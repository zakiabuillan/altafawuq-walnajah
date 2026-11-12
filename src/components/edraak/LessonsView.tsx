import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Sparkles, 
  FlaskConical, 
  Zap, 
  Sun, 
  Layers, 
  Leaf, 
  ArrowLeft, 
  ArrowRight, 
  Info, 
  CheckSquare, 
  Search, 
  Printer, 
  Download, 
  Highlighter, 
  CreditCard, 
  RotateCw,
  FileText,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { CurriculumData, LearningUnit, StudentProgress, ApprovedReference, StudentUnitQuizResult } from './types';
import { MathJaxSection } from '../MathJaxSection';
import { UnitQuizSection } from './UnitQuizSection';

interface LessonsViewProps {
  curriculum: CurriculumData;
  progress: StudentProgress;
  onToggleUnitRead: (unitId: string) => void;
  onProceedToReview: () => void;
  currentStudent?: {
    id: string;
    name: string;
    email?: string;
  };
  onSaveUnitQuizResult?: (result: StudentUnitQuizResult) => void;
}

export const LessonsView: React.FC<LessonsViewProps> = ({
  curriculum,
  progress,
  onToggleUnitRead,
  onProceedToReview,
  currentStudent,
  onSaveUnitQuizResult
}) => {
  const [activeUnitIndex, setActiveUnitIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHighlightEnabled, setIsHighlightEnabled] = useState(true);
  const [activeTabMode, setActiveTabMode] = useState<'content' | 'flashcards'>('content');
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const units = curriculum.learningUnits;
  const currentUnit: LearningUnit | undefined = units[activeUnitIndex] || units[0];

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Generate flashcards from current unit key terms and details
  const flashcards = useMemo(() => {
    if (!currentUnit) return [];
    const list: { id: string; front: string; back: string; category: string }[] = [];

    if (currentUnit.keyTerms) {
      currentUnit.keyTerms.forEach((t, i) => {
        list.push({
          id: `card-term-${i}`,
          front: `${t.ar} (${t.en})`,
          back: t.definition || 'مفهوم رئيسي في مساق التمثيل الضوئي وعلم البيولوجيا.',
          category: 'مصطلح علمي'
        });
      });
    }

    if (currentUnit.chemicalEquation) {
      list.push({
        id: 'card-chem',
        front: 'المعادلة الكيميائية لعملية التمثيل الضوئي',
        back: currentUnit.chemicalEquation,
        category: 'تفاعل كيميائي'
      });
    }

    if (currentUnit.details) {
      currentUnit.details.slice(0, 4).forEach((d, i) => {
        list.push({
          id: `card-detail-${i}`,
          front: `مفهوم تطبيقي #${i + 1}: ${currentUnit.title}`,
          back: d,
          category: 'فهم وتطبيق'
        });
      });
    }

    return list;
  }, [currentUnit]);

  // Search filtering in current unit
  const filteredDetails = useMemo(() => {
    if (!currentUnit || !Array.isArray(currentUnit.details)) return [];
    if (!searchQuery.trim()) return currentUnit.details;
    const q = (searchQuery || '').trim().toLowerCase();
    return currentUnit.details.filter(
      (d) => (d || '').toLowerCase().includes(q)
    );
  }, [currentUnit, searchQuery]);

  const filteredTerms = useMemo(() => {
    if (!currentUnit || !Array.isArray(currentUnit.keyTerms)) return [];
    if (!searchQuery.trim()) return currentUnit.keyTerms;
    const q = (searchQuery || '').trim().toLowerCase();
    return currentUnit.keyTerms.filter(
      (t) =>
        (t.ar || '').toLowerCase().includes(q) ||
        (t.en || '').toLowerCase().includes(q) ||
        (t.definition && (t.definition || '').toLowerCase().includes(q))
    );
  }, [currentUnit, searchQuery]);

  // Handler for printing current lesson
  const handlePrint = () => {
    window.print();
  };

  // Handler for downloading text summary
  const handleDownloadSummary = () => {
    if (!currentUnit) return;
    const summaryText = `
=========================================
أكاديمية التفوق أون لاين - ملخص الدرس
المساق: ${curriculum.title}
الوحدة: ${currentUnit.unitNumber} - ${currentUnit.title}
العنوان الفرعي: ${currentUnit.subtitle}
=========================================

[خلاصة المفهوم العلمي]
${currentUnit.summary}

${currentUnit.chemicalEquation ? `[المعادلة الكيميائية]\n${currentUnit.chemicalEquation}\n` : ''}

[النقاط والشروحات الأساسية]
${currentUnit.details.map((d, i) => `${i + 1}. ${d}`).join('\n\n')}

${currentUnit.keyTerms ? `[المصطلحات العلمية ثنائية اللغة]\n${currentUnit.keyTerms.map(t => `• ${t.ar} (${t.en}): ${t.definition || ''}`).join('\n')}` : ''}

=========================================
تم استخراج هذا الملخص تلقائياً من منصة أكاديمية التفوق
`.trim();

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ملخص_${currentUnit.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!currentUnit) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-stone-200">
        <p className="text-stone-600">لا توجد وحدات تعليمية متاحة حالياً.</p>
      </div>
    );
  }

  const isCurrentRead = progress.unitsRead.includes(currentUnit.id);

  // Find approved reference associated with the current unit
  const approvedRef: ApprovedReference | null = useMemo(() => {
    const refs = curriculum.approvedReferences || [];
    if (refs.length === 0) return null;
    if (currentUnit.approvedReferenceId) {
      const found = refs.find(r => r.id === currentUnit.approvedReferenceId);
      if (found) return found;
    }
    const byUnit = refs.find(r => r.unitId === currentUnit.id && r.isApproved);
    if (byUnit) return byUnit;
    return refs.find(r => r.isApproved) || null;
  }, [curriculum.approvedReferences, currentUnit]);

  // Helper for highlighting keywords if enabled
  const renderHighlightedText = (text: string) => {
    if (!isHighlightEnabled) return text;
    // Highlight prominent scientific keywords
    const keywords = [
      'التمثيل الضوئي',
      'البلاستيدات الخضراء',
      'الكلوروفيل',
      'الثايلاكويد',
      'الستروما',
      'حلقة كالفن',
      'روبيسكو',
      'ATP',
      'NADPH',
      'الجلوكوز',
      'الأكسجين',
      'ثاني أكسيد الكربون',
      'الضوء',
      'الماء',
      'الإنزيمات',
      'بيولوجيا'
    ];

    const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (keywords.some((k) => (k || '').toLowerCase() === (part || '').toLowerCase())) {
        return (
          <mark
            key={i}
            className="bg-amber-200/70 text-emerald-950 font-bold px-1 rounded mx-0.5"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search & Tool Action Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث سريع داخل مفاهيم ومعادلات الوحدة..."
            className="w-full pl-4 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-emerald-700 transition-colors"
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

        {/* Action Toggles */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Content Mode vs Flashcards */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveTabMode('content')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTabMode === 'content'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen size={14} />
              <span>الشرح والدروس</span>
            </button>
            <button
              onClick={() => setActiveTabMode('flashcards')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTabMode === 'flashcards'
                  ? 'bg-amber-500 text-emerald-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CreditCard size={14} />
              <span>بطاقات تعليمية ({flashcards.length})</span>
            </button>
          </div>

          {/* Highlight toggle */}
          <button
            onClick={() => setIsHighlightEnabled(!isHighlightEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isHighlightEnabled
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
            title="تفعيل/تعطيل التمييز اللوني للمفاهيم الأساسية"
          >
            <Highlighter size={14} />
            <span className="hidden sm:inline">تمييز المفاهيم</span>
          </button>

          {/* Download summary */}
          <button
            onClick={handleDownloadSummary}
            className="px-3 py-2 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="تنزيل ملخص الدرس كملف نصي"
          >
            <Download size={14} className="text-emerald-700" />
            <span className="hidden sm:inline">تنزيل الملخص</span>
          </button>

          {/* Print lesson */}
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="طباعة محتوى الدرس كاملاً"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">طباعة</span>
          </button>
        </div>
      </div>

      {/* Unit Selector Bar (Edraak Course Navigation) */}
      <div className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {units.map((unit, idx) => {
            const isSelected = idx === activeUnitIndex;
            const isRead = progress.unitsRead.includes(unit.id);
            return (
              <button
                key={unit.id}
                onClick={() => {
                  setActiveUnitIndex(idx);
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-900 text-white shadow-md'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                }`}
              >
                <span>الوحدة {idx + 1}</span>
                {isRead && (
                  <CheckCircle2 size={13} className={isSelected ? 'text-amber-300' : 'text-emerald-600'} />
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-stone-500 font-semibold px-2 shrink-0 hidden md:block">
          {activeUnitIndex + 1} من {units.length}
        </div>
      </div>

      {/* Main Mode 1: Flashcards Mode */}
      {activeTabMode === 'flashcards' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 text-amber-950 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-xs">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold">البطاقات التعليمية التفاعلية (Flashcards)</h3>
                <p className="text-xs text-amber-800">
                  انقر على أي بطاقة لقلبها واختبار حفظك وفهمك للمصطلحات والمعادلات الكيميائية.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-white rounded-xl border border-amber-300">
              {flashcards.length} بطاقة
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {flashcards.map((card) => {
              const isFlipped = !!flippedCards[card.id];
              return (
                <div
                  key={card.id}
                  onClick={() => toggleFlip(card.id)}
                  className={`min-h-[190px] rounded-2xl p-6 border transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-xs select-none ${
                    isFlipped
                      ? 'bg-emerald-950 text-white border-emerald-900 shadow-md'
                      : 'bg-white text-stone-900 border-stone-200 hover:border-amber-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b pb-2 mb-3 border-stone-100 dark:border-emerald-900/60">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isFlipped ? 'bg-amber-400/20 text-amber-300' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {card.category}
                    </span>
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <RotateCw size={12} className={isFlipped ? 'text-amber-400 animate-spin-once' : ''} />
                      {isFlipped ? 'الإجابة' : 'السؤال'}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-center text-center">
                    {isFlipped ? (
                      <p className="text-xs md:text-sm text-emerald-100 leading-relaxed font-medium">
                        {card.back}
                      </p>
                    ) : (
                      <h4 className="text-sm md:text-base font-extrabold text-stone-900 font-serif">
                        {card.front}
                      </h4>
                    )}
                  </div>

                  <div className="pt-2 text-center">
                    <span className="text-[10px] text-stone-400 hover:underline">
                      (اضغط للقلب)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Mode 2: Content View */}
      {activeTabMode === 'content' && (
        <div id="printable-lesson" className="bg-white rounded-3xl p-6 md:p-10 border border-stone-200/80 shadow-sm space-y-8">
          {/* Lesson Header */}
          <div className="border-b border-stone-100 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                <Leaf size={13} />
                الوحدة {activeUnitIndex + 1}: {currentUnit.title}
              </span>

              <button
                type="button"
                onClick={() => onToggleUnitRead(currentUnit.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCurrentRead
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                <CheckCircle2 size={14} className={isCurrentRead ? 'text-emerald-600' : 'text-stone-400'} />
                <span>{isCurrentRead ? 'تمت دراسة هذه الوحدة ✅' : 'تحديد كمقروء'}</span>
              </button>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900 font-serif mt-2">
              {currentUnit.title}
            </h2>
            <p className="text-sm md:text-base text-stone-500 mt-1">
              {currentUnit.subtitle}
            </p>
          </div>

          {/* Search notice if active */}
          {searchQuery && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
              <span>نتائج البحث عن: «{searchQuery}»</span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-amber-800 font-bold hover:underline"
              >
                مسح البحث
              </button>
            </div>
          )}

          {/* Teacher Approved Reference Banner for this Lesson */}
          {approvedRef && (
            <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-stone-900 rounded-2xl p-5 md:p-6 text-white border border-emerald-800/80 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black bg-amber-400 text-emerald-950 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck size={14} />
                  المرجع العلمي المعتمد لهذا الدرس (مرجعية معلم المادة)
                </span>

                <span className="text-[11px] text-emerald-300 font-mono">
                  أولوية المرجع: #{approvedRef.priority} • نوع المصدر: {approvedRef.sourceType.toUpperCase()}
                </span>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base md:text-lg font-bold text-white font-serif">
                  {approvedRef.title}
                </h4>
                <p className="text-xs text-emerald-200 flex flex-wrap items-center gap-2">
                  <span>المؤلف / المصدر: <strong>{approvedRef.authorOrPublisher}</strong></span>
                  <span>•</span>
                  <span>المساق: {approvedRef.subject} ({approvedRef.gradeLevel})</span>
                  <span>•</span>
                  <span className="text-amber-300">اعتمد رسمياً بواسطة: {approvedRef.approvedByTeacherName}</span>
                </p>
                {approvedRef.citation && (
                  <p className="text-[11px] text-stone-300 font-mono bg-black/30 p-2 rounded-xl border border-white/10">
                    التوثيق الأكاديمي: {approvedRef.citation}
                  </p>
                )}
              </div>

              {approvedRef.notes && (
                <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200">
                  <strong className="text-amber-300">توجيه المعلم للطلاب: </strong>
                  {approvedRef.notes}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between text-[11px] text-emerald-300/80 pt-2 border-t border-emerald-900/60 gap-2">
                <span className="flex items-center gap-1 text-emerald-200 font-medium">
                  <CheckCircle2 size={13} className="text-amber-400" />
                  ملاحظة: كافة أسئلة المراجعة، البطاقات، والامتحانات مبنية حصراً على هذا المرجع المعتمد.
                </span>
                {approvedRef.urlOrContent && (
                  <a
                    href={approvedRef.urlOrContent}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-300 hover:text-amber-200 font-bold underline flex items-center gap-1"
                  >
                    <span>فتح واستعراض المرجع</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Executive Summary Card */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-200/80 rounded-2xl p-5 md:p-6 text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-2">
              <Info size={16} className="text-emerald-700" />
              <span>خلاصة المفهوم العلمي:</span>
            </div>
            <p className="text-sm md:text-base leading-relaxed">
              {renderHighlightedText(currentUnit.summary)}
            </p>
          </div>

          {/* Chemical Equation Box if exists */}
          {currentUnit.chemicalEquation && (
            <div className="bg-[#FAF8F5] border-2 border-dashed border-amber-300/80 rounded-2xl p-5 md:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <FlaskConical size={16} className="text-amber-600" />
                  <span>المعادلة الكيميائية / التفاعل الحيوي:</span>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono">
                  Formula & Stoichiometry
                </span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-sm text-center text-sm md:text-lg font-bold text-emerald-950 overflow-x-auto" dir="ltr">
                <MathJaxSection content={`$$${currentUnit.chemicalEquation}$$`} />
              </div>
              <p className="text-[11px] text-stone-500 text-center mt-2" dir="rtl">
                توازن الذرات وتدفق الطاقة في التفاعل الكيميائي لعملية التمثيل الضوئي.
              </p>
            </div>
          )}

          {/* Detailed Explanation Breakdown */}
          <div>
            <h3 className="text-lg font-bold text-stone-900 font-serif mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-700" />
              <span>التفاصيل والشرح العلمي المعمق:</span>
            </h3>

            {filteredDetails.length === 0 ? (
              <p className="text-xs text-stone-500 italic p-4 bg-stone-50 rounded-xl">
                لا توجد نقاط مطابقة لكلمة البحث في هذا القسم.
              </p>
            ) : (
              <div className="space-y-3.5">
                {filteredDetails.map((point, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-4 rounded-xl bg-stone-50 border border-stone-200/70 hover:border-emerald-300 transition-all flex items-start gap-3.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      {pIdx + 1}
                    </div>
                    <p className="text-xs md:text-sm text-stone-700 leading-relaxed font-normal">
                      {renderHighlightedText(point)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conceptual Diagram & Components */}
          {currentUnit.diagram && (
            <div className="bg-stone-50 rounded-2xl p-5 md:p-6 border border-stone-200">
              <div className="mb-3">
                <h4 className="font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                  <Layers size={16} className="text-emerald-700" />
                  <span>{currentUnit.diagram.title}</span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">{currentUnit.diagram.caption}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {currentUnit.diagram.elements.map((el, elIdx) => (
                  <div key={elIdx} className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-2xs">
                    <span className="text-xs font-bold text-emerald-900 block mb-1">{el.name}</span>
                    <span className="text-[11px] text-stone-600 leading-normal block">{el.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bilingual Scientific Terminology */}
          {filteredTerms && filteredTerms.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-stone-900 font-serif mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-700" />
                <span>المصطلحات العلمية ثنائية اللغة (Arabic & English):</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTerms.map((term, tIdx) => (
                  <div
                    key={tIdx}
                    className="p-3 bg-white border border-stone-200 rounded-xl hover:border-emerald-400 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-xs md:text-sm text-emerald-950">
                        {renderHighlightedText(term.ar)}
                      </span>
                      <span className="text-xs font-semibold text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded">
                        ({term.en})
                      </span>
                    </div>
                    {term.definition && (
                      <p className="text-[11px] text-stone-500 leading-relaxed mt-1">
                        {renderHighlightedText(term.definition)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unit Multiple-Choice Quiz Section (Persisted to Firebase studentProgress) */}
          <UnitQuizSection
            unit={currentUnit}
            isRead={isCurrentRead}
            onMarkUnitRead={() => onToggleUnitRead(currentUnit.id)}
            currentStudent={currentStudent || {
              id: 'student-mohammad-101',
              name: progress.studentName || 'محمد أحمد',
              email: progress.studentEmail || 'mohammad.ahmed@altafawuq.edu'
            }}
            savedQuizResult={progress.unitQuizResults?.[currentUnit.id]}
            onQuizCompleted={(result) => {
              if (onSaveUnitQuizResult) {
                onSaveUnitQuizResult(result);
              }
            }}
            onNextUnit={() => {
              if (activeUnitIndex < units.length - 1) {
                setActiveUnitIndex(activeUnitIndex + 1);
                setSearchQuery('');
              }
            }}
            isLastUnit={activeUnitIndex === units.length - 1}
            onProceedToReview={onProceedToReview}
          />

          {/* Bottom Navigation Buttons */}
          <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => {
                  setActiveUnitIndex(Math.max(0, activeUnitIndex - 1));
                  setSearchQuery('');
                }}
                disabled={activeUnitIndex === 0}
                className="px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
                <span>الوحدة السابقة</span>
              </button>

              {activeUnitIndex < units.length - 1 ? (
                <button
                  onClick={() => {
                    onToggleUnitRead(currentUnit.id);
                    setActiveUnitIndex(activeUnitIndex + 1);
                    setSearchQuery('');
                  }}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>الوحدة التالية</span>
                  <ChevronLeft size={16} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    onToggleUnitRead(currentUnit.id);
                    onProceedToReview();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <CheckSquare size={16} />
                  <span>إنهاء الشرح والانتقال للتدريب</span>
                </button>
              )}
            </div>

            <button
              onClick={onProceedToReview}
              className="text-xs md:text-sm text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1.5 underline cursor-pointer"
            >
              <span>الانتقال فوراً لأسئلة المراجعة (4 أنواع)</span>
              <ArrowLeft size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

