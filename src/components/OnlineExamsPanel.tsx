import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  AlertCircle, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  User, 
  Phone, 
  Calendar, 
  Award,
  ChevronDown,
  X,
  Database,
  CheckCircle2,
  XCircle,
  Hash,
  Upload,
  Loader2,
  FlaskConical,
  Sparkles,
  Globe
} from 'lucide-react';
import { MathJaxSection } from './MathJaxSection';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { getExamLink } from '../lib/urlUtils';

interface OnlineExam {
  id: string;
  title: string;
  description: string;
  grade: string;
  subject: string;
  category?: string;
  questions: {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
    scientificExplanation?: string;
  }[];
  teacherId: string;
  teacherName: string;
  createdAt: any;
}

interface ExamSubmission {
  id: string;
  examId: string;
  examTitle: string;
  category?: string;
  studentName: string;
  studentPhone: string;
  score: number;
  correctCount: number;
  answersCount: number;
  answers: number[]; // Index of student answers
  submittedAt: string;
  teacherId: string;
}

export interface VebChemistryTopic {
  id: string;
  title: string;
  tag: string;
  icon: string;
  topicText: string;
  category: string;
}

export const VEB_CHEMISTRY_TOPICS: VebChemistryTopic[] = [
  {
    id: 'atom-periodic',
    title: 'مبنى الذرة والقائمة الدورية',
    tag: 'النماذج والتأين',
    icon: '⚛️',
    topicText: 'مبنى الذرة والنماذج الذرية، التوزيع الإلكتروني، نصف القطر الذري وتدرج طاقة التأين والسالبية الكهربائية عبر الدورات والمجموعات وفق معايير موقع VEB School Chemistry ونموذج 037381.',
    category: 'بجروت كيمياء - ذرة وجدول دوري'
  },
  {
    id: 'chemical-bonds',
    title: 'الروابط الكيميائية وعالم المواد',
    tag: 'تساهمية، هيدروجينية، وفان دير فالس',
    icon: '🔗',
    topicText: 'الروابط التساهمية القطبية وغير القطبية، قوى فان دير فالس، الروابط الهيدروجينية، الشبكة الأيونية والفلزية، وتأثير نوع الروابط على درجات الغليان والانصهار والذائبية استناداً لموقع VEB School Chemistry.',
    category: 'بجروت كيمياء - الروابط والمواد'
  },
  {
    id: 'stoichiometry',
    title: 'الستوكيومتريا والحسابات الكيميائية',
    tag: 'المول، الغازات STP، وتراكيز المحاليل',
    icon: '⚖️',
    topicText: 'حسابات المول والكتلة المولية، حسابات الغازات في الشروط المعيارية STP، حساب تراكيز المحاليل المولارية (Molar)، والمادة المحددة للتفاعل والمردود المئوي بحسب منهاج VEB School.',
    category: 'بجروت كيمياء - ستوكيومتريا'
  },
  {
    id: 'thermodynamics',
    title: 'الكيمياء الحرارية والإنتروبيا',
    tag: 'الإنثالبي ΔH والإنتروبيا ΔS وطاقة جيبس',
    icon: '🔥',
    topicText: 'حسابات طاقة الروابط، التغير في الإنثالبي ΔH للتفاعلات، قانون هس، الإنتروبيا ΔS، وتلقائية التفاعلات وطاقة جيبس الحرة ΔG وفق منهاج 5 وحدات بموقع VEB School Chemistry.',
    category: 'بجروت كيمياء - طاقة وإنتروبيا'
  },
  {
    id: 'kinetics-equilibrium',
    title: 'سرعة التفاعل والاتزان الكيميائي',
    tag: 'لوشاتلييه، طاقة التنشيط، وثابت Kc',
    icon: '⏱️',
    topicText: 'نظرية التصادم، طاقة التنشيط، العوامل المؤثرة على سرعة التفاعل، ثابت الاتزان الكيميائي Kc، ومبدأ لوشاتلييه وتأثير التغير في التركيز والضغط ودرجة الحرارة استناداً لـ VEB School.',
    category: 'بجروت كيمياء - اتزان كيميائي'
  },
  {
    id: 'acids-bases',
    title: 'الحوامض والقواعد والرقم الهيدروجيني pH',
    tag: 'برونستد-لوري، المعايرة، ومحاليل Buffer',
    icon: '🧪',
    topicText: 'تعريف برونستد-لوري للمانح والمستقبل، حسابات تركيز أيونات H₃O⁺ و OH⁻، حساب الرقم الهيدروجيني pH، معايرة حامض-قاعدة، والمحاليل المنظمة (Buffers) وفق منهاج موقع VEB School Chemistry.',
    category: 'بجروت كيمياء - حوامض وقواعد'
  },
  {
    id: 'redox-electro',
    title: 'الأكسدة والاختزال والكهروكيمياء',
    tag: 'أرقام التأكسد، الخلايا الجلفانية وجهود الاختزال',
    icon: '⚡',
    topicText: 'تحديد أرقام التأكسد، موازنة تفاعلات التأكسد والاختزال، الخلايا الجلفانية وجهود الاختزال القياسية، والخلايا الإلكتروليتية وفق شروحات VEB School Chemistry.',
    category: 'بجروت كيمياء - أكسدة واختزال'
  },
  {
    id: 'organic-chemistry',
    title: 'الكيمياء العضوية ومجموعات المواد',
    tag: 'ألكانات، كحولات، ألدهيدات، وأحماض',
    icon: '🧬',
    topicText: 'تسمية وخصائص وتفاعلات المركبات العضوية: الهيدروكربونات، الكحولات، الألدهيدات، الكيتونات، الأحماض الكربوكسيلية، والإسترات وتفاعلات التكاثف استناداً لـ VEB School Chemistry.',
    category: 'بجروت كيمياء - كيمياء عضوية'
  },
  {
    id: 'food-polymers',
    title: 'كيمياء الغذاء والبوليمرات',
    tag: 'أحماض دهنية، سكريات، وبروتينات',
    icon: '🥗',
    topicText: 'بنية وخصائص الأحماض الدهنية والدهون الثلاثية (تصبن، أوميغا 3 و 6)، السكريات الأحادية والمتعددة، والأحماض الأمينية والروابط الببتيدية والبروتينات وفق منهاج VEB School.',
    category: 'بجروت كيمياء - كيمياء الغذاء'
  },
  {
    id: 'academic-competition',
    title: 'مسابقة الكيمياء الأكاديمية (بجروت 5 وحدات)',
    tag: 'تحدي تفكير عليا وبجروت 037381',
    icon: '🏆',
    topicText: 'مسابقة أكاديمية كيميائية متقدمة تحاكي أعلى مستويات التفكير والتحليل العلمي في نموذج بجروت الكيمياء 037381، شاملة لتحليل التجارب واستنتاج الآليات الكيميائية بالاعتماد على موقع VEB School Chemistry.',
    category: 'مسابقة كيمياء أكاديمية'
  }
];

interface OnlineExamsPanelProps {
  loggedInTeacher: {
    id: string;
    name: string;
    subjects?: string[];
    specialization?: string;
  };
}

export default function OnlineExamsPanel({ loggedInTeacher }: OnlineExamsPanelProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'results'>('list');
  const [loading, setLoading] = useState<boolean>(false);
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // CSV Exporter States
  const [showCsvExporter, setShowCsvExporter] = useState<boolean>(false);
  const [csvExporterData, setCsvExporterData] = useState<{questions: any[], title: string}>({ questions: [], title: '' });

  // Detection of chemistry specialization
  const isChemistryTeacher = useMemo(() => {
    const subs = loggedInTeacher.subjects || [];
    const spec = loggedInTeacher.specialization || '';
    return subs.some(s => s.includes('كيمياء') || s.toLowerCase().includes('chem')) ||
      spec.includes('كيمياء') || spec.toLowerCase().includes('chem');
  }, [loggedInTeacher]);

  const defaultSubject = useMemo(() => {
    if (loggedInTeacher.subjects && loggedInTeacher.subjects.length > 0) {
      const chem = loggedInTeacher.subjects.find(s => s.includes('كيمياء') || s.toLowerCase().includes('chem'));
      return chem || loggedInTeacher.subjects[0];
    }
    return isChemistryTeacher ? 'الكيمياء' : 'الرياضيات';
  }, [loggedInTeacher, isChemistryTeacher]);

  // New Exam Form State
  const [examTitle, setExamTitle] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [examCategory, setExamCategory] = useState(isChemistryTeacher ? 'بجروت كيمياء - VEB School' : 'مراجعة عامة');
  const [examGrade, setExamGrade] = useState('الصف العاشر');
  const [examSubject, setExamSubject] = useState(defaultSubject);
  const [questions, setQuestions] = useState<Array<{
    id: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
    scientificExplanation?: string;
  }>>([
    {
      id: 'q-1',
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      scientificExplanation: ''
    }
  ]);

  // Selected submission detail modal
  const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);
  const [assocExam, setAssocExam] = useState<OnlineExam | null>(null);

  // AI Exam Generator states
  const [creationMode, setCreationMode] = useState<'manual' | 'ai'>('manual');
  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(10); // Default to 10 (multiples of 10)
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [sourceType, setSourceType] = useState<'none' | 'website' | 'file' | 'library'>('none');
  const [sourceValue, setSourceValue] = useState('');
  const [generatingWithAi, setGeneratingWithAi] = useState(false);

  // Educational Library resources state in AI exam generator
  const [libraryResources, setLibraryResources] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [filterLibraryByExamDetails, setFilterLibraryByExamDetails] = useState(true);

  // Fetch educational resources for source selection
  useEffect(() => {
    if (sourceType === 'library' && libraryResources.length === 0) {
      const fetchLibrary = async () => {
        setLoadingLibrary(true);
        try {
          const colRef = collection(db, 'educational_resources');
          const snap = await getDocs(colRef);
          const list = snap.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          }));
          setLibraryResources(list);
        } catch (err: any) {
          console.error("Error loading library resources in Exams generator:", err);
          handleFirestoreError(err, OperationType.LIST, 'educational_resources');
        } finally {
          setLoadingLibrary(false);
        }
      };
      fetchLibrary();
    }
  }, [sourceType, libraryResources.length]);

  const filteredLibraryResources = React.useMemo(() => {
    if (!filterLibraryByExamDetails) return libraryResources;
    return libraryResources.filter(res => {
      const matchSubject = !res.subject || !examSubject || res.subject.includes(examSubject) || examSubject.includes(res.subject);
      const matchGrade = !res.grade || !examGrade || res.grade.includes(examGrade) || examGrade.includes(res.grade);
      return matchSubject || matchGrade;
    });
  }, [libraryResources, examSubject, examGrade, filterLibraryByExamDetails]);

  // File Upload states for additional educational source
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileParsingError, setFileParsingError] = useState<string | null>(null);
  const [fileParsingLoading, setFileParsingLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Fallback / dynamic loader of PDF.js CDN
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const existingLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf'];
      if (existingLib) {
        resolve(existingLib);
        return;
      }

      const cdns = [
        {
          script: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
          worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'
        },
        {
          script: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.min.js',
          worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.worker.min.js'
        },
        {
          script: 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.min.js',
          worker: 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js'
        }
      ];

      let currentCdnIndex = 0;

      const tryLoad = () => {
        if (currentCdnIndex >= cdns.length) {
          reject(new Error('فشل تحميل محرك الاستخراج التلقائي لنصوص PDF من جميع المصادر الاحتياطية. يرجى التحقق من اتصال الإنترنت وصلاحية روابط CDN.'));
          return;
        }

        const cdn = cdns[currentCdnIndex];
        const script = document.createElement('script');
        script.src = cdn.script;
        
        script.onload = () => {
          const pdfjsLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf'];
          if (pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = cdn.worker;
            resolve(pdfjsLib);
          } else {
            // Try next CDN
            currentCdnIndex++;
            tryLoad();
          }
        };

        script.onerror = () => {
          currentCdnIndex++;
          tryLoad();
        };

        document.head.appendChild(script);
      };

      tryLoad();
    });
  };

  const extractTextFromFile = async (file: File) => {
    setFileParsingError(null);
    setFileParsingLoading(true);
    setUploadedFileName(file.name);
    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        const pageLimit = Math.min(pdf.numPages, 15);
        
        for (let i = 1; i <= pageLimit; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        if (pdf.numPages > 15) {
          fullText += `\n[تم اقتطاع النص المتبقي لتجاوز حد الـ 15 صفحة المسموحة للمسودة علمياً]`;
        }

        if (!fullText.trim()) {
          throw new Error('لم نعثر على نصوص صريحة قابلة للتحديد بالملف. قد يكون الملف ممسوحاً ضوئياً كلياً كصورة (Scanned). يرجى نسخ ولصق النصوص يدوياً أو استخدام ملف نصي داعم.');
        }
        
        setSourceValue(fullText);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        setSourceValue(text);
      } else {
        throw new Error('صيغة الملف غير مدعومة. يرجى رفع ملفات بصيغة PDF أو بصيغة نصوص TXT عادية.');
      }
    } catch (err: any) {
      console.error('Core PDF Extraction error on client:', err);
      setFileParsingError(err.message || 'فشل تحميل واستخلاص نصوص الملف.');
      setUploadedFileName('');
    } finally {
      setFileParsingLoading(false);
    }
  };

  // Handle generating exam using AI route
  const handleGenerateExamWithAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      alert("الرجاء تحديد موضوع أو فكرة الاختبار المراد توليدها ذكياً.");
      return;
    }

    setGeneratingWithAi(true);
    try {
      const res = await fetch("/api/teacher/generate-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: examSubject,
          grade: examGrade,
          topic: aiTopic.trim(),
          numQuestions: aiNumQuestions,
          category: examCategory.trim(),
          difficulty: aiDifficulty,
          sourceType,
          sourceValue: sourceValue.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل توليد الاختبار من المعالج الذكي بالخادم.");
      }

      // Load AI generated result into builder form
      setExamTitle(data.exam.title || `اختبار ذكي: ${aiTopic.trim()}`);
      setExamDescription(data.exam.description || `اختبار تفاعلي حول موضوع ${aiTopic.trim()} مولد بالكامل بالذكاء الاصطناعي.`);
      setQuestions(data.exam.questions || []);

      // Inform user and return to manual so they can inspect/edit and save.
      setCreationMode('manual');
      alert("🎉 تم توليد وبناء مسودة الاختبار بالكامل بالذكاء الاصطناعي بنجاح! يمكنك الآن معاينة الأسئلة، تعديل صياغاتها بالكامل، ثم حفظ ونشر رابط الاختبار فورياً لطلابك.");
    } catch (err: any) {
      console.error("AI Exam Generation Failure on frontend:", err);
      alert(`عذراً، حدث خطأ أثناء التوليد الذكي: ${err.message || 'يرجى مراجعة تفاصيل الاتصال بالخادم الذكي.'}`);
    } finally {
      setGeneratingWithAi(false);
    }
  };

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamFilter, setSelectedExamFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const grades = [
    'الصف السابع',
    'الصف الثامن',
    'الصف التاسع',
    'الصف العاشر',
    'الصف الحادي عشر',
    'الصف الثاني عشر (بجروت)',
    'تحضيري للجامعة'
  ];

  const subjectsList = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(loggedInTeacher.subjects)) {
      loggedInTeacher.subjects.forEach(s => {
        const trimmed = typeof s === 'string' ? s.trim() : '';
        if (trimmed && !list.includes(trimmed)) {
          list.push(trimmed);
        }
      });
    }
    if (loggedInTeacher.specialization && typeof loggedInTeacher.specialization === 'string') {
      const trimmed = loggedInTeacher.specialization.trim();
      if (trimmed && !list.includes(trimmed)) {
        list.push(trimmed);
      }
    }
    if (list.length > 0) {
      if (!list.some(s => s.includes('كيمياء') || s.toLowerCase().includes('chem'))) {
        list.push('الكيمياء');
      }
      return list;
    }
    return [
      'الكيمياء',
      'الرياضيات',
      'الفيزياء',
      'اللغة الإنجليزية',
      'اللغة العربية',
      'البيولوجيا',
      'الحاسوب والتكنولوجيا'
    ];
  }, [loggedInTeacher.subjects, loggedInTeacher.specialization]);

  const isCurrentExamChemistry = useMemo(() => {
    return (examSubject && (examSubject.includes('كيمياء') || examSubject.toLowerCase().includes('chem'))) ||
      (aiTopic && (aiTopic.includes('كيمياء') || aiTopic.toLowerCase().includes('chem'))) ||
      (sourceValue && sourceValue.includes('vebschoolchemistry')) ||
      isChemistryTeacher;
  }, [examSubject, aiTopic, sourceValue, isChemistryTeacher]);

  const handleApplyVebChemistryTopic = (topicItem: VebChemistryTopic) => {
    setCreationMode('ai');
    setActiveTab('create');
    const chemSub = subjectsList.find(s => s.includes('كيمياء') || s.toLowerCase().includes('chem')) || 'الكيمياء';
    setExamSubject(chemSub);
    setSourceType('website');
    setSourceValue('https://www.vebschoolchemistry.com/');
    setAiTopic(topicItem.topicText);
    setExamCategory(topicItem.category);
    setExamTitle(`اختبار كيمياء تفاعلي: ${topicItem.title}`);
    setExamDescription(`اختبار ومسابقة أكاديمية في الكيمياء حول "${topicItem.title}" مبني استناداً إلى المرجع الأساسي المعتمد موقع VEB School Chemistry (نموذج بجروت 037381).`);
  };

  // Fetch Exams & Submissions
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch exams
      const examsQuery = query(
        collection(db, 'onlineExams'), 
        where('teacherId', '==', loggedInTeacher.id)
      );
      const examsSnap = await getDocs(examsQuery);
      const fetchedExams: OnlineExam[] = [];
      examsSnap.forEach((doc) => {
        const data = doc.data();
        fetchedExams.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          grade: data.grade || '',
          subject: data.subject || '',
          category: data.category || '',
          questions: data.questions || [],
          teacherId: data.teacherId || '',
          teacherName: data.teacherName || '',
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString('ar-EG') || data.createdAt || ''
        });
      });
      setExams(fetchedExams);

      // Fetch Submissions
      const submissionsQuery = query(
        collection(db, 'examResults'),
        where('teacherId', '==', loggedInTeacher.id)
      );
      const submissionsSnap = await getDocs(submissionsQuery);
      const fetchedSubmissions: ExamSubmission[] = [];
      submissionsSnap.forEach((doc) => {
        const data = doc.data();
        fetchedSubmissions.push({
          id: doc.id,
          examId: data.examId || '',
          examTitle: data.examTitle || '',
          category: data.category || '',
          studentName: data.studentName || '',
          studentPhone: data.studentPhone || '',
          score: data.score || 0,
          correctCount: data.correctCount || 0,
          answersCount: data.answersCount || 0,
          answers: data.answers || [],
          submittedAt: data.submittedAt || '',
          teacherId: data.teacherId || ''
        });
      });
      // Sort submissions by date desc
      fetchedSubmissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setSubmissions(fetchedSubmissions);
    } catch (e) {
      console.error('Error fetching online exams data', e);
      handleFirestoreError(e, OperationType.LIST, 'onlineExams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [loggedInTeacher.id]);

  const handleCopyLink = (examId: string) => {
    const link = getExamLink(examId);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(examId);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // Add Question to Form
  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        id: `q-${Date.now()}`,
        text: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        scientificExplanation: ''
      }
    ]);
  };

  // Delete Question from Form
  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // Update Question Content
  const updateQuestionText = (index: number, val: string) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, text: val } : q));
  };

  // Update Question Options
  const updateQuestionOption = (qIndex: number, optIndex: number, val: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === qIndex) {
        const updatedOpts = [...q.options];
        updatedOpts[optIndex] = val;
        return { ...q, options: updatedOpts };
      }
      return q;
    }));
  };

  // Update Question Correct Index
  const updateQuestionCorrectIndex = (qIndex: number, optIndex: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIndex ? { ...q, correctOptionIndex: optIndex } : q));
  };

  // Generate CSV String helper
  const generateCsvString = (examQuestions: any[]) => {
    const headers = ["السؤال", "الخيار_أ", "الخيار_ب", "الخيار_ج", "الخيار_د", "الإجابة_الصحيحة", "التفسير_العلمي"];
    
    const escapeCSV = (val: string) => {
      if (!val) return '""';
      let clean = val;
      // Remove LaTeX expressions to keep raw text
      clean = clean.replace(/\$\ce\{([^}]+)\}\$/g, '$1');
      clean = clean.replace(/\$([^$]+)\$/g, '$1');
      // Escape double quotes
      clean = clean.replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = (examQuestions || []).map(q => {
      const optA = q.options[0] || '';
      const optB = q.options[1] || '';
      const optC = q.options[2] || '';
      const optD = q.options[3] || '';
      const correctText = q.options[q.correctOptionIndex] || '';
      const explanation = q.scientificExplanation || q.explanation || 'تفسير علمي عام للإجابة النموذجية.';

      return [
        escapeCSV(q.text),
        escapeCSV(optA),
        escapeCSV(optB),
        escapeCSV(optC),
        escapeCSV(optD),
        escapeCSV(correctText),
        escapeCSV(explanation)
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  // Create Online Exam Submitter
  const handleCreateExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      alert('الرجاء إدخال عنوان الاختبار.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        alert(`الرجاء إدخال نص السؤال رقم ${i + 1}`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          alert(`الرجاء إدخال الخيار رقم ${j + 1} للسؤال رقم ${i + 1}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const examPayload = {
        title: examTitle.trim(),
        description: examDescription.trim(),
        grade: examGrade,
        subject: examSubject,
        category: examCategory.trim(),
        questions: questions.map(q => ({
          id: q.id,
          text: q.text.trim(),
          options: q.options.map(o => o.trim()),
          correctOptionIndex: q.correctOptionIndex,
          scientificExplanation: q.scientificExplanation || ''
        })),
        teacherId: loggedInTeacher.id,
        teacherName: loggedInTeacher.name,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'onlineExams'), examPayload);
      
      // Reset form
      setExamTitle('');
      setExamDescription('');
      setExamCategory('مراجعة عامة');
      setQuestions([
        {
          id: 'q-1',
          text: '',
          options: ['', '', '', ''],
          correctOptionIndex: 0
        }
      ]);

      // Switch to list tab & refresh
      setActiveTab('list');
      fetchData();
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, 'onlineExams');
      alert('حدث خطأ أثناء حفظ الاختبار الإلكتروني.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Exam
  const handleDeleteExam = async (examId: string) => {
    if (!confirm('هل أنت متأكد من رغبتك بحذف هذا الاختبار الإلكتروني؟ سيؤدي ذلك أيضاً لإلغاء صلاحية روابطه المنشورة.')) return;
    try {
      await deleteDoc(doc(db, 'onlineExams', examId));
      setExams(prev => prev.filter(e => e.id !== examId));
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.DELETE, `onlineExams/${examId}`);
      alert('خطأ أثناء حذف الاختبار.');
    }
  };

  // Open Detailed results view
  const handleOpenSubmissionDetail = (submission: ExamSubmission) => {
    const relatedExam = exams.find(e => e.id === submission.examId);
    setSelectedSubmission(submission);
    setAssocExam(relatedExam || null);
  };

  // Filtered Submissions list
  const filteredSubmissions = submissions.filter(sub => {
    const q = (searchQuery || '').trim().toLowerCase();
    const matchesSearch = !q || 
      (sub.studentName || '').toLowerCase().includes(q) ||
      (sub.studentPhone || '').includes(searchQuery || '');
    
    const matchesExam = selectedExamFilter === 'all' || sub.examId === selectedExamFilter;
    
    const matchesCategory = selectedCategoryFilter === 'all' || sub.category === selectedCategoryFilter;

    return matchesSearch && matchesExam && matchesCategory;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 overflow-hidden">
      
      {/* Arabic Tab Selector Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 pb-5 mb-6 gap-4" dir="rtl">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <span className="p-1 px-2.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs">📝</span>
            <span>بوابة الامتحانات الإلكترونية والاختبارات التفاعلية</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">صناعة اختبارات متعددة الخيارات، توليد الروابط ومتابعة تحصيل الطلاب</p>
        </div>

        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 text-xs font-black rounded-xl cursor-pointer transition-all ${
              activeTab === 'results' 
                ? 'bg-slate-950 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            📊 نتائج الطلاب ({submissions.length})
          </button>
          
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-xs font-black rounded-xl cursor-pointer transition-all ${
              activeTab === 'list' 
                ? 'bg-slate-950 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            📋 الاختبارات المنشورة ({exams.length})
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-black rounded-xl cursor-pointer transition-all ${
              activeTab === 'create' 
                ? 'bg-slate-950 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            ✨ إنشاء اختبار جديد
          </button>
        </div>
      </div>

      {/* VEB School Chemistry Academic Reference Banner */}
      {(isChemistryTeacher || isCurrentExamChemistry) && (
        <div className="mb-6 p-4.5 rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white border-2 border-emerald-500/40 shadow-lg relative overflow-hidden" dir="rtl">
          <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
                🧪
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    المرجع الأكاديمي الأساسي المعتمد لمادة الكيمياء: موقع VEB School Chemistry
                  </h3>
                  <span className="text-[9px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-2xs">
                    فيفيان بشوتي حوراني ⭐
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/90 font-medium mt-1 leading-relaxed">
                  المرجع الرسمي لإعداد الاختبارات الإلكترونية التفاعلية، أوراق العمل، والمسابقات الأكاديمية لبجروت الكيمياء 3 و 5 وحدات (نموذج 037381 و 037387).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <a
                href="https://www.vebschoolchemistry.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-white/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 transition-all flex items-center gap-1.5"
              >
                <span>زيارة الموقع المرجعي 🌐</span>
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('create');
                  setCreationMode('ai');
                  const chemSub = subjectsList.find(s => s.includes('كيمياء')) || 'الكيمياء';
                  setExamSubject(chemSub);
                  setSourceType('website');
                  setSourceValue('https://www.vebschoolchemistry.com/');
                  setExamCategory('بجروت كيمياء - VEB School');
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>توليد اختبار من المرجع ⚡</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="py-20 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-xs font-black text-slate-800">جاري تحميل البيانات والمزامنة...</span>
        </div>
      )}

      {!loading && activeTab === 'list' && (
        <div dir="rtl">
          {exams.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <h4 className="text-sm font-black text-slate-800">لا يوجد لديك أي اختبارات منشورة حتى الآن</h4>
              <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
                ابدأ الآن بصناعة أول اختبار إلكتروني بدقائق! ستقوم المنصة بتوليد رابط دائم للطلاب لحل الأسئلة وإرسال النتائج لك فوراً.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm"
              >
                اصنع اختبارك الأول الآن 👈
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <div 
                  key={exam.id} 
                  className="border border-slate-200/80 rounded-2xl bg-white hover:border-indigo-300 transition-all shadow-sm flex flex-col justify-between p-5 group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-black px-2 py-1 rounded-md">
                          {exam.subject}
                        </span>
                        {(exam.subject.includes('كيمياء') || exam.title.includes('كيمياء') || (exam.description && exam.description.includes('VEB'))) && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            🧪 مرجع VEB School
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-md">
                        {exam.grade}
                      </span>
                    </div>

                    <h3 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {exam.title}
                    </h3>
                    
                    {exam.description && (
                      <p className="text-[11px] text-slate-400 font-bold line-clamp-2 leading-relaxed">
                        {exam.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3.5 pt-2 border-t border-slate-50 text-slate-400 text-[10px] font-bold">
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} className="text-slate-400" />
                        <span>عدد الأسئلة: {exam.questions?.length || 0}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        <span>أُنشئ: {exam.createdAt}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2">
                    {/* Share / Copy action block */}
                    <div className="bg-slate-50 p-2 rounded-xl flex items-center justify-between border border-slate-100 gap-2">
                      <code className="text-[9px] font-mono text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap block flex-1 text-left" dir="ltr">
                        {getExamLink(exam.id)}
                      </code>
                      
                      <button
                        onClick={() => handleCopyLink(exam.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                          copiedId === exam.id 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-white hover:bg-slate-200 border border-slate-300/85 text-slate-700'
                        }`}
                      >
                        {copiedId === exam.id ? (
                          <>
                            <Check size={11} />
                            <span>تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>نسخ الرابط</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex justify-between items-center mt-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const url = getExamLink(exam.id);
                            window.open(url, '_blank');
                          }}
                          className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink size={11} />
                          <span>تجربة الرابط كطالب</span>
                        </button>

                        <button
                          onClick={() => {
                            setCsvExporterData({ questions: exam.questions, title: exam.title });
                            setShowCsvExporter(true);
                          }}
                          className="text-[10px] font-black text-emerald-600 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText size={11} />
                          <span>تصدير كـ CSV 📄</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteExam(exam.id)}
                        className="p-1 px-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ml-1.5"
                      >
                        <Trash size={11} />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === 'create' && (
        <div className="space-y-6 animate-fade-in" dir="rtl">
          {/* Creation Mode Tabs Selector */}
          <div className="flex bg-slate-100 p-1 rounded-2xl max-w-md mx-auto relative select-none">
            <button
              type="button"
              onClick={() => setCreationMode('manual')}
              className={`flex-1 text-center py-2.5 text-xs font-black rounded-xl cursor-pointer transition-all ${
                creationMode === 'manual' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ✏️ بناء يدوي تقليدي
            </button>
            <button
              type="button"
              onClick={() => setCreationMode('ai')}
              className={`flex-1 text-center py-2.5 text-xs font-black rounded-xl cursor-pointer transition-all ${
                creationMode === 'ai' 
                  ? 'bg-gradient-to-r from-indigo-650 to-purple-650 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ✨ توليد تلقائي بالذكاء الاصطناعي
            </button>
          </div>

          {creationMode === 'ai' ? (
            /* AI Generator Console View */
            <form onSubmit={handleGenerateExamWithAi} className="space-y-6 bg-slate-50/40 p-6 rounded-[2rem] border border-slate-150">
              <div className="p-5 bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-900 rounded-3xl text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 font-black text-7xl font-sans select-none pointer-events-none transform translate-y-4">
                  AI
                </div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <span>🤖</span>
                  <span>معالج الامتحانات الذكي والمسابقات الأكاديمية (GenAI Exam Builder)</span>
                </h3>
                <p className="text-[11px] text-white/80 font-semibold mt-2 leading-relaxed">
                  أدخل الفكرة أو موضوع الدرس الذي تود قياس مهارات الطلاب فيه، وسيقوم المعالج الذكي بصياغة أسئلة اختيار من متعدد متقنة، متدرجة الصعوبة ومطابقة للمناهج الدراسية المطلوبة في ثوانٍ معدودة.
                </p>
              </div>

              {/* VEB School Chemistry Dedicated Primary Reference Showcase in AI Generator */}
              {(isChemistryTeacher || isCurrentExamChemistry) && (
                <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-500/40 shadow-xl space-y-4 relative overflow-hidden" dir="rtl">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-500/20 shrink-0">
                        🧪
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-white">
                            المرجع الأساسي المعتمد: موقع VEB School Chemistry
                          </h3>
                          <span className="text-[9px] bg-emerald-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full shadow-xs">
                            المرجع الرسمي للكيمياء 🎖️
                          </span>
                        </div>
                        <p className="text-xs text-emerald-200/90 font-medium mt-1 leading-relaxed">
                          بإشراف المعلمة فيفيان بشوتي حوراني • المنهاج المعتمد لإعداد بنك الأسئلة، الاختبارات الإلكترونية التفاعلية، والمسابقات الأكاديمية لبجروت الكيمياء 3 و 5 وحدات (نموذج 037381 و 037387).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <a
                        href="https://www.vebschoolchemistry.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-white/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 transition-all flex items-center gap-1.5"
                      >
                        <span>زيارة الموقع 🌐</span>
                        <ExternalLink size={13} />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const chemSub = subjectsList.find(s => s.includes('كيمياء') || s.toLowerCase().includes('chem')) || 'الكيمياء';
                          setExamSubject(chemSub);
                          setSourceType('website');
                          setSourceValue('https://www.vebschoolchemistry.com/');
                          setExamCategory('بجروت كيمياء - VEB School');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                          sourceType === 'website' && sourceValue === 'https://www.vebschoolchemistry.com/'
                            ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <Check size={14} />
                        <span>
                          {sourceType === 'website' && sourceValue === 'https://www.vebschoolchemistry.com/'
                            ? 'تم تفعيل المرجع بالرابط المعتمد ✓'
                            : 'تفعيل المرجع المعتمد بالرابط ⚡'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Units Quick-Selector Cards */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <span className="font-black text-emerald-300 flex items-center gap-1.5">
                        <span>⚡ محاور ووحدات منهاج موقع VEB School Chemistry (اضغط على أي وحدة لتوليد الاختبار فوراً):</span>
                      </span>
                      <span className="text-[10px] text-emerald-200/80 font-bold bg-white/10 px-2 py-0.5 rounded-md">
                        10 وحدات ونماذج بجروت ومسابقات 📚
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                      {VEB_CHEMISTRY_TOPICS.map((topicItem) => (
                        <button
                          key={topicItem.id}
                          type="button"
                          onClick={() => handleApplyVebChemistryTopic(topicItem)}
                          className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer group hover:scale-[1.02] ${
                            aiTopic === topicItem.topicText
                              ? 'bg-emerald-500/30 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400'
                              : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-emerald-500/40 text-emerald-100'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-base">{topicItem.icon}</span>
                            <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                              {topicItem.tag.slice(0, 18)}...
                            </span>
                          </div>
                          <span className="text-[11px] font-black line-clamp-2 leading-tight group-hover:text-white">
                            {topicItem.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block">الصف المستهدف *</label>
                  <select
                    value={examGrade}
                    onChange={(e) => setExamGrade(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white cursor-pointer"
                  >
                    {grades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block">المادة الدراسية *</label>
                  <select
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white cursor-pointer"
                  >
                    {subjectsList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block">تصنيف الاختبار *</label>
                  <input
                    type="text"
                    required
                    list="exam-categories-ai"
                    placeholder="مراجعة عامة، قواعد..."
                    value={examCategory}
                    onChange={(e) => setExamCategory(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white text-right"
                  />
                  <datalist id="exam-categories-ai">
                    <option value="بجروت كيمياء - VEB School" />
                    <option value="مسابقة كيمياء أكاديمية" />
                    <option value="مراجعة عامة" />
                    <option value="قواعد" />
                    <option value="مفردات" />
                    <option value="مراجعة نهائية" />
                    <option value="اختبار شهري" />
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block">عدد الأسئلة المطلوبة *</label>
                  <select
                    value={aiNumQuestions}
                    onChange={(e) => setAiNumQuestions(Number(e.target.value))}
                    className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white cursor-pointer"
                  >
                    <option value={10}>10 أسئلة (مضاعف 10) 📚</option>
                    <option value={20}>20 سؤالاً (مضاعف 10) 🎖️</option>
                    <option value={30}>30 سؤالاً (مضاعف 10) 🌟</option>
                    <option value={40}>40 سؤالاً (مضاعف 10) 🏅</option>
                    <option value={50}>50 سؤالاً (مضاعف 10) 🔥</option>
                    <option value={5}>5 أسئلة (اختبار سريع) ⭐</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block">مستوى الصعوبة *</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as any)}
                    className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white cursor-pointer"
                  >
                    <option value="easy">سهل المأخذ 🟢</option>
                    <option value="medium">متوسط متوازن 🟡</option>
                    <option value="hard">صعب متقدم / بجروت 🔴</option>
                  </select>
                </div>

                {/* Source Selection Panel (Website or pasted File text with PDF upload support) */}
                <div className="space-y-2 md:col-span-5 bg-indigo-50/20 p-4 border border-indigo-150/40 rounded-2xl text-right" dir="rtl">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-indigo-100/30">
                    <div>
                      <span className="text-xs font-black text-indigo-900 block">📚 تحديد مصدر إضافي للامتحان (اختياري)</span>
                      <p className="text-[10px] text-slate-500 font-bold">يمكنك توجيه الذكاء الاصطناعي ليعتمد على محتوى ويب، ملف PDF، أو مرجع من المكتبة التعليمية.</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => { setSourceType('none'); setSourceValue(''); setUploadedFileName(''); setFileParsingError(null); setSelectedResourceId(''); }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${sourceType === 'none' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                      >
                        لا يوجد (من المنهج مباشرة)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSourceType('website'); setSourceValue(isCurrentExamChemistry ? 'https://www.vebschoolchemistry.com/' : ''); setUploadedFileName(''); setFileParsingError(null); setSelectedResourceId(''); }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${sourceType === 'website' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                      >
                        🌐 موقع إلكتروني (رابط)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSourceType('file'); setSourceValue(''); setUploadedFileName(''); setFileParsingError(null); setSelectedResourceId(''); }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${sourceType === 'file' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                      >
                        📄 ملف PDF / مستند نصي
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSourceType('library'); setSourceValue(''); setUploadedFileName(''); setFileParsingError(null); setSelectedResourceId(''); }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${sourceType === 'library' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                      >
                        🏫 المكتبة التعليمية
                      </button>
                    </div>
                  </div>

                  {sourceType === 'website' && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-[10px] font-black text-indigo-950 block text-right">رابط الموقع الإلكتروني المرجعي *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setSourceValue('https://www.vebschoolchemistry.com/');
                            const chemSub = subjectsList.find(s => s.includes('كيمياء') || s.toLowerCase().includes('chem')) || 'الكيمياء';
                            setExamSubject(chemSub);
                            setExamCategory('بجروت كيمياء - VEB School');
                          }}
                          className="text-[9px] font-black bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <span>🧪 تعيين موقع VEB School Chemistry كمرجع أساسي معتمد</span>
                        </button>
                      </div>
                      <input
                        type="url"
                        required
                        placeholder="أدخل رابط الموقع، مثال: https://www.vebschoolchemistry.com/"
                        value={sourceValue}
                        onChange={(e) => setSourceValue(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 border border-indigo-200 rounded-xl focus:border-indigo-600 bg-white text-left font-mono"
                        dir="ltr"
                      />
                      {sourceValue === 'https://www.vebschoolchemistry.com/' && (
                        <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                          <span>✅</span>
                          <span>تم ربط الاختبار رسمياً بموقع VEB School Chemistry (فيفيان بشوتي حوراني) - نموذج بجروت 037381.</span>
                        </p>
                      )}
                    </div>
                  )}

                  {sourceType === 'file' && (
                    <div className="mt-4 space-y-3">
                      {/* Drag & Drop Area */}
                      <div 
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            extractTextFromFile(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`border-2 border-dashed rounded-2xl p-4.5 text-center transition-all cursor-pointer ${
                          isDraggingFile 
                            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
                            : 'border-slate-300 hover:border-indigo-400 bg-white'
                        }`}
                        onClick={() => document.getElementById('exam-source-file-input')?.click()}
                      >
                        <input 
                          type="file"
                          id="exam-source-file-input"
                          className="hidden"
                          accept=".pdf,.txt"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              extractTextFromFile(e.target.files[0]);
                            }
                          }}
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            {fileParsingLoading ? (
                              <Loader2 className="animate-spin text-indigo-600" size={18} />
                            ) : (
                              <Upload size={18} />
                            )}
                          </div>
                          <div>
                            <span className="text-[11px] font-black text-slate-800 block">
                              قم بسحب وإفلت ورقة عمل البجروت أو ملف الـ PDF هنا 📥
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                              يدعم ملفات PDF التعليمية وملفات النصوص العامة (.txt) حتى 15 صفحة
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* File Parsing Loading Indicator */}
                      {fileParsingLoading && (
                        <div className="flex items-center gap-2 text-[10px] text-indigo-600 font-black justify-center bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
                          <Loader2 className="animate-spin" size={13} />
                          <span>جاري قراءة ملف البجروت وفهرسة النصوص بدقة استثنائية...</span>
                        </div>
                      )}

                      {/* Error State */}
                      {fileParsingError && (
                        <div className="space-y-3">
                          <div className="text-[10px] text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 font-bold leading-relaxed text-right">
                            ⚠️ {fileParsingError}
                          </div>
                          
                          {/* Diagnostic Info Panel */}
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-right space-y-3 text-xs" dir="rtl">
                            <span className="font-black text-slate-700 text-[11px] block border-b border-slate-200 pb-1.5">🔍 دليل تشخيص وحل مشكلات قراءة ملفات الـ PDF:</span>
                            
                            <div className="space-y-2.5 text-[10px] leading-relaxed text-slate-600">
                              <div>
                                <span className="font-extrabold text-rose-700 block">⚠️ حالة (فشل تحميل محرك الاستخراج):</span>
                                <p className="font-medium text-slate-500 mt-0.5">يعني أن المنصة تواجه مشكلة تقنية في الاتصال بالخوادم (CDN) التي تحلل ملفات الـ PDF. هذا خلل برمجي أو شبكي مؤقت من طرف الاتصال بالخوادم البعيدة.</p>
                                <span className="text-[9px] font-bold text-indigo-600 block mt-0.5">💡 الحل الموصى به: يرجى نسخ ولصق النصوص مباشرة في حقل مسودة النص بدلاً من رفع الملف، أو المحاولة مرة أخرى لاحقاً عند تحسن جودة الاتصال بالإنترنت.</span>
                              </div>
                              
                              <div className="border-t border-slate-200 pt-2">
                                <span className="font-extrabold text-rose-700 block">⚠️ حالة (الملف ممسوح ضوئياً / Scanned):</span>
                                <p className="font-medium text-slate-500 mt-0.5">يعني أن ملف الـ PDF الذي قمت برفعه هو عبارة عن "صور" للصفحات (Scanned) وليس نصوصاً رقمية يمكن للكمبيوتر تظليلها وقراءتها. الذكاء الاصطناعي لا يرى الحروف في هذا الملف، بل يرى مجرد صورة مصمتة.</p>
                                <span className="text-[9px] font-bold text-indigo-600 block mt-0.5">💡 الحل الموصى به: يرجى فتح الملف على جهازك، وتصوير أو نسخ النصوص يدوياً ووضعها في خانة مسودة نصوص الاختبار، أو توفير نسخة ملف رقمية (Digital Text) قابلة للنسخ والتظليل.</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Success / Uploaded Info */}
                      {uploadedFileName && (
                        <div className="flex items-center justify-between gap-2.5 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-[10px] font-bold">
                          <div className="flex items-center gap-2 text-emerald-800 font-black">
                            <span>📄 تم استخراج نصوص:</span>
                            <span className="underline font-mono" dir="ltr">{uploadedFileName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFileName('');
                              setSourceValue('');
                              setFileParsingError(null);
                            }}
                            className="text-rose-600 hover:text-rose-800 font-black text-[9px] px-2 py-1 rounded-md bg-white border border-rose-150 transition-all hover:bg-rose-50 cursor-pointer"
                          >
                            تفريغ وإلغاء 🗑️
                          </button>
                        </div>
                      )}

                      {/* Source Text Preview/Modification Area */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-indigo-950 block text-right">
                            النص المرجعي المستخلص (يمكنك تحريره وتعديله لضبط الجيل):
                          </label>
                          {sourceValue && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 font-mono px-2 py-0.5 rounded-md border border-indigo-100">
                              {sourceValue.length} حرف
                            </span>
                          )}
                        </div>
                        <textarea
                          required
                          rows={6}
                          placeholder="ألصق المادة الدراسية، أسئلة امتحانات سابقة، أو نصوص التوجيهات يدوياً هنا، أو استفد من ميزة تحميل الـ PDF والملفات أعلاه لاستخراجها فوراً..."
                          value={sourceValue}
                          onChange={(e) => setSourceValue(e.target.value)}
                          className="w-full text-xs font-semibold p-3.5 border border-indigo-200 rounded-xl focus:border-indigo-600 bg-white leading-relaxed text-right"
                        />
                      </div>
                    </div>
                  )}

                  {sourceType === 'library' && (
                    <div className="mt-4 space-y-3 text-right" dir="rtl">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-100/30 pb-2">
                        <label className="text-[11px] font-black text-indigo-950 block">
                          اختر مرجعاً دراسياً من 'المكتبة التعليمية' *
                        </label>
                        <button
                          type="button"
                          onClick={() => setFilterLibraryByExamDetails(!filterLibraryByExamDetails)}
                          className={`px-2 py-1 rounded text-[9px] font-black cursor-pointer transition-all border ${
                            filterLibraryByExamDetails 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          {filterLibraryByExamDetails 
                            ? `تصفية بالمطابقة: ${examSubject} / ${examGrade} 🟢` 
                            : 'عرض كافة المراجع (بدون تصفية) 🌐'}
                        </button>
                      </div>

                      {loadingLibrary ? (
                        <div className="py-6 text-center flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl border border-indigo-100">
                          <Loader2 className="animate-spin text-indigo-600" size={18} />
                          <span className="text-[10px] font-black text-slate-500">جاري تحميل مراجع المكتبة...</span>
                        </div>
                      ) : filteredLibraryResources.length === 0 ? (
                        <div className="p-4 text-center bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                          <p className="text-[10px] text-amber-800 font-bold leading-normal">
                            لم نجد مراجع في المكتبة {filterLibraryByExamDetails ? `تطابق مادة "${examSubject}" أو الصف "${examGrade}"` : ''}.
                          </p>
                          <div className="flex gap-1.5 justify-center">
                            {filterLibraryByExamDetails && (
                              <button
                                type="button"
                                onClick={() => setFilterLibraryByExamDetails(false)}
                                className="px-2.5 py-1 bg-white border border-amber-200 text-amber-900 rounded-lg text-[9px] font-black hover:bg-amber-50 cursor-pointer"
                              >
                                عرض كافة المراجع المتاحة
                              </button>
                            )}
                            <span className="text-[9px] text-slate-500 font-bold p-1">أو يمكنك رفع ملفات/روابط في "المكتبة التعليمية" أولاً.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <select
                            value={selectedResourceId}
                            onChange={(e) => {
                              const resId = e.target.value;
                              setSelectedResourceId(resId);
                              const found = libraryResources.find(r => r.id === resId);
                              if (found) {
                                setSourceValue(found.content || found.url || '');
                              } else {
                                setSourceValue('');
                              }
                            }}
                            className="w-full text-xs font-bold px-3 py-2.5 border border-indigo-200 rounded-xl focus:border-indigo-600 bg-white cursor-pointer text-slate-800"
                          >
                            <option value="">-- اختر المصدر من المكتبة التعليمية --</option>
                            {filteredLibraryResources.map(res => (
                              <option key={res.id} value={res.id}>
                                {res.title} [{res.subject} | {res.grade}] ({res.type === 'pdf' ? 'ملف PDF 📄' : res.type === 'link' ? 'رابط 🌐' : 'نص مباشر 📝'})
                              </option>
                            ))}
                          </select>

                          {sourceValue && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-indigo-950 block">
                                  محتوى ونصوص المرجع النشط المختار (يمكن تعديله لضبط التوليد الذكي لتطابق منهج المعارف):
                                </span>
                                <span className="text-[9px] bg-indigo-50 text-indigo-700 font-mono px-2 py-0.5 rounded-md border border-indigo-100">
                                  {sourceValue.length} حرف
                                </span>
                              </div>
                              <textarea
                                rows={5}
                                value={sourceValue}
                                onChange={(e) => setSourceValue(e.target.value)}
                                placeholder="محتوى المرجع المختار..."
                                className="w-full text-xs font-semibold p-3 border border-indigo-200 rounded-xl focus:border-indigo-600 bg-white leading-relaxed text-right text-slate-800"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1 md:col-span-12 lg:col-span-5 mt-1">
                  <label className="text-xs font-black text-slate-750 block">موضوع أو فكرة الاختبار التفصيلية *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="مثال: قانون أوم وتيار الفولت والمقاومات، التفاعلات الكيميائية وموازنة النواتج لصف العاشر، أو حل المعادلات التربيعية بإيجاد قيمة الدستور والمميز بالتفصيل..."
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full text-xs font-semibold p-4 border border-slate-250 rounded-2xl focus:border-indigo-500 bg-white leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 font-bold mt-1">كلما قمت بكتابة مفردات ومصطلحات أكثر تفصيلاً، كلما نضجت صياغة وتنوع وجاذبية الأسئلة لطلابك.</p>
                </div>
              </div>

              {generatingWithAi ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 bg-white border border-dashed border-indigo-200 rounded-3xl animate-pulse">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <h4 className="text-xs font-black text-indigo-700">جاري صياغة الأسئلة وبناء البدائل وتنظيم المسودة...</h4>
                  <p className="text-[10px] text-slate-400 font-bold max-w-sm text-center leading-relaxed">
                    يستغرق المعالج الذكي عادةً من 5 لـ 15 ثانية لتصميم مسابقة إلكترونية متميزة تتماشى مع المناهج الرسمية لوزارة المعارف. يرجى الانتظار ثوانٍ...
                  </p>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-sans">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 via-indigo-750 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-650/10 hover:shadow-indigo-650/20 hover:scale-[1.01] flex items-center gap-2"
                  >
                    <span>⚡ توليد بنية الاختبار بالذكاء الاصطناعي</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* Traditional Manual Builder Form */
            <form onSubmit={handleCreateExamSubmit} className="space-y-6">
              {/* Main info properties */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-black text-slate-700">عنوان الاختبار الإلكتروني *</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: مراجعة الجبر العام والتحليل الرياضي"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">تصنيف الاختبار *</label>
                  <input 
                    type="text"
                    required
                    list="exam-categories-manual"
                    placeholder="قواعد، مفردات..."
                    value={examCategory}
                    onChange={(e) => setExamCategory(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white"
                  />
                  <datalist id="exam-categories-manual">
                    <option value="مراجعة عامة" />
                    <option value="قواعد" />
                    <option value="مفردات" />
                    <option value="مراجعة نهائية" />
                    <option value="اختبار شهري" />
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">الصف المستهدف</label>
                  <select
                    value={examGrade}
                    onChange={(e) => setExamGrade(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white"
                  >
                    {grades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">المادة الدراسية</label>
                  <select
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white"
                  >
                    {subjectsList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-5 mt-2">
                  <label className="text-xs font-black text-slate-700">ملاحظات أو تعليمات إضافية للطلاب (اختياري)</label>
                  <input 
                    type="text"
                    placeholder="مثال: يرجى التركيز في مراجعة المفاهيم وحل المسابقة دون استخدام الآلة الحاسبة بقوة."
                    value={examDescription}
                    onChange={(e) => setExamDescription(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>


          {/* Questions Container Block */}
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-xs font-black text-slate-800">أسئلة الاختبار الخيار من متعدد 🎚️</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCsvExporterData({ questions, title: examTitle || 'اختبار_ذكي' });
                    setShowCsvExporter(true);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-black cursor-pointer transition-all border border-emerald-100 flex items-center gap-1.5"
                >
                  <FileText size={12} />
                  <span>تصدير كـ CSV متوافق مع جوجل 📄</span>
                </button>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-150 text-indigo-700 rounded-xl text-[11px] font-black cursor-pointer transition-all border border-indigo-100 flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>إضافة سؤال جديد</span>
                </button>
              </div>
            </div>

            {questions.map((q, qIdx) => (
              <div 
                key={q.id} 
                className="bg-white border border-slate-250 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden"
              >
                {/* Header question card info */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-indigo-600 flex items-center gap-1">
                    <Hash size={13} />
                    <span>السؤال رقم {qIdx + 1}</span>
                  </span>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="text-[10px] font-black text-rose-500 hover:text-rose-705 cursor-pointer flex items-center gap-0.5 hover:bg-rose-50 px-2 py-1 rounded-md"
                    >
                      <Trash size={11} />
                      <span>حذف السؤال</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">نص السؤال الأكاديمي</label>
                  <textarea
                    required
                    placeholder="اكتب السؤال هنا..."
                    rows={2}
                    value={q.text}
                    onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white"
                  />
                </div>

                {/* Grid for multiple options (A, B, C, D) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIdx) => (
                    <div 
                      key={optIdx} 
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        q.correctOptionIndex === optIdx 
                          ? 'border-emerald-300 bg-emerald-500/5' 
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1">
                        <span className="text-[10px] font-black text-slate-400 w-5 h-5 rounded-full bg-white border border-slate-250 flex items-center justify-center shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <input 
                          type="text"
                          required
                          placeholder={`الخيار رقم ${optIdx + 1}`}
                          value={opt}
                          onChange={(e) => updateQuestionOption(qIdx, optIdx, e.target.value)}
                          className="w-full text-xs font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 py-0.5 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => updateQuestionCorrectIndex(qIdx, optIdx)}
                        className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg transition-all cursor-pointer border ${
                          q.correctOptionIndex === optIdx
                            ? 'bg-emerald-600 text-white border-emerald-505'
                            : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {q.correctOptionIndex === optIdx ? '✔️ خيار صحيح' : 'تحديد كإجابة صحيحة'}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-500 block">💡 التفسير العلمي والتعليمي للإجابة النموذجية (متوافق مع أدوات جوجل)</label>
                  <input
                    type="text"
                    placeholder="اكتب هنا التفسير والخطوات العلمية التفصيلية لحل هذا السؤال ليتعلم منها الطلاب..."
                    value={q.scientificExplanation || ''}
                    onChange={(e) => {
                      setQuestions(prev => prev.map((item, i) => 
                        i === qIdx ? { ...item, scientificExplanation: e.target.value } : item
                      ));
                    }}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-right">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl cursor-pointer"
            >
              إلغاء وتراجع
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1"
            >
              <Check size={14} />
              <span>حفظ ونشر الاختبار الآن 🚀</span>
            </button>
          </div>
        </form>
          )}
        </div>
      )}

      {!loading && activeTab === 'results' && (
        <div dir="rtl" className="space-y-4">
          
          {/* Filters card */}
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <input 
                type="text"
                placeholder="🔍 بحث باسم الطالب أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white"
              />
            </div>
            
            <div className="w-full md:w-1/4">
              <select
                value={selectedExamFilter}
                onChange={(e) => setSelectedExamFilter(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white cursor-pointer"
              >
                <option value="all">كل الاختبارات</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-1/4">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 bg-white cursor-pointer"
              >
                <option value="all">كل التصنيفات (جميع الفئات)</option>
                {Array.from(new Set(submissions.map(sub => sub.category).filter(Boolean))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 border border-slate-100 rounded-3xl bg-slate-50/20">
              <div className="w-12 h-12 bg-slate-105 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Award size={24} />
              </div>
              <h4 className="text-sm font-black text-slate-600 mt-3">لا توجد نتائج مطابقة</h4>
              <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto mt-1 leading-normal">
                عندما يقوم الطلاب بملء البيانات وحل الاختبارات، ستظهر درجاتهم وإجاباتهم التفصيلية في هذا الجدول فورياً.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-150 select-none">
                    <tr>
                      <th className="p-3.5 pr-5">اسم الطالب</th>
                      <th className="p-3.5">رقم الهاتف</th>
                      <th className="p-3.5">اسم الاختبار</th>
                      <th className="p-3.5">تصنيف الاختبار</th>
                      <th className="p-3.5 text-center">النتيجة</th>
                      <th className="p-3.5">تاريخ التقديم</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {filteredSubmissions.map((sub) => {
                      const percentage = Math.round((sub.correctCount / sub.answersCount) * 100) || 0;
                      // Calculate grading style
                      let badgeStyle = "bg-rose-50 text-rose-700 border-rose-100";
                      if (percentage >= 85) badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                      else if (percentage >= 60) badgeStyle = "bg-amber-50 text-amber-700 border-amber-100";

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3.5 pr-5 font-black text-slate-900 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-650 flex items-center justify-center">
                              <User size={12} />
                            </span>
                            <span>{sub.studentName}</span>
                          </td>
                          <td className="p-3.5 text-slate-500 font-mono text-[11px] select-all">
                            <span className="flex items-center gap-1">
                              <Phone size={10} className="text-slate-450" />
                              <span>{sub.studentPhone}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-700 max-w-[200px] truncate" title={sub.examTitle}>
                            {sub.examTitle}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {sub.category || "مراجعة عامة"}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-black ${badgeStyle}`}>
                              {sub.correctCount} / {sub.answersCount} ({percentage}%)
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono text-[10px]">
                            {new Date(sub.submittedAt).toLocaleString('ar-EG', {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleOpenSubmissionDetail(sub)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg cursor-pointer transition-all border border-indigo-150"
                            >
                              عرض الإجابات بالكامل 🔍
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Answer evaluation modal details */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-2xl w-full text-right" dir="rtl">
            
            {/* Modal header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-black px-2.5 py-0.5 rounded-full">
                  تفاصيل إجابة الطالب
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1.5 flex items-center gap-1.5">
                  <User size={15} />
                  <span>{selectedSubmission.studentName} - {selectedSubmission.studentPhone}</span>
                </h3>
              </div>
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal content */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
              
              {/* Submission Score Summary */}
              <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200 flex justify-between items-center">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">الاختبار الإلكتروني المقدم</span>
                  <span className="text-xs font-black text-slate-800 block">{selectedSubmission.examTitle}</span>
                </div>

                <div className="text-center bg-white p-2.5 px-4 rounded-xl border border-slate-200/40">
                  <span className="text-[10px] text-slate-400 font-bold block">مجموع الدرجة المحصلة</span>
                  <span className="text-base font-black text-slate-900">
                    {selectedSubmission?.correctCount} / {selectedSubmission?.answersCount}
                  </span>
                  <span className="text-[10px] text-emerald-600 block font-bold mt-0.5">
                    ({Math.round((selectedSubmission?.correctCount / selectedSubmission?.answersCount) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Questions list with student answers verified */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-700 border-b border-indigo-50 pb-1.5">تحليل الإجابات والتحقق الأكاديمي:</h4>
                
                {assocExam ? (
                  assocExam.questions.map((q, idx) => {
                    const studentAnswerIdx = selectedSubmission.answers[idx];
                    const isCorrect = studentAnswerIdx === q.correctOptionIndex;

                    return (
                      <div key={q.id} className="border border-slate-200 p-4 rounded-2xl bg-slate-50/30 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <h5 className="text-xs font-black text-slate-900" style={{ unicodeBidi: 'plaintext' }}>
                            <span className="text-slate-400 inline-block ml-1">س {idx + 1}:</span>
                            <MathJaxSection as="span" className="inline">{q.text}</MathJaxSection>
                          </h5>

                          {isCorrect ? (
                            <span className="text-emerald-600 flex items-center gap-1 text-[11px] font-black bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded-full shrink-0 select-none">
                              <CheckCircle2 size={12} />
                              <span>إجابة صحيحة (+1)</span>
                            </span>
                          ) : (
                            <span className="text-rose-600 flex items-center gap-1 text-[11px] font-black bg-rose-50 px-2 py-0.5 border border-rose-100 rounded-full shrink-0 select-none">
                              <XCircle size={12} />
                              <span>إجابة خاطئة (0)</span>
                            </span>
                          )}
                        </div>

                        {/* Options verification list */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, optIdx) => {
                            const isPickedByStudent = optIdx === studentAnswerIdx;
                            const isTheRightAnswer = optIdx === q.correctOptionIndex;

                            let optStyle = "border-slate-150 bg-white text-slate-700";
                            let iconBadge = null;

                            if (isTheRightAnswer) {
                              optStyle = "border-emerald-300 bg-emerald-500/5 text-emerald-800 font-extrabold";
                              iconBadge = <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black select-none">الإجابة النموذجية ✔️</span>;
                            } else if (isPickedByStudent && !isCorrect) {
                              optStyle = "border-rose-300 bg-rose-500/5 text-rose-800";
                              iconBadge = <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black select-none">إجابة الطالب ❌</span>;
                            }

                            return (
                              <div 
                                key={optIdx} 
                                className={`p-2.5 px-3 rounded-xl border text-[11px] flex justify-between items-center transition-colors ${optStyle}`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-slate-400 w-4 h-4 rounded-full bg-slate-100/80 border border-slate-200 flex items-center justify-center shrink-0">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <MathJaxSection as="span" className="inline">{opt}</MathJaxSection>
                                </span>
                                {iconBadge}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs font-bold bg-slate-150/40 rounded-xl">
                    ⚠️ لم نتمكن من العثور على الأسئلة الأصلية لهذا الاختبار (ربما قام المعلم بحذف تصميم الاختبار الرئيسي أو تعديله).
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100/80 flex justify-end bg-slate-50 rounded-b-3xl">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-5 py-2 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CSV Exporter Modal */}
      {showCsvExporter && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-2xl w-full text-right" dir="rtl">
            
            {/* Modal header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-black px-2.5 py-0.5 rounded-full">
                  تصدير CSV متوافق مع أدوات جوجل
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1.5 flex items-center gap-1.5">
                  <Database size={15} className="text-indigo-600" />
                  <span>تصدير الاختبار: {csvExporterData.title}</span>
                </h3>
              </div>
              <button 
                onClick={() => setShowCsvExporter(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal content */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-bold">
                تم تهيئة هذا الجدول وتنسيق معادلته بالكامل باستخدام رموز <span className="text-indigo-600 font-black">Unicode</span> القياسية (مثل: H₂O, O², ΔH) بدلاً من LaTeX لضمان التوافق التام والمباشر عند الرفع على منتجات جوجل (مثل Google Sheets أو Google Forms).
              </p>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400">كود CSV النقي (بدون أي نصوص إضافية):</span>
                  <button
                    onClick={() => {
                      const csvString = generateCsvString(csvExporterData.questions);
                      navigator.clipboard.writeText(csvString).then(() => {
                        alert("📋 تم نسخ كود الـ CSV النقي بنجاح! يمكنك لصقه مباشرة.");
                      });
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={11} />
                    <span>نسخ الكود بالكامل</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={generateCsvString(csvExporterData.questions)}
                  className="w-full font-mono text-[11px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200/50 p-3.5 rounded-2xl">
                <span className="text-[10.5px] font-black text-amber-800 block">💡 تلميح للاستخدام:</span>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed mt-1">
                  الجدول يحتوي على الأعمدة التالية بالترتيب: (السؤال، الخيار_أ، الخيار_ب، الخيار_ج، الخيار_د، الإجابة_الصحيحة، التفسير_العلمي). يمكنك نسخ الكود مباشرة أو تنزيله كملف بامتداد .csv جاهز بالزر أدناه.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100/80 flex justify-between bg-slate-50 rounded-b-3xl">
              <button
                onClick={() => {
                  const csvString = generateCsvString(csvExporterData.questions);
                  const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement("a");
                  const url = URL.createObjectURL(blob);
                  link.setAttribute("href", url);
                  link.setAttribute("download", `${csvExporterData.title || 'test'}_questions.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Upload size={13} className="rotate-180" />
                <span>تحميل ملف CSV جاهز 📥</span>
              </button>

              <button
                onClick={() => setShowCsvExporter(false)}
                className="px-5 py-2.5 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
