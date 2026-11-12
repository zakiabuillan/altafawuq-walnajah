import React from 'react';
import { 
  FileText, 
  FolderOpen, 
  Save, 
  Download, 
  Printer, 
  Undo2, 
  Redo2, 
  Scissors, 
  Copy, 
  Clipboard, 
  ChevronsLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsRight, 
  Maximize2, 
  Minimize2, 
  PenTool, 
  Eraser, 
  Highlighter, 
  Type, 
  MousePointer, 
  BoxSelect, 
  Sparkles, 
  Grid, 
  Compass, 
  Plus, 
  ArrowRightCircle, 
  ArrowLeftCircle,
  ArrowDown,
  ZoomIn,
  ZoomOut,
  Expand,
  Presentation,
  PenLine,
  Pin,
  PinOff
} from 'lucide-react';
import { XournalTool, PageBackgroundStyle, XournalPageLayoutMode } from './types';

interface XournalPrimaryToolbarProps {
  isAutoHideBars?: boolean;
  onToggleAutoHideBars?: () => void;
  onNewDocument: () => void;
  onOpenPdf: () => void;
  onOpenJournal?: () => void;
  onRestoreSession?: () => void;
  hasAutosavedSession?: boolean;
  onSaveJournal: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  onStartPresentation?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoCount?: number;
  redoCount?: number;
  activePageLabel?: string;
  currentPageIndex: number;
  totalPages: number;
  onGoToPage: (pageIndex: number) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onZoom100: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  activeTool: XournalTool;
  onSelectTool: (tool: XournalTool) => void;
  onInsertPageAfter: (style?: PageBackgroundStyle) => void;
  onInsertPageBefore: (style?: PageBackgroundStyle) => void;
  onInsertPageBeside?: (style?: PageBackgroundStyle) => void;
  onInsertPageBelow?: (style?: PageBackgroundStyle) => void;
  pageLayoutMode?: XournalPageLayoutMode;
  onSetPageLayoutMode?: (mode: XournalPageLayoutMode) => void;
  isCurrentPageBlank: boolean;
}

export const XournalPrimaryToolbar: React.FC<XournalPrimaryToolbarProps> = ({
  isAutoHideBars,
  onToggleAutoHideBars,
  onNewDocument,
  onOpenPdf,
  onOpenJournal,
  onRestoreSession,
  hasAutosavedSession,
  onSaveJournal,
  onExportPdf,
  onPrint,
  onStartPresentation,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  activePageLabel,
  currentPageIndex,
  totalPages,
  onGoToPage,
  zoom,
  onZoomChange,
  onFitWidth,
  onFitPage,
  onZoom100,
  isFullscreen,
  onToggleFullscreen,
  activeTool,
  onSelectTool,
  onInsertPageAfter,
  onInsertPageBefore,
  onInsertPageBeside,
  onInsertPageBelow,
  pageLayoutMode = 'single',
  onSetPageLayoutMode,
  isCurrentPageBlank
}) => {
  return (
    <div 
      className="bg-[#ebebeb] border-b border-[#cccccc] px-2 py-1 flex items-center justify-between text-[#222222] select-none text-xs gap-1.5 flex-wrap overflow-x-auto min-h-[38px] shadow-xs"
      dir="ltr"
    >
      {/* 1. Document Actions */}
      <div className="flex items-center space-x-0.5 border-r border-[#d4d4d4] pr-1.5 shrink-0">
        <button
          type="button"
          onClick={onNewDocument}
          className="p-1.5 hover:bg-[#d8d8d8] active:bg-[#c4c4c4] rounded text-slate-700 transition-colors cursor-pointer"
          title="New Document (Ctrl+N)"
        >
          <FileText size={15} />
        </button>
        <button
          type="button"
          onClick={onOpenPdf}
          className="p-1.5 hover:bg-[#d8d8d8] active:bg-[#c4c4c4] rounded text-slate-700 transition-colors cursor-pointer"
          title="Open PDF Document (Ctrl+O) - فتح مستند PDF"
        >
          <FolderOpen size={15} />
        </button>
        {onOpenJournal && (
          <button
            type="button"
            onClick={onOpenJournal}
            className="p-1.5 hover:bg-amber-100 text-amber-800 active:bg-amber-200 rounded transition-colors cursor-pointer"
            title="Open / Restore Journal (.xoj / .json) - استرداد ملف تدوين محفوظ"
          >
            <FolderOpen size={15} className="text-amber-700 stroke-[2.2]" />
          </button>
        )}
        {hasAutosavedSession && onRestoreSession && (
          <button
            type="button"
            onClick={onRestoreSession}
            className="p-1.5 hover:bg-emerald-100 text-emerald-800 active:bg-emerald-200 rounded transition-colors cursor-pointer"
            title="Restore Last Auto-Backup - استرداد مسودة الجلسة السابقة"
          >
            <Sparkles size={15} className="text-emerald-700" />
          </button>
        )}
        <button
          type="button"
          onClick={onSaveJournal}
          className="p-1.5 hover:bg-[#d8d8d8] active:bg-[#c4c4c4] rounded text-slate-700 transition-colors cursor-pointer"
          title="Save Journal File (.xoj) - حفظ ملف التدوين (Ctrl+S)"
        >
          <Save size={15} />
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          className="p-1.5 hover:bg-blue-100 text-blue-800 active:bg-blue-200 rounded transition-colors cursor-pointer font-bold"
          title="Export to Annotated PDF (Ctrl+E) - تصدير لـ PDF مدمج مع الشرح"
        >
          <Download size={15} className="text-blue-700" />
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="p-1.5 hover:bg-[#d8d8d8] active:bg-[#c4c4c4] rounded text-slate-700 transition-colors cursor-pointer"
          title="Print Document (Ctrl+P)"
        >
          <Printer size={15} />
        </button>
      </div>

      {/* 2. Undo / Redo (Per-Page History) */}
      <div className="flex items-center space-x-0.5 border-r border-[#d4d4d4] pr-1.5 shrink-0" title={`سجل التراجع الخاص بـ ${activePageLabel || 'الصفحة الحالية'}`}>
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className="p-1.5 hover:bg-[#d8d8d8] active:bg-[#c4c4c4] rounded text-slate-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          title={`تراجع (Ctrl+Z) - ${activePageLabel || 'الصفحة الحالية'} ${undoCount !== undefined ? `(${undoCount} حركة متاحة)` : ''}`}
        >
          <Undo2 size={15} />
          {undoCount !== undefined && undoCount > 0 && (
            <span className="text-[9px] font-mono font-black text-slate-700 bg-slate-300/80 px-1 py-0.2 rounded leading-none">
              {undoCount}
            </span>
          )}
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          className="p-1.5 hover:bg-[#d8d8d8] active:bg-[#c4c4c4] rounded text-slate-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          title={`إعادة (Ctrl+Y) - ${activePageLabel || 'الصفحة الحالية'} ${redoCount !== undefined ? `(${redoCount} حركة متاحة)` : ''}`}
        >
          <Redo2 size={15} />
          {redoCount !== undefined && redoCount > 0 && (
            <span className="text-[9px] font-mono font-black text-slate-700 bg-slate-300/80 px-1 py-0.2 rounded leading-none">
              {redoCount}
            </span>
          )}
        </button>
      </div>

      {/* 3. Page Navigation Controls (Dedicated Fast-Navigation for Presentation & Lecturing) */}
      <div 
        className="flex items-center gap-1 border-r border-[#d4d4d4] pr-2 shrink-0 bg-slate-200/70 p-0.5 rounded-lg border border-slate-300 shadow-2xs"
        data-testid="xournal-toolbar-page-navigation"
      >
        {/* First Page (Home) */}
        <button
          type="button"
          disabled={currentPageIndex <= 0}
          onClick={() => onGoToPage(0)}
          className="p-1 hover:bg-white text-slate-700 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="الصفحة الأولى (Home)"
          aria-label="First page"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Previous Page Button (الصفحة السابقة) */}
        <button
          type="button"
          id="xournal-toolbar-prev-page-btn"
          data-testid="xournal-toolbar-prev-page"
          disabled={currentPageIndex <= 0}
          onClick={() => onGoToPage(currentPageIndex - 1)}
          className="px-2.5 py-1 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 border border-slate-300 rounded shadow-xs font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed select-none"
          title="الانتقال إلى الصفحة السابقة (PageUp / ←)"
        >
          <ChevronLeft size={15} className="text-blue-700 stroke-[2.5]" />
          <span>الصفحة السابقة</span>
        </button>

        {/* Page Input & Total Display */}
        <div className="flex items-center gap-1 bg-white border border-[#c4c4c4] rounded px-2 py-0.5 shadow-inner">
          <span className="text-[10px] font-bold text-slate-500">صفحة</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPageIndex + 1}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                onGoToPage(val - 1);
              }
            }}
            className="w-9 text-center text-xs font-mono font-black outline-none text-slate-900 bg-transparent"
            title="اكتب رقم الصفحة للتنقل المباشر"
          />
          <span className="text-[11px] text-slate-500 font-mono font-bold">/ {totalPages}</span>
        </div>

        {/* Next Page Button (الصفحة التالية) */}
        <button
          type="button"
          id="xournal-toolbar-next-page-btn"
          data-testid="xournal-toolbar-next-page"
          disabled={currentPageIndex >= totalPages - 1}
          onClick={() => onGoToPage(currentPageIndex + 1)}
          className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white border border-blue-700 rounded shadow-xs font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed select-none"
          title="الانتقال إلى الصفحة التالية (PageDown / →)"
        >
          <span>الصفحة التالية</span>
          <ChevronRight size={15} className="text-white stroke-[2.5]" />
        </button>

        {/* Last Page (End) */}
        <button
          type="button"
          disabled={currentPageIndex >= totalPages - 1}
          onClick={() => onGoToPage(totalPages - 1)}
          className="p-1 hover:bg-white text-slate-700 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="الصفحة الأخيرة (End)"
          aria-label="Last page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>

      {/* 4. DYNAMIC PAGE INSERTION SYSTEM (Beside / Below with matched dimensions) */}
      <div className="flex items-center space-x-1 border-r border-[#d4d4d4] pr-1.5 shrink-0 bg-emerald-50/70 p-0.5 rounded border border-emerald-300">
        {onInsertPageBeside && (
          <button
            type="button"
            id="xournal-toolbar-insert-beside-btn"
            data-testid="xournal-toolbar-insert-beside"
            onClick={() => onInsertPageBeside('plain')}
            className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-bold text-[11px] rounded shadow-xs flex items-center gap-1 transition-all cursor-pointer"
            title="إدراج صفحة بيضاء فارغة متطابقة الحجم بجانب الصفحة الحالية (جنباً إلى جنب)"
          >
            <Plus size={13} strokeWidth={3} />
            <span>+ بجانبها (جنباً لجنب)</span>
          </button>
        )}

        <button
          type="button"
          id="xournal-toolbar-insert-below-btn"
          data-testid="xournal-toolbar-insert-below"
          onClick={() => (onInsertPageBelow ? onInsertPageBelow('plain') : onInsertPageAfter('plain'))}
          className="px-2 py-1 bg-white hover:bg-slate-100 active:scale-95 text-emerald-800 border border-emerald-300 font-semibold text-[11px] rounded shadow-xs flex items-center gap-1 transition-all cursor-pointer"
          title="إدراج صفحة بيضاء فارغة متطابقة الحجم تحت الصفحة الحالية"
        >
          <ArrowDown size={12} className="text-emerald-700" />
          <span>+ تحتها</span>
        </button>

        {onSetPageLayoutMode && (
          <div className="flex items-center gap-0.5 ml-1 bg-white/80 p-0.5 rounded border border-emerald-200 text-[10px]">
            <button
              type="button"
              onClick={() => onSetPageLayoutMode('single')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${pageLayoutMode === 'single' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              title="عرض صفحة مفردة"
            >
              مفردة
            </button>
            <button
              type="button"
              onClick={() => onSetPageLayoutMode('side-by-side')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${pageLayoutMode === 'side-by-side' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              title="عرض صفحتين جنباً إلى جنب"
            >
              جنباً لجنب 📑
            </button>
            <button
              type="button"
              onClick={() => onSetPageLayoutMode('continuous')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${pageLayoutMode === 'continuous' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              title="تمرير رأسي مستمر"
            >
              متتابع
            </button>
          </div>
        )}

        <button
          type="button"
          id="xournal-toolbar-quick-notes-ruled-btn"
          data-testid="xournal-toolbar-quick-notes-ruled"
          onClick={() => (onInsertPageBelow ? onInsertPageBelow('ruled') : onInsertPageAfter('ruled'))}
          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-[11px] rounded shadow-xs flex items-center gap-1 transition-all cursor-pointer border border-amber-600"
          title="إضافة صفحة ملاحظات سريعة بنمط 'مسطرة' (ruled) تحت الصفحة الحالية دون تغيير طريقة العرض"
        >
          <PenLine size={12} className="text-slate-950" />
          <span>ملاحظات سريعة 📝</span>
        </button>
      </div>

      {/* 5. Tool Selectors (Faithful to Xournal++) */}
      <div className="flex items-center space-x-0.5 border-r border-[#d4d4d4] pr-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onSelectTool('pen')}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            activeTool === 'pen'
              ? 'bg-[#3b82f6] text-white shadow-inner font-bold'
              : 'hover:bg-[#d8d8d8] text-slate-800'
          }`}
          title="Pen Tool (P)"
        >
          <PenTool size={15} />
        </button>
        <button
          type="button"
          onClick={() => onSelectTool('eraser')}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            activeTool === 'eraser'
              ? 'bg-[#3b82f6] text-white shadow-inner font-bold'
              : 'hover:bg-[#d8d8d8] text-slate-800'
          }`}
          title="Eraser Tool (E)"
        >
          <Eraser size={15} />
        </button>
        <button
          type="button"
          onClick={() => onSelectTool('highlighter')}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            activeTool === 'highlighter'
              ? 'bg-[#3b82f6] text-white shadow-inner font-bold'
              : 'hover:bg-[#d8d8d8] text-slate-800'
          }`}
          title="Highlighter Tool (H)"
        >
          <Highlighter size={15} />
        </button>
        <button
          type="button"
          onClick={() => onSelectTool('text')}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            activeTool === 'text'
              ? 'bg-[#3b82f6] text-white shadow-inner font-bold'
              : 'hover:bg-[#d8d8d8] text-slate-800'
          }`}
          title="Text Tool (T)"
        >
          <Type size={15} />
        </button>

        {/* Laser Pointer (مؤشر الليزر المتوهج) */}
        <button
          type="button"
          onClick={() => onSelectTool('laser')}
          className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
            activeTool === 'laser'
              ? 'bg-red-600 text-white shadow-inner font-bold ring-2 ring-red-400'
              : 'hover:bg-red-50 text-red-600'
          }`}
          title="مؤشر الليزر (Laser Pointer - L): نقطة حمراء متوهجة وشعاع يتلاشى تدريجياً للشرح دون ترك أثر دائم"
        >
          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600 border border-white"></span>
          </span>
          <span className="text-[11px] font-bold">ليزر</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTool('select-rect')}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            activeTool === 'select-rect'
              ? 'bg-[#3b82f6] text-white shadow-inner font-bold'
              : 'hover:bg-[#d8d8d8] text-slate-800'
          }`}
          title="Select Region Tool (S)"
        >
          <BoxSelect size={15} />
        </button>
        <button
          type="button"
          onClick={() => onSelectTool('shape-recognizer')}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            activeTool === 'shape-recognizer'
              ? 'bg-amber-500 text-slate-950 shadow-inner font-bold'
              : 'hover:bg-[#d8d8d8] text-amber-700'
          }`}
          title="Shape Recognizer (Auto-snaps lines, rectangles, circles)"
        >
          <Sparkles size={15} />
        </button>
        <button
          type="button"
          onClick={() => onSelectTool('ruler')}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            activeTool === 'ruler'
              ? 'bg-[#3b82f6] text-white shadow-inner font-bold'
              : 'hover:bg-[#d8d8d8] text-slate-800'
          }`}
          title="Straight Ruler Tool"
        >
          <Compass size={15} />
        </button>
        <button
          type="button"
          onClick={() => onSelectTool('coord-axes')}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            activeTool === 'coord-axes'
              ? 'bg-[#3b82f6] text-white shadow-inner font-bold'
              : 'hover:bg-[#d8d8d8] text-slate-800'
          }`}
          title="Cartesian Coordinates Tool"
        >
          <Grid size={15} />
        </button>
      </div>

      {/* 6. Zoom Controls & Fullscreen */}
      <div className="flex items-center space-x-1 shrink-0">
        <button
          type="button"
          onClick={onFitWidth}
          className="px-1.5 py-1 text-[11px] bg-white hover:bg-slate-100 border border-[#c4c4c4] rounded text-slate-700 font-bold transition-colors cursor-pointer"
          title="Fit Page Width (W)"
        >
          Fit W
        </button>
        <button
          type="button"
          onClick={onFitPage}
          className="px-1.5 py-1 text-[11px] bg-white hover:bg-slate-100 border border-[#c4c4c4] rounded text-slate-700 font-bold transition-colors cursor-pointer"
          title="Fit Whole Page (F)"
        >
          Fit Page
        </button>
        <button
          type="button"
          onClick={onZoom100}
          className="px-1.5 py-1 text-[11px] bg-white hover:bg-slate-100 border border-[#c4c4c4] rounded text-slate-700 font-bold transition-colors cursor-pointer"
          title="100% Zoom"
        >
          100%
        </button>

        <div className="flex items-center gap-1 pl-1">
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.05}
            value={zoom}
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-[#c8c8c8] rounded-lg appearance-none cursor-pointer accent-blue-600"
            title={`Zoom Slider: ${Math.round(zoom * 100)}%`}
          />
          <span className="text-[10px] font-mono text-slate-600 w-10 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1.5 hover:bg-[#d8d8d8] active:bg-[#c4c4c4] rounded text-slate-700 transition-colors cursor-pointer ml-1"
          title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        {onToggleAutoHideBars && (
          <button
            type="button"
            onClick={onToggleAutoHideBars}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-[11px] transition-all shadow-xs cursor-pointer ml-1.5 border ${
              isAutoHideBars
                ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-500 font-black'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title={isAutoHideBars ? 'إلغاء الإخفاء التلقائي وتثبيت كافة الأشرطة 📌' : 'توسيع اللوح وتفعيل الإخفاء التلقائي للأشرطة 🚀'}
          >
            {isAutoHideBars ? <PinOff size={14} className="text-slate-950" /> : <Pin size={14} className="text-slate-600" />}
            <span className="hidden md:inline">{isAutoHideBars ? 'لوح موسّع 🚀' : 'تثبيت 📌'}</span>
          </button>
        )}

        {onStartPresentation && (
          <button
            type="button"
            onClick={onStartPresentation}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white rounded font-bold text-[11px] transition-all shadow-xs active:scale-95 cursor-pointer ml-1.5 border border-blue-400/40"
            title="بدء وضع عرض الشرائح التفاعلي (F5)"
          >
            <Presentation size={14} className="text-amber-300" />
            <span className="hidden sm:inline">عرض الشرائح</span>
            <span className="text-[9px] bg-blue-900/60 px-1 rounded text-blue-200 font-mono">F5</span>
          </button>
        )}
      </div>
    </div>
  );
};
