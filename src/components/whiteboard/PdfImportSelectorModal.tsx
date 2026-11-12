import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  FileText, 
  BookOpen, 
  Columns, 
  Layers, 
  Grid, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Loader2, 
  ZoomIn, 
  HelpCircle,
  PenTool,
  SlidersHorizontal,
  ArrowDown,
  ScrollText,
  AlignVerticalJustifyCenter
} from 'lucide-react';
import { PdfDocumentInfo, parsePageRange } from '../../lib/pdfWhiteboardUtils';

export type PdfImportLayoutMode = 'vertical_stack' | 'dual_spread' | 'pdf_plus_scratchpad' | 'single_pages';
export type ScratchpadStyle = 'grid' | 'ruled' | 'blank' | 'dark';

interface PdfImportSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfInfo: PdfDocumentInfo | null;
  isLoading: boolean;
  onConfirmImport: (options: {
    selectedPages: number[];
    layoutMode: PdfImportLayoutMode;
    scratchpadStyle: ScratchpadStyle;
    verticalChunkSize?: 'all' | 2 | 3 | 4;
    hasVerticalScratchpad?: boolean;
  }) => Promise<void>;
}

export const PdfImportSelectorModal: React.FC<PdfImportSelectorModalProps> = ({
  isOpen,
  onClose,
  pdfInfo,
  isLoading,
  onConfirmImport
}) => {
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<PdfImportLayoutMode>('vertical_stack');
  const [scratchpadStyle, setScratchpadStyle] = useState<ScratchpadStyle>('grid');
  const [verticalChunkSize, setVerticalChunkSize] = useState<'all' | 2 | 3 | 4>('all');
  const [hasVerticalScratchpad, setHasVerticalScratchpad] = useState<boolean>(true); // Default to TRUE as requested: PDF on Left, Whiteboard on Right
  const [previewPageNumber, setPreviewPageNumber] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Initialize selected pages when pdfInfo loads
  useEffect(() => {
    if (pdfInfo) {
      const allPages = Array.from({ length: pdfInfo.numPages }, (_, i) => i + 1);
      setSelectedPages(allPages);
      setRangeInput(`1-${pdfInfo.numPages}`);
      setPreviewPageNumber(null);
    }
  }, [pdfInfo]);

  if (!isOpen || !pdfInfo) return null;

  const totalPages = pdfInfo.numPages;

  // Toggle single page selection
  const handleTogglePage = (pageNum: number) => {
    setSelectedPages(prev => {
      const next = prev.includes(pageNum) 
        ? prev.filter(p => p !== pageNum) 
        : [...prev, pageNum].sort((a, b) => a - b);
      
      // Update range input text representation
      updateRangeInputFromPages(next);
      return next;
    });
  };

  const updateRangeInputFromPages = (pages: number[]) => {
    if (pages.length === 0) {
      setRangeInput('');
      return;
    }
    if (pages.length === totalPages) {
      setRangeInput(`1-${totalPages}`);
      return;
    }
    // Simple comma separated or basic grouping
    setRangeInput(pages.join(', '));
  };

  // Handle custom range input change
  const handleRangeInputChange = (val: string) => {
    setRangeInput(val);
    const parsed = parsePageRange(val, totalPages);
    setSelectedPages(parsed);
  };

  // Quick Select Helpers
  const handleSelectAll = () => {
    const all = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelectedPages(all);
    setRangeInput(`1-${totalPages}`);
  };

  const handleDeselectAll = () => {
    setSelectedPages([]);
    setRangeInput('');
  };

  const handleSelectOdd = () => {
    const odd = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p % 2 !== 0);
    setSelectedPages(odd);
    setRangeInput(odd.join(', '));
  };

  const handleSelectEven = () => {
    const even = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p % 2 === 0);
    setSelectedPages(even);
    setRangeInput(even.join(', '));
  };

  // Confirm Import
  const handleProceed = async () => {
    if (selectedPages.length === 0) {
      alert('يرجى تحديد صفحة واحدة على الأقل للاسترداد.');
      return;
    }

    try {
      setIsProcessing(true);
      await onConfirmImport({
        selectedPages,
        layoutMode,
        scratchpadStyle,
        verticalChunkSize,
        hasVerticalScratchpad
      });
      onClose();
    } catch (e) {
      console.error('Import confirmation error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate spread counts preview
  const calculatedSpreadsCount = layoutMode === 'vertical_stack'
    ? (verticalChunkSize === 'all' ? 1 : Math.ceil(selectedPages.length / (typeof verticalChunkSize === 'number' ? verticalChunkSize : 1)))
    : layoutMode === 'dual_spread'
      ? Math.ceil(selectedPages.length / 2)
      : selectedPages.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none" dir="rtl">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">استرداد وتحديد صفحات المستند (PDF)</h3>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
                  {totalPages} صفحة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md sm:max-w-xl">
                {pdfInfo.title || 'ملف PDF تعليمي'} - حدد الصفحات المطلوبة وشكل العرض المتجاور
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-30"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* Top Controls: Selection Tools & Range */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-amber-400" />
                  أدوات التحديد السريع:
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  تحديد الكل ({totalPages})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  إلغاء التحديد
                </button>
                <button
                  type="button"
                  onClick={handleSelectOdd}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer hidden sm:inline-block"
                >
                  الفردية
                </button>
                <button
                  type="button"
                  onClick={handleSelectEven}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer hidden sm:inline-block"
                >
                  الزوجية
                </button>
              </div>

              {/* Selected Count Indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-950/60 border border-indigo-700/50 rounded-xl text-xs font-bold text-indigo-300">
                <Check size={14} className="text-emerald-400" />
                <span>تم تحديد: </span>
                <span className="font-mono text-white font-black">{selectedPages.length}</span>
                <span>من أصل {totalPages} صفحة</span>
              </div>
            </div>

            {/* Custom Range Input */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
              <label className="text-xs text-slate-400 font-bold shrink-0">
                نطاق الصفحات المطلوب:
              </label>
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => handleRangeInputChange(e.target.value)}
                placeholder="مثال: 1, 3-5, 8, 12-15"
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-hidden"
              />
              <span className="text-[11px] text-slate-500 hidden md:inline">
                (يمكنك الفصل بفاصلة أو كتابة شرطة للنطاق مثل 1-6)
              </span>
            </div>
          </div>

            {/* Import Layout Mode Options (الشكل بعد الاسترداد) */}
            <div className="space-y-3">
              <label className="text-xs font-black text-amber-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Columns size={15} />
                  اختر شكل وتنسيق الصفحات بعد الاسترداد على اللوح الذكي:
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  {layoutMode === 'vertical_stack' && '📜 صفحات متتابعة رأسياً: PDF على اليسار + الصفحة البيضاء على اليمين (تحريك بعجلة الماوس)'}
                  {layoutMode === 'dual_spread' && '📖 صفحتان متجاورتان بجانب بعضهما'}
                  {layoutMode === 'pdf_plus_scratchpad' && '📝 صفحة PDF على اليسار + سبورة بيضاء على اليمين'}
                  {layoutMode === 'single_pages' && '📄 كل صفحة في شريحة مستقلة'}
                </span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* Option 1: Vertical Stack (صفحات متتالية تحت بعضها البعض) */}
                <div
                  onClick={() => setLayoutMode('vertical_stack')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    layoutMode === 'vertical_stack'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/50'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-xs text-white">
                        <ScrollText size={16} className="text-emerald-400" />
                        <span>صفحات متتابعة (PDF يسار + بيضاء يمين)</span>
                      </div>
                      {layoutMode === 'vertical_stack' && (
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                          <Check size={12} />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                      صفحات الـ PDF على اليسار ومقابلها الصفحة البيضاء للشرح على اليمين، متتابعة أسفل بعضها البعض وتتحرك بسلاسة بعجلة الماوس 🖱️.
                    </p>
                  </div>

                  {/* Visual Mini Diagram for Vertical Stack: PDF on Left, Whiteboard on Right */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-col items-center justify-center gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-6 w-11 bg-slate-800 rounded border border-slate-600 flex items-center justify-center text-[8px] font-bold text-sky-300">PDF يسار</div>
                      <div className="h-6 w-11 bg-emerald-950/60 rounded border border-emerald-500/50 flex items-center justify-center text-[8px] font-bold text-emerald-200">بيضاء يمين</div>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
                      <ArrowDown size={10} className="animate-bounce" />
                      <span>عجلة الماوس 🖱️</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-70">
                      <div className="h-5 w-10 bg-slate-800 rounded border border-slate-600 flex items-center justify-center text-[7px] font-mono text-slate-300">PDF صـ2</div>
                      <div className="h-5 w-10 bg-emerald-950/60 rounded border border-emerald-500/40 flex items-center justify-center text-[7px] font-mono text-emerald-200">بيضاء صـ2</div>
                    </div>
                  </div>
                </div>

                {/* Option 2: Dual Page Spread (صفحتان متجاورتان) */}
                <div
                  onClick={() => setLayoutMode('dual_spread')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    layoutMode === 'dual_spread'
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-xs text-white">
                        <BookOpen size={16} className="text-indigo-400" />
                        <span>صفحتان متجاورتان (كتاب مفتوح)</span>
                      </div>
                      {layoutMode === 'dual_spread' && (
                        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">
                          <Check size={12} />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      يدمج كل صفحتين متتاليتين جنباً إلى جنب (1-2 ثم 3-4...) مع فاصل أنيق للشرح السلس المقارن.
                    </p>
                  </div>

                  {/* Visual Mini Diagram */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1">
                    <div className="h-10 w-8 bg-slate-800 rounded border border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-300">ص 1</div>
                    <div className="h-10 w-0.5 bg-indigo-500/50"></div>
                    <div className="h-10 w-8 bg-slate-800 rounded border border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-300">ص 2</div>
                  </div>
                </div>

                {/* Option 3: PDF + Scratchpad Split (صفحة PDF على اليسار + مسودة حل بيضاء على اليمين) */}
                <div
                  onClick={() => setLayoutMode('pdf_plus_scratchpad')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    layoutMode === 'pdf_plus_scratchpad'
                      ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-xs text-white">
                        <PenTool size={16} className="text-amber-400" />
                        <span>PDF يسار + مسودة بيضاء يمين</span>
                      </div>
                      {layoutMode === 'pdf_plus_scratchpad' && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs">
                          <Check size={12} />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      يضع صفحة الـ PDF على اليسار، وبجانبها على اليمين سبورة بيضاء مخصصة لكتابة الخطوات والشرح!
                    </p>
                  </div>

                  {/* Visual Mini Diagram */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1">
                    <div className="h-10 w-8 bg-slate-800 rounded border border-slate-600 flex items-center justify-center text-[8px] font-mono text-slate-300">PDF يسار</div>
                    <div className="h-10 w-0.5 bg-amber-500/50"></div>
                    <div className="h-10 w-8 bg-amber-950/40 rounded border border-amber-500/40 flex items-center justify-center text-[8px] font-bold text-amber-300">بيضاء يمين</div>
                  </div>
                </div>

                {/* Option 4: Single Pages (صفحات مفردة) */}
                <div
                  onClick={() => setLayoutMode('single_pages')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    layoutMode === 'single_pages'
                      ? 'bg-sky-950/40 border-sky-500 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-xs text-white">
                        <FileText size={16} className="text-sky-400" />
                        <span>صفحات مفردة مستقلة</span>
                      </div>
                      {layoutMode === 'single_pages' && (
                        <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs">
                          <Check size={12} />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      كل صفحة يتم استيرادها كشريحة سبورة مفردة بعرض الشاشة الكامل.
                    </p>
                  </div>

                  {/* Visual Mini Diagram */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-center">
                    <div className="h-10 w-16 bg-slate-800 rounded border border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-300">شريحة مفردة</div>
                  </div>
                </div>

              </div>

              {/* Extra Options for Vertical Stack Mode (تنسيق الصفحات الرأسية) */}
              {layoutMode === 'vertical_stack' && (
                <div className="space-y-2.5 p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl text-xs animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-300">طريقة توزيع وتجميع الصفحات الرأسية:</span>
                      <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setVerticalChunkSize('all')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            verticalChunkSize === 'all' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          📜 كل الصفحات في لوح رأسي متصل واحد
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerticalChunkSize(2)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            verticalChunkSize === 2 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          كل صفحتين (2) تحت بعضهما
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerticalChunkSize(3)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            verticalChunkSize === 3 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          كل 3 صفحات تحت بعضها
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerticalChunkSize(4)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            verticalChunkSize === 4 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          كل 4 صفحات
                        </button>
                      </div>
                    </div>

                    {/* Side Scratchpad Toggle for Vertical Stack */}
                    <button
                      type="button"
                      onClick={() => setHasVerticalScratchpad(prev => !prev)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                        hasVerticalScratchpad
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <PenTool size={13} />
                      <span>{hasVerticalScratchpad ? '✓ مفعل: صفحات PDF على اليسار والصفحة البيضاء على اليمين' : '+ تفعيل الصفحة البيضاء للشرح على اليمين'}</span>
                    </button>
                  </div>

                  {hasVerticalScratchpad && (
                    <div className="flex items-center gap-2 pt-2 border-t border-emerald-900/40">
                      <span className="text-slate-400 font-bold">نوع خلفية عمود المسودة:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setScratchpadStyle('grid')}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                            scratchpadStyle === 'grid' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          📐 شبكة مربعات
                        </button>
                        <button
                          type="button"
                          onClick={() => setScratchpadStyle('ruled')}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                            scratchpadStyle === 'ruled' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          📝 مسطر
                        </button>
                        <button
                          type="button"
                          onClick={() => setScratchpadStyle('blank')}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                            scratchpadStyle === 'blank' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          ⚪ أبيض فارغ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Extra Options for Scratchpad Mode */}
              {layoutMode === 'pdf_plus_scratchpad' && (
                <div className="flex items-center gap-3 p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs">
                  <span className="font-bold text-amber-300">نوع خلفية مسودة الشرح:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScratchpadStyle('grid')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        scratchpadStyle === 'grid' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      📐 شبكة مربعات (رياضيات)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScratchpadStyle('ruled')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        scratchpadStyle === 'ruled' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      📝 أسطر دفتر مسطرة
                    </button>
                    <button
                      type="button"
                      onClick={() => setScratchpadStyle('blank')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        scratchpadStyle === 'blank' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      ⚪ بيضاء فارغة
                    </button>
                  </div>
                </div>
              )}
            </div>

          {/* Page Thumbnails Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Grid size={14} className="text-indigo-400" />
                معاينة وتحديد الصفحات الفردية ({totalPages} صفحة):
              </label>
              <span className="text-[11px] text-slate-400">انقر على أي صفحة لتحديدها أو إلغائها</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 max-h-80 overflow-y-auto custom-scrollbar">
              {pdfInfo.pages.map((p) => {
                const isSelected = selectedPages.includes(p.pageNumber);
                return (
                  <div
                    key={p.pageNumber}
                    onClick={() => handleTogglePage(p.pageNumber)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group flex flex-col ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-950/30'
                        : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600 bg-slate-900'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-3/4 bg-white flex items-center justify-center overflow-hidden">
                      <img
                        src={p.thumbnailUrl}
                        alt={`صفحة ${p.pageNumber}`}
                        className="w-full h-full object-contain pointer-events-none select-none"
                        loading="lazy"
                      />
                      
                      {/* Checkbox badge */}
                      <div className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-slate-900/80 text-slate-400 border border-slate-700'
                      }`}>
                        {isSelected ? <Check size={14} /> : <Square size={14} />}
                      </div>

                      {/* Zoom Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPageNumber(p.pageNumber);
                        }}
                        className="absolute bottom-1.5 left-1.5 p-1 bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="معاينة مكبرة"
                      >
                        <ZoomIn size={13} />
                      </button>
                    </div>

                    {/* Footer Info */}
                    <div className="p-1.5 text-center bg-slate-900 border-t border-slate-800 text-[11px] font-bold font-mono text-slate-300">
                      صفحة {p.pageNumber}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Sparkles size={15} className="text-amber-400 shrink-0" />
            <span>
              سيتم إنشاء <strong>{calculatedSpreadsCount}</strong> {layoutMode === 'dual_spread' ? 'شريحة مزدوجة (صفحتان معاً)' : 'شريحة باللوح'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleProceed}
              disabled={isProcessing || selectedPages.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin text-amber-300" />
                  <span>جاري تجهيز واسترداد الصفحات بدقة...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>استرداد {selectedPages.length} صفحة إلى اللوح</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* High-Res Single Page Zoom Modal */}
      {previewPageNumber !== null && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewPageNumber(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800">معاينة صفحة {previewPageNumber}</span>
              <button
                type="button"
                onClick={() => setPreviewPageNumber(null)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={pdfInfo.pages.find(p => p.pageNumber === previewPageNumber)?.thumbnailUrl}
              alt={`معاينة صفحة ${previewPageNumber}`}
              className="max-h-[70vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}

    </div>
  );
};
