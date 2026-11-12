import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  FileText, 
  Video, 
  Globe, 
  Book, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Award, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  Download, 
  Check, 
  Search, 
  Filter, 
  AlertCircle, 
  Headphones, 
  Image as ImageIcon, 
  MessageSquare, 
  FileCheck2,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  Clock,
  UserCheck,
  Copy,
  CheckCheck,
  Loader2,
  Send,
  FileCode,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { ApprovedReference, SupportedSourceType, LearningUnit } from './types';

interface TeacherReferencesManagerProps {
  references: ApprovedReference[];
  onAddReference: (ref: ApprovedReference) => void;
  onUpdateReference: (id: string, updates: Partial<ApprovedReference>) => void;
  onDeleteReference: (id: string) => void;
  onToggleApproval: (id: string) => void;
  onReorderPriority: (id: string, direction: 'up' | 'down') => void;
  learningUnits?: LearningUnit[];
  teacherName?: string;
  onBuildContentFromReference?: (ref: ApprovedReference) => void;
}

const SOURCE_TYPE_LABELS: Record<SupportedSourceType, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; badgeBg: string }> = {
  pdf: { label: 'ملف PDF', icon: FileText, color: 'text-red-700', badgeBg: 'bg-red-50 border-red-200 text-red-800' },
  word: { label: 'ملف Word (docx)', icon: FileText, color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200 text-blue-800' },
  powerpoint: { label: 'عرض PowerPoint', icon: Layers, color: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200 text-amber-800' },
  video: { label: 'فيديو تعليمي', icon: Video, color: 'text-purple-700', badgeBg: 'bg-purple-50 border-purple-200 text-purple-800' },
  website: { label: 'موقع إلكتروني', icon: Globe, color: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  ebook: { label: 'كتاب إلكتروني E-Book', icon: Book, color: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  scientific_paper: { label: 'مقالة علمية محكمة', icon: Award, color: 'text-cyan-700', badgeBg: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
  image: { label: 'صورة ورسم تعليمي', icon: ImageIcon, color: 'text-pink-700', badgeBg: 'bg-pink-50 border-pink-200 text-pink-800' },
  audio: { label: 'ملف صوتي / بودكاست', icon: Headphones, color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200 text-orange-800' },
  teacher_notes: { label: 'ملاحظات وشروحات المعلم', icon: MessageSquare, color: 'text-teal-700', badgeBg: 'bg-teal-50 border-teal-200 text-teal-800' }
};

export const TeacherReferencesManager: React.FC<TeacherReferencesManagerProps> = ({
  references,
  onAddReference,
  onUpdateReference,
  onDeleteReference,
  onToggleApproval,
  onReorderPriority,
  learningUnits = [],
  teacherName = 'د. سامر الصالح (المعلم المشرف)',
  onBuildContentFromReference
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  const [selectedApprovalFilter, setSelectedApprovalFilter] = useState<string>('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRefId, setEditingRefId] = useState<string | null>(null);

  // Dedicated AI Content Generation Modal State ("توليد محتوى")
  const [activeAiRef, setActiveAiRef] = useState<ApprovedReference | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState<'worksheet' | 'exam' | 'lesson_plan' | 'comprehensive'>('worksheet');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'content' | 'questions' | 'answer_key' | 'lesson_plan'>('content');
  const [copiedNotification, setCopiedNotification] = useState(false);

  const handleOpenAiModal = (ref: ApprovedReference) => {
    setActiveAiRef(ref);
    setAiResult(null);
    setAiError(null);
    setIsAiModalOpen(true);
    setActiveResultTab('content');
  };

  const handleExecuteAiGeneration = async () => {
    if (!activeAiRef) return;
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const targetUnit = learningUnits.find(u => u.id === activeAiRef.unitId);
      const res = await fetch('/api/educational/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: activeAiRef.subject || 'بيولوجيا',
          unitTitle: targetUnit?.title || activeAiRef.lessonTitle || activeAiRef.title,
          resourceText: activeAiRef.urlOrContent || activeAiRef.contentSummary || activeAiRef.notes || activeAiRef.title,
          referenceTitle: activeAiRef.title,
          referenceCitation: activeAiRef.citation,
          referenceAuthor: activeAiRef.authorOrPublisher,
          referenceNotes: activeAiRef.notes,
          goal: aiGoal,
          targetGrade: activeAiRef.gradeLevel || 'المرحلة الثانوية والبجروت'
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAiResult(data.data);
      } else {
        setAiError(data.error || 'فشل استدعاء نموذج الذكاء الاصطناعي (Gemini).');
      }
    } catch (err: any) {
      console.error('Error invoking /api/educational/generate-content:', err);
      setAiError(err.message || 'حدث خطأ في الاتصال بالخادم.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyFullContent = () => {
    if (!aiResult) return;
    const textToCopy = `=== ${aiResult.title || 'محتوى تعليمي مولد'} ===
المصدر المعتمد: ${aiResult.referenceDocumented || activeAiRef?.title || 'المرجع الرسمي'}

${aiResult.markdownContent || ''}

${aiResult.teacherAnswerKeyMarkdown ? `\n\n${aiResult.teacherAnswerKeyMarkdown}` : ''}
`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    });
  };

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    sourceType: SupportedSourceType;
    authorOrPublisher: string;
    subject: string;
    gradeLevel: string;
    unitId: string;
    lessonTitle: string;
    priority: number;
    isApproved: boolean;
    urlOrContent: string;
    fileSize: string;
    notes: string;
    citation: string;
    contentSummary: string;
    usedInAssessments: boolean;
  }>({
    title: '',
    sourceType: 'pdf',
    authorOrPublisher: '',
    subject: 'بيولوجيا',
    gradeLevel: 'المرحلة الثانوية - بجروت 5 وحدات',
    unitId: 'unit-1',
    lessonTitle: '',
    priority: 1,
    isApproved: true,
    urlOrContent: '',
    fileSize: '',
    notes: '',
    citation: '',
    contentSummary: '',
    usedInAssessments: true
  });

  const [activePreviewRef, setActivePreviewRef] = useState<ApprovedReference | null>(null);

  // Filtered references
  const filteredReferences = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return references
      .filter((ref) => {
        const matchesSearch = 
          (ref.title || '').toLowerCase().includes(q) ||
          (ref.authorOrPublisher || '').toLowerCase().includes(q) ||
          (ref.notes && (ref.notes || '').toLowerCase().includes(q)) ||
          (ref.citation && (ref.citation || '').toLowerCase().includes(q));

        const matchesType = selectedTypeFilter === 'all' || ref.sourceType === selectedTypeFilter;
        const matchesUnit = selectedUnitFilter === 'all' || ref.unitId === selectedUnitFilter;
        const matchesApproval = 
          selectedApprovalFilter === 'all' ||
          (selectedApprovalFilter === 'approved' && ref.isApproved) ||
          (selectedApprovalFilter === 'pending' && !ref.isApproved);

        return matchesSearch && matchesType && matchesUnit && matchesApproval;
      })
      .sort((a, b) => {
        // Sort primarily by priority (1 is highest), then by approval status
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return (b.isApproved ? 1 : 0) - (a.isApproved ? 1 : 0);
      });
  }, [references, searchQuery, selectedTypeFilter, selectedUnitFilter, selectedApprovalFilter]);

  const approvedCount = references.filter(r => r.isApproved).length;

  const handleOpenAdd = () => {
    setEditingRefId(null);
    setFormData({
      title: '',
      sourceType: 'pdf',
      authorOrPublisher: teacherName,
      subject: 'بيولوجيا',
      gradeLevel: 'المرحلة الثانوية - بجروت 5 وحدات',
      unitId: learningUnits[0]?.id || 'unit-1',
      lessonTitle: '',
      priority: references.length + 1,
      isApproved: true,
      urlOrContent: '',
      fileSize: '3.5 MB',
      notes: '',
      citation: '',
      contentSummary: '',
      usedInAssessments: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ref: ApprovedReference) => {
    setEditingRefId(ref.id);
    setFormData({
      title: ref.title,
      sourceType: ref.sourceType,
      authorOrPublisher: ref.authorOrPublisher,
      subject: ref.subject,
      gradeLevel: ref.gradeLevel,
      unitId: ref.unitId || 'unit-1',
      lessonTitle: ref.lessonTitle || '',
      priority: ref.priority,
      isApproved: ref.isApproved,
      urlOrContent: ref.urlOrContent || '',
      fileSize: ref.fileSize || '',
      notes: ref.notes || '',
      citation: ref.citation || '',
      contentSummary: ref.contentSummary || '',
      usedInAssessments: !!ref.usedInAssessments
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const matchedUnit = learningUnits.find(u => u.id === formData.unitId);
    const unitTitle = matchedUnit ? `الوحدة ${matchedUnit.unitNumber}: ${matchedUnit.title}` : undefined;

    if (editingRefId) {
      // Update existing
      onUpdateReference(editingRefId, {
        ...formData,
        unitTitle,
        approvedByTeacherName: formData.isApproved ? teacherName : 'قيد المراجعة',
        approvedDate: new Date().toISOString().slice(0, 10)
      });
    } else {
      // Create new
      const newRef: ApprovedReference = {
        id: `ref-${Date.now()}`,
        ...formData,
        unitTitle,
        approvedByTeacherName: formData.isApproved ? teacherName : 'قيد المراجعة',
        approvedDate: new Date().toISOString().slice(0, 10)
      };
      onAddReference(newRef);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Principle Banner: Teacher is the Authoritative Scientific Reference */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-stone-900 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden border border-emerald-900/60">
        <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-emerald-950 flex items-center gap-1.5 shadow-xs">
                <ShieldCheck size={14} />
                المبدأ الأساسي للمنصة: المعلم هو المرجعية العلمية المعتمدة
              </span>
              <span className="text-xs text-emerald-300/80 font-mono">
                {approvedCount} مصادر معتمدة رسمياً
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black font-serif text-white tracking-tight">
              إدارة واعتماد مصادر ومراجع التعلم والتقييمات
            </h2>

            <p className="text-xs md:text-sm text-emerald-100/90 leading-relaxed">
              <strong>تعتمد المنصة مبدأ الحصانة الأكاديمية:</strong> لا يتم إنشاء محتوى الشرح أو بنوك الأسئلة أو الاختبارات من مصادر عشوائية أو غير معتمدة. جميع المحتويات التعليمية والتقييمية داخل المنصة تبنى حصراً اعتماداً على المصادر والمراجع التي يختارها ويعتمدها معلم المادة.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-300 pt-1">
              <span className="flex items-center gap-1">
                <UserCheck size={14} className="text-amber-400" />
                المعلم المشرف: <strong>{teacherName}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileCheck2 size={14} className="text-amber-400" />
                10 أنواع مصادر معتمدة ومدعومة
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles size={14} className="text-amber-400" />
                توليد التقييمات حصرياً من المراجع المعتمدة
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <button
              onClick={handleOpenAdd}
              className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black px-5 py-3 rounded-2xl text-xs md:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Plus size={18} />
              <span>إضافة مرجع تعليمي جديد</span>
            </button>
            <div className="text-[11px] text-emerald-200/70 text-center lg:text-right">
              يدعم الكتب، المقالات، العروض، والفيديوهات
            </div>
          </div>
        </div>
      </div>

      {/* 2. Source Type Quick Filter Bar (All 10 Supported Types) */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
          <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <Filter size={14} className="text-emerald-700" />
            تصفية المراجع حسب النوع المدعوم:
          </span>
          <span className="text-[11px] text-stone-400 font-mono">
            المعروض: {filteredReferences.length} من {references.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedTypeFilter === 'all'
                ? 'bg-emerald-950 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            جميع الأنواع ({references.length})
          </button>

          {(Object.keys(SOURCE_TYPE_LABELS) as SupportedSourceType[]).map((type) => {
            const config = SOURCE_TYPE_LABELS[type];
            const Icon = config.icon;
            const count = references.filter(r => r.sourceType === type).length;
            const isSelected = selectedTypeFilter === type;

            return (
              <button
                key={type}
                onClick={() => setSelectedTypeFilter(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-emerald-950 text-white shadow-xs'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200/60'
                }`}
              >
                <Icon size={13} className={isSelected ? 'text-amber-400' : config.color} />
                <span>{config.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20' : 'bg-stone-200 text-stone-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search & Secondary Filters */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالعنوان، المؤلف، المفهوم العلمي، أو التوثيق..."
            className="w-full pl-4 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-emerald-700"
          />
          <Search size={16} className="absolute right-3.5 top-3 text-stone-400 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-3 text-stone-400 hover:text-stone-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Unit Filter */}
          <select
            value={selectedUnitFilter}
            onChange={(e) => setSelectedUnitFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:border-emerald-700"
          >
            <option value="all">كافة الوحدات والدروس</option>
            {learningUnits.map(u => (
              <option key={u.id} value={u.id}>
                الوحدة {u.unitNumber}: {u.title}
              </option>
            ))}
          </select>

          {/* Approval Filter */}
          <select
            value={selectedApprovalFilter}
            onChange={(e) => setSelectedApprovalFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:border-emerald-700"
          >
            <option value="all">كافة حالات الاعتماد</option>
            <option value="approved">معتمد رسمياً فقط ✓</option>
            <option value="pending">غير معتمد / قيد المراجعة ✕</option>
          </select>

          {/* New Reference Button */}
          <button
            onClick={handleOpenAdd}
            className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>إضافة مرجع</span>
          </button>
        </div>
      </div>

      {/* 4. References List */}
      <div className="space-y-4">
        {filteredReferences.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-stone-300 text-stone-400 space-y-3">
            <BookOpen size={40} className="mx-auto text-stone-300" />
            <h4 className="text-base font-bold text-stone-700">لم يتم العثور على مراجع تطابق البحث والتصفية</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              يمكنك إضافة مرجع جديد بالنقر على زر "إضافة مرجع تعليمي جديد" وتحديد نوعه وربطه بالوحدة والدرس المناسب.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-950"
            >
              إضافة مرجع جديد الآن
            </button>
          </div>
        ) : (
          filteredReferences.map((ref, idx) => {
            const typeConfig = SOURCE_TYPE_LABELS[ref.sourceType] || SOURCE_TYPE_LABELS.pdf;
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={ref.id}
                className={`bg-white rounded-3xl p-5 md:p-6 border transition-all duration-200 shadow-xs hover:shadow-md ${
                  ref.isApproved
                    ? 'border-emerald-200/90'
                    : 'border-stone-200 bg-stone-50/50 opacity-90'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left (Icon & Main Info) */}
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Source Icon / Type Badge */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs ${
                        ref.isApproved ? 'bg-emerald-950 text-amber-400 shadow-xs' : 'bg-stone-200 text-stone-600'
                      }`}>
                        <TypeIcon size={22} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeConfig.badgeBg}`}>
                        {typeConfig.label}
                      </span>
                    </div>

                    {/* Text Details */}
                    <div className="space-y-2 flex-1">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Priority Badge */}
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-stone-900 text-white flex items-center gap-1">
                          <span>أولوية {ref.priority}</span>
                          {ref.priority === 1 && <span className="text-amber-400">★ (مرجع رئيسي)</span>}
                        </span>

                        {/* Approval Status Badge */}
                        {ref.isApproved ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck size={12} className="text-emerald-700" />
                            <span>معتمد من معلم المادة ✓</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <AlertCircle size={12} className="text-amber-700" />
                            <span>مسودة / قيد مراجعة المعلم</span>
                          </span>
                        )}

                        {/* Unit Association */}
                        {ref.unitTitle && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            {ref.unitTitle}
                          </span>
                        )}

                        {/* Lesson Association */}
                        {ref.lessonTitle && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                            درس: {ref.lessonTitle}
                          </span>
                        )}

                        {ref.fileSize && (
                          <span className="text-[10px] text-stone-400 font-mono">
                            الحجم: {ref.fileSize}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-base md:text-lg font-bold text-stone-900 font-serif leading-snug">
                        {ref.title}
                      </h4>

                      {/* Author & Citation */}
                      <div className="text-xs text-stone-600 space-y-1">
                        <p className="flex items-center gap-1.5">
                          <span className="text-stone-400">المؤلف / المصدر:</span>
                          <strong className="text-stone-800">{ref.authorOrPublisher}</strong>
                          <span className="text-stone-300">•</span>
                          <span className="text-stone-500">{ref.subject} ({ref.gradeLevel})</span>
                        </p>

                        {ref.citation && (
                          <p className="text-[11px] text-stone-500 font-mono bg-stone-50 p-1.5 rounded-lg border border-stone-200/60">
                            التوثيق الأكاديمي: {ref.citation}
                          </p>
                        )}
                      </div>

                      {/* Content summary or Teacher notes */}
                      {ref.contentSummary && (
                        <p className="text-xs text-stone-600 leading-relaxed">
                          {ref.contentSummary}
                        </p>
                      )}

                      {/* Teacher Guidance Box */}
                      {ref.notes && (
                        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2">
                          <MessageSquare size={14} className="text-amber-700 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-bold text-[11px] text-amber-900">توجيهات وملاحظات المعلم:</span>
                            <p className="leading-relaxed">{ref.notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Key concepts covered tags */}
                      {ref.keyConceptsCovered && ref.keyConceptsCovered.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-stone-400">المفاهيم المغطاة:</span>
                          {ref.keyConceptsCovered.map((c, ci) => (
                            <span key={ci} className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Approval Teacher Signature & Date */}
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 pt-1">
                        <span className="flex items-center gap-1 text-emerald-800 font-medium">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          اعتمد بواسطة: {ref.approvedByTeacherName} ({ref.approvedDate})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions Bar */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                    {/* Priority Up / Down */}
                    <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                      <button
                        onClick={() => onReorderPriority(ref.id, 'up')}
                        disabled={ref.priority <= 1}
                        title="رفع الأولوية"
                        className="p-1.5 text-stone-600 hover:text-emerald-800 hover:bg-white rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <span className="text-xs font-mono font-bold px-1 text-stone-700" title="ترتيب الأولوية">
                        #{ref.priority}
                      </span>
                      <button
                        onClick={() => onReorderPriority(ref.id, 'down')}
                        disabled={ref.priority >= references.length}
                        title="خفض الأولوية"
                        className="p-1.5 text-stone-600 hover:text-emerald-800 hover:bg-white rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    {/* Toggle Approval Button */}
                    <button
                      onClick={() => onToggleApproval(ref.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        ref.isApproved
                          ? 'bg-emerald-100 text-emerald-900 hover:bg-red-50 hover:text-red-700'
                          : 'bg-stone-200 text-stone-700 hover:bg-emerald-600 hover:text-white'
                      }`}
                      title={ref.isApproved ? 'انقر لإلغاء الاعتماد' : 'انقر لاعتماد المرجع'}
                    >
                      {ref.isApproved ? (
                        <>
                          <Check size={13} />
                          <span>معتمد (إلغاء؟)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} />
                          <span>اعتماد المرجع</span>
                        </>
                      )}
                    </button>

                    {/* Dedicated 'توليد محتوى' Button with Gemini Integration */}
                    {ref.isApproved && (
                      <button
                        onClick={() => handleOpenAiModal(ref)}
                        className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-emerald-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer border border-amber-600/30 active:scale-95"
                        title="توليد محتوى تعليمي ذكي (شرح، ورقة عمل، اختبار متدرج) عبر نموذج Gemini مدمج"
                      >
                        <Sparkles size={14} className="text-emerald-950 animate-pulse" />
                        <span>توليد محتوى</span>
                        <span className="text-[9px] bg-emerald-950/15 px-1.5 py-0.5 rounded font-mono font-bold">Gemini</span>
                      </button>
                    )}

                    {/* Edit and Delete */}
                    <div className="flex items-center gap-1">
                      {ref.urlOrContent && (
                        <button
                          onClick={() => setActivePreviewRef(ref)}
                          className="p-2 text-stone-500 hover:text-emerald-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                          title="معاينة المرجع ومحتواه"
                        >
                          <ExternalLink size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(ref)}
                        className="p-2 text-stone-500 hover:text-emerald-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                        title="تعديل بيانات المرجع"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف المرجع "${ref.title}"؟`)) {
                            onDeleteReference(ref.id);
                          }
                        }}
                        className="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="حذف المرجع"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Add / Edit Reference Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-stone-200 space-y-5 text-right my-8" dir="rtl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 text-amber-400 flex items-center justify-center font-bold">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 font-serif">
                    {editingRefId ? 'تعديل بيانات المرجع العلمي المعتمد' : 'إضافة واعتماد مرجع تعليمي جديد'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    بإشراف واعتماد: {teacherName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold text-base p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  عنوان المرجع أو المصدر التعليمي *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: كتاب منهاج بيولوجيا البجروت الرسمي - الفصل الخامس"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-emerald-700"
                />
              </div>

              {/* Source Type & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    نوع المصدر (من المصادر الـ 10 المدعومة) *
                  </label>
                  <select
                    value={formData.sourceType}
                    onChange={(e) => setFormData({ ...formData, sourceType: e.target.value as SupportedSourceType })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-emerald-700"
                  >
                    <option value="pdf">ملف PDF (كتاب / مذكرة)</option>
                    <option value="word">ملف Word (ملخص / أوراق عمل)</option>
                    <option value="powerpoint">عرض PowerPoint (شرائح)</option>
                    <option value="video">فيديو تعليمي (مرئي)</option>
                    <option value="website">موقع إلكتروني موثوق</option>
                    <option value="ebook">كتاب إلكتروني E-Book</option>
                    <option value="scientific_paper">مقالة وبحث علمي محكم</option>
                    <option value="image">صورة / رسم تشريحي تعليمي</option>
                    <option value="audio">ملف صوتي / بودكاست</option>
                    <option value="teacher_notes">ملاحظات وشروحات يكتبها المعلم</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ترتيب أولوية المرجع (1 = أعلى أولوية) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm font-mono focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Author and Citation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    المؤلف / جهة الإصدار أو الناشر *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.authorOrPublisher}
                    onChange={(e) => setFormData({ ...formData, authorOrPublisher: e.target.value })}
                    placeholder="مثال: وزارة التربية والتعليم / إعداد د. سامر الصالح"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    التوثيق الأكاديمي (Citation)
                  </label>
                  <input
                    type="text"
                    value={formData.citation}
                    onChange={(e) => setFormData({ ...formData, citation: e.target.value })}
                    placeholder="مثال: Campbell Biology (2021), Chapter 10"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700 font-mono"
                  />
                </div>
              </div>

              {/* Unit and Lesson Association */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    الوحدة التعليمية المرتبطة *
                  </label>
                  <select
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-emerald-700"
                  >
                    {learningUnits.map(u => (
                      <option key={u.id} value={u.id}>
                        الوحدة {u.unitNumber}: {u.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    الدرس أو الموضوع الفرعي المرتبط
                  </label>
                  <input
                    type="text"
                    value={formData.lessonTitle}
                    onChange={(e) => setFormData({ ...formData, lessonTitle: e.target.value })}
                    placeholder="مثال: درس التفاعلات الضوئية وشطر الماء"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* URL or Content */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  رابط الملف / الرابط الإلكتروني / أو نص الملاحظات المباشرة
                </label>
                <textarea
                  rows={formData.sourceType === 'teacher_notes' ? 4 : 2}
                  value={formData.urlOrContent}
                  onChange={(e) => setFormData({ ...formData, urlOrContent: e.target.value })}
                  placeholder={
                    formData.sourceType === 'teacher_notes'
                      ? 'اكتب شروحاتك وملاحظاتك المباشرة هنا ليتم اعتمادها كمرجع للدرس والأسئلة...'
                      : 'https://example.com/file.pdf أو رابط المرجع المعتمد'
                  }
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700 font-sans"
                />
              </div>

              {/* Notes and Guidance */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  توجيهات المعلم وملاحظاته حول هذا المرجع للطلاب
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="مثال: يركز هذا المرجع على أسئلة الرسوم البيانية لتغير شدة الضوء"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                />
              </div>

              {/* Approval Checkbox */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-800" />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">اعتماد هذا المرجع رسمياً في المنصة</span>
                    <span className="text-[11px] text-emerald-800">
                      سيتم بناء أسئلة الشرح والتقييمات بالاعتماد عليه فورياً
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isApproved}
                    onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-800"></div>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{editingRefId ? 'حفظ التعديلات' : 'تأكيد الإضافة والاعتماد'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Preview Reference Modal */}
      {activePreviewRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                <ShieldCheck size={16} />
                معاينة المرجع العلمي المعتمد
              </span>
              <button
                onClick={() => setActivePreviewRef(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-bold text-stone-900 font-serif">
                {activePreviewRef.title}
              </h4>
              <p className="text-xs text-stone-500">
                المصدر: {activePreviewRef.authorOrPublisher} • الأولوية: #{activePreviewRef.priority}
              </p>

              {activePreviewRef.contentSummary && (
                <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-700 leading-relaxed">
                  {activePreviewRef.contentSummary}
                </div>
              )}

              {activePreviewRef.urlOrContent && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <span className="font-bold block">محتوى / رابط المرجع:</span>
                  <p className="font-mono break-all text-[11px]">{activePreviewRef.urlOrContent}</p>
                </div>
              )}

              {activePreviewRef.notes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950">
                  <strong>توجيهات المعلم:</strong> {activePreviewRef.notes}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end">
              <button
                onClick={() => setActivePreviewRef(null)}
                className="px-4 py-2 bg-emerald-950 text-white rounded-xl text-xs font-bold"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Dedicated AI Content Generation Modal (توليد محتوى عبر Gemini API) */}
      {isAiModalOpen && activeAiRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl border border-stone-200 my-8 text-right max-h-[90vh] flex flex-col" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-emerald-950 flex items-center justify-center shadow-xs">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-stone-900 font-serif">
                      توليد محتوى تعليمي ذكي (Gemini 3.8 Flash)
                    </h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      معتمد رسمياً
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    أكاديمية التفوق أون لاين • الاعتماد الحصري على المرجع العلمي المعتمد للمعلم
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 py-4 space-y-5 pr-1">
              {/* Selected Reference Banner */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-700" />
                    المرجع المعتمد المستخدم للتوليد:
                  </span>
                  <span className="text-[11px] bg-white text-emerald-800 font-mono px-2 py-0.5 rounded-md border border-emerald-200">
                    {activeAiRef.sourceType.toUpperCase()}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-emerald-950">{activeAiRef.title}</h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                  <span>المؤلف: <strong>{activeAiRef.authorOrPublisher}</strong></span>
                  {activeAiRef.citation && <span>التوثيق: <strong>{activeAiRef.citation}</strong></span>}
                  <span>المادة: <strong>{activeAiRef.subject}</strong></span>
                </div>
                {activeAiRef.notes && (
                  <p className="text-xs text-stone-600 bg-white/70 p-2 rounded-xl border border-emerald-100">
                    <strong>ملاحظات المعلم:</strong> {activeAiRef.notes}
                  </p>
                )}
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-950 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 text-amber-700 mt-0.5" />
                  <span>
                    <strong>القاعدة الذهبية:</strong> يتم توليد الشرح والأسئلة والاختبارات اعتماداً <strong>حصرياً</strong> على هذا المرجع المعتمد فقط ودون استخدام أي معلومات خارجية.
                  </span>
                </div>
              </div>

              {/* Goal Selector */}
              {!aiResult && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-800 block">
                    اختر نوع المحتوى المراد توليده:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'worksheet', label: 'ورقة عمل تطبيقية تفاعلية', desc: 'شرح مركز + أسئلة تطبيقية + نموذج إجابة' },
                      { id: 'exam', label: 'اختبار تجريبي بنمط البجروت', desc: 'أسئلة متدرجة من المستوى 1 إلى 4 مع توزيع درجات' },
                      { id: 'lesson_plan', label: 'خطة درس تفاعلية', desc: 'أهداف سلوكية ومعرفية ومراحل زمنية للحصة' },
                      { id: 'comprehensive', label: 'حزمة تعليمية شاملة', desc: 'شرح مفصل + خطة درس + ورقة عمل + اختبار بجروت' }
                    ].map(goal => (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => setAiGoal(goal.id as any)}
                        className={`p-3 rounded-2xl text-right border transition-all cursor-pointer ${
                          aiGoal === goal.id
                            ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <div className="font-bold text-xs">{goal.label}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{goal.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {aiError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-600" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Loading State */}
              {isGeneratingAi && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                  <Loader2 size={36} className="animate-spin text-amber-500" />
                  <p className="text-sm font-bold text-stone-800">
                    جاري استدعاء نموذج Gemini 3.8 Flash وتطبيق تعليمات المنصة...
                  </p>
                  <p className="text-xs text-stone-500 max-w-md">
                    يتم الآن استخلاص المفاهيم من المرجع المعتمد وصياغة المحتوى والأسئلة المتدرجة بدقة فائقة.
                  </p>
                </div>
              )}

              {/* Generated Result Display */}
              {aiResult && !isGeneratingAi && (
                <div className="space-y-4">
                  {/* Results Header & Tabs */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      <button
                        onClick={() => setActiveResultTab('content')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activeResultTab === 'content'
                            ? 'bg-emerald-900 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        الشرح والملخص
                      </button>
                      <button
                        onClick={() => setActiveResultTab('questions')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          activeResultTab === 'questions'
                            ? 'bg-emerald-900 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        <span>الأسئلة المتدرجة</span>
                        <span className="text-[10px] bg-amber-400 text-emerald-950 font-bold px-1.5 py-0.2 rounded-full">
                          {aiResult.questions?.length || 0}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveResultTab('answer_key')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activeResultTab === 'answer_key'
                            ? 'bg-emerald-900 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        نموذج إجابة المعلم
                      </button>
                      {aiResult.lessonPlan && (
                        <button
                          onClick={() => setActiveResultTab('lesson_plan')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeResultTab === 'lesson_plan'
                              ? 'bg-emerald-900 text-white'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          خطة الدرس
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyFullContent}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="نسخ النص بالكامل"
                      >
                        {copiedNotification ? <CheckCheck size={14} className="text-emerald-700" /> : <Copy size={14} />}
                        <span>{copiedNotification ? 'تم النسخ!' : 'نسخ المحتوى'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Tab 1: Content & Summary */}
                  {activeResultTab === 'content' && (
                    <div className="space-y-4">
                      {aiResult.summary && (
                        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-800 leading-relaxed">
                          <strong className="text-emerald-900 block mb-1">ملخص المحتوى:</strong>
                          {aiResult.summary}
                        </div>
                      )}
                      <div className="p-4 bg-white rounded-2xl border border-stone-200 text-xs text-stone-800 leading-relaxed font-sans whitespace-pre-line space-y-3">
                        {aiResult.markdownContent}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Graduated Questions */}
                  {activeResultTab === 'questions' && (
                    <div className="space-y-3">
                      {aiResult.questions && aiResult.questions.length > 0 ? (
                        aiResult.questions.map((q: any, qIdx: number) => (
                          <div key={q.id || qIdx} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-xs font-bold text-stone-900">
                                السؤال {qIdx + 1}: {q.question}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                                  {q.levelBadge || q.cognitiveLevel || `مستوى ${qIdx + 1}`}
                                </span>
                                {q.points && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                                    {q.points} علامة
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {q.options?.map((opt: string, oIdx: number) => {
                                const isCorrect = opt === q.correctAnswer;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-2 rounded-xl text-xs border ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold flex items-center justify-between'
                                        : 'bg-white border-stone-200 text-stone-700'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {isCorrect && <CheckCircle size={14} className="text-emerald-700" />}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation */}
                            {q.modelExplanation && (
                              <div className="p-2 bg-emerald-50/50 rounded-xl text-[11px] text-emerald-950 border border-emerald-100">
                                <strong>التفسير العلمي المعتمد:</strong> {q.modelExplanation}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-stone-500 text-center py-4">لا توجد أسئلة مضمنة.</p>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Teacher Answer Key */}
                  {activeResultTab === 'answer_key' && (
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 text-xs text-stone-800 leading-relaxed whitespace-pre-line">
                      {aiResult.teacherAnswerKeyMarkdown || 'نموذج إجابة المعلم مستند إلى المرجع المعتمد.'}
                    </div>
                  )}

                  {/* Tab 4: Lesson Plan */}
                  {activeResultTab === 'lesson_plan' && aiResult.lessonPlan && (
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 text-xs">
                      <div>
                        <strong className="text-emerald-900 block mb-1">الأهداف التعليمية والسلوكية:</strong>
                        <ul className="list-disc list-inside space-y-1 text-stone-700">
                          {aiResult.lessonPlan.objectives?.map((obj: string, idx: number) => (
                            <li key={idx}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong className="text-emerald-900 block mb-1">مراحل وخطوات تنفيذ الدرس:</strong>
                        <ol className="list-decimal list-inside space-y-1 text-stone-700">
                          {aiResult.lessonPlan.steps?.map((step: string, idx: number) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between shrink-0">
              <div>
                {aiResult && (
                  <button
                    type="button"
                    onClick={() => {
                      setAiResult(null);
                      setAiError(null);
                    }}
                    className="text-xs text-stone-600 hover:text-stone-900 font-bold underline cursor-pointer"
                  >
                    توليد محتوى جديد أو تغيير الهدف
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إغلاق
                </button>
                {!aiResult && (
                  <button
                    type="button"
                    onClick={handleExecuteAiGeneration}
                    disabled={isGeneratingAi}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-emerald-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingAi ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>جاري التوليد...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>توليد المحتوى (Gemini API) 🚀</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
