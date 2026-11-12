import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Layers, 
  ExternalLink, 
  Award, 
  CheckCircle2, 
  FlaskConical, 
  Sliders, 
  TrendingUp, 
  Save, 
  Printer, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  AlertCircle, 
  Atom, 
  Send,
  Eye,
  Check,
  Plus,
  Compass,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MathJaxSection } from './MathJaxSection';
import { collection, addDoc, getDocs, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CurriculumSourceMapping, DEFAULT_CURRICULUM_SOURCE_MAPPINGS } from '../types';

export interface LearningOutcomeClassification {
  id: string;
  outcomeText: string;
  bloomLevel: 'knowledge' | 'comprehension' | 'application' | 'analysis' | 'synthesis' | 'evaluation';
  bloomLabel: string;
  skillCategory: 'conceptual' | 'quantitative' | 'experimental_lab' | 'inquiry_research' | 'critical_thinking';
  skillLabel: string;
  assessmentMethod: string;
  successCriteria: string;
  targetQuestionSample?: string;
}

export interface GeneratedCurriculumLesson {
  id: string;
  title: string;
  lessonNumber: number;
  durationMinutes: number;
  keyConcepts: string[];
  detailedExplanation: string;
  learningOutcomes: LearningOutcomeClassification[];
  experimentalLabWork?: {
    labTitle: string;
    safetyInstructions: string;
    toolsAndChemicals: string[];
    procedureSteps: string[];
    expectedObservations: string;
  };
  practiceQuestions?: Array<{
    questionText: string;
    options?: string[];
    correctAnswer: string;
    bloomLevel: string;
    explanation: string;
  }>;
  vebChemistryReference: {
    portalUrl: string;
    portalSection: string;
    bagrutModel?: string;
    approvedReferenceNote: string;
  };
}

export interface GeneratedCurriculumUnit {
  id: string;
  unitNumber: number;
  title: string;
  description: string;
  totalHours: number;
  lessons: GeneratedCurriculumLesson[];
}

export interface BloomSummaryItem {
  level: string;
  label: string;
  percentage: number;
  count: number;
  color: string;
}

export interface GeneratedCurriculum {
  id?: string;
  title: string;
  subject: string;
  grade: string;
  academicYear: string;
  accreditationReference: {
    sourceName: string;
    sourceUrl: string;
    verifiedDate: string;
    description: string;
  };
  overview: string;
  prerequisites: string[];
  units: GeneratedCurriculumUnit[];
  totalOutcomesCount?: number;
  bloomTaxonomySummary?: BloomSummaryItem[];
  createdAt: string;
}

const BLOOM_LEVEL_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  knowledge: { label: 'تذكر ومعرفة', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-250' },
  comprehension: { label: 'فهم واستيعاب', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  application: { label: 'تطبيق كمي وحسابي', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  analysis: { label: 'تحليل واستقصاء', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  synthesis: { label: 'تركيب وتصميم مخبري', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  evaluation: { label: 'تقويم ونقد علمي', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
};

const SKILL_CATEGORY_BADGES: Record<string, { label: string; icon: string }> = {
  conceptual: { label: 'مفاهيمية ونظرية', icon: '🧠' },
  quantitative: { label: 'كمية وحسابات مول', icon: '📐' },
  experimental_lab: { label: 'مخبرية وتجارب عملية', icon: '🧪' },
  inquiry_research: { label: 'استقصاء وبحث علمي', icon: '🔍' },
  critical_thinking: { label: 'تفكير ناقد وحل مشكلات', icon: '💡' }
};

const SUGGESTED_CHEMISTRY_TOPICS = [
  'الحسابات الكيميائية والمول وقوانين الغازات (نموذج بجروت 037381)',
  'الاتزان الكيميائي وسرعة التفاعلات ومبدأ لوشاتيليه (نموذج 037387)',
  'الكيمياء العضوية والمجموعات الوظيفية والبوليمرات',
  'مبنى الذرة، الجدول الدوري، والروابط الكيميائية (تساهمية وأيونية وفلزية)',
  'الأحماض والقواعد، الرقم الهيدروجيني pH والمحاليل المنظمة',
  'الكيمياء الحرارية والتفاعلات الماصة والطاردة للحرارة وتغيرات الإنثالبي'
];

interface AICurriculumGeneratorProps {
  onApplyCurriculumToPortal?: (curriculum: GeneratedCurriculum) => void;
}

export const AICurriculumGenerator: React.FC<AICurriculumGeneratorProps> = ({
  onApplyCurriculumToPortal
}) => {
  // Input parameters
  const [sourceMappings, setSourceMappings] = useState<CurriculumSourceMapping[]>(DEFAULT_CURRICULUM_SOURCE_MAPPINGS);
  const [subject, setSubject] = useState('الكيمياء');
  const [grade, setGrade] = useState('الصف الثاني عشر - مسار البجروت (5 وحدات)');
  const [topic, setTopic] = useState('الحسابات الكيميائية والمول، الاتزان وسرعة التفاعل، والكيمياء العضوية');
  const [unitsCount, setUnitsCount] = useState(3);
  const [lessonsPerUnit, setLessonsPerUnit] = useState(1);
  const [bagrutModel, setBagrutModel] = useState('037381 و 037387 (مسار 4 و 5 وحدات)');
  const [referenceUrl, setReferenceUrl] = useState('https://www.vebschoolchemistry.com/');
  const [targetAudience, setTargetAudience] = useState('طلاب التوجيهي والبجروت المتقدم ومسابقات التفوق الأكاديمي');

  // Load configured source mappings from Firestore settings/global
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.curriculumSourceMappings && Array.isArray(data.curriculumSourceMappings) && data.curriculumSourceMappings.length > 0) {
            setSourceMappings(data.curriculumSourceMappings);
            // If current subject matches a configured mapping, ensure reference URL is aligned
            const matched = data.curriculumSourceMappings.find((m: CurriculumSourceMapping) => 
              m.subject.toLowerCase() === subject.toLowerCase() || 
              subject.toLowerCase().includes(m.subject.toLowerCase())
            );
            if (matched) {
              setReferenceUrl(matched.sourceUrl);
              if (matched.bagrutModels && matched.bagrutModels.length > 0) {
                setBagrutModel(matched.bagrutModels.join(' و '));
              }
            }
          }
        }
      }, (err) => {
        console.warn("Could not listen to settings/global for curriculumSourceMappings:", err);
      });
      return () => unsub();
    } catch (e) {
      console.warn("Settings listener error:", e);
    }
  }, [subject]);

  // Active source mapping
  const activeSourceMapping = useMemo(() => {
    const found = sourceMappings.find(m => 
      m.subject.toLowerCase() === subject.toLowerCase() || 
      subject.toLowerCase().includes(m.subject.toLowerCase()) ||
      m.subject.toLowerCase().includes(subject.toLowerCase())
    );
    if (found) return found;
    return sourceMappings.find(m => m.isPrimaryApprovedSource) || sourceMappings[0];
  }, [sourceMappings, subject]);

  const handleSubjectChange = (newSubject: string) => {
    setSubject(newSubject);
    const matched = sourceMappings.find(m => 
      m.subject.toLowerCase() === newSubject.toLowerCase() || 
      newSubject.toLowerCase().includes(m.subject.toLowerCase()) ||
      m.subject.toLowerCase().includes(newSubject.toLowerCase())
    );
    if (matched) {
      setReferenceUrl(matched.sourceUrl);
      if (matched.bagrutModels && matched.bagrutModels.length > 0) {
        setBagrutModel(matched.bagrutModels.join(' و '));
      }
      if (matched.approvedKeyTopics && matched.approvedKeyTopics.length > 0) {
        setTopic(matched.approvedKeyTopics[0]);
      }
    }
  };

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [currentCurriculum, setCurrentCurriculum] = useState<GeneratedCurriculum | null>(null);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [activeBloomFilter, setActiveBloomFilter] = useState<string>('all');
  const [savedCurriculums, setSavedCurriculums] = useState<GeneratedCurriculum[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Load saved curriculums from Firestore
  useEffect(() => {
    try {
      const colRef = collection(db, 'generated_curriculums');
      const unsub = onSnapshot(colRef, (snap) => {
        const list: GeneratedCurriculum[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as GeneratedCurriculum);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setSavedCurriculums(list);
      }, (err) => {
        console.warn("Could not listen to generated_curriculums in Firestore:", err);
      });
      return () => unsub();
    } catch (e) {
      // ignore
    }
  }, []);

  // Generate curriculum handler
  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('يرجى تحديد موضوع أو محور المنهاج المراد توليده.');
      return;
    }

    setGenerating(true);
    setStatusMessage('جاري استدعاء محرك الذكاء الاصطناعي وبناء المنهاج وتصنيف المخرجات وفق مرجع VEB School Chemistry...');

    try {
      const response = await fetch('/api/ai/curriculum-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          grade,
          topic,
          unitsCount,
          lessonsPerUnit,
          referenceUrl,
          bagrutModel,
          targetAudience,
          aiProvider: 'openai',
          aiModel: 'gpt-4o'
        })
      });

      const data = await response.json();
      if (data.success && data.curriculum) {
        setCurrentCurriculum(data.curriculum);
        if (data.curriculum.units && data.curriculum.units.length > 0) {
          setActiveUnitId(data.curriculum.units[0].id);
        }
        showStatus('تم توليد المنهاج وتصنيف المخرجات بالذكاء الاصطناعي بنجاح! ✨');
      } else {
        alert(data.error || 'تعذر توليد المنهاج. يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء التواصل مع خادم الذكاء الاصطناعي.');
    } finally {
      setGenerating(false);
    }
  };

  // Save to Firestore
  const handleSaveToCloud = async () => {
    if (!currentCurriculum) return;
    try {
      const colRef = collection(db, 'generated_curriculums');
      await addDoc(colRef, {
        ...currentCurriculum,
        savedAt: new Date().toISOString()
      });
      showStatus('تم حفظ المنهاج الأكاديمي في قاعدة البيانات السحابية بنجاح 💾');
    } catch (e: any) {
      console.error(e);
      showStatus('فشل الحفظ في السحابة. تحقق من الصلاحيات.');
    }
  };

  // Delete saved curriculum
  const handleDeleteSaved = async (id?: string) => {
    if (!id) return;
    if (window.confirm('هل أنت متأكد من حذف هذا المنهاج المحفوظ؟')) {
      try {
        await deleteDoc(doc(db, 'generated_curriculums', id));
        showStatus('تم حذف المنهاج بنجاح.');
      } catch (e) {
        showStatus('حدث خطأ أثناء حذف المنهاج.');
      }
    }
  };

  // Filter outcomes
  const allOutcomes = currentCurriculum?.units.flatMap(u => 
    u.lessons.flatMap(l => l.learningOutcomes.map(o => ({ ...o, unitTitle: u.title, lessonTitle: l.title })))
  ) || [];

  const filteredOutcomes = activeBloomFilter === 'all' 
    ? allOutcomes 
    : allOutcomes.filter(o => o.bloomLevel === activeBloomFilter);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Toast Alert */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white border border-cyan-400/50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-bold backdrop-blur-md"
          >
            <Sparkles className="text-cyan-400 shrink-0" size={18} />
            <span>{statusMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Card */}
      <div className="bg-gradient-to-r from-[#0D365A] via-[#12416b] to-[#0A2640] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-white/10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-400/20 text-cyan-300 rounded-full text-xs font-black border border-cyan-400/30">
              <FlaskConical size={14} />
              <span>توليد المناهج وتصنيف المخرجات بالذكاء الاصطناعي 🧪✨</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              منظومة هندسة المناهج وتصنيف نواتج التعلم الأكاديمية
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed font-medium">
              توليد متكامل للمناهج الدراسية والوحدات والدروس وتصنيف مخرجات التعلم وفق هرم بلوم المعرفي ومهارات الاستقصاء والمختبر، استناداً حصرياً ومباشراً إلى المرجع المعتمد:
              <a 
                href={activeSourceMapping.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-cyan-300 underline mx-1 hover:text-white"
              >
                {activeSourceMapping.sourceTitle}
              </a>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <a
              href={activeSourceMapping.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer"
            >
              <span>زيارة المرجع المعتمد 🌐</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Quick Accreditation Box */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold">المرجع المعتمد النشط:</span>
            <span className="font-mono text-cyan-200 bg-white/10 px-2 py-0.5 rounded-lg border border-white/15">
              {activeSourceMapping.sourceUrl}
            </span>
            {activeSourceMapping.isPrimaryApprovedSource && (
              <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-md">
                معتمد رئيسي ⭐
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-300 flex-wrap">
            <span>نماذج بجروت: {(activeSourceMapping.bagrutModels || []).slice(0, 2).join(' و ') || '037381 و 037387'}</span>
            <span>•</span>
            <span>تصنيف بلوم السداسي الكامل</span>
            <span>•</span>
            <span>التجارب المخبرية والاستقصاء</span>
          </div>
        </div>
      </div>

      {/* Generator Configuration Panel */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0D365A]/10 text-[#0D365A] flex items-center justify-center font-bold">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">إعدادات وضوابط توليد المنهاج المعتمد</h2>
              <p className="text-xs text-slate-500 font-medium">حدد المادة والمسار والمواضيع والمخرجات المستهدفة</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800">المادة الدراسية المسجلة <span className="text-rose-500">*</span></label>
            <select
              value={subject}
              onChange={e => handleSubjectChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0D365A] cursor-pointer"
            >
              {sourceMappings.filter(m => m.isActive).map(m => (
                <option key={m.id} value={m.subject}>
                  {m.subject} ({m.sourceTitle.split('(')[0].trim()}) {m.isPrimaryApprovedSource ? '⭐' : ''}
                </option>
              ))}
              {!sourceMappings.some(m => m.subject === subject) && (
                <option value={subject}>{subject}</option>
              )}
            </select>
          </div>

          {/* Grade & Track */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800">الصف والمرحلة التعليمية <span className="text-rose-500">*</span></label>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0D365A] cursor-pointer"
            >
              <option value="الصف الثاني عشر - مسار البجروت (5 وحدات)">الصف الثاني عشر - مسار البجروت (5 وحدات)</option>
              <option value="الصف الحادي عشر - مسار البجروت (4 و 5 وحدات)">الصف الحادي عشر - مسار البجروت (4 و 5 وحدات)</option>
              <option value="الصف العاشر - التأسيس العلمي للكيمياء">الصف العاشر - التأسيس العلمي للكيمياء</option>
              <option value="مسار التفوق والمسابقات الأكاديمية">مسار التفوق والمسابقات الأكاديمية</option>
            </select>
          </div>

          {/* Bagrut Model & Reference */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800">المرجع المعتمد ونماذج البجروت</label>
            <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="truncate" title={activeSourceMapping.sourceTitle}>
                {activeSourceMapping.sourceTitle}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black shrink-0">معتمد ✓</span>
            </div>
          </div>

          {/* Topic & Units configuration */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-black text-slate-800">
              المحور والموضوعات المركزية المستهدفة في المنهاج <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="مثال: الحسابات الكيميائية والمول، الاتزان وسرعة التفاعل، والكيمياء العضوية"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0D365A]"
            />

            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <span className="text-[10px] text-slate-400 font-bold">محاور مقترحة من المرجع المعتمد:</span>
              {((activeSourceMapping.approvedKeyTopics && activeSourceMapping.approvedKeyTopics.length > 0)
                ? activeSourceMapping.approvedKeyTopics
                : SUGGESTED_CHEMISTRY_TOPICS
              ).map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(sug)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200/60"
                >
                  + {sug.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Depth Parameters */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800">عدد الوحدات التعليمية</label>
            <select
              value={unitsCount}
              onChange={e => setUnitsCount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
            >
              <option value={2}>وحدتان تعليميتان (مكثف)</option>
              <option value={3}>3 وحدات تعليمية (فصل كامل - قياسي)</option>
              <option value={4}>4 وحدات تعليمية (منهاج سنوي شامل)</option>
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-black text-slate-800">الفئة والهدف البيداغوجي المستهدف</label>
            <input
              type="text"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            />
          </div>
        </div>

        {/* Generate Button Action */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>يتضمن تصنيف مستويات بلوم (تذكر، فهم، تطبيق، تحليل، تركيب، تقييم) والتجارب المخبرية.</span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
              generating 
                ? 'bg-slate-300 text-slate-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-[#0D365A] via-[#114674] to-cyan-600 hover:from-[#114674] hover:to-cyan-500 text-white shadow-cyan-600/20 active:scale-95'
            }`}
          >
            {generating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>جاري توليد المنهاج وتصنيف المخرجات بالذكاء الاصطناعي...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} className="text-cyan-300" />
                <span>توليد المنهاج وتصنيف المخرجات الآن ⚡</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* -------------------- CURRENT CURRICULUM DISPLAY -------------------- */}
      {currentCurriculum && (
        <div className="space-y-6">
          {/* Curriculum Accreditation Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    منهاج كيمياء معتمد 🎓
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {currentCurriculum.grade}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                    {currentCurriculum.academicYear}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">{currentCurriculum.title}</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
                  {currentCurriculum.overview}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleSaveToCloud}
                  className="px-4 py-2 bg-[#0D365A] hover:bg-[#114674] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Save size={14} />
                  <span>حفظ المنهاج 💾</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer size={14} />
                  <span>طباعة المنهاج 🖨️</span>
                </button>
              </div>
            </div>

            {/* Accreditation Citation Card */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <span className="font-black text-slate-900 block">
                    الاعتماد المرجعي: {currentCurriculum.accreditationReference.sourceName}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {currentCurriculum.accreditationReference.description}
                  </span>
                </div>
              </div>
              <a
                href={currentCurriculum.accreditationReference.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-900 font-black text-xs shrink-0 underline"
              >
                <span>زيارة المرجع: {currentCurriculum.accreditationReference.sourceUrl}</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Bloom's Taxonomy Classification Radar / Bar Overview */}
            {currentCurriculum.bloomTaxonomySummary && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <TrendingUp size={15} className="text-[#0D365A]" />
                    <span>مصفوفة توزيع مستويات بلوم المعرفية في المنهاج (Bloom's Taxonomy Distribution)</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">إجمالي مخرجات التعلم: {allOutcomes.length}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {currentCurriculum.bloomTaxonomySummary.map(item => {
                    const badge = BLOOM_LEVEL_BADGES[item.level] || BLOOM_LEVEL_BADGES.knowledge;
                    const isActive = activeBloomFilter === item.level;

                    return (
                      <button
                        key={item.level}
                        onClick={() => setActiveBloomFilter(isActive ? 'all' : item.level)}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                          isActive 
                            ? 'ring-2 ring-[#0D365A] border-[#0D365A] shadow-md bg-slate-50' 
                            : `${badge.bg} ${badge.border} hover:shadow-xs`
                        }`}
                      >
                        <div className="text-[10px] font-bold text-slate-500">{badge.label}</div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-base font-black text-slate-900">{item.percentage}%</span>
                          <span className="text-[10px] font-black text-slate-600">{item.count} نواتج</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Unit Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {currentCurriculum.units.map(unit => (
              <button
                key={unit.id}
                onClick={() => setActiveUnitId(unit.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                  activeUnitId === unit.id
                    ? 'bg-[#0D365A] text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{unit.title.split(':')[0]}</span>
                <span className="text-[10px] opacity-80">({unit.lessons.length} دروس)</span>
              </button>
            ))}
          </div>

          {/* Active Unit Lessons & Outcomes Detailed Explorer */}
          {currentCurriculum.units.filter(u => !activeUnitId || u.id === activeUnitId).map(unit => (
            <div key={unit.id} className="space-y-5">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900">{unit.title}</h3>
                  <span className="text-xs font-black text-[#0D365A] bg-slate-100 px-3 py-1 rounded-xl">
                    إجمالي الساعات المعتمدة: {unit.totalHours} ساعة
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{unit.description}</p>
              </div>

              {/* Lessons Cards */}
              <div className="space-y-5">
                {unit.lessons.map(lesson => (
                  <div key={lesson.id} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
                    {/* Lesson Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black bg-[#0D365A] text-white px-2.5 py-0.5 rounded-lg">
                            الدرس {lesson.lessonNumber}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">⏱️ {lesson.durationMinutes} دقيقة</span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 mt-1">{lesson.title}</h4>
                      </div>

                      {/* VEB Reference citation badge */}
                      <a
                        href={lesson.vebChemistryReference.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-[11px] font-black border border-cyan-200 transition-colors cursor-pointer self-start sm:self-auto"
                        title="مرجع الدرس في بوابة كيمياء التفوق"
                      >
                        <Atom size={13} className="text-cyan-600" />
                        <span>مرجع VEB Chemistry: {lesson.vebChemistryReference.portalSection}</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>

                    {/* Key Concepts Chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400">المفاهيم المركزية:</span>
                      {lesson.keyConcepts.map((kc, idx) => (
                        <span key={idx} className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/60">
                          {kc}
                        </span>
                      ))}
                    </div>

                    {/* Detailed Academic Explanation with MathJax */}
                    <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 text-right space-y-2">
                      <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <BookOpen size={14} className="text-[#0D365A]" />
                        <span>الشرح الأكاديمي وصياغة القوانين الكيميائية:</span>
                      </h5>
                      <div className="text-xs text-slate-700 leading-relaxed font-sans">
                        <MathJaxSection>
                          <div className="whitespace-pre-line">
                            {lesson.detailedExplanation}
                          </div>
                        </MathJaxSection>
                      </div>
                    </div>

                    {/* Classified Learning Outcomes Matrix */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Layers size={14} className="text-[#0D365A]" />
                          <span>تصنيف مخرجات التعلم ونواتج الأداء المستهدفة (Learning Outcomes Matrix)</span>
                        </h5>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {lesson.learningOutcomes.length} مخرجات مصنفة
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {lesson.learningOutcomes.map(outcome => {
                          const bloomBadge = BLOOM_LEVEL_BADGES[outcome.bloomLevel] || BLOOM_LEVEL_BADGES.knowledge;
                          const skillBadge = SKILL_CATEGORY_BADGES[outcome.skillCategory] || { label: outcome.skillCategory, icon: '📌' };

                          return (
                            <div key={outcome.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${bloomBadge.bg} ${bloomBadge.text} ${bloomBadge.border}`}>
                                    {bloomBadge.label}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70 flex items-center gap-1">
                                    <span>{skillBadge.icon}</span>
                                    <span>{skillBadge.label}</span>
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">معيار التقييم: {outcome.assessmentMethod}</span>
                              </div>

                              <p className="text-xs font-black text-slate-900 leading-relaxed">
                                {outcome.outcomeText}
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                                <div className="bg-slate-50 p-2 rounded-xl text-slate-600">
                                  <span className="font-bold text-slate-800 block">🎯 معيار الإتقان والنجاح:</span>
                                  <span>{outcome.successCriteria}</span>
                                </div>

                                {outcome.targetQuestionSample && (
                                  <div className="bg-cyan-50/50 p-2 rounded-xl text-cyan-900 border border-cyan-100">
                                    <span className="font-bold text-cyan-950 block">📝 سؤال قياس المخرج (محاكاة VEB):</span>
                                    <span className="font-mono">{outcome.targetQuestionSample}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Experimental Lab Activity if available */}
                    {lesson.experimentalLabWork && (
                      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/60 to-cyan-50/60 border border-emerald-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                            <FlaskConical size={15} className="text-emerald-700" />
                            <span>التجربة المخبرية والاستقصاء العلمي: {lesson.experimentalLabWork.labTitle}</span>
                          </h5>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            مختبر كيمياء معتمد
                          </span>
                        </div>

                        <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-200/60 text-[11px] text-rose-700 font-bold">
                          ⚠️ إرشادات السلامة المخبرية: {lesson.experimentalLabWork.safetyInstructions}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                          <div className="space-y-1">
                            <span className="font-black text-slate-900 block">🧪 الأدوات والمواد الكيميائية:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                              {lesson.experimentalLabWork.toolsAndChemicals.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-1">
                            <span className="font-black text-slate-900 block">📋 خطوات العمل الاستقصائي:</span>
                            <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-600">
                              {lesson.experimentalLabWork.procedureSteps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>

                        <div className="p-3 bg-white/90 rounded-xl border border-emerald-200/60 text-[11px] text-emerald-900">
                          <span className="font-bold">🔍 الملاحظات والاستنتاج المتوقع: </span>
                          <span>{lesson.experimentalLabWork.expectedObservations}</span>
                        </div>
                      </div>
                    )}

                    {/* Practice Questions Sample */}
                    {lesson.practiceQuestions && lesson.practiceQuestions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <span className="text-xs font-black text-slate-800 block">أسئلة تدريبية لقياس المخرجات (نماذج بجروت):</span>
                        <div className="space-y-2">
                          {lesson.practiceQuestions.map((pq, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-slate-900">س{idx + 1}: {pq.questionText}</span>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  الإجابة: {pq.correctAnswer}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-mono">💡 التفسير والخطوات: {pq.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* -------------------- SAVED CURRICULUMS ARCHIVE -------------------- */}
      {savedCurriculums.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">سجل المناهج التعليمية المعتمدة والمحفوظة في السحابة</h3>
              <p className="text-xs text-slate-500 font-medium">مناهج الكيمياء المنتجة وتصنيفاتها وفق مرجع VEB School Chemistry</p>
            </div>
            <span className="text-xs font-black bg-cyan-50 text-cyan-800 px-3 py-1 rounded-full border border-cyan-200">
              {savedCurriculums.length} مناهج محفوظة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedCurriculums.map(sc => (
              <div key={sc.id} className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">{sc.title}</h4>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                      {sc.grade} • {sc.units.length} وحدات • مرجع VEB Chemistry
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteSaved(sc.id)}
                    className="text-slate-400 hover:text-rose-600 text-xs p-1"
                    title="حذف المنهاج"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {sc.createdAt ? new Date(sc.createdAt).toLocaleDateString('ar-EG') : 'تاريخ غير محدد'}
                  </span>
                  <button
                    onClick={() => {
                      setCurrentCurriculum(sc);
                      if (sc.units && sc.units.length > 0) setActiveUnitId(sc.units[0].id);
                      showStatus('تم تحميل المنهاج المحفوظ بنجاح! 📖');
                    }}
                    className="px-3 py-1 bg-[#0D365A] hover:bg-[#114674] text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    استعراض وتفحص المنهاج
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AICurriculumGenerator;
