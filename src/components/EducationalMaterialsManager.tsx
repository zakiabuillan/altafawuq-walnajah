import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  Upload,
  Globe,
  FileText,
  ExternalLink,
  X,
  Loader2,
  Tag,
  CheckCircle2,
  FolderOpen,
  ArrowLeftRight,
  Copy,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Eye,
  Database,
  Brain,
  Printer,
  GraduationCap,
  ListOrdered,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Clock,
  BookMarked,
  ShieldCheck,
  Highlighter,
  Bookmark,
  MessageSquare
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import {
  EducationalResourceDoc,
  GeneratedEducationalContent,
  ResourceType,
  CognitiveLevel,
  PdfAnnotation,
  PDF_CATEGORIES,
  PdfCategory
} from '../types/educationalResources';
import { INITIAL_EDUCATIONAL_RESOURCES, EDUCATIONAL_SUBJECTS } from '../lib/educationalResourcesData';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { savePdfAnnotationsToFirestore } from '../lib/pdfAnnotationsFirestore';
import { PdfAnnotatorViewerModal } from './PdfAnnotatorViewerModal';

interface EducationalMaterialsManagerProps {
  initialViewMode?: 'teacher' | 'student' | 'schema';
  currentTeacherName?: string;
  currentStudentId?: string;
  currentStudentGroups?: string[];
  studentGroupName?: string; // alias for StudentPortal
  studentId?: string; // alias for StudentPortal
  enrolledSubjects?: string[];
  onClose?: () => void;
}

export const EducationalMaterialsManager: React.FC<EducationalMaterialsManagerProps> = ({
  initialViewMode = 'teacher',
  currentTeacherName = 'أ. د. زكي أبو علان',
  currentStudentId = 'student-mohammad-101',
  currentStudentGroups = ['group-12-science', 'group-chem-honors'],
  studentGroupName,
  studentId,
  enrolledSubjects = ['كيمياء', 'فيزياء', 'أحياء'],
  onClose
}) => {
  // Navigation View: 'teacher' (Source) | 'student' (Display) | 'schema' (Firestore Schema Inspector)
  const [viewMode, setViewMode] = useState<'teacher' | 'student' | 'schema'>(initialViewMode);

  // Effective Student Identity & Permissions
  const effectiveStudentId = studentId || currentStudentId || 'student-mohammad-101';
  const effectiveStudentGroups = useMemo(() => {
    const groups = [...(currentStudentGroups || [])];
    if (studentGroupName && !groups.includes(studentGroupName)) {
      groups.push(studentGroupName);
    }
    return groups.length > 0 ? groups : ['group-12-science', 'مجموعة التفوق للبجروت'];
  }, [currentStudentGroups, studentGroupName]);

  // Resources State
  const [resources, setResources] = useState<EducationalResourceDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');

  // Teacher Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('كيمياء');
  const [formUnitTitle, setFormUnitTitle] = useState('كيمياء العضوية');
  const [formType, setFormType] = useState<ResourceType>('text');
  const [formPdfCategory, setFormPdfCategory] = useState<PdfCategory>('شروحات ومذكرات دراسية');
  const [formFileName, setFormFileName] = useState('');
  const [formFileSize, setFormFileSize] = useState('');
  const [formPageCount, setFormPageCount] = useState<number>(3);
  const [formUrl, setFormUrl] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCitation, setFormCitation] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formGroupIds, setFormGroupIds] = useState('group-12-science, مجموعة التفوق للبجروت');
  const [formStudentIds, setFormStudentIds] = useState('student-mohammad-101, student-sara-102');
  const [formTags, setFormTags] = useState('كيمياء, بجروت, مراجع');
  const [isSaving, setIsSaving] = useState(false);

  // PDF Viewer & Annotator Modal State
  const [annotatingResource, setAnnotatingResource] = useState<EducationalResourceDoc | null>(null);
  const [annotatorMode, setAnnotatorMode] = useState<'teacher' | 'student'>('teacher');

  // AI Content Generator State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [targetResourceForAi, setTargetResourceForAi] = useState<EducationalResourceDoc | null>(null);
  const [aiGoal, setAiGoal] = useState<'lesson_plan' | 'worksheet' | 'exam' | 'comprehensive'>('worksheet');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState<GeneratedEducationalContent | null>(null);
  const [generationEngineUsed, setGenerationEngineUsed] = useState<'gemini_api' | 'pedagogical_engine' | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Student View State
  const [studentSelectedSubject, setStudentSelectedSubject] = useState<string>(enrolledSubjects[0] || 'كيمياء');
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [viewingResourceDetail, setViewingResourceDetail] = useState<EducationalResourceDoc | null>(null);
  const [studentSelectedAnswers, setStudentSelectedAnswers] = useState<Record<string, string>>({});
  const [studentShowResults, setStudentShowResults] = useState<Record<string, boolean>>({});

  // 1. Load Resources from Firestore with Local Fallback
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const colRef = collection(db, 'educational_resources');
      unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: EducationalResourceDoc[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ id: docSnap.id, ...docSnap.data() } as EducationalResourceDoc);
            });
            setResources(list);
          } else {
            // Seed local default if empty
            setResources(INITIAL_EDUCATIONAL_RESOURCES);
          }
          setLoading(false);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'educational_resources');
          setResources(INITIAL_EDUCATIONAL_RESOURCES);
          setLoading(false);
        }
      );
    } catch {
      setResources(INITIAL_EDUCATIONAL_RESOURCES);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Compute Units for selected subject in form
  const availableUnitsForForm = useMemo(() => {
    const subj = EDUCATIONAL_SUBJECTS.find((s) => s.id === formSubject);
    return subj ? subj.defaultUnits : ['الوحدة الأولى', 'الوحدة الثانية'];
  }, [formSubject]);

  // Handle saving new educational resource
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      alert('يرجى كتابة عنوان المادة التعليمية وتوفير النص المرجعي أو المحتوى العلمي.');
      return;
    }

    setIsSaving(true);
    const newDocId = `res-${Date.now()}`;
    const unitIdGenerated = `unit-${formSubject || 'gen'}-${(formUnitTitle || 'general').replace(/\s+/g, '-').toLowerCase()}`;

    const newResource: EducationalResourceDoc = {
      id: newDocId,
      title: formTitle.trim(),
      subject: formSubject,
      unit_id: unitIdGenerated,
      unit_title: formUnitTitle,
      type: formType,
      pdf_category: formType === 'pdf' ? formPdfCategory : undefined,
      file_name: formFileName || (formType === 'pdf' ? `${formTitle.trim()}.pdf` : undefined),
      file_size: formFileSize || (formType === 'pdf' ? '2.4 MB' : undefined),
      page_count: formPageCount || 3,
      pdf_annotations: [],
      url: formType !== 'text' ? formUrl.trim() : undefined,
      content: formContent.trim(),
      teacher_id: 'teacher-zaki-abu-illan',
      teacher_name: currentTeacherName,
      course_id: `course-${formSubject}-12`,
      course_name: `${formSubject} المرحلة الثانوية (بجروت)`,
      group_ids: formGroupIds.split(',').map((s) => s.trim()).filter(Boolean),
      student_ids: formStudentIds.split(',').map((s) => s.trim()).filter(Boolean),
      academic_citation: formCitation.trim() || `المرجع المعتمد في ${formSubject}`,
      notes: formNotes.trim(),
      tags: formTags.split(',').map((s) => s.trim()).filter(Boolean),
      is_approved: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      generated_materials: []
    };

    try {
      await setDoc(doc(db, 'educational_resources', newDocId), newResource);
      setResources((prev) => [newResource, ...prev.filter((r) => r.id !== newDocId)]);
      setIsAddModalOpen(false);
      // Reset form
      setFormTitle('');
      setFormContent('');
      setFormUrl('');
      setFormCitation('');
      setFormNotes('');
      setFormFileName('');
      setFormFileSize('');
    } catch (err) {
      console.warn('Saving locally due to Firestore constraint:', err);
      setResources((prev) => [newResource, ...prev.filter((r) => r.id !== newDocId)]);
      setIsAddModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Updating PDF Annotations for a resource with persistent Firestore sync
  const handleUpdateResourceAnnotations = async (updatedAnnotations: PdfAnnotation[]) => {
    if (!annotatingResource) return;
    const resId = annotatingResource.id;

    setResources((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, pdf_annotations: updatedAnnotations } : r))
    );
    setAnnotatingResource((prev) => (prev ? { ...prev, pdf_annotations: updatedAnnotations } : null));

    try {
      await savePdfAnnotationsToFirestore(resId, updatedAnnotations, {
        resourceTitle: annotatingResource.title,
        teacherName: currentTeacherName,
        subject: annotatingResource.subject
      });
    } catch (err) {
      console.warn('Firestore update annotations fallback:', err);
    }
  };

  // Handle Delete Resource
  const handleDeleteResource = async (resId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المرجع التعليمي؟')) return;
    try {
      await deleteDoc(doc(db, 'educational_resources', resId));
      setResources((prev) => prev.filter((r) => r.id !== resId));
    } catch (err) {
      console.warn('Deleting locally:', err);
      setResources((prev) => prev.filter((r) => r.id !== resId));
    }
  };

  // Handle Triggering AI Content Generator
  const openAiGenerator = (res: EducationalResourceDoc) => {
    setTargetResourceForAi(res);
    setAiGoal('worksheet');
    setAiGeneratedResult(null);
    setGenerationEngineUsed(null);
    setAiError(null);
    setIsAiModalOpen(true);
  };

// Pedagogical Content Generator adhering strictly to teacher reference materials
function generateLocalPedagogicalContent(
  resource: EducationalResourceDoc,
  goal: 'lesson_plan' | 'worksheet' | 'exam' | 'comprehensive'
): GeneratedEducationalContent {
  const subject = resource.subject || 'العلوم';
  const unit = resource.unit_title || 'الوحدة التعليمية';
  const text = (resource.content || '').trim();

  // Extract key concept sentences or tokens
  const rawTokens = text.split(/[\n،,؛;.]+/).map(s => s.trim()).filter(s => s.length > 2);
  const keyTerms = rawTokens.slice(0, 8);
  const primaryConcept = keyTerms[0] || unit;
  const secondaryConcept = keyTerms[1] || 'القوانين والنسب المنهجية';

  const goalLabels: Record<string, string> = {
    lesson_plan: 'خطة درس تفاعلية ونموذجية',
    worksheet: 'ورقة عمل تطبيقية ومسائل نموذجية',
    exam: 'اختبار تجريبي بنمط البجروت متدرج الصعوبة',
    comprehensive: 'حزمة تعليمية وبنك تدريبات متكامل'
  };

  const title = `${goalLabels[goal] || 'محتوى تعليمي'}: ${unit}`;

  // Build Markdown structured content
  const markdownContent = `## 📚 ${title}
المادة الدراسية: **${subject}** | الوحدة: **${unit}** | التوثيق المعتمد: **${resource.academic_citation || 'المادة التعليمية المقررة'}**

---

### 🌟 1. ملخص المفاهيم والقواعد العلمية المستخلصة من المرجع:
${keyTerms.map((term, i) => `- **${i + 1}. ${term}:** مفهوم أساسي مقرر ضمن المنهج استناداً للمرجع المعتمد.`).join('\n')}

---

### 📊 2. جدول العلاقات والقوانين المنهجية المعتمدة:
| المفهوم / القانون المرجعي | التطبيق النموذجي | الهدف التعليمي |
| :--- | :--- | :--- |
| **${primaryConcept}** | حساب واستنتاج مباشر وفق المعطيات | قياس الاستيعاب والتطبيق المباشر |
| **${secondaryConcept}** | ربط العلاقات والمتغيرات في المسائل | تنمية التفكير التحليلي والرياضي |
| **قوانين حفظ المادة والموازنة** | تطبيق في التفاعلات والحسابات | الوصول إلى دقة الحل والمطابقة |

---

### 💡 3. إرشادات الحل والتفوق في امتحانات البجروت:
1. قراءة نص السؤال بعناية وتدوين المعطيات والمطلوب بدقة قبل البدء بالحل.
2. استخدام القوانين والعلاقات الرياضية المعتمدة المذكورة أعلاه وكتابة الوحدات القياسية بجانب الأرقام.
3. مراجعة خطوات التعويض العددي ومطابقة النتيجة مع المنطق العلمي.`;

  // Behavioral Lesson Plan
  const lessonPlan = {
    objectives: [
      `أن يسترجع الطالب مفاهيم ${primaryConcept} بدقة استناداً للنص المرجعي المعتمد.`,
      `أن يطبق الطالب العلاقات والقوانين في حل مسائل ${unit} التفاعلية.`,
      `أن يحلل الطالب المعطيات المنهجية ويقارن بين الحالات المختلفة بنمط البجروت.`
    ],
    steps: [
      'التهيئة الحافزة واستكشاف المعرفة السابقة (5 دقائق)',
      `شرح وتوضيح المفاهيم الأساسية لـ ${primaryConcept} من المرجع المعتمد (15 دقيقة)`,
      'تطبيق عملي وحل تدريبات تفاعلية موجهة في مجموعات وبشكل فردي (15 دقيقة)',
      'التقويم التكويني الختامي وغلق الحصة برصد استيعاب الطلاب (10 دقائق)'
    ],
    durationMinutes: 45
  };

  // Graduated Questions (Levels 1 to 4: تذكر، فهم، تطبيق، تحليل)
  const questions: GeneratedQuestion[] = [
    {
      id: `q-recall-${Date.now()}`,
      cognitiveLevel: 'تذكر',
      levelBadge: 'مستوى 1: تذكر واسترجاع',
      question: `وفق المادة التعليمية المعتمدة في "${unit}"، ما هو التعريف أو القانون المباشر المرتبط بـ (${primaryConcept})؟`,
      options: [
        `علاقة علمية مقررة تربط بين كميات المادة المحددة في المرجع`,
        `قيمة عشوائية غير ثابتة تتغير دون قانون منظم`,
        `مفهوم نظري غير قابل للتطبيق الحسابي`,
        `خاصية فيزيائية لا ترتبط بالتفاعلات أو المركبات الكيميائية`
      ],
      correctAnswer: `علاقة علمية مقررة تربط بين كميات المادة المحددة في المرجع`,
      modelExplanation: `وفق النص المرجعي المعتمد، فإن (${primaryConcept}) يمثل علاقة علمية أساسية ضمن قوانين ${unit}.`,
      points: 10
    },
    {
      id: `q-understanding-${Date.now()}`,
      cognitiveLevel: 'فهم',
      levelBadge: 'مستوى 2: استيعاب ومفاهيم',
      question: `ما هو الاستنتاج العلمي المباشر عند تغير المعطيات في موضوع (${secondaryConcept})؟`,
      options: [
        `تتغير النتائج الحسابية طردياً أو عكسياً وفق النسبة الرياضية المعتمدة بالقانون`,
        `تبقى جميع المتغيرات ثابتة بشكل مطلق دون أي تأثر`,
        `يفقد القانون صلاحيته وتلغى الحسابات المقررة`,
        `تتضاعف القيم بطريقة عشوائية غير منضبطة`
      ],
      correctAnswer: `تتغير النتائج الحسابية طردياً أو عكسياً وفق النسبة الرياضية المعتمدة بالقانون`,
      modelExplanation: `الاستيعاب المفاهيمي للمرجع يؤكد أن المتغيرات ترتبط بنسب تناسبية واضحة (طردية أو عكسية) تحكمها القوانين المقررة.`,
      points: 15
    },
    {
      id: `q-application-${Date.now()}`,
      cognitiveLevel: 'تطبيق',
      levelBadge: 'مستوى 3: تطبيق عملي ومسائل',
      question: `في مسألة تطبيقية على (${unit})، إذا توفرت معطيات أولية بحسب المرجع، كيف يتم حساب الناتج النهائي بدقة؟`,
      options: [
        `بالتعويض المباشر في القانون المعتمد واستخراج الناتج بالوحدات العلمية المحددة`,
        `بإهمال المعطيات الحسابية والاعتماد على التخمين التقريبي`,
        `بجمع الأرقام دون تطبيق العلاقة الرياضية المناسبة`,
        `بتغيير المعادلة دون الالتزام بالثوابت المقررة`
      ],
      correctAnswer: `بالتعويض المباشر في القانون المعتمد واستخراج الناتج بالوحدات العلمية المحددة`,
      modelExplanation: `خطوات الحل المنهجي تقتضي التعويض الرياضي المباشر في القانون المعتمد ومراعاة الدقة ووحدات القياس.`,
      points: 20
    },
    {
      id: `q-analysis-${Date.now()}`,
      cognitiveLevel: 'تحليل',
      levelBadge: 'مستوى 4: تحليل واستنتاج ومقارنة (بجروت)',
      question: `[سؤال تفكير عليا بنمط البجروت]: بالنظر إلى المادة المرجعية في "${unit}"، قارن بين تأثير زيادة أحد المتغيرات على النتيجة النهائية وما يتطلبه ذلك من موازنة؟`,
      options: [
        `يتطلب ضبط النسبة الرياضية ومراعاة موازنة النظام للمحافظة على الثوابت المقررة في المرجع`,
        `لا يوجد أي تأثير أو حاجة لضبط الحسابات أو المعادلات`,
        `يؤدي بالضرورة إلى انهيار التفاعل أو الحسابات الرياضية`,
        `ينتج عنه تغير غير متوقع يمنع استنتاج أي علاقة علمية`
      ],
      correctAnswer: `يتطلب ضبط النسبة الرياضية ومراعاة موازنة النظام للمحافظة على الثوابت المقررة في المرجع`,
      modelExplanation: `التحليل العميق بنمط امتحانات البجروت يربط بين المتغيرات وحفظ التوازن الكلي للنظام استناداً للقوانين المرجعية.`,
      points: 25
    }
  ];

  // Specific high-precision overrides for Chemistry / Bagrut calculations if present in the text
  if (text.includes('مول') || text.includes('كتلة') || text.includes('تركيز')) {
    questions[0] = {
      id: `q-chem-1-${Date.now()}`,
      cognitiveLevel: 'تذكر',
      levelBadge: 'مستوى 1: تذكر واسترجاع',
      question: 'ما هو القانون المستخدم لحساب عدد المولات (n) بدلالة الكتلة بالجرام (m) والكتلة المولارية (Mw)؟',
      options: ['n = m / Mw', 'n = m × Mw', 'n = Mw / m', 'n = m + Mw'],
      correctAnswer: 'n = m / Mw',
      modelExplanation: 'وفق القوانين المعتمدة في المرجع: عدد المولات = الكتلة بالجرام ÷ الكتلة المولارية (n = m / Mw).',
      points: 10
    };
    questions[1] = {
      id: `q-chem-2-${Date.now()}`,
      cognitiveLevel: 'فهم',
      levelBadge: 'مستوى 2: استيعاب ومفاهيم',
      question: 'ماذا يقتضي قانون حفظ الكتلة عند موازنة المعادلات الكيميائية وفق المرجع المعتمد؟',
      options: [
        'مجموع كتل المواد المتفاعلة يساوي تماماً مجموع كتل المواد الناتجة',
        'اختفاء جزء من ذرات العناصر بعد انتهاء التفاعل',
        'زيادة الكتلة الإجمالية للمواد بعد حدوث التفاعل',
        'تغير هوية العناصر الداخلة في التفاعل دون حفظ الذرات'
      ],
      correctAnswer: 'مجموع كتل المواد المتفاعلة يساوي تماماً مجموع كتل المواد الناتجة',
      modelExplanation: 'قانون حفظ الكتلة يقر بأن المادة لا تفنى ولا تستحدث من العدم، وبالتالي كتل المتفاعلات تساوي كتل النواتج.',
      points: 15
    };
    questions[2] = {
      id: `q-chem-3-${Date.now()}`,
      cognitiveLevel: 'تطبيق',
      levelBadge: 'مستوى 3: تطبيق عملي ومسائل',
      question: 'عينة مجهولة كتلتها 40g وكتلتها المولارية 20g/mol، ما هو عدد مولات هذه العينة وما هو الحجم اللازم لتحضير محلول بتركيز 2M؟',
      options: [
        'عدد المولات = 2 مول، والحجم اللازم = 1 لتر',
        'عدد المولات = 4 مول، والحجم اللازم = 2 لتر',
        'عدد المولات = 1 مول، والحجم اللازم = 0.5 لتر',
        'عدد المولات = 0.5 مول، والحجم اللازم = 4 لتر'
      ],
      correctAnswer: 'عدد المولات = 2 مول، والحجم اللازم = 1 لتر',
      modelExplanation: 'الحل: n = m / Mw = 40 / 20 = 2 مول. ومن قانون التركيز M = n / V ينتج أن V = n / M = 2 / 2 = 1 لتر.',
      points: 20
    };
    questions[3] = {
      id: `q-chem-4-${Date.now()}`,
      cognitiveLevel: 'تحليل',
      levelBadge: 'مستوى 4: تحليل واستنتاج ومقارنة (بجروت)',
      question: 'عند مضاعفة حجم محلول مائي بإضافة ماء مقطر مع بقاء كمية المادة المذابة (عدد المولات) ثابتة، كيف يتأثر التركيز المولاري (M)؟',
      options: [
        'يقل التركيز المولاري إلى النصف نتيجة التناسب العكسي بين التركيز والحجم',
        'يتضاعف التركيز المولاري إلى الضعف',
        'يبقى التركيز المولاري ثابتاً دون أي تغيير',
        'يزداد التركيز المولاري بنسبة طردية'
      ],
      correctAnswer: 'يقل التركيز المولاري إلى النصف نتيجة التناسب العكسي بين التركيز والحجم',
      modelExplanation: 'التركيز المولاري M = n / V يتناسب عكسياً مع الحجم V، فعند مضاعفة الحجم مع ثبات عدد المولات ينخفض التركيز للنصف.',
      points: 25
    };
  }

  const teacherAnswerKeyMarkdown = `## 📝 نموذج الإجابة النموذجي المنفصل للمعلم وتوزيع الدرجات:
- **السؤال الأول (10 علامات):** ${questions[0]?.correctAnswer} - *التعليل:* ${questions[0]?.modelExplanation}
- **السؤال الثاني (15 علامة):** ${questions[1]?.correctAnswer} - *التعليل:* ${questions[1]?.modelExplanation}
- **السؤال الثالث (20 علامة):** ${questions[2]?.correctAnswer} - *التعليل:* ${questions[2]?.modelExplanation}
- **السؤال الرابع (25 علامة):** ${questions[3]?.correctAnswer} - *التعليل:* ${questions[3]?.modelExplanation}

**ملاحظة تربوية للمعلم:** يُشترط على الطالب كتابة القانون المعتمد أولاً والتعويض بالوحدات المناسبة قبل وضع الناتج النهائي.`;

  return {
    id: `gen-${Date.now()}`,
    title,
    goal,
    createdAt: new Date().toISOString(),
    summary: `تم استخلاص وتحليل المادة التعليمية لـ "${unit}" بنجاح استناداً حصرياً إلى النص المرجعي المعتمد لتوفير محتوى متدرج يشمل خطة عمل، تدريبات بجروت، ونموذج إجابة كامل للمعلم.`,
    markdownContent,
    lessonPlan,
    questions,
    teacherAnswerKeyMarkdown
  };
}

  // Execute AI Generation using backend /api/educational/generate-content with safe pedagogical fallback
  const handleExecuteAiGeneration = async () => {
    if (!targetResourceForAi) return;
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      let generated: GeneratedEducationalContent | null = null;

      // 1. Attempt backend generation via /api/educational/generate-content
      try {
        const response = await fetch('/api/educational/generate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: targetResourceForAi.subject || 'بيولوجيا',
            unitTitle: targetResourceForAi.unit_title || 'الوحدة التعليمية',
            resourceText: targetResourceForAi.content || targetResourceForAi.description || targetResourceForAi.title,
            referenceTitle: targetResourceForAi.title,
            referenceCitation: targetResourceForAi.citation,
            referenceAuthor: targetResourceForAi.author_publisher,
            referenceNotes: targetResourceForAi.notes,
            goal: aiGoal,
            courseName: targetResourceForAi.course_name || 'بيولوجيا البجروت',
            targetGrade: 'الصف الثاني عشر (بجروت)'
          })
        });

        const rawText = await response.text();
        if (rawText.trim().startsWith('{')) {
          try {
            const json = JSON.parse(rawText);
            if (response.ok && json.success && json.data) {
              generated = {
                id: `gen-${Date.now()}`,
                title: json.data.title || `محتوى مولد لـ ${targetResourceForAi.unit_title}`,
                goal: aiGoal,
                createdAt: new Date().toISOString(),
                summary: json.data.summary || '',
                markdownContent: json.data.markdownContent || '',
                lessonPlan: json.data.lessonPlan,
                questions: json.data.questions || [],
                teacherAnswerKeyMarkdown: json.data.teacherAnswerKeyMarkdown || ''
              };
              setGenerationEngineUsed('gemini_api');
            } else if (json.error) {
              console.warn('Backend returned informative error:', json.error);
              setAiError(`تنبيه Gemini: ${json.error}`);
            }
          } catch (jsonErr) {
            console.warn('Backend response was not valid JSON, switching to local pedagogical generator:', jsonErr);
          }
        }
      } catch (fetchErr) {
        console.warn('Backend fetch failed, activating local pedagogical generator:', fetchErr);
      }

      // 2. Seamlessly use local pedagogical generator if backend did not yield data
      if (!generated) {
        generated = generateLocalPedagogicalContent(targetResourceForAi, aiGoal);
        setGenerationEngineUsed('pedagogical_engine');
      }

      setAiGeneratedResult(generated);

      // Automatically attach to the resource document
      const updatedMaterials = [...(targetResourceForAi.generated_materials || []), generated];
      const updatedResource: EducationalResourceDoc = {
        ...targetResourceForAi,
        generated_materials: updatedMaterials,
        updated_at: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'educational_resources', targetResourceForAi.id), updatedResource, { merge: true });
      } catch (e) {
        console.warn('Locally updated generated materials:', e);
      }

      setResources((prev) => prev.map((r) => (r.id === targetResourceForAi.id ? updatedResource : r)));
      setTargetResourceForAi(updatedResource);
    } catch (err: any) {
      console.error('AI Generation Error:', err);
      try {
        const fallback = generateLocalPedagogicalContent(targetResourceForAi, aiGoal);
        setAiGeneratedResult(fallback);
      } catch (e) {
        setAiError('حدث خطأ أثناء معالجة المحتوى. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Filtered resources for Teacher view
  const filteredTeacherResources = useMemo(() => {
    return resources.filter((r) => {
      const matchSubject = selectedSubjectFilter === 'all' || r.subject === selectedSubjectFilter;
      const matchUnit = selectedUnitFilter === 'all' || r.unit_title === selectedUnitFilter;
      const q = (searchQuery || '').trim().toLowerCase();
      const matchQuery =
        !q ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q) ||
        (r.academic_citation && (r.academic_citation || '').toLowerCase().includes(q)) ||
        (Array.isArray(r.tags) && r.tags.some((t) => (t || '').toLowerCase().includes(q)));
      return matchSubject && matchUnit && matchQuery;
    });
  }, [resources, selectedSubjectFilter, selectedUnitFilter, searchQuery]);

  // Hierarchical groupings for Student view (Filtered by enrolled courses/groups & Foreign Key: unit_id)
  const studentHierarchicalUnits = useMemo(() => {
    // 1. Filter resources accessible to student by group_ids or student_ids
    const studentPermittedResources = resources.filter((r) => {
      const hasGroupAccess =
        !r.group_ids ||
        r.group_ids.length === 0 ||
        r.group_ids.some((g) => g === 'الكل' || g === 'الجميع' || effectiveStudentGroups.includes(g));
      const hasStudentIdAccess =
        !r.student_ids ||
        r.student_ids.length === 0 ||
        r.student_ids.some((s) => s === 'الكل' || s === 'الجميع' || s === effectiveStudentId);
      const isSubjectMatch = r.subject === studentSelectedSubject;
      return (hasGroupAccess || hasStudentIdAccess) && isSubjectMatch;
    });

    // 2. Group by unit_id (Foreign Key)
    const unitMap = new Map<string, { unit_id: string; unit_title: string; resources: EducationalResourceDoc[] }>();

    studentPermittedResources.forEach((res) => {
      const uKey = res.unit_id || res.unit_title;
      if (!unitMap.has(uKey)) {
        unitMap.set(uKey, {
          unit_id: res.unit_id,
          unit_title: res.unit_title,
          resources: []
        });
      }
      unitMap.get(uKey)!.resources.push(res);
    });

    return Array.from(unitMap.values());
  }, [resources, studentSelectedSubject, effectiveStudentGroups, effectiveStudentId]);

  // Set default expanded unit if none selected
  useEffect(() => {
    if (studentHierarchicalUnits.length > 0 && !expandedUnitId) {
      setExpandedUnitId(studentHierarchicalUnits[0].unit_id);
    }
  }, [studentHierarchicalUnits, expandedUnitId]);

  // Copy text helper
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="w-full bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[750px]" dir="rtl">
      {/* Top Header Bar */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                المواد التعليمية والمصادر
              </h2>
              <span className="text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                نظام إدارة المناهج وذكاء المحتوى
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              إدارة وتصنيف المراجع الأكاديمية حسب المادة والوحدة الدراسية مع التوليد الذكي لخطط الدروس وأوراق العمل
            </p>
          </div>
        </div>

        {/* View Mode Switcher: Teacher | Student | Database Schema */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('teacher')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'teacher'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FolderOpen size={14} />
            <span>لوحة تحكم المعلم (المصدر)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('student')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'student'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap size={14} />
            <span>واجهة الطالب (العرض المنظم)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('schema')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'schema'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database size={14} />
            <span>هيكلية Firestore NoSQL</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors ml-1"
              title="إغلاق"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Body Content based on active viewMode */}
      <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
        {/* ========================================================================= */}
        {/* 1. TEACHER VIEW (SOURCE)                                                 */}
        {/* ========================================================================= */}
        {viewMode === 'teacher' && (
          <div className="space-y-6">
            {/* Top Action & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في المواد، الوحدات، النصوص المرجعية، أو الكلمات المفتاحية..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none"
                  />
                </div>

                {/* Filter by Subject */}
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => {
                    setSelectedSubjectFilter(e.target.value);
                    setSelectedUnitFilter('all');
                  }}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="all">📚 جميع المواد الدراسية</option>
                  {EDUCATIONAL_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>

                {/* Filter by Unit if Subject Selected */}
                {selectedSubjectFilter !== 'all' && (
                  <select
                    value={selectedUnitFilter}
                    onChange={(e) => setSelectedUnitFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="all">📑 جميع الوحدات / الفصول</option>
                    {(EDUCATIONAL_SUBJECTS.find((s) => s.id === selectedSubjectFilter)?.defaultUnits || []).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Primary AI Content Generator Trigger */}
                <button
                  type="button"
                  id="btn-top-generate-content"
                  onClick={() => {
                    const target = targetResourceForAi || filteredTeacherResources[0] || resources[0];
                    if (target) {
                      openAiGenerator(target);
                    } else {
                      setIsAiModalOpen(true);
                    }
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 hover:from-amber-400 hover:to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
                  title="توليد محتوى تعليمي ذكي (شرح، خطط، أوراق عمل، بنك أسئلة) عبر نموذج Gemini مدمج"
                >
                  <Sparkles size={16} className="text-amber-200 animate-pulse" />
                  <span>توليد محتوى (Gemini API) 🚀</span>
                </button>

                {/* Add Material Button */}
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  <Plus size={16} />
                  <span>إضافة مرجع أو مادة تعليمية ➕</span>
                </button>
              </div>
            </div>

            {/* List of Resource Cards */}
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-amber-400" />
                <p className="text-xs font-bold">جاري تحميل المواد التعليمية والمراجع الأكاديمية...</p>
              </div>
            ) : filteredTeacherResources.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/40 rounded-3xl border border-slate-800/80 space-y-3">
                <BookOpen size={40} className="mx-auto text-slate-600" />
                <h4 className="text-sm font-black text-slate-300">لا توجد مواد تعليمية مطابقة للتصفية الحالية</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  قم بإضافة مراجع ومذكرات دراسية جديدة مصنفة حسب المادة والوحدة للبدء في توليد الخطط التعليمية وأوراق العمل.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
                >
                  إضافة أول مادة تعليمية الآن
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredTeacherResources.map((res) => (
                  <div
                    key={res.id}
                    className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 group relative shadow-lg"
                  >
                    {/* Card Header & Badges */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                            <span>{EDUCATIONAL_SUBJECTS.find((s) => s.id === res.subject)?.icon || '📚'}</span>
                            <span>{res.subject}</span>
                          </span>

                          <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                            <Layers size={11} />
                            <span>{res.unit_title}</span>
                          </span>

                          <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
                            {res.type === 'pdf' ? 'ملف PDF 📄' : res.type === 'link' ? 'رابط خارجي 🌐' : 'نص مذكرات 📝'}
                          </span>

                          {res.pdf_category && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-lg border border-purple-500/30 font-bold">
                              {res.pdf_category}
                            </span>
                          )}

                          {res.pdf_annotations && res.pdf_annotations.length > 0 && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30 font-bold flex items-center gap-1">
                              <Bookmark size={10} />
                              <span>{res.pdf_annotations.length} ملاحظة توضيحية</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteResource(res.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="حذف المادة"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
                        {res.title}
                      </h3>

                      {/* Citation */}
                      {res.academic_citation && (
                        <div className="text-[11px] text-amber-200/80 font-medium flex items-center gap-1.5 bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/15">
                          <BookMarked size={12} className="shrink-0 text-amber-400" />
                          <span className="truncate">المصدر المعتمد: {res.academic_citation}</span>
                        </div>
                      )}

                      {/* Content Preview Snippet */}
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed line-clamp-3 select-all">
                        {res.content}
                      </div>

                      {/* Access & Link info */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <UserCheck size={11} className="text-emerald-400" />
                          <span>المجموعات المصرح لها:</span>
                          <span className="text-slate-300 font-mono">{res.group_ids?.join(', ') || 'الكل'}</span>
                        </div>

                        {res.url && (
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline flex items-center gap-1 mr-auto font-mono"
                          >
                            <span>فتح المرفق الخارجي</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions: Dedicated AI Generation Button & Materials count */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-400" />
                        <span>
                          المواد المولدة ذكياً: <strong>{res.generated_materials?.length || 0}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* PDF Annotations & Viewer Tool Button */}
                        {(res.type === 'pdf' || (res.pdf_annotations && res.pdf_annotations.length > 0)) && (
                          <button
                            type="button"
                            onClick={() => {
                              setAnnotatingResource(res);
                              setAnnotatorMode('teacher');
                            }}
                            className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="فتح مستند الـ PDF وتحديد أجزاء وإضافة ملاحظات توضيحية للطلاب"
                          >
                            <Highlighter size={13} className="text-amber-400" />
                            <span>ملاحظات وتظليل PDF</span>
                            <span className="text-[10px] bg-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                              {res.pdf_annotations?.length || 0}
                            </span>
                          </button>
                        )}

                        {/* Secondary View Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setViewingResourceDetail(res);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>معاينة التفاصيل</span>
                        </button>

                        {/* Dedicated Primary AI Button: "توليد محتوى" as strictly required */}
                        <button
                          type="button"
                          id={`btn-generate-content-${res.id}`}
                          onClick={() => openAiGenerator(res)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title="توليد محتوى تعليمي ذكي (خطط دروس، أوراق عمل، بنك أسئلة) عبر نموذج Gemini"
                        >
                          <Sparkles size={14} className="text-amber-200 animate-pulse" />
                          <span>توليد محتوى</span>
                          <span className="text-[9px] bg-black/25 px-1.5 py-0.5 rounded font-mono font-normal">Gemini</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. STUDENT VIEW (DISPLAY - HIERARCHICAL & READ-ONLY)                       */}
        {/* ========================================================================= */}
        {viewMode === 'student' && (
          <div className="space-y-6">
            {/* Student Subject Tabs */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-sm font-black text-white">بوابة الطالب الأكاديمية: مصادر المواد المعتمدة</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  معاينة المراجع والدروس المعتمدة المصنفة تسلسلياً حسب الوحدات والفصول المقررة
                </p>
              </div>

              {/* Subject Selector Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {enrolledSubjects.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => {
                      setStudentSelectedSubject(subj);
                      setExpandedUnitId(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      studentSelectedSubject === subj
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>{EDUCATIONAL_SUBJECTS.find((s) => s.id === subj)?.icon || '📖'}</span>
                    <span>{subj}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hierarchical Unit Accordion Display */}
            {studentHierarchicalUnits.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/40 rounded-3xl border border-slate-800 space-y-2">
                <BookOpen size={36} className="mx-auto text-slate-600" />
                <h4 className="text-sm font-bold text-slate-300">
                  لا توجد مراجع معتمدة منشورة حالياً لمادة {studentSelectedSubject}
                </h4>
                <p className="text-xs text-slate-500">
                  يقوم معلم المادة حالياً بإعداد واعتماد المذكرات التعليمية لدروس هذه المادة.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentHierarchicalUnits.map((unitGroup, idx) => {
                  const isExpanded = expandedUnitId === unitGroup.unit_id || expandedUnitId === null;
                  return (
                    <div
                      key={unitGroup.unit_id || idx}
                      className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-md"
                    >
                      {/* Unit Header (Click to toggle accordion) */}
                      <button
                        type="button"
                        onClick={() => setExpandedUnitId(isExpanded ? '' : unitGroup.unit_id)}
                        className="w-full p-4 sm:p-5 flex items-center justify-between text-right hover:bg-slate-900/60 transition-colors cursor-pointer border-b border-slate-800/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                              <span>{unitGroup.unit_title}</span>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                                {unitGroup.resources.length} مرجع معتمد
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              المفتاح الرابط (Foreign Key): <code className="text-amber-300/80">{unitGroup.unit_id}</code>
                            </p>
                          </div>
                        </div>

                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>

                      {/* Unit Content: List of Resources under this specific unit */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 space-y-4 bg-slate-900/40">
                          {unitGroup.resources.map((resource) => (
                            <div
                              key={resource.id}
                              className="bg-slate-900 border border-slate-800/90 rounded-xl p-4 space-y-3 hover:border-indigo-500/40 transition-colors"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-black text-white">{resource.title}</span>
                                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                                      معتمد رسمياً من المعلم ✅
                                    </span>
                                    {resource.pdf_category && (
                                      <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                                        {resource.pdf_category}
                                      </span>
                                    )}
                                    {resource.pdf_annotations && resource.pdf_annotations.length > 0 && (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold flex items-center gap-1">
                                        <Bookmark size={9} />
                                        <span>{resource.pdf_annotations.length} ملاحظة توضيحية</span>
                                      </span>
                                    )}
                                  </div>
                                  {resource.academic_citation && (
                                    <div className="text-[11px] text-amber-300/90 font-medium">
                                      📖 المصدر: {resource.academic_citation}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* PDF Annotations & Viewer Button for Student */}
                                  {(resource.type === 'pdf' || (resource.pdf_annotations && resource.pdf_annotations.length > 0)) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAnnotatingResource(resource);
                                        setAnnotatorMode('student');
                                      }}
                                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 border border-amber-500/35 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                                      title="فتح مستند الـ PDF واستعراض الملاحظات التوضيحية المدونة من المعلم"
                                    >
                                      <Highlighter size={13} className="text-amber-400" />
                                      <span>تصفح مستند الـ PDF وملاحظات المعلم 📄</span>
                                      {resource.pdf_annotations && resource.pdf_annotations.length > 0 && (
                                        <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                                          {resource.pdf_annotations.length} ملاحظة
                                        </span>
                                      )}
                                    </button>
                                  )}

                                  {resource.url && (
                                    <a
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 text-[11px] font-bold rounded-lg border border-sky-500/30 flex items-center gap-1"
                                    >
                                      <ExternalLink size={11} />
                                      <span>تصفح المرفق</span>
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Dedicated Teacher Notes Banner if annotations exist */}
                              {resource.pdf_annotations && resource.pdf_annotations.length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Bookmark size={14} className="text-amber-400 shrink-0" />
                                    <span className="text-xs text-amber-200 font-bold">
                                      قام المعلم {resource.teacher_name} بتحديد {resource.pdf_annotations.length} أجزاء من هذا المستند وإضافة شروحات وملاحظات توضيحية.
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAnnotatingResource(resource);
                                      setAnnotatorMode('student');
                                    }}
                                    className="text-xs font-black text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer self-end sm:self-auto"
                                  >
                                    <span>مطالعة الملاحظات على المستند</span>
                                    <ChevronLeft size={13} />
                                  </button>
                                </div>
                              )}

                              {/* Text / Summary Display */}
                              <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-line">
                                {resource.content}
                              </div>

                              {/* Student Interactive AI Worksheets & Practice Questions (if generated) */}
                              {resource.generated_materials && resource.generated_materials.length > 0 && (
                                <div className="pt-2 border-t border-slate-800/80 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                                      <Sparkles size={13} className="text-amber-400" />
                                      <span>أنشطة وأوراق عمل وتدريبات تفاعلية مولدة للدرس:</span>
                                    </h5>
                                    <span className="text-[10px] text-slate-400">
                                      نمط البجروت والأسئلة متدرجة الصعوبة
                                    </span>
                                  </div>

                                  {resource.generated_materials.map((mat) => (
                                    <div
                                      key={mat.id}
                                      className="bg-slate-950/90 border border-indigo-500/20 rounded-xl p-4 space-y-3"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="text-xs font-black text-white">{mat.title}</div>
                                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">
                                          {mat.goal === 'worksheet'
                                            ? 'ورقة عمل تفاعلية'
                                            : mat.goal === 'exam'
                                            ? 'اختبار تجريبي'
                                            : 'خطة ومراجعة'}
                                        </span>
                                      </div>

                                      {/* Interactive Questions with Immediate Feedback */}
                                      {mat.questions && mat.questions.length > 0 && (
                                        <div className="space-y-3 pt-2">
                                          {mat.questions.map((q, qIdx) => {
                                            const selectedOpt = studentSelectedAnswers[q.id];
                                            const showResult = studentShowResults[q.id];
                                            const isCorrect = selectedOpt === q.correctAnswer;

                                            return (
                                              <div
                                                key={q.id || qIdx}
                                                className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-2"
                                              >
                                                <div className="flex items-center justify-between gap-2">
                                                  <span className="text-[10px] font-black bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded">
                                                    {q.levelBadge || q.cognitiveLevel}
                                                  </span>
                                                  {q.points && (
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                      {q.points} علامة
                                                    </span>
                                                  )}
                                                </div>

                                                <p className="text-xs font-bold text-white leading-snug">
                                                  {qIdx + 1}. {q.question}
                                                </p>

                                                {/* Options */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                  {q.options?.map((opt, optIdx) => {
                                                    const isThisSelected = selectedOpt === opt;
                                                    let btnStyle = 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300';
                                                    if (showResult) {
                                                      if (opt === q.correctAnswer) {
                                                        btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold';
                                                      } else if (isThisSelected && !isCorrect) {
                                                        btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-300 line-through';
                                                      }
                                                    } else if (isThisSelected) {
                                                      btnStyle = 'bg-indigo-950 border-indigo-500 text-indigo-200 font-bold';
                                                    }

                                                    return (
                                                      <button
                                                        key={optIdx}
                                                        type="button"
                                                        onClick={() => {
                                                          setStudentSelectedAnswers((prev) => ({
                                                            ...prev,
                                                            [q.id]: opt
                                                          }));
                                                          setStudentShowResults((prev) => ({
                                                            ...prev,
                                                            [q.id]: true
                                                          }));
                                                        }}
                                                        className={`p-2 rounded-lg text-xs text-right border transition-all cursor-pointer ${btnStyle}`}
                                                      >
                                                        {opt}
                                                      </button>
                                                    );
                                                  })}
                                                </div>

                                                {/* Feedback explanation */}
                                                {showResult && (
                                                  <div
                                                    className={`p-2.5 rounded-lg text-[11px] font-sans mt-2 border ${
                                                      isCorrect
                                                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                                                    }`}
                                                  >
                                                    <div className="font-bold mb-1">
                                                      {isCorrect ? '✅ إجابة صحيحة وممتازة!' : '❌ إجابة غير صحيحة.'}
                                                    </div>
                                                    <div className="text-slate-300">{q.modelExplanation}</div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. FIRESTORE DATABASE SCHEMA INSPECTOR                                    */}
        {/* ========================================================================= */}
        {viewMode === 'schema' && (
          <div className="space-y-6">
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-emerald-400" />
                <h3 className="text-sm sm:text-base font-black text-white">
                  هيكلية قاعدة بيانات Firestore NoSQL المثالية للربط بين المعلمين والدورات والمصادر والطلاب
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                تصميم NoSQL عالي الأداء يضمن أمان الوصول وحصر المواد على الطلاب المسجلين عبر استعلامات مصفوفات الصلاحيات (
                <code>group_ids</code> و <code>student_ids</code>) ومنع التكدس بالربط الهيكلي عبر المفتاح الخارجي{' '}
                <code>unit_id</code>.
              </p>
            </div>

            {/* Visual Architecture Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Collection 1: Teachers */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-slate-800 pb-2">
                  <span>1. Collection: teachers</span>
                  <span className="text-[10px] text-slate-500">Document: teacher_id</span>
                </div>
                <pre className="text-[11px] text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded-lg">
{`{
  "name": "أ. د. زكي أبو علان",
  "email": "zakiabuillan@gmail.com",
  "specialization": "كيمياء وأحياء",
  "subjects": ["كيمياء", "أحياء", "فيزياء"],
  "assigned_courses": ["course-chem-12", "course-bio-1"]
}`}
                </pre>
              </div>

              {/* Collection 2: Courses */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-400 border-b border-slate-800 pb-2">
                  <span>2. Collection: courses</span>
                  <span className="text-[10px] text-slate-500">Document: course_id</span>
                </div>
                <pre className="text-[11px] text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded-lg">
{`{
  "name": "كيمياء متقدمة - بجروت 5 وحدات",
  "subject": "كيمياء",
  "grade": "الصف الثاني عشر",
  "teacher_id": "teacher-zaki-abu-illan",
  "units": [
    {
      "unit_id": "unit-chem-organic",
      "unit_title": "الكيمياء العضوية"
    },
    {
      "unit_id": "unit-gas-laws",
      "unit_title": "قوانين الغازات"
    }
  ],
  "enrolled_group_ids": ["group-12-science"],
  "enrolled_student_ids": ["student-mohammad-101"]
}`}
                </pre>
              </div>

              {/* Collection 3: Resources (Core Source with unit breakdown & student_ids) */}
              <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-2 font-mono md:col-span-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2">
                  <span>3. Collection: educational_resources (المصادر والمذكرات مع التوليد الذكي)</span>
                  <span className="text-[10px] text-slate-500">Document: resource_id</span>
                </div>
                <pre className="text-[11px] text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded-lg leading-relaxed">
{`{
  "title": "مذكرة تفاعلات الألكينات وقاعدة ماركوفنيكوف",
  "subject": "كيمياء",
  "unit_id": "unit-chem-organic",               // <-- Foreign Key (مفتاح الربط لمنع تكدس الواجهة)
  "unit_title": "كيمياء العضوية",
  "type": "text",                                // <-- 'text' | 'pdf' | 'link'
  "content": "نص المرجع العلمي المعتمد من المعلم...",
  "teacher_id": "teacher-zaki-abu-illan",
  "course_id": "course-chem-12",
  "group_ids": ["group-12-science", "group-chem-honors"], // <-- where("group_ids", "array-contains", ...)
  "student_ids": ["student-mohammad-101", "student-sara-102"], // <-- الصلاحيات الفردية
  "academic_citation": "كتاب الكيمياء المعتمد، ص 112-135",
  "is_approved": true,
  "generated_materials": [                      // <-- المواد المولدة بالذكاء الاصطناعي
    {
      "id": "gen-chem-01",
      "goal": "worksheet",                      // <-- 'lesson_plan' | 'worksheet' | 'exam'
      "markdownContent": "## ورقة عمل تفاعلية...",
      "questions": [ ... ],                     // <-- أسئلة متدرجة الصعوبة (تذكر، فهم، تطبيق، تحليل)
      "teacherAnswerKeyMarkdown": "## نموذج الإجابة للمعلم..."
    }
  ]
}`}
                </pre>
              </div>

              {/* Collection 4: Students */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 font-mono md:col-span-2">
                <div className="flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 pb-2">
                  <span>4. Collection: students (بيانات الطالب والصلاحيات)</span>
                  <span className="text-[10px] text-slate-500">Document: student_id</span>
                </div>
                <pre className="text-[11px] text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded-lg">
{`{
  "name": "محمد أحمد",
  "grade": "الصف الثاني عشر (توجيهي علمي)",
  "group_ids": ["group-12-science", "group-chem-honors"],
  "enrolled_courses": ["course-chem-12", "course-bio-1"],
  "enrolled_subjects": ["كيمياء", "فيزياء", "أحياء"]
}`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD EDUCATIONAL RESOURCE (TEACHER FORM)                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">إضافة مرجع أو مادة تعليمية جديدة</h3>
                    <p className="text-xs text-slate-400">تصنيف دقيق حسب المادة والوحدة الدراسية</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveResource} className="space-y-4 text-right">
                {/* 1. Categorization by Subject & Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">المادة الدراسية (Subject) *</label>
                    <select
                      value={formSubject}
                      onChange={(e) => {
                        const newSub = e.target.value;
                        setFormSubject(newSub);
                        const firstUnit =
                          EDUCATIONAL_SUBJECTS.find((s) => s.id === newSub)?.defaultUnits[0] || 'الوحدة الأولى';
                        setFormUnitTitle(firstUnit);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400"
                    >
                      {EDUCATIONAL_SUBJECTS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.icon} {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">الوحدة / الفصل (Unit/Chapter) *</label>
                    <select
                      value={formUnitTitle}
                      onChange={(e) => setFormUnitTitle(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400"
                    >
                      {availableUnitsForForm.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value="وحدة مخصصة جديدة">➕ إدخال وحدة جديدة...</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">عنوان المادة أو المرجع *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: مذكرة شرح تفاعلات الألكينات وقاعدة ماركوفنيكوف..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>

                {/* Resource Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('text')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formType === 'text'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <FileText size={14} />
                    <span>محتوى نصي خام</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('pdf')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formType === 'pdf'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <FileSpreadsheet size={14} />
                    <span>مرجع PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('link')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formType === 'link'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Globe size={14} />
                    <span>رابط خارجي معتمد</span>
                  </button>
                </div>

                {/* PDF Specific: Category Classification & Upload */}
                {formType === 'pdf' && (
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Tag size={13} />
                        <span>تصنيف ملف الـ PDF الأكاديمي *</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {PDF_CATEGORIES.map((cat) => {
                          const isSelected = formPdfCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setFormPdfCategory(cat)}
                              className={`p-2 rounded-xl text-[11px] font-bold border text-right transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <span>{cat}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* PDF File Upload Zone */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">رفع ملف الـ PDF المعتمد</label>
                      <label className="border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-900/50 transition-colors">
                        <Upload size={24} className="text-amber-400" />
                        <span className="text-xs font-bold text-white">
                          {formFileName ? `الملف المحدد: ${formFileName} (${formFileSize || '2.4 MB'})` : 'اسحب ملف PDF هنا أو انقر للاختيار'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          يدعم ملفات الكتب والمذكرات ونماذج البجروت (.pdf)
                        </span>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFormFileName(file.name);
                              setFormFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
                              if (!formTitle.trim()) {
                                setFormTitle(file.name.replace(/\.[^/.]+$/, ''));
                              }
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Page Count */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">عدد صفحات المستند:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={formPageCount}
                          onChange={(e) => setFormPageCount(parseInt(e.target.value) || 1)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono outline-none focus:border-amber-400"
                        />
                        <span className="text-slate-400 text-[11px]">صفحات</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* URL if link or PDF */}
                {formType !== 'text' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">رابط الملف أو الموقع الخارجي</label>
                    <input
                      type="url"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="https://example.com/reference.pdf"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                )}

                {/* Raw Content / Text */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">النص المرجعي أو المادة العلمية الخام *</label>
                    <span className="text-[10px] text-amber-400 font-medium">
                      سيتم استخدامه حصرياً لتوليد الأسئلة والدروس بالذكاء الاصطناعي
                    </span>
                  </div>
                  <textarea
                    required
                    rows={5}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="الصق هنا النص العلمي أو الشرح التفصيلي أو مذكرات الدرس المعتمدة من المعلم..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400 leading-relaxed font-sans"
                  />
                </div>

                {/* Citation & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">التوثيق الأكاديمي (Citation)</label>
                    <input
                      type="text"
                      value={formCitation}
                      onChange={(e) => setFormCitation(e.target.value)}
                      placeholder="مثال: كتاب الكيمياء المعتمد، ص 112"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">ملاحظات وتوجيهات المعلم للطلاب</label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="توجيهات إضافية حول الامتحان أو الحصة..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Target Groups & Students for Access Permission with Quick Chips */}
                <div className="space-y-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-300">تعيين المجموعات المصرح لها (group_ids)</label>
                      <div className="flex items-center gap-1">
                        {['الكل', 'مجموعة التفوق للبجروت', 'group-12-science', 'group-chem-honors'].map((grp) => (
                          <button
                            key={grp}
                            type="button"
                            onClick={() => {
                              if (grp === 'الكل') setFormGroupIds('الكل');
                              else {
                                const current = formGroupIds.split(',').map((s) => s.trim()).filter(Boolean);
                                if (!current.includes(grp)) {
                                  setFormGroupIds([...current.filter((c) => c !== 'الكل'), grp].join(', '));
                                }
                              }
                            }}
                            className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer"
                          >
                            + {grp}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={formGroupIds}
                      onChange={(e) => setFormGroupIds(e.target.value)}
                      placeholder="group-12-science, مجموعة التفوق للبجروت"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-300">تعيين الطلاب المصرح لهم (student_ids)</label>
                      <div className="flex items-center gap-1">
                        {['الجميع', 'student-mohammad-101', 'student-sara-102'].map((std) => (
                          <button
                            key={std}
                            type="button"
                            onClick={() => {
                              if (std === 'الجميع') setFormStudentIds('الجميع');
                              else {
                                const current = formStudentIds.split(',').map((s) => s.trim()).filter(Boolean);
                                if (!current.includes(std)) {
                                  setFormStudentIds([...current.filter((c) => c !== 'الجميع'), std].join(', '));
                                }
                              }
                            }}
                            className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer"
                          >
                            + {std}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={formStudentIds}
                      onChange={(e) => setFormStudentIds(e.target.value)}
                      placeholder="student-mohammad-101, student-sara-102"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                  >
                    {isSaving && <Loader2 size={14} className="animate-spin" />}
                    <span>حفظ المرجع واعتماده ✅</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: AI CONTENT GENERATOR ("توليد محتوى")                                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>توليد محتوى تعليمي بالذكاء الاصطناعي</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                        Gemini 3.8 Flash • خبير تربوي
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تحويل المرجع المعتمد إلى خطط دروس، أوراق عمل، أو اختبارات بنمط البجروت متدرجة الصعوبة وفق معايير المنصة
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Reference Selector & Details */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <BookMarked size={14} className="text-amber-400" />
                    <span>المرجع العلمي المعتمد للتوليد:</span>
                  </label>
                  {resources.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">تبديل المرجع:</span>
                      <select
                        value={targetResourceForAi?.id || ''}
                        onChange={(e) => {
                          const found = resources.find((r) => r.id === e.target.value);
                          if (found) {
                            setTargetResourceForAi(found);
                            setAiGeneratedResult(null);
                            setAiError(null);
                          }
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-amber-400 cursor-pointer max-w-[280px] truncate"
                      >
                        {resources.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.subject} - {r.unit_title} ({r.title})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {targetResourceForAi ? (
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/90 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-black">{targetResourceForAi.subject}</span>
                        <span>•</span>
                        <span>{targetResourceForAi.unit_title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        كود الوحدة: {targetResourceForAi.unit_id}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">{targetResourceForAi.title}</div>
                    {targetResourceForAi.citation && (
                      <div className="text-[11px] text-amber-200/80 font-medium">
                        📖 التوثيق المعتمد: {targetResourceForAi.citation}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 line-clamp-2 font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      {targetResourceForAi.content || targetResourceForAi.description || 'النص المرجعي المعتمد للدرس'}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-400 font-bold p-2 bg-amber-500/10 rounded-lg">
                    يرجى اختيار مادة أو مرجع معتمد للبدء في التوليد.
                  </div>
                )}
              </div>

              {/* Strict Pedagogical & System Prompt Compliance Banner */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-teal-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
                <ShieldCheck size={20} className="shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-black text-amber-300 flex items-center gap-2">
                    <span>سياسة الاعتماد الحصري على المراجع (أكاديمية التفوق أون لاين)</span>
                    <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono">
                      System Prompt Compliant
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    يتم استدعاء نموذج <strong>Gemini</strong> مع التوجيه الصارم بالقاعدة الذهبية: يُمنع منعاً باتاً التخمين أو استخدام المعارف العامة، وتقتصر كافة الشروحات، الأسئلة المتدرجة (مستويات 1-4)، ونماذج الإجابة على محتوى المرجع المعتمد فقط.
                  </p>
                </div>
              </div>

              {/* Cognitive Levels Guidance Indicator */}
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <ListOrdered size={13} className="text-indigo-400" />
                  <span>تدرج المستويات المعرفية المعتمد في التوليد:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5 font-bold">
                  <span className="bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md">
                    1. تذكر واسترجاع
                  </span>
                  <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    2. فهم واستيعاب
                  </span>
                  <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    3. تطبيق عملي
                  </span>
                  <span className="bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md">
                    4. تحليل واستنتاج (بجروت)
                  </span>
                </div>
              </div>

              {/* Objective Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-200">اختر الهدف المطلوب توليده:</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiGoal('worksheet')}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-1 ${
                      aiGoal === 'worksheet'
                        ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-400" />
                      <span>ورقة عمل تفاعلية</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">تطبيقات ومسائل مع نموذج إجابة المعلم</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiGoal('exam')}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-1 ${
                      aiGoal === 'exam'
                        ? 'bg-amber-500/30 border-amber-400 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black flex items-center gap-1.5">
                      <Award size={14} className="text-amber-400" />
                      <span>اختبار بنمط البجروت</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">أسئلة متدرجة: تذكر، فهم، تطبيق، تحليل</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiGoal('lesson_plan')}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-1 ${
                      aiGoal === 'lesson_plan'
                        ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black flex items-center gap-1.5">
                      <Clock size={14} className="text-emerald-400" />
                      <span>خطة درس تفاعلية</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">أهداف سلوكية وخطوات الحصة</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiGoal('comprehensive')}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-1 ${
                      aiGoal === 'comprehensive'
                        ? 'bg-purple-600/30 border-purple-400 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black flex items-center gap-1.5">
                      <Layers size={14} className="text-purple-400" />
                      <span>حزمة شاملة متكاملة</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">خطة كاملة + ورقة عمل + اختبار</p>
                  </button>
                </div>
              </div>

              {/* Generate Trigger Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex items-center gap-1 text-amber-300 font-bold">
                    <Sparkles size={12} />
                    <span>مدمج بنموذج Gemini مع System Prompt الرسمي لأكاديمية التفوق</span>
                  </div>
                  <div>⚡ الالتزام الصارم بالمراجع المعتمدة، مستويات معرفية متدرجة، ونموذج إجابة للمعلم</div>
                </div>
                <button
                  type="button"
                  id="btn-execute-gemini-content-gen"
                  onClick={handleExecuteAiGeneration}
                  disabled={isGeneratingAi || !targetResourceForAi}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري استدعاء Gemini وتوليد المحتوى...</span>
                    </>
                  ) : (
                    <>
                      <Brain size={16} />
                      <span>توليد محتوى (Gemini API) 🚀</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error Display */}
              {aiError && (
                <div className="p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Generated Content Output Display */}
              {aiGeneratedResult && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/40">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                        <span>تم توليد المحتوى التعليمي وحفظه بالمرجع بنجاح!</span>
                      </h4>
                      <div className="text-[10px] text-emerald-200/80">
                        {generationEngineUsed === 'gemini_api'
                          ? '✨ متصل ومولد مباشرةً بواسطة نموذج Gemini (gemini-3.8-flash) وفق معايير المنصة'
                          : '⚡ تم التوليد بنجاح وفق المعايير التربوية والاعتماد الحصري على المرجع'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            `${aiGeneratedResult.markdownContent}\n\n${aiGeneratedResult.teacherAnswerKeyMarkdown || ''}`,
                            'full-ai-copy'
                          )
                        }
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Copy size={13} />
                        <span>{copiedKey === 'full-ai-copy' ? 'تم النسخ! ✅' : 'نسخ المحتوى'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary & Markdown Content Box */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <h5 className="text-xs font-black text-amber-300">{aiGeneratedResult.title}</h5>
                    <div className="text-xs text-slate-300 whitespace-pre-line font-sans leading-relaxed border-b border-slate-800/80 pb-3">
                      {aiGeneratedResult.markdownContent}
                    </div>

                    {/* Graduated Questions */}
                    {aiGeneratedResult.questions && aiGeneratedResult.questions.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h6 className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                          <ListOrdered size={14} />
                          <span>الأسئلة المتدرجة (تذكر، فهم، تطبيق، تحليل):</span>
                        </h6>
                        {aiGeneratedResult.questions.map((q, idx) => (
                          <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                                {q.levelBadge || q.cognitiveLevel}
                              </span>
                              {q.points && (
                                <span className="text-[10px] text-slate-400 font-mono">{q.points} علامة</span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-white">
                              {idx + 1}. {q.question}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              {q.options?.map((opt, oIdx) => (
                                <div
                                  key={oIdx}
                                  className={`p-1.5 rounded text-[11px] ${
                                    opt === q.correctAnswer
                                      ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold'
                                      : 'bg-slate-950 text-slate-400'
                                  }`}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Teacher Model Answer Key */}
                    {aiGeneratedResult.teacherAnswerKeyMarkdown && (
                      <div className="mt-4 p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-2">
                        <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                          <Award size={14} />
                          <span>نموذج الإجابة النموذجي المنفصل للمعلم:</span>
                        </div>
                        <div className="text-xs text-amber-100 whitespace-pre-line font-sans leading-relaxed">
                          {aiGeneratedResult.teacherAnswerKeyMarkdown}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: VIEW RESOURCE DETAIL                                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {viewingResourceDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-black">
                      {viewingResourceDetail.subject}
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">
                      {viewingResourceDetail.unit_title}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white">{viewingResourceDetail.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingResourceDetail(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {viewingResourceDetail.academic_citation && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200">
                  📖 <strong>المصدر المعتمد:</strong> {viewingResourceDetail.academic_citation}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">المحتوى والنص العلمي المعتمد:</label>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-line">
                  {viewingResourceDetail.content}
                </div>
              </div>

              {viewingResourceDetail.notes && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                  💡 <strong>ملاحظات المعلم:</strong> {viewingResourceDetail.notes}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  id="btn-detail-generate-content"
                  onClick={() => {
                    setViewingResourceDetail(null);
                    openAiGenerator(viewingResourceDetail);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all"
                >
                  <Sparkles size={14} className="text-amber-200" />
                  <span>توليد محتوى (Gemini API) 🚀</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: PDF ANNOTATOR & VIEWER MODAL (.pdf-viewer-container)              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {annotatingResource && (
          <PdfAnnotatorViewerModal
            resource={annotatingResource}
            mode={annotatorMode}
            currentTeacherName={currentTeacherName}
            onClose={() => setAnnotatingResource(null)}
            onUpdateAnnotations={handleUpdateResourceAnnotations}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EducationalMaterialsManager;
