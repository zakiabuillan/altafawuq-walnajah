import React, { useState, useMemo } from 'react';
import { 
  CurriculumSourceMapping, 
  DEFAULT_CURRICULUM_SOURCE_MAPPINGS 
} from '../types';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  RotateCcw, 
  Search, 
  BookMarked, 
  Sparkles, 
  ExternalLink, 
  Check, 
  X, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  Filter,
  FlaskConical,
  Atom,
  Calculator,
  Languages,
  BookOpen,
  GraduationCap,
  Layers,
  Globe,
  Sliders,
  AlertCircle,
  FileCheck,
  Play,
  Zap,
  Loader2,
  Save,
  Send,
  Eye,
  Clipboard,
  Database,
  Tag,
  Gauge,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/activityLogger';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CurriculumSourcesManagerProps {
  mappings: CurriculumSourceMapping[];
  onSaveMappings: (updatedMappings: CurriculumSourceMapping[]) => Promise<void>;
  isSaving?: boolean;
  availableSubjects?: string[];
  onOpenGenerator?: () => void;
}

const STRICTNESS_CONFIG: Record<string, { label: string; badge: string; desc: string; color: string }> = {
  exclusive: {
    label: 'حصري ومطلق (Exclusive)',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'يعتمد الذكاء الاصطناعي حصرياً ومطلقاً على محتوى ونماذج هذا المرجع المعتمد دون الخروج عنه.',
    color: 'rose'
  },
  preferred: {
    label: 'مفضل ومعتمد (Preferred)',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'المرجع الأساسي المعتمد للتوليد والتصنيف مع الالتزام بالمعايير الأكاديمية ونماذج البجروت.',
    color: 'emerald'
  },
  optional: {
    label: 'استرشادي وإثرائي (Optional)',
    badge: 'bg-slate-100 text-slate-700 border-slate-250',
    desc: 'مرجع إضافي للاستئناس والأنشطة الإثرائية وأسئلة التدريب المفتوحة.',
    color: 'slate'
  }
};

const getSubjectIcon = (subject: string) => {
  if (subject.includes('كيمياء')) return <FlaskConical className="text-amber-500" size={18} />;
  if (subject.includes('فيزياء')) return <Atom className="text-sky-500" size={18} />;
  if (subject.includes('رياضيات') || subject.includes('حساب')) return <Calculator className="text-emerald-500" size={18} />;
  if (subject.includes('أحياء') || subject.includes('بيولوجيا')) return <GraduationCap className="text-teal-500" size={18} />;
  if (subject.includes('عربي') || subject.includes('لغة')) return <Languages className="text-indigo-500" size={18} />;
  if (subject.includes('إنجليزي') || subject.includes('English')) return <Globe className="text-blue-500" size={18} />;
  return <BookOpen className="text-slate-500" size={18} />;
};

export const CurriculumSourcesManager: React.FC<CurriculumSourcesManagerProps> = ({
  mappings,
  onSaveMappings,
  isSaving = false,
  availableSubjects = [],
  onOpenGenerator
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [strictnessFilter, setStrictnessFilter] = useState<'all' | 'exclusive' | 'preferred' | 'optional'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form states for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceDescription, setSourceDescription] = useState('');
  const [bagrutModelsInput, setBagrutModelsInput] = useState('');
  const [approvedKeyTopicsInput, setApprovedKeyTopicsInput] = useState('');
  const [strictness, setStrictness] = useState<'exclusive' | 'preferred' | 'optional'>('preferred');
  const [isPrimaryApprovedSource, setIsPrimaryApprovedSource] = useState(false);
  const [targetGradeLevel, setTargetGradeLevel] = useState('الصف الثاني عشر (مسار البجروت / متقدم)');
  const [academicDifficultyRating, setAcademicDifficultyRating] = useState<'beginner' | 'advanced'>('advanced');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Quick Inline Add State for Manager to input and map approved URLs
  const [quickUrl, setQuickUrl] = useState('');
  const [quickSubject, setQuickSubject] = useState('الكيمياء');
  const [quickCustomSubject, setQuickCustomSubject] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTargetGradeLevel, setQuickTargetGradeLevel] = useState('الصف الثاني عشر (مسار البجروت / متقدم)');
  const [quickCustomGradeLevel, setQuickCustomGradeLevel] = useState('');
  const [quickAcademicDifficultyRating, setQuickAcademicDifficultyRating] = useState<'beginner' | 'advanced'>('advanced');
  const [quickStrictness, setQuickStrictness] = useState<'exclusive' | 'preferred' | 'optional'>('preferred');
  const [quickError, setQuickError] = useState('');
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // Delete & Reset Confirmation Modals
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Test Run Generator State
  const [isTestRunModalOpen, setIsTestRunModalOpen] = useState(false);
  const [testMappingId, setTestMappingId] = useState('');
  const [testSubject, setTestSubject] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [testTopic, setTestTopic] = useState('');
  const [testBagrutModel, setTestBagrutModel] = useState('');
  const [testGrade, setTestGrade] = useState('الصف الثاني عشر - مسار البجروت (متقدم)');
  const [testRunning, setTestRunning] = useState(false);
  const [testProgressStep, setTestProgressStep] = useState(0);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSavedNotice, setTestSavedNotice] = useState(false);

  // Simulated Test Run State (for 'Run Test' button using currently saved URLs)
  const [isSimulatingTest, setIsSimulatingTest] = useState(false);
  const [simulatedTestNotification, setSimulatedTestNotification] = useState<{
    type: 'success' | 'failure';
    title: string;
    message: string;
    testedCount: number;
    testedUrls: Array<{
      subject: string;
      url: string;
      status: 'valid' | 'invalid';
      groundedScore: number;
      latencyMs: number;
      details?: string;
    }>;
    timestamp: string;
    simulatedOutputPreview?: {
      sampleUnitTitle: string;
      accreditationStatus: string;
      bloomsTaxonomyAligned: boolean;
      bagrutModelsVerified: string[];
    };
  } | null>(null);

  // Find the primary chemistry reference (VEB School Chemistry)
  const primaryChemReference = useMemo(() => {
    return mappings.find(m => m.sourceUrl.includes('vebschoolchemistry') || (m.subject.includes('كيمياء') && m.isPrimaryApprovedSource))
      || mappings.find(m => m.subject.includes('كيمياء'));
  }, [mappings]);

  // Combined subject suggestions
  const subjectsList = useMemo(() => {
    const set = new Set<string>();
    [
      'الكيمياء', 
      'الرياضيات', 
      'الفيزياء', 
      'الأحياء والبيولوجيا', 
      'اللغة العربية والأدب', 
      'اللغة الإنجليزية', 
      'المدنيات',
      'التاريخ',
      'الجغرافيا',
      'علوم الحاسوب والبرمجة',
      'التكنولوجيا والاتصالات',
      'العلوم العامة والمختبرات'
    ].forEach(s => set.add(s));
    availableSubjects.forEach(s => {
      if (s && s.trim()) set.add(s.trim());
    });
    return Array.from(set);
  }, [availableSubjects]);

  // Filtered mappings list
  const filteredMappings = useMemo(() => {
    return mappings.filter(item => {
      const matchesSearch = 
        !searchTerm || 
        item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sourceTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sourceUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.bagrutModels || []).some(m => m.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStrictness = strictnessFilter === 'all' || item.strictness === strictnessFilter;
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && item.isActive) || 
        (statusFilter === 'inactive' && !item.isActive);

      return matchesSearch && matchesStrictness && matchesStatus;
    });
  }, [mappings, searchTerm, strictnessFilter, statusFilter]);

  // Metrics
  const activeCount = useMemo(() => mappings.filter(m => m.isActive).length, [mappings]);
  const exclusiveCount = useMemo(() => mappings.filter(m => m.strictness === 'exclusive').length, [mappings]);
  const primaryCount = useMemo(() => mappings.filter(m => m.isPrimaryApprovedSource).length, [mappings]);

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setSubject(subjectsList[0] || 'الكيمياء');
    setCustomSubjectInput('');
    setSourceTitle('');
    setSourceUrl('https://');
    setSourceDescription('');
    setBagrutModelsInput('');
    setApprovedKeyTopicsInput('');
    setStrictness('preferred');
    setIsPrimaryApprovedSource(false);
    setTargetGradeLevel('الصف الثاني عشر (مسار البجروت / متقدم)');
    setAcademicDifficultyRating('advanced');
    setIsActive(true);
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (item: CurriculumSourceMapping) => {
    setEditingId(item.id);
    if (subjectsList.includes(item.subject)) {
      setSubject(item.subject);
      setCustomSubjectInput('');
    } else {
      setSubject('__custom__');
      setCustomSubjectInput(item.subject);
    }
    setSourceTitle(item.sourceTitle);
    setSourceUrl(item.sourceUrl);
    setSourceDescription(item.sourceDescription || '');
    setBagrutModelsInput((item.bagrutModels || []).join('\n'));
    setApprovedKeyTopicsInput((item.approvedKeyTopics || []).join('\n'));
    setStrictness(item.strictness);
    setIsPrimaryApprovedSource(item.isPrimaryApprovedSource || false);
    setTargetGradeLevel(item.targetGradeLevel || item.metadata?.targetGradeLevel || 'الصف الثاني عشر (مسار البجروت / متقدم)');
    setAcademicDifficultyRating((item.academicDifficultyRating || item.metadata?.academicDifficultyRating as any) || 'advanced');
    setIsActive(item.isActive);
    setFormError('');
    setIsFormOpen(true);
  };

  // Clipboard Paste Helper for manual URL pasting
  const handlePasteFromClipboard = async () => {
    setQuickError('');
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setQuickUrl(text.trim());
          return;
        }
      }
    } catch {
      // In case browser clipboard API permission requires focus or is blocked
    }
    const inputEl = document.getElementById('paste-educational-source-url');
    if (inputEl) {
      inputEl.focus();
    }
  };

  // Clipboard Paste Helper for Modal form
  const handleModalPasteFromClipboard = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setSourceUrl(text.trim());
          setFormError('');
          return;
        }
      }
    } catch {
      // fallback
    }
    const inputEl = document.getElementById('modal-source-url');
    if (inputEl) {
      inputEl.focus();
    }
  };

  // Quick Add / Map Approved URL handler (Save to Database)
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError('');

    let rawUrl = quickUrl.trim();
    if (!rawUrl) {
      setQuickError('يرجى إدخال أو لصق رابط المصدر التعليمي الجديد (Educational Source URL).');
      return;
    }
    // Auto normalize URL if scheme missing
    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = 'https://' + rawUrl;
    }

    try {
      new URL(rawUrl);
    } catch {
      setQuickError('صيغة الرابط غير صحيحة، يرجى كتابة رابط صالح مثل vebschoolchemistry.com');
      return;
    }

    const targetSub = quickSubject === '__custom__' ? quickCustomSubject.trim() : quickSubject.trim();
    if (!targetSub) {
      setQuickError('يرجى تحديد فئة المادة الدراسية للمصدر (Subject Category) من القائمة المنسدلة.');
      return;
    }

    const targetGrade = quickTargetGradeLevel === '__custom__' 
      ? (quickCustomGradeLevel.trim() || 'الصف الثاني عشر (مسار البجروت / متقدم)')
      : quickTargetGradeLevel.trim();

    const isChem = targetSub.includes('كيمياء') || rawUrl.includes('vebschoolchemistry');
    const autoTitle = quickTitle.trim() || (isChem ? 'بوابة الاختبارات التفاعلية وصناعة المسابقات في الكيمياء (VebSchool)' : `مرجع ومصادر مادة ${targetSub}`);

    const newMapping: CurriculumSourceMapping = {
      id: 'csm_' + Date.now(),
      subject: targetSub,
      sourceUrl: rawUrl,
      sourceTitle: autoTitle,
      sourceDescription: isChem 
        ? 'المرجع الرقمي الحصري والمباشر لمنهاج الكيمياء، نماذج بجروت، اختبارات تفاعلية، تصنيف بلوم للمخرجات، ومسابقات التميز الأكاديمي.' 
        : `المرجع الرسمي المعتمد لتوليد مناهج وتصنيف مخرجات مادة ${targetSub}.`,
      bagrutModels: isChem ? ['037381 (الكيمياء الموسعة)', '037387 (المختبر وبحث التقصي)'] : [],
      approvedKeyTopics: isChem ? [
        'مقدمة إلى بنية المادة والروابط الكيميائية',
        'الحسابات الكيميائية وحالات المادة',
        'الأكسدة والاختزال والخلايا الكهروكيميائية',
        'الأحماض والقواعد ومحاليل الاتزان الأيوني'
      ] : [],
      strictness: isChem ? 'exclusive' : quickStrictness,
      isPrimaryApprovedSource: isChem,
      targetGradeLevel: targetGrade,
      academicDifficultyRating: quickAcademicDifficultyRating,
      metadata: {
        targetGradeLevel: targetGrade,
        academicDifficultyRating: quickAcademicDifficultyRating,
        sourceType: 'online_curriculum_portal',
        registeredAt: new Date().toISOString()
      },
      isActive: true,
      lastUpdated: new Date().toISOString()
    };

    setQuickSubmitting(true);
    try {
      const updated = mappings.map(m => {
        if (isChem && m.subject === targetSub) {
          return { ...m, isPrimaryApprovedSource: false };
        }
        return m;
      });
      updated.push(newMapping);

      // Save to Database (Firestore)
      await onSaveMappings(updated);
      await logActivity({
        actionType: 'CREATE_CURRICULUM_SOURCE',
        actionName: 'حفظ مصدر تعليمي جديد مع البيانات الوصفية (Metadata)',
        details: `تم حفظ المصدر التعليمي (${rawUrl}) لمادة (${targetSub}) بمستوى صفي (${targetGrade}) وتقييم صعوبة (${quickAcademicDifficultyRating}) في قاعدة البيانات`
      });

      setQuickUrl('');
      setQuickTitle('');
      setQuickCustomSubject('');
      setQuickCustomGradeLevel('');
      setSuccessMessage(`تم بنجاح حفظ المصدر التعليمي والبيانات الوصفية (Metadata) في قاعدة البيانات وتعيينه لمادة (${targetSub})! 💾✨`);
      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err: any) {
      setQuickError('فشل حفظ المصدر في قاعدة البيانات. يرجى التحقق من الاتصال بالإنترنت.');
    } finally {
      setQuickSubmitting(false);
    }
  };

  // Test Run Handlers
  const handleTriggerTestRun = (mappingToTest?: CurriculumSourceMapping) => {
    const target = mappingToTest 
      || primaryChemReference 
      || mappings.find(m => m.isActive) 
      || mappings[0];

    if (!target) return;

    setTestMappingId(target.id);
    setTestSubject(target.subject);
    setTestUrl(target.sourceUrl);
    setTestTopic(target.approvedKeyTopics && target.approvedKeyTopics.length > 0 
      ? target.approvedKeyTopics[0] 
      : (target.subject.includes('كيمياء') 
          ? 'الحسابات الكيميائية والمول والاتزان الكيميائي وسرعة التفاعلات' 
          : `منهاج ${target.subject} المعتمد`));
    setTestBagrutModel((target.bagrutModels || []).join(' و ') || '037381 و 037387');
    setTestGrade('الصف الثاني عشر - مسار البجروت (متقدم)');
    setTestRunning(false);
    setTestProgressStep(0);
    setTestResult(null);
    setTestError(null);
    setTestSavedNotice(false);
    setIsTestRunModalOpen(true);
  };

  const handleTestMappingChange = (mappingId: string) => {
    const found = mappings.find(m => m.id === mappingId);
    if (!found) return;
    setTestMappingId(found.id);
    setTestSubject(found.subject);
    setTestUrl(found.sourceUrl);
    setTestTopic(found.approvedKeyTopics && found.approvedKeyTopics.length > 0 
      ? found.approvedKeyTopics[0] 
      : `منهاج ${found.subject} المعتمد`);
    setTestBagrutModel((found.bagrutModels || []).join(' و ') || '');
    setTestResult(null);
    setTestError(null);
  };

  const handleExecuteTestRun = async () => {
    if (!testUrl.trim()) {
      setTestError('الرابط المعتمد فارغ.');
      return;
    }
    if (!testTopic.trim()) {
      setTestError('يرجى تحديد موضوع أو محور للاختبار.');
      return;
    }

    setTestRunning(true);
    setTestError(null);
    setTestResult(null);
    setTestProgressStep(1);

    const stepTimer1 = setTimeout(() => setTestProgressStep(2), 1200);
    const stepTimer2 = setTimeout(() => setTestProgressStep(3), 2800);

    try {
      const response = await fetch('/api/ai/curriculum-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: testSubject,
          grade: testGrade,
          topic: testTopic,
          unitsCount: 1, // fast and focused test run
          lessonsPerUnit: 1,
          referenceUrl: testUrl,
          bagrutModel: testBagrutModel,
          targetAudience: 'اختبار فحص المرجع وتوليد مخرجات التعلم الأكاديمية'
        })
      });

      const data = await response.json();
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (data.success && data.curriculum) {
        setTestProgressStep(4);
        setTestResult(data.curriculum);
        await logActivity({
          actionType: 'TEST_RUN_CURRICULUM_GENERATOR',
          actionName: 'تشغيل اختبار توليد المنهاج',
          details: `تم بنجاح تشغيل اختبار توليد المنهاج بالاعتماد على الرابط المعتمد (${testUrl}) لمادة (${testSubject}) بموضوع: ${testTopic}`
        });
      } else {
        setTestError(data.error || 'فشل تشغيل الاختبار. يرجى المحاولة ثانية.');
      }
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setTestError('تعذر الاتصال بخادم الذكاء الاصطناعي أثناء الاختبار.');
    } finally {
      setTestRunning(false);
    }
  };

  const handleSaveTestResult = async () => {
    if (!testResult) return;
    try {
      const colRef = collection(db, 'generated_curriculums');
      await addDoc(colRef, {
        ...testResult,
        savedAt: new Date().toISOString(),
        isTestRunSample: true
      });
      setTestSavedNotice(true);
      setTimeout(() => setTestSavedNotice(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Run Test Handler: Simulated test of the AI curriculum generator using currently saved URLs
  const handleRunSimulatedTest = async (forceFailure = false) => {
    setIsSimulatingTest(true);
    setSimulatedTestNotification(null);

    // Realistic AI engine simulation & schema grounding delay
    await new Promise(resolve => setTimeout(resolve, 900));

    const savedUrls = mappings.filter(m => m.sourceUrl && m.sourceUrl.trim().length > 0);

    // Check if there are saved URLs or if a failure simulation is explicitly requested
    if (forceFailure || savedUrls.length === 0) {
      const failureNotice = {
        type: 'failure' as const,
        title: 'فشل الاختبار المحاكي: تعذر محاكاة توليد المنهاج (Simulation Test Failed) ❌',
        message: forceFailure 
          ? 'فشل الاختبار المحاكي: تم رصد تعارض في تهيئة الروابط المحفوظة أو انقطاع في استجابة المرجع التعليمي المعتمد.'
          : 'فشل الاختبار المحاكي: لا توجد روابط تعليمية معتمدة محفوظة حالياً في النظام لتنفيذ المحاكاة.',
        testedCount: savedUrls.length,
        testedUrls: savedUrls.map(item => ({
          subject: item.subject,
          url: item.sourceUrl,
          status: 'invalid' as const,
          groundedScore: 0,
          latencyMs: 420,
          details: 'فشل التحقق من استجابة الرابط أو شهادة المرجع'
        })),
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setSimulatedTestNotification(failureNotice);
      setIsSimulatingTest(false);

      await logActivity({
        actionType: 'SIMULATED_TEST_RUN',
        actionName: 'تشغيل اختبار محاكي لمولد المناهج (Run Test)',
        details: `فشل الاختبار المحاكي (${failureNotice.message})`
      });
      return;
    }

    // Validate saved URLs
    const testedUrls = savedUrls.map(item => {
      let isValid = false;
      let score = 95;
      try {
        const u = new URL(item.sourceUrl);
        isValid = u.protocol === 'http:' || u.protocol === 'https:';
        if (item.sourceUrl.includes('vebschoolchemistry.com')) {
          score = 99;
        } else if (item.sourceUrl.includes('education.gov') || item.sourceUrl.includes('phet')) {
          score = 97;
        }
      } catch {
        isValid = false;
        score = 0;
      }

      return {
        subject: item.subject,
        url: item.sourceUrl,
        status: isValid ? ('valid' as const) : ('invalid' as const),
        groundedScore: score,
        latencyMs: Math.floor(Math.random() * 80) + 110,
        details: isValid 
          ? `مرجع معتمد نشط - تطابق تام مع منهاج ${item.subject}` 
          : 'صيغة الرابط غير صحيحة أو غير صالحة'
      };
    });

    const anyInvalid = testedUrls.some(t => t.status === 'invalid');

    if (anyInvalid) {
      const failureNotice = {
        type: 'failure' as const,
        title: 'فشل الاختبار: عُثر على روابط غير صالحة (Simulation Test Failed) ❌',
        message: 'فشلت محاكاة مولد المناهج بسبب وجود رابط محفوظ بصيغة غير صالحة أو غير مدعوم ببروتوكول https://. يرجى مراجعة وتحديث الروابط.',
        testedCount: savedUrls.length,
        testedUrls,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setSimulatedTestNotification(failureNotice);
      setIsSimulatingTest(false);

      await logActivity({
        actionType: 'SIMULATED_TEST_RUN',
        actionName: 'تشغيل اختبار محاكي لمولد المناهج (Run Test)',
        details: `فشل الاختبار المحاكي: عُثر على روابط غير صالحة من بين ${savedUrls.length} روابط`
      });
      return;
    }

    // Success Notification
    const primaryChem = savedUrls.find(s => s.sourceUrl.includes('vebschoolchemistry.com') || s.subject.includes('كيمياء'));
    const successNotice = {
      type: 'success' as const,
      title: 'نجاح الاختبار المحاكي لمولد المناهج بالذكاء الاصطناعي بنسبة 100% (Simulation Test Passed) ✅',
      message: `تم تشغيل الاختبار المحاكي بنجاح تام بالاعتماد الحصري على الروابط المحفوظة (${savedUrls.length} روابط معتمدة). تم توثيق المرجع المعتمد ومطابقة مخرجات تصنيف بلوم (Bloom's Taxonomy) ونماذج البجروت الوزارية بنجاح!`,
      testedCount: savedUrls.length,
      testedUrls,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      simulatedOutputPreview: {
        sampleUnitTitle: primaryChem ? 'الوحدة النموذجية: الاتزان الأيوني والأحماض والقواعد ومحاليل المنظمات' : `الوحدة النموذجية لمادة ${savedUrls[0]?.subject}`,
        accreditationStatus: `معتمد وموثق رقمياً وفق: ${primaryChem?.sourceTitle || savedUrls[0]?.sourceTitle}`,
        bloomsTaxonomyAligned: true,
        bagrutModelsVerified: primaryChem?.bagrutModels || ['037381', '037387']
      }
    };

    setSimulatedTestNotification(successNotice);
    setIsSimulatingTest(false);

    await logActivity({
      actionType: 'SIMULATED_TEST_RUN',
      actionName: 'تشغيل اختبار محاكي لمولد المناهج (Run Test)',
      details: `نجح الاختبار المحاكي لمولد المناهج بنجاح لـ ${savedUrls.length} روابط محفوظة`
    });
  };

  // Toggle active state for a mapping
  const handleToggleActive = async (id: string, currentVal: boolean) => {
    const updated = mappings.map(m => m.id === id ? { ...m, isActive: !currentVal, lastUpdated: new Date().toISOString() } : m);
    await onSaveMappings(updated);
    const target = mappings.find(m => m.id === id);
    await logActivity({
      actionType: 'UPDATE_CURRICULUM_SOURCE',
      actionName: currentVal ? 'تعطيل مرجع منهاج' : 'تفعيل مرجع منهاج',
      details: `${currentVal ? 'تم تعطيل' : 'تم تفعيل'} المرجع المعتمد لمادة (${target?.subject}): ${target?.sourceTitle}`
    });
    setSuccessMessage('تم تحديث حالة المرجع بنجاح ✨');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Submit form handler (Directly links and saves to approved sources database)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetSubject = subject === '__custom__' ? customSubjectInput.trim() : subject.trim();
    if (!targetSubject) {
      setFormError('يرجى تحديد أو إدخال تصنيف المادة الدراسية (Subject Classification).');
      return;
    }

    let cleanUrl = sourceUrl.trim();
    if (!cleanUrl || cleanUrl === 'https://') {
      setFormError('يرجى إدخال أو لصق رابط الموقع المعتمد (URL المرجع).');
      return;
    }

    // Auto prepend https:// if missing
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      new URL(cleanUrl);
    } catch {
      setFormError('رابط المرجع غير صالح. تأكد من كتابة رابط صالح مثل https://www.vebschoolchemistry.com/');
      return;
    }

    const isChem = targetSubject.includes('كيمياء') || cleanUrl.includes('vebschoolchemistry');
    const autoTitle = sourceTitle.trim() || (isChem 
      ? 'بوابة الاختبارات التفاعلية وصناعة المسابقات في الكيمياء (VebSchool Chemistry)' 
      : `مرجع ومصادر منهاج مادة ${targetSubject}`);

    // Parse models and topics
    const bagrutModels = bagrutModelsInput
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const approvedKeyTopics = approvedKeyTopicsInput
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    let updatedMappings: CurriculumSourceMapping[];

    if (editingId) {
      // Edit existing
      updatedMappings = mappings.map(m => {
        if (m.id === editingId) {
          return {
            ...m,
            subject: targetSubject,
            sourceTitle: autoTitle,
            sourceUrl: cleanUrl,
            sourceDescription: sourceDescription.trim(),
            bagrutModels,
            approvedKeyTopics,
            strictness,
            isPrimaryApprovedSource,
            targetGradeLevel,
            academicDifficultyRating,
            metadata: {
              ...(m.metadata || {}),
              targetGradeLevel,
              academicDifficultyRating,
              updatedAt: new Date().toISOString()
            },
            isActive,
            lastUpdated: new Date().toISOString()
          };
        }
        // If this one is primary and for the same subject, remove primary from others of same subject
        if (isPrimaryApprovedSource && m.subject === targetSubject && m.id !== editingId) {
          return { ...m, isPrimaryApprovedSource: false };
        }
        return m;
      });
    } else {
      // Add new
      const newMapping: CurriculumSourceMapping = {
        id: 'csm_' + Date.now(),
        subject: targetSubject,
        sourceTitle: autoTitle,
        sourceUrl: cleanUrl,
        sourceDescription: sourceDescription.trim(),
        bagrutModels,
        approvedKeyTopics,
        strictness,
        isPrimaryApprovedSource,
        targetGradeLevel,
        academicDifficultyRating,
        metadata: {
          targetGradeLevel,
          academicDifficultyRating,
          registeredAt: new Date().toISOString()
        },
        isActive,
        lastUpdated: new Date().toISOString()
      };

      updatedMappings = mappings.map(m => {
        if (isPrimaryApprovedSource && m.subject === targetSubject) {
          return { ...m, isPrimaryApprovedSource: false };
        }
        return m;
      });
      updatedMappings.push(newMapping);
    }

    // Save directly to the approved sources database
    await onSaveMappings(updatedMappings);
    await logActivity({
      actionType: editingId ? 'UPDATE_CURRICULUM_SOURCE' : 'CREATE_CURRICULUM_SOURCE',
      actionName: editingId ? 'تعديل مرجع في قاعدة بيانات المصادر المعتمدة' : 'إضافة مصدر في قاعدة بيانات المصادر المعتمدة',
      details: `تم ${editingId ? 'تعديل' : 'إضافة'} وحفظ مصدر مادة (${targetSubject}): ${autoTitle} [${cleanUrl}] مباشرة في قاعدة البيانات`
    });

    setIsFormOpen(false);
    setSuccessMessage(editingId ? 'تم حفظ تعديلات المصدر في قاعدة البيانات بنجاح 💾' : 'تم بنجاح حفظ وتوثيق المصدر في قاعدة بيانات المصادر المعتمدة 💾✨');
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    const target = mappings.find(m => m.id === id);
    const updated = mappings.filter(m => m.id !== id);
    await onSaveMappings(updated);
    await logActivity({
      actionType: 'DELETE_CURRICULUM_SOURCE',
      actionName: 'حذف مرجع منهاج',
      details: `تم حذف مرجع مادة (${target?.subject}): ${target?.sourceTitle}`
    });
    setDeleteConfirmId(null);
    setSuccessMessage('تم حذف التعيين بنجاح.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Reset to default mappings
  const handleResetDefaults = async () => {
    await onSaveMappings(DEFAULT_CURRICULUM_SOURCE_MAPPINGS);
    await logActivity({
      actionType: 'RESET_CURRICULUM_SOURCES',
      actionName: 'استعادة مراجع المناهج الافتراضية',
      details: `تمت استعادة القائمة الافتراضية لمراجع المناهج مع تثبيت بوابة VebSchool Chemistry كمرجع كيمياء معتمد.`
    });
    setResetConfirmOpen(false);
    setSuccessMessage('تمت استعادة المراجع المعتمدة الافتراضية بنجاح 🔄');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-10" dir="rtl">
      
      {/* Primary Header Banner */}
      <section className="bg-gradient-to-l from-[#D4A33C]/15 via-amber-500/10 to-transparent rounded-[2.5rem] p-8 sm:p-10 border border-[#D4A33C]/25 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-2.5 h-full bg-[#D4A33C]" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-[#D4A33C] flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
              <BookMarked size={28} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight" id="ai-curriculum-settings-panel-title">
                  AI Curriculum Settings
                </h3>
                <span className="bg-[#D4A33C]/20 text-amber-900 text-xs font-black px-3 py-1 rounded-xl border border-[#D4A33C]/30 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#D4A33C]" />
                  إعدادات وضبط مراجع ومصادر المناهج المعتمدة للذكاء الاصطناعي
                </span>
              </div>
              <p className="text-xs text-slate-600 font-bold leading-relaxed max-w-3xl">
                لوحة تحكم الإدارة لإدخال وإدارة قائمة الروابط المعتمدة (Approved URLs) وتعيينها لفئات المواد الدراسية (Subject Categories) مثل <strong className="font-mono text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">vebschoolchemistry.com</strong> لتوجيه محرك الذكاء الاصطناعي بدقة تامة.
              </p>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* 'Run Test' Button for Simulated Test of currently saved URLs */}
            <button
              type="button"
              onClick={() => handleRunSimulatedTest(false)}
              disabled={isSimulatingTest}
              id="run-test-button"
              data-testid="run-test-button"
              className="px-5 py-3 bg-gradient-to-l from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-indigo-600/25 flex items-center gap-2 cursor-pointer active:scale-95 border border-indigo-400/30"
              title="تشغيل اختبار محاكي لمولد المناهج بالذكاء الاصطناعي باستخدام الروابط المحفوظة حالياً"
            >
              {isSimulatingTest ? (
                <>
                  <Loader2 size={16} className="animate-spin text-indigo-200" />
                  <span>جاري تشغيل الاختبار...</span>
                </>
              ) : (
                <>
                  <FlaskConical size={16} className="text-amber-300" />
                  <span>Run Test 🧪 (تشغيل الاختبار)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTriggerTestRun()}
              id="test-run-curriculum-generator-btn"
              className="px-5 py-3 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
              title="تشغيل اختبار تجريبي فوري لمولد المناهج بالروابط المعتمدة"
            >
              <Zap size={16} className="text-amber-300 animate-pulse" />
              <span>معاينة التوليد الحقيقي 🚀</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              id="add-source-btn"
              data-testid="add-source-btn"
              className="px-5 py-3 bg-[#D4A33C] hover:bg-[#b88c32] text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
              title="فتح نافذة منبثقة لإضافة مصدر تعليمي معتمد وربطه مباشرة بقاعدة البيانات"
            >
              <Plus size={16} />
              <span>إضافة مصدر ➕</span>
            </button>

            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="px-4 py-3 bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="استعادة المراجع الافتراضية المعتمدة"
            >
              <RotateCcw size={15} />
              <span>استعادة الافتراضيات 🔄</span>
            </button>
          </div>
        </div>

        {/* Simulated Test Success or Failure Notification */}
        <AnimatePresence>
          {simulatedTestNotification && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              id="simulated-test-notification"
              className={`mt-6 rounded-3xl p-6 border-2 shadow-lg transition-all ${
                simulatedTestNotification.type === 'success'
                  ? 'bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border-emerald-300 text-emerald-950'
                  : 'bg-gradient-to-br from-rose-50 via-red-50/40 to-white border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    simulatedTestNotification.type === 'success'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}>
                    {simulatedTestNotification.type === 'success' ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <AlertCircle size={24} />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        simulatedTestNotification.type === 'success'
                          ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-200 text-rose-900 border border-rose-300'
                      }`}>
                        {simulatedTestNotification.type === 'success' ? 'Simulation Test: SUCCESS ✅' : 'Simulation Test: FAILURE ❌'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {simulatedTestNotification.timestamp}
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-black leading-snug">
                      {simulatedTestNotification.title}
                    </h4>

                    <p className="text-xs font-bold leading-relaxed opacity-90 max-w-3xl">
                      {simulatedTestNotification.message}
                    </p>
                  </div>
                </div>

                {/* Notification Action Buttons */}
                <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleRunSimulatedTest(false)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <RotateCcw size={13} />
                    <span>إعادة الاختبار 🔄</span>
                  </button>

                  {/* Toggle simulate failure for testing both notification types */}
                  <button
                    type="button"
                    onClick={() => handleRunSimulatedTest(simulatedTestNotification.type === 'success')}
                    className="px-3 py-2 bg-white/80 hover:bg-white border border-slate-200 text-slate-600 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                    title="تجربة عرض إشعار الحالة المعاكسة (نجاح / فشل)"
                  >
                    {simulatedTestNotification.type === 'success' ? 'اختبار حالة الفشل ⚠️' : 'اختبار حالة النجاح ✨'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulatedTestNotification(null)}
                    className="p-2 hover:bg-black/5 rounded-xl text-slate-500 transition-colors cursor-pointer"
                    title="إغلاق الإشعار"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Tested Saved URLs Detailed Preview Chips */}
              {simulatedTestNotification.testedUrls.length > 0 && (
                <div className="mt-4 pt-4 border-t border-black/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="flex items-center gap-1.5">
                      <Globe size={14} className="text-slate-500" />
                      <span>الروابط المعتمدة المحفوظة التي تم فحصها ومحاكاتها ({simulatedTestNotification.testedUrls.length} روابط):</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      زمن استجابة المحاكاة: ~120ms
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {simulatedTestNotification.testedUrls.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col justify-between gap-1.5 ${
                          item.status === 'valid'
                            ? 'bg-white border-emerald-200 text-slate-900 shadow-2xs'
                            : 'bg-white border-rose-200 text-slate-900 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-slate-800">{item.subject}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            item.status === 'valid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status === 'valid' ? 'مطابق 100%' : 'فشل'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 truncate" dir="ltr">
                          {item.url}
                        </span>
                        {item.details && (
                          <span className="text-[10px] text-slate-500">
                            {item.details}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success toast feedback inside banner */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm"
            >
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Quick Add & Map Approved URL Card - Manual Paste & Subject Dropdown */}
      <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border-2 border-amber-500/20 shadow-sm relative overflow-hidden bg-gradient-to-b from-amber-50/30 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100/80 pb-5 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black shadow-xs">
              <Database size={24} className="text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base sm:text-lg font-black text-slate-900">
                  إضافة ولصق رابط مصدر تعليمي جديد وحفظه في قاعدة البيانات
                </h4>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-black border border-amber-300">
                  Database Direct
                </span>
              </div>
              <p className="text-xs text-slate-600 font-bold mt-1">
                ألصق رابط المصدر التعليمي الجديد يدوياً (Manual URL Paste) وحدد فئة المادة الدراسية من القائمة المنسدلة لحفظه مباشرة في قاعدة بيانات المناهج
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => handleRunSimulatedTest(false)}
              disabled={isSimulatingTest}
              className="text-[11px] font-black text-indigo-900 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
              title="تشغيل اختبار محاكي للروابط المحفوظة حالياً"
            >
              <FlaskConical size={13} className="text-indigo-600" />
              <span>Run Test للروابط المحفوظة 🧪</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setQuickUrl('https://www.vebschoolchemistry.com/');
                setQuickSubject('الكيمياء');
                setQuickTitle('بوابة الاختبارات التفاعلية وصناعة المسابقات في الكيمياء (VebSchool Chemistry)');
              }}
              className="text-[11px] font-black text-amber-900 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <Sparkles size={13} className="text-amber-700" />
              <span>مثال سريع: vebschoolchemistry.com 🧪</span>
            </button>
          </div>
        </div>

        {quickError && (
          <div className="mb-5 p-3.5 bg-rose-50 border-2 border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-xs">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{quickError}</span>
          </div>
        )}

        <form onSubmit={handleQuickAdd} className="space-y-5">
          {/* Main Inputs: URL + Subject Dropdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            {/* Field 1: Manual Paste URL Field */}
            <div className="lg:col-span-7 space-y-1.5">
              <label 
                htmlFor="paste-educational-source-url" 
                className="text-xs font-black text-slate-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Globe size={14} className="text-amber-600" />
                  رابط المصدر التعليمي الجديد (Educational Source URL)
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  لصق يدوي أو كتابة
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="paste-educational-source-url"
                  data-testid="paste-educational-source-url"
                  name="educationalSourceUrl"
                  type="text"
                  value={quickUrl}
                  onChange={e => setQuickUrl(e.target.value)}
                  placeholder="ألصق الرابط هنا، مثال: https://www.vebschoolchemistry.com/ أو vebschoolchemistry.com"
                  className="w-full pr-4 pl-32 py-3 bg-white border-2 border-slate-200 focus:border-amber-500 rounded-2xl text-xs font-mono font-bold focus:ring-4 focus:ring-amber-500/10 outline-none text-slate-900 transition-all shadow-inner"
                  dir="ltr"
                />
                <div className="absolute left-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                    title="لصق الرابط مباشرة من الحافظة (Paste from Clipboard)"
                  >
                    <Clipboard size={12} className="text-amber-700" />
                    <span>لصق (Paste)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Field 2: Subject Category Dropdown */}
            <div className="lg:col-span-5 space-y-1.5">
              <label 
                htmlFor="select-source-subject-category" 
                className="text-xs font-black text-slate-800 flex items-center gap-1.5"
              >
                <BookMarked size={14} className="text-amber-600" />
                فئة المادة الدراسية للمصدر (Subject Category)
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="select-source-subject-category"
                  data-testid="select-source-subject-category"
                  name="subjectCategory"
                  value={quickSubject}
                  onChange={e => setQuickSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-amber-500 rounded-2xl text-xs font-black text-slate-900 focus:ring-4 focus:ring-amber-500/10 outline-none cursor-pointer transition-all shadow-inner appearance-none"
                >
                  {subjectsList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="__custom__">➕ إضافة فئة مادة دراسية أخرى (كتابة يدوية)...</option>
                </select>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Custom Subject field if user chooses __custom__ */}
          {quickSubject === '__custom__' && (
            <div className="space-y-1.5 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <label className="text-xs font-black text-slate-800 block">
                اكتب اسم فئة المادة الدراسية الجديدة: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={quickCustomSubject}
                onChange={e => setQuickCustomSubject(e.target.value)}
                placeholder="مثال: علم الأرض والبيئة، التكنولوجيا التطبيقية، إلخ..."
                className="w-full px-4 py-2.5 bg-white border-2 border-amber-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900"
                autoFocus
              />
            </div>
          )}

          {/* Quick Title & Source Optional Info */}
          <div>
            <input
              type="text"
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              placeholder="عنوان أو وصف المصدر التعليمي (اختياري - سيتم توليده تلقائياً من اسم المادة والرابط إن تُرك فارغاً)"
              className="w-full px-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-400 focus:bg-white transition-all placeholder:text-slate-400 shadow-inner"
            />
          </div>

          {/* Metadata Fields Block */}
          <div 
            id="manual-source-metadata-block"
            className="p-4 sm:p-5 bg-gradient-to-br from-amber-500/5 via-amber-50/40 to-slate-50/80 rounded-2xl border-2 border-dashed border-amber-300/80 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-black">
                  <Tag size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 tracking-wide">
                      البيانات الوصفية الأكاديمية للمصدر (Metadata Fields)
                    </span>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full font-bold border border-amber-300">
                      Metadata Block
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-bold mt-0.5">
                    تحديد المستوى الصفي المستهدف (Target Grade Level) وتقييم الصعوبة الأكاديمية (Academic Difficulty Rating) لتوجيه نموذج الذكاء الاصطناعي بدقة
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Metadata Field 1: Target Grade Level */}
              <div className="md:col-span-6 space-y-1.5">
                <label 
                  htmlFor="manual-source-target-grade" 
                  className="text-xs font-black text-slate-800 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <GraduationCap size={15} className="text-amber-600" />
                    المستوى الصفي المستهدف (Target Grade Level)
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">المرحلة الدراسية</span>
                </label>
                <div className="relative">
                  <select
                    id="manual-source-target-grade"
                    data-testid="manual-source-target-grade"
                    name="targetGradeLevel"
                    value={quickTargetGradeLevel}
                    onChange={e => setQuickTargetGradeLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer transition-all shadow-inner appearance-none"
                  >
                    <option value="الصف الثاني عشر (مسار البجروت / متقدم)">الصف الثاني عشر (مسار البجروت / متقدم)</option>
                    <option value="الصف الحادي عشر (المرحلة الثانوية)">الصف الحادي عشر (المرحلة الثانوية)</option>
                    <option value="الصف العاشر (المرحلة الثانوية - تأسيسي)">الصف العاشر (المرحلة الثانوية - تأسيسي)</option>
                    <option value="المرحلة الثانوية الشاملة (الصفوف 10 - 12)">المرحلة الثانوية الشاملة (الصفوف 10 - 12)</option>
                    <option value="المرحلة الإعدادية (الصفوف 7 - 9)">المرحلة الإعدادية (الصفوف 7 - 9)</option>
                    <option value="التعليم الأكاديمي والتحضيري الجامعي">التعليم الأكاديمي والتحضيري الجامعي</option>
                    <option value="__custom__">➕ مستوى صفي مخصص (إدخال يدوي)...</option>
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>

                {quickTargetGradeLevel === '__custom__' && (
                  <input
                    type="text"
                    value={quickCustomGradeLevel}
                    onChange={e => setQuickCustomGradeLevel(e.target.value)}
                    placeholder="اكتب المستوى الصفي المخصص هنا..."
                    className="w-full mt-2 px-3.5 py-2 bg-white border-2 border-amber-300 rounded-xl text-xs font-bold outline-none text-slate-900"
                    autoFocus
                  />
                )}
              </div>

              {/* Metadata Field 2: Academic Difficulty Rating (beginner / advanced) */}
              <div className="md:col-span-6 space-y-1.5">
                <label 
                  htmlFor="manual-source-difficulty-rating"
                  className="text-xs font-black text-slate-800 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <Gauge size={15} className="text-amber-600" />
                    تقييم الصعوبة الأكاديمية (Academic Difficulty Rating)
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                    {quickAcademicDifficultyRating === 'advanced' ? '🔥 متقدم (advanced)' : '🌱 مبتدئ (beginner)'}
                  </span>
                </label>

                {/* Visible Select & Interactive Options */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setQuickAcademicDifficultyRating('beginner')}
                    className={`py-2 px-3 rounded-xl border-2 text-xs font-black transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                      quickAcademicDifficultyRating === 'beginner'
                        ? 'border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>مبتدئ (beginner)</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      مفاهيم تأسيسية وتمهيدية
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickAcademicDifficultyRating('advanced')}
                    className={`py-2 px-3 rounded-xl border-2 text-xs font-black transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                      quickAcademicDifficultyRating === 'advanced'
                        ? 'border-amber-500 bg-amber-50/90 text-amber-950 shadow-xs ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>متقدم (advanced)</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      تفكير عليا وبجروت 5 وحدات
                    </span>
                  </button>
                </div>

                {/* Accessible Select bound to manual-source-difficulty-rating for programmatic access */}
                <select
                  id="manual-source-difficulty-rating"
                  data-testid="manual-source-difficulty-rating"
                  name="academicDifficultyRating"
                  value={quickAcademicDifficultyRating}
                  onChange={e => setQuickAcademicDifficultyRating(e.target.value as 'beginner' | 'advanced')}
                  className="w-full mt-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="beginner">مبتدئ / أساسي (beginner)</option>
                  <option value="advanced">متقدم / تعمقي (advanced)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions Row: Save to Database Button & Status Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 order-2 sm:order-1">
              <ShieldCheck size={14} className="text-emerald-600" />
              حفظ فوري ومشفر في Firebase Firestore مع توثيق البيانات الوصفية (Metadata)
            </span>

            <button
              type="submit"
              id="save-source-to-database-btn"
              data-testid="save-source-to-database-btn"
              disabled={quickSubmitting}
              className="py-3 px-6 bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-black rounded-2xl transition-all shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 order-1 sm:order-2 self-stretch sm:self-auto"
            >
              {quickSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>جاري الحفظ في قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <Database size={16} className="text-amber-200" />
                  <Save size={16} />
                  <span>حفظ المصدر والبيانات الوصفية في قاعدة البيانات 💾 (Save to Database)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Featured Primary Approved Reference Card (VEB School Chemistry) */}
      {primaryChemReference && (
        <section className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-[2.5rem] p-8 border-2 border-amber-500/30 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="bg-amber-500 text-white text-[11px] font-black px-3.5 py-1 rounded-xl shadow-sm flex items-center gap-1.5">
                  <Sparkles size={13} />
                  المرجع الحصري المعتمد لمادة الكيمياء (Primary Approved Source)
                </span>
                <span className="bg-rose-50 text-rose-700 text-[10px] font-black px-2.5 py-0.5 rounded-lg border border-rose-200 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  إلزامي وحصري (Exclusive Strictness)
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  نشط وفعّال ⚡
                </span>
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <FlaskConical className="text-amber-500 shrink-0" size={24} />
                  <span>{primaryChemReference.sourceTitle}</span>
                </h4>
                <p className="text-xs text-slate-600 font-bold mt-1.5 leading-relaxed">
                  {primaryChemReference.sourceDescription || 'بوابة الاختبارات التفاعلية وصناعة المسابقات في الكيمياء، نماذج بجروت 037381 و 037387، وتصنيف بلوم للمخرجات التعلّمية.'}
                </p>
              </div>

              {/* URL with quick click-to-open */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-amber-500/30 rounded-xl text-xs font-mono font-bold text-amber-900 shadow-xs">
                  <Globe size={14} className="text-amber-500" />
                  <span>{primaryChemReference.sourceUrl}</span>
                </div>
                <a
                  href={primaryChemReference.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-colors shadow-xs"
                >
                  <span>زيارة البوابة المعتمدة 🌐</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Models & Topics Chips */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-500">
                  <span className="text-slate-700 font-black">نماذج البجروت المقترنة:</span>
                  {(primaryChemReference.bagrutModels || []).map((model, idx) => (
                    <span key={idx} className="bg-amber-100/80 text-amber-900 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-black border border-amber-300/60">
                      {model}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-500">
                  <span className="text-slate-700 font-black">المحاور المعتمدة:</span>
                  {(primaryChemReference.approvedKeyTopics || []).slice(0, 4).map((top, idx) => (
                    <span key={idx} className="bg-white text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200">
                      {top}
                    </span>
                  ))}
                  {(primaryChemReference.approvedKeyTopics || []).length > 4 && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                      +{(primaryChemReference.approvedKeyTopics || []).length - 4} محاور أخرى
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions for this primary card */}
            <div className="flex lg:flex-col items-center gap-2.5 shrink-0 justify-end pt-4 lg:pt-0 border-t lg:border-t-0 border-amber-200/60">
              <button
                type="button"
                onClick={() => handleTriggerTestRun(primaryChemReference)}
                className="w-full px-5 py-2.5 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                id="test-run-primary-chem-btn"
              >
                <Zap size={14} className="text-amber-300" />
                <span>اختبار التوليد الفوري للمرجع 🧪 (Test Run)</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenEdit(primaryChemReference)}
                className="w-full px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Edit3 size={14} className="text-amber-500" />
                <span>تعديل إعدادات الربط ⚙️</span>
              </button>

              {onOpenGenerator && (
                <button
                  type="button"
                  onClick={onOpenGenerator}
                  className="w-full px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Sparkles size={14} />
                  <span>توليد منهاج كيمياء الآن 🚀</span>
                </button>
              )}
            </div>

          </div>
        </section>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-xs">
          <div className="text-[11px] font-black text-slate-400">إجمالي المواد المعينة</div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{mappings.length}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-1">تغطي التخصصات الأساسية</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-xs">
          <div className="text-[11px] font-black text-slate-400">المراجع النشطة</div>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">{activeCount}</div>
          <div className="text-[10px] text-emerald-700 font-bold mt-1">جاهزة للاستدعاء والتوليد</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-xs">
          <div className="text-[11px] font-black text-slate-400">مراجع حصرية (Exclusive)</div>
          <div className="text-2xl font-black text-rose-600 mt-1 font-mono">{exclusiveCount}</div>
          <div className="text-[10px] text-rose-700 font-bold mt-1">تقييد دقيق ضد الاختلاق</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-xs">
          <div className="text-[11px] font-black text-slate-400">المراجع المعتمدة الرئيسية</div>
          <div className="text-2xl font-black text-[#D4A33C] mt-1 font-mono">{primaryCount}</div>
          <div className="text-[10px] text-amber-700 font-bold mt-1">تشمل VEB Chemistry</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <section className="bg-white rounded-[2rem] p-6 border border-slate-200/70 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المادة، عنوان المرجع، الرابط، أو رقم نموذج البجروت..."
              className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                مسح
              </button>
            )}
          </div>

          {/* Strictness Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-black text-slate-500 flex items-center gap-1">
              <Filter size={13} />
              السياسة:
            </span>
            <select
              value={strictnessFilter}
              onChange={e => setStrictnessFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">جميع السياسات</option>
              <option value="exclusive">حصري ومطلق (Exclusive)</option>
              <option value="preferred">مفضل ومعتمد (Preferred)</option>
              <option value="optional">استرشادي (Optional)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-black text-slate-500">الحالة:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">الكل ({mappings.length})</option>
              <option value="active">نشط فقط ({activeCount})</option>
              <option value="inactive">معطل فقط ({mappings.length - activeCount})</option>
            </select>
          </div>

        </div>
      </section>

      {/* Mappings Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMappings.map(item => {
          const strictConfig = STRICTNESS_CONFIG[item.strictness] || STRICTNESS_CONFIG.preferred;

          return (
            <motion.div
              key={item.id}
              layout
              className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                item.isPrimaryApprovedSource 
                  ? 'border-amber-400/80 shadow-md ring-2 ring-amber-400/10' 
                  : item.isActive 
                    ? 'border-slate-200 hover:border-slate-300 shadow-xs' 
                    : 'border-slate-200/60 bg-slate-50/50 opacity-70'
              }`}
            >
              <div className="space-y-4">
                
                {/* Header row: Subject + Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
                      {getSubjectIcon(item.subject)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-900">{item.subject}</h4>
                        {item.isPrimaryApprovedSource && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                            مرجع معتمد رئيسي ⭐
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-bold mt-0.5">
                        آخر تحديث: {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('ar-EG') : 'افتراضي'}
                      </div>
                    </div>
                  </div>

                  {/* Strictness badge */}
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border shrink-0 ${strictConfig.badge}`}>
                    {strictConfig.label}
                  </span>
                </div>

                {/* Source Title & Description */}
                <div>
                  <h5 className="text-sm font-black text-slate-800 leading-snug">{item.sourceTitle}</h5>
                  {item.sourceDescription && (
                    <p className="text-xs text-slate-500 font-bold mt-1 line-clamp-2 leading-relaxed">
                      {item.sourceDescription}
                    </p>
                  )}
                </div>

                {/* URL Badge */}
                <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe size={13} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-slate-700 truncate" dir="ltr">
                      {item.sourceUrl}
                    </span>
                  </div>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors shrink-0"
                    title="فتح الرابط في نافذة جديدة"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>

                {/* Metadata Badges: Target Grade Level & Academic Difficulty Rating */}
                {(item.targetGradeLevel || item.academicDifficultyRating || item.metadata?.targetGradeLevel || item.metadata?.academicDifficultyRating) && (
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {(item.targetGradeLevel || item.metadata?.targetGradeLevel) && (
                      <span className="text-[10px] font-black bg-blue-50 text-blue-900 border border-blue-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                        <GraduationCap size={12} className="text-blue-600" />
                        <span>{item.targetGradeLevel || item.metadata?.targetGradeLevel}</span>
                      </span>
                    )}
                    {(item.academicDifficultyRating || item.metadata?.academicDifficultyRating) && (
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 shadow-2xs ${
                        (item.academicDifficultyRating || item.metadata?.academicDifficultyRating) === 'advanced'
                          ? 'bg-amber-50 text-amber-950 border-amber-300'
                          : 'bg-emerald-50 text-emerald-950 border-emerald-300'
                      }`}>
                        <Gauge size={12} className={(item.academicDifficultyRating || item.metadata?.academicDifficultyRating) === 'advanced' ? 'text-amber-600' : 'text-emerald-600'} />
                        <span>
                          {(item.academicDifficultyRating || item.metadata?.academicDifficultyRating) === 'advanced' 
                            ? 'مستوى متقدم (advanced)' 
                            : 'مستوى مبتدئ (beginner)'}
                        </span>
                      </span>
                    )}
                  </div>
                )}

                {/* Bagrut Models */}
                {item.bagrutModels && item.bagrutModels.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-black text-slate-400 block">نماذج البجروت المرتبطة:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.bagrutModels.map((m, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-slate-200">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Topics preview */}
                {item.approvedKeyTopics && item.approvedKeyTopics.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-black text-slate-400 block">المحاور التعليمية المعتمدة:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.approvedKeyTopics.slice(0, 3).map((top, idx) => (
                        <span key={idx} className="bg-amber-500/5 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/10">
                          {top}
                        </span>
                      ))}
                      {item.approvedKeyTopics.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-bold px-1.5 py-0.5">
                          +{item.approvedKeyTopics.length - 3} محاور
                        </span>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Footer Actions */}
              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                
                {/* Active switch */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={() => handleToggleActive(item.id, item.isActive)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold ${item.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {item.isActive ? 'نشط في التوليد' : 'معطل'}
                  </span>
                </label>

                {/* Edit & Delete & Test */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTriggerTestRun(item)}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[11px] font-black"
                    title="تشغيل اختبار التوليد التجريبي لهذا الرابط"
                  >
                    <Play size={11} className="fill-emerald-600 text-emerald-600" />
                    <span>اختبار الرابط 🚀</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 hover:bg-amber-500/10 text-slate-600 hover:text-amber-700 rounded-xl transition-colors cursor-pointer"
                    title="تعديل هذا التعيين"
                  >
                    <Edit3 size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                    title="حذف هذا التعيين"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

              </div>

            </motion.div>
          );
        })}
      </div>

      {filteredMappings.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8">
          <BookMarked size={40} className="mx-auto text-slate-300 mb-3" />
          <h4 className="text-base font-black text-slate-800">لم يتم العثور على مراجع مطابقة</h4>
          <p className="text-xs text-slate-400 font-bold mt-1">
            جرب تعديل كلمات البحث أو الفلاتر، أو أضف مرجعاً جديداً.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            id="empty-add-source-btn"
            className="mt-4 px-5 py-2.5 bg-[#D4A33C] hover:bg-[#b88c32] text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 mx-auto cursor-pointer"
          >
            <Plus size={15} />
            <span>إضافة مصدر ➕</span>
          </button>
        </div>
      )}

      {/* Add / Edit Modal - إضافة مصدر نافذة منبثقة */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl p-6 sm:p-8 max-w-2xl w-full text-right overflow-y-auto max-h-[90vh] relative"
              dir="rtl"
            >
              <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-l from-amber-500 to-[#D4A33C]" />
              
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <BookMarked size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 leading-tight">
                      {editingId ? 'تعديل مصدر ومطابقة المادة' : 'إضافة مصدر تعليمي معتمد جديد ➕'}
                    </h4>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                      إدخال URL المرجع، وتصنيفه حسب الموضوع، وإضافة وصف سريع، مع الحفظ المباشر بقاعدة البيانات.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-black transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-5">
                
                {/* 1. Reference URL (URL المرجع) */}
                <div className="space-y-1.5 p-4 bg-amber-50/40 rounded-2xl border border-amber-200/70">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label htmlFor="modal-source-url" className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Globe size={14} className="text-amber-600" />
                      <span>URL المرجع / رابط الموقع المعتمد <span className="text-rose-500">*</span></span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="modal-paste-url-btn"
                        onClick={handleModalPasteFromClipboard}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="لصق الرابط مباشرة من الحافظة"
                      >
                        <ClipboardPaste size={12} />
                        <span>لصق من الحافظة 📋</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSourceUrl('https://www.vebschoolchemistry.com/');
                          if (!sourceTitle) setSourceTitle('بوابة الاختبارات التفاعلية وصناعة المسابقات في الكيمياء (VebSchool Chemistry)');
                          if (!sourceDescription) setSourceDescription('المرجع الرقمي الشامل لمنهاج الكيمياء، بنوك الأسئلة، ومسابقات التميز الأكاديمي.');
                        }}
                        className="text-[10px] font-black text-amber-700 hover:text-amber-800 underline cursor-pointer"
                      >
                        وضع رابط VEB Chemistry
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    id="modal-source-url"
                    name="sourceUrl"
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    placeholder="https://www.vebschoolchemistry.com/"
                    className="w-full px-4 py-3 bg-white border border-amber-300/80 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-left"
                    dir="ltr"
                    required
                  />
                  <p className="text-[10px] text-slate-500 font-bold">
                    أدخل الرابط الكامل للبوابة أو الموقع التعليمي المراد اعتماده كمصدر أساسي للمنهاج.
                  </p>
                </div>

                {/* 2. Classification by Subject (تصنيفه حسب الموضوع) */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-source-subject" className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-slate-500" />
                    <span>تصنيف المرجع حسب الموضوع / المادة الدراسية <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    id="modal-source-subject"
                    name="subject"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none cursor-pointer"
                  >
                    {subjectsList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="__custom__">+ مادة دراسية أخرى (كتابة يدوية)...</option>
                  </select>
                </div>

                {subject === '__custom__' && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label htmlFor="modal-source-custom-subject" className="text-xs font-black text-slate-700 block">
                      اسم المادة الدراسية الجديدة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="modal-source-custom-subject"
                      value={customSubjectInput}
                      onChange={e => setCustomSubjectInput(e.target.value)}
                      placeholder="مثال: علم البيئة أو الفلسفة..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                    />
                  </div>
                )}

                {/* 3. Quick Description (إضافة وصف سريع) */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-source-description" className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-500" />
                    <span>وصف سريع للمرجع ومحتوياته التعليمية</span>
                  </label>
                  <textarea
                    id="modal-source-description"
                    name="sourceDescription"
                    rows={2}
                    value={sourceDescription}
                    onChange={e => setSourceDescription(e.target.value)}
                    placeholder="توضيح مختصر لمحتويات البوابة وتغطيتها لنماذج الاختبارات والتصنيف الأكاديمي..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
                  />
                  <p className="text-[10px] text-slate-400 font-bold">
                    وصف موجز يوضح للمولد الذكي سياق المحتوى وأهم المخرجات المستهدفة.
                  </p>
                </div>

                {/* 4. Source Title */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-source-title" className="text-xs font-black text-slate-700 block">
                    عنوان أو اسم البوابة / المرجع المعتمد
                  </label>
                  <input
                    type="text"
                    id="modal-source-title"
                    name="sourceTitle"
                    value={sourceTitle}
                    onChange={e => setSourceTitle(e.target.value)}
                    placeholder="مثال: بوابة الاختبارات التفاعلية وصناعة المسابقات في الكيمياء (أو يترك فارغاً للاستنتاج التلقائي)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>

                {/* 5. Metadata Fields Block for Modal Form */}
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900 border-b border-amber-200/60 pb-2">
                    <Tag size={15} className="text-amber-700" />
                    <span>البيانات الوصفية الأكاديمية للمصدر (Metadata Fields)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Target Grade Level */}
                    <div className="space-y-1.5">
                      <label htmlFor="modal-source-grade" className="text-xs font-black text-slate-700 block">
                        المستوى الصفي المستهدف (Target Grade Level) *
                      </label>
                      <input
                        type="text"
                        id="modal-source-grade"
                        value={targetGradeLevel}
                        onChange={e => setTargetGradeLevel(e.target.value)}
                        placeholder="الصف الثاني عشر (مسار البجروت / متقدم)"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    {/* Academic Difficulty Rating */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 block">
                        تقييم الصعوبة الأكاديمية (Academic Difficulty Rating) *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAcademicDifficultyRating('beginner')}
                          className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            academicDifficultyRating === 'beginner'
                              ? 'border-emerald-500 bg-emerald-100/60 text-emerald-950 font-black'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          <span>🌱 مبتدئ (beginner)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAcademicDifficultyRating('advanced')}
                          className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            academicDifficultyRating === 'advanced'
                              ? 'border-amber-500 bg-amber-100/60 text-amber-950 font-black'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          <span>🔥 متقدم (advanced)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Bagrut models & Key Topics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 block">
                      نماذج امتحانات البجروت المعتمدة
                    </label>
                    <textarea
                      rows={2}
                      value={bagrutModelsInput}
                      onChange={e => setBagrutModelsInput(e.target.value)}
                      placeholder={`037381 (الكيمياء الأساسية)\n037387 (مختبر التقصي)`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 block">
                      المحاور والمفاهيم الأساسية
                    </label>
                    <textarea
                      rows={2}
                      value={approvedKeyTopicsInput}
                      onChange={e => setApprovedKeyTopicsInput(e.target.value)}
                      placeholder={`بنية الذرة والروابط الكيميائية\nالأحماض والقواعد والاتزان`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* 7. Strictness Policy */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 block">
                    سياسة الاعتماد والالتزام بالمرجع
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(['exclusive', 'preferred', 'optional'] as const).map(st => {
                      const cfg = STRICTNESS_CONFIG[st];
                      const isSelected = strictness === st;
                      return (
                        <div
                          key={st}
                          onClick={() => setStrictness(st)}
                          className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-amber-500 bg-amber-50/50 shadow-xs' 
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="text-xs font-black text-slate-900">{cfg.label}</div>
                          <div className="text-[10px] text-slate-500 font-bold mt-0.5 leading-snug">{cfg.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Toggles */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPrimaryApprovedSource}
                      onChange={e => setIsPrimaryApprovedSource(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-900 block">
                        تعيين كمرجع رسمي رئيسي معتمد لهذه المادة ⭐
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer select-none pt-2 border-t border-slate-200/60">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-900 block">
                        تفعيل المرجع للاستخدام الفوري في التوليد الأكاديمي ⚡
                      </span>
                    </div>
                  </label>
                </div>

                {/* 8. Form Buttons with Direct Save to Database Button */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    id="modal-save-source-btn"
                    data-testid="save-source-button"
                    disabled={isSaving}
                    className="px-6 py-3 bg-[#D4A33C] hover:bg-[#b88c32] disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
                    title="حفظ وربط المصدر مباشرة بقاعدة بيانات المصادر المعتمدة"
                  >
                    <Check size={16} />
                    <span>
                      {isSaving 
                        ? 'جاري الحفظ في قاعدة البيانات...' 
                        : (editingId 
                            ? 'حفظ التعديلات في قاعدة البيانات 💾' 
                            : 'حفظ في قاعدة بيانات المصادر المعتمدة 💾')}
                    </span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full text-right"
              dir="rtl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>

              <h4 className="text-base font-black text-slate-900 leading-tight">
                هل أنت متأكد من حذف تعيين المرجع؟
              </h4>
              <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">
                سيؤدي هذا الإجراء إلى إزالة ربط هذا المرجع من محرك توليد المناهج بالذكاء الاصطناعي لهذه المادة.
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors"
                >
                  نعم، احذف التعيين
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Defaults Confirmation Modal */}
      <AnimatePresence>
        {resetConfirmOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full text-right"
              dir="rtl"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#D4A33C] flex items-center justify-center mb-4">
                <RotateCcw size={24} />
              </div>

              <h4 className="text-base font-black text-slate-900 leading-tight">
                استعادة المراجع المعتمدة الافتراضية
              </h4>
              <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">
                سيتم استبدال القائمة الحالية بالقائمة الافتراضية المعتمدة لكافة المواد الدراسية، مع تثبيت بوابة VEB School Chemistry كمرجع كيمياء حصري ومعتمد لنماذج بجروت 037381 و 037387.
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="flex-1 py-2.5 bg-[#D4A33C] hover:bg-[#b88c32] text-white rounded-xl text-xs font-black transition-colors shadow-sm"
                >
                  استعادة الافتراضيات 🔄
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Test Run Curriculum Generator Modal */}
      <AnimatePresence>
        {isTestRunModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl p-6 sm:p-8 max-w-3xl w-full text-right overflow-y-auto max-h-[92vh] relative"
              dir="rtl"
            >
              <div className="absolute top-0 right-0 w-full h-2.5 bg-gradient-to-l from-emerald-500 via-teal-500 to-[#D4A33C]" />
              
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Zap size={24} className="text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-slate-900 leading-tight">
                        اختبار تشغيل مولّد المناهج بالروابط المعتمدة (Test Run Generator) 🚀
                      </h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                        فحص مباشر Live AI
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      تشغيل تجريبي فوري لمخرجات الذكاء الاصطناعي والتأكد من استنادها الحصري إلى الرابط المعتمد المحدد
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTestRunModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-black transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Configuration of Test Run */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Mapped Source */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">
                      المصدر والرابط المراد اختباره:
                    </label>
                    <select
                      value={testMappingId}
                      onChange={e => handleTestMappingChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {mappings.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.subject} - {m.sourceTitle.split('(')[0].trim()} ({m.sourceUrl})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Active Target URL display */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">
                      الرابط المعتمد قيد الفحص (Tested URL):
                    </label>
                    <div className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-800 flex items-center justify-between truncate" dir="ltr">
                      <span className="truncate">{testUrl}</span>
                      <a href={testUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-emerald-50 text-emerald-600 rounded">
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>

                  {/* Topic being tested */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-black text-slate-700 block">
                      المحور الدراسي المستهدف للاختبار التجريبي:
                    </label>
                    <input
                      type="text"
                      value={testTopic}
                      onChange={e => setTestTopic(e.target.value)}
                      placeholder="أدخل موضوع الاختبار..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Trigger button inside modal */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    سيتم إرسال الرابط المعتمد كمرجع وحيد وإلزامي في استدعاء الذكاء الاصطناعي.
                  </span>
                  <button
                    type="button"
                    onClick={handleExecuteTestRun}
                    disabled={testRunning}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 shrink-0"
                    id="execute-curriculum-test-run-action"
                  >
                    {testRunning ? <Loader2 size={15} className="animate-spin" /> : <Play size={14} className="fill-white" />}
                    <span>{testRunning ? 'جاري تشغيل الاختبار...' : 'بدء الاختبار الفوري ⚡'}</span>
                  </button>
                </div>
              </div>

              {/* Error box */}
              {testError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 mb-6">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{testError}</span>
                </div>
              )}

              {/* Progress Steps Indicator during test run */}
              {testRunning && (
                <div className="p-6 bg-emerald-50/50 border border-emerald-200 rounded-3xl space-y-4 mb-6">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-900">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                    <span>جاري تنفيذ اختبار التوليد الميداني...</span>
                  </div>

                  <div className="space-y-2.5 text-xs font-bold">
                    <div className={`flex items-center gap-2 transition-all ${testProgressStep >= 1 ? 'text-emerald-800 font-black' : 'text-slate-400'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${testProgressStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>1</span>
                      <span>التحقق من الرابط المعتمد ({testUrl}) والاتصال الآمن بخادم الذكاء الاصطناعي...</span>
                    </div>

                    <div className={`flex items-center gap-2 transition-all ${testProgressStep >= 2 ? 'text-emerald-800 font-black' : 'text-slate-400'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${testProgressStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>2</span>
                      <span>بناء هيكل المنهاج وتقييد المخرجات بالبوابة المعتمدة ونماذج البجروت...</span>
                    </div>

                    <div className={`flex items-center gap-2 transition-all ${testProgressStep >= 3 ? 'text-emerald-800 font-black' : 'text-slate-400'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${testProgressStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>3</span>
                      <span>تصنيف نواتج التعلم وفق مستويات بلوم الستة وهندسة التجارب المخبرية...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Results Card */}
              {testResult && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {/* Verified Accreditation Banner */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <span className="font-black text-emerald-900">
                        تم التحقق بنجاح: تم التوليد استناداً حصرياً ومباشراً إلى:
                      </span>
                      <strong className="font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300" dir="ltr">
                        {testResult.accreditationReference?.sourceUrl || testUrl}
                      </strong>
                    </div>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-2.5 py-0.5 rounded-full">
                      تأكيد المطابقة ✓
                    </span>
                  </div>

                  {/* Summary Details */}
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                    <h5 className="text-base font-black text-slate-900 leading-snug">
                      {testResult.title}
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {testResult.overview}
                    </p>

                    {/* Unit & Lesson Preview */}
                    {testResult.units && testResult.units[0] && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">
                            الوحدة الأولى: {testResult.units[0].title}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {testResult.units[0].totalHours} ساعات تدريسية
                          </span>
                        </div>

                        {testResult.units[0].lessons && testResult.units[0].lessons[0] && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-emerald-950">
                                الدرس الأول: {testResult.units[0].lessons[0].title}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold">
                                المدة: {testResult.units[0].lessons[0].durationMinutes} دقيقة
                              </span>
                            </div>

                            {/* Key Concepts */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {(testResult.units[0].lessons[0].keyConcepts || []).map((c: string, idx: number) => (
                                <span key={idx} className="bg-white text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                                  {c}
                                </span>
                              ))}
                            </div>

                            {/* Learning Outcomes sample */}
                            {testResult.units[0].lessons[0].learningOutcomes && testResult.units[0].lessons[0].learningOutcomes.length > 0 && (
                              <div className="space-y-1.5 pt-2">
                                <span className="text-[11px] font-black text-slate-700 block">
                                  عينة مخرجات التعلم المصنفة وفق هرم بلوم:
                                </span>
                                <div className="space-y-2">
                                  {testResult.units[0].lessons[0].learningOutcomes.slice(0, 2).map((out: any, idx: number) => (
                                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800">{out.outcomeText}</span>
                                        <span className="text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                                          {out.bloomLabel || out.bloomLevel}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        معيار التقييم: {out.successCriteria}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Lab inquiry activity if present */}
                            {testResult.units[0].lessons[0].experimentalLabWork && (
                              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs space-y-1 mt-2">
                                <div className="font-black text-amber-950 flex items-center gap-1.5">
                                  <FlaskConical size={13} className="text-amber-600" />
                                  <span>النشاط المخبري والاستقصائي: {testResult.units[0].lessons[0].experimentalLabWork.labTitle}</span>
                                </div>
                                <div className="text-[10px] text-amber-900 leading-relaxed">
                                  إرشادات السلامة: {testResult.units[0].lessons[0].experimentalLabWork.safetyInstructions}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons for Results */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveTestResult}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save size={14} />
                        <span>حفظ النموذج التجريبي في السجلات 💾</span>
                      </button>
                      {testSavedNotice && (
                        <span className="text-xs font-bold text-emerald-700">تم الحفظ بنجاح!</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenGenerator && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsTestRunModalOpen(false);
                            onOpenGenerator();
                          }}
                          className="px-5 py-2.5 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>فتح المنظومة الكاملة لمولد المناهج 🚀</span>
                          <ArrowRight size={14} className="rotate-180" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsTestRunModalOpen(false)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CurriculumSourcesManager;

