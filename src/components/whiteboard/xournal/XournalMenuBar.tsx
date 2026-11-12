import React, { useState, useRef, useEffect } from 'react';
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
  Trash2, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  ChevronsLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsRight, 
  PlusCircle, 
  CopyPlus, 
  PenTool, 
  Eraser, 
  Highlighter, 
  Type, 
  HelpCircle, 
  Layout, 
  Grid, 
  Compass, 
  Check, 
  Sparkles,
  X,
  Presentation
} from 'lucide-react';
import { PageBackgroundStyle, XournalTool, XournalPageLayoutMode } from './types';

interface XournalMenuBarProps {
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
  onClearPage: () => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onZoom100: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  currentPageIndex: number;
  totalPages: number;
  onGoToPage: (pageIndex: number) => void;
  onInsertPageAfter: (style?: PageBackgroundStyle) => void;
  onInsertPageBefore: (style?: PageBackgroundStyle) => void;
  onInsertPageBeside?: (style?: PageBackgroundStyle) => void;
  onInsertPageBelow?: (style?: PageBackgroundStyle) => void;
  pageLayoutMode?: XournalPageLayoutMode;
  onSetPageLayoutMode?: (mode: XournalPageLayoutMode) => void;
  onDuplicatePage: () => void;
  onDeleteCurrentPage: () => void;
  onChangePageBackground: (style: PageBackgroundStyle) => void;
  currentPageBackground?: PageBackgroundStyle;
  isCurrentPageBlank: boolean;
  activeTool: XournalTool;
  onSelectTool: (tool: XournalTool) => void;
  stylusPressureEnabled: boolean;
  onToggleStylusPressure: () => void;
  palmRejectionEnabled: boolean;
  onTogglePalmRejection: () => void;
  onClose?: () => void;
}

export const XournalMenuBar: React.FC<XournalMenuBarProps> = ({
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
  onClearPage,
  onFitWidth,
  onFitPage,
  onZoom100,
  onZoomIn,
  onZoomOut,
  isFullscreen,
  onToggleFullscreen,
  showSidebar,
  onToggleSidebar,
  currentPageIndex,
  totalPages,
  onGoToPage,
  onInsertPageAfter,
  onInsertPageBefore,
  onInsertPageBeside,
  onInsertPageBelow,
  pageLayoutMode = 'single',
  onSetPageLayoutMode,
  onDuplicatePage,
  onDeleteCurrentPage,
  onChangePageBackground,
  currentPageBackground,
  isCurrentPageBlank,
  activeTool,
  onSelectTool,
  stylusPressureEnabled,
  onToggleStylusPressure,
  palmRejectionEnabled,
  onTogglePalmRejection,
  onClose
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMenuClick = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleItemClick = (action?: () => void) => {
    if (action) action();
    setOpenMenu(null);
  };

  return (
    <div 
      ref={menuBarRef}
      className="bg-[#e4e4e4] border-b border-[#c0c0c0] text-[#222222] select-none text-xs font-sans flex items-center justify-between px-1 h-7 shadow-xs"
      dir="ltr"
    >
      <div className="flex items-center space-x-0.5">
        {/* App Brand Icon */}
        <div className="flex items-center px-2 py-0.5 mr-1 font-bold text-slate-800 tracking-tight gap-1.5 border-r border-[#cfcfcf]">
          <span className="w-4 h-4 bg-gradient-to-tr from-blue-700 to-indigo-600 text-white rounded flex items-center justify-center text-[10px] font-black shadow-xs">
            X
          </span>
          <span className="font-extrabold text-[11px] text-slate-900">Xournal++</span>
          <span className="text-[9px] bg-amber-200/80 text-amber-900 px-1 py-0.2 rounded font-mono font-bold">
            Web
          </span>
        </div>

        {/* 1. File Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('file')}
            className={`px-2.5 py-1 hover:bg-[#d0d0d0] rounded-xs cursor-pointer ${
              openMenu === 'file' ? 'bg-[#c5c5c5] shadow-inner' : ''
            }`}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="absolute top-full left-0 mt-0.5 w-64 bg-[#f7f7f7] border border-[#a8a8a8] shadow-lg rounded-xs py-1 z-50 text-[11px] text-slate-800">
              <button
                type="button"
                onClick={() => handleItemClick(onNewDocument)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText size={13} />
                  <span>New Document</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">Ctrl+N</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onOpenPdf)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={13} />
                  <span>Open PDF Document...</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">Ctrl+O</span>
              </button>
              {onOpenJournal && (
                <button
                  type="button"
                  onClick={() => handleItemClick(onOpenJournal)}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={13} className="text-amber-600" />
                    <span>Open / Restore Journal (.xoj)...</span>
                  </span>
                  <span className="text-[10px] opacity-70 font-mono">Ctrl+Shift+O</span>
                </button>
              )}
              {hasAutosavedSession && onRestoreSession && (
                <button
                  type="button"
                  onClick={() => handleItemClick(onRestoreSession)}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex items-center justify-between cursor-pointer bg-emerald-50 text-emerald-800"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={13} className="text-emerald-600" />
                    <span>Restore Last Auto-Backup</span>
                  </span>
                  <span className="text-[10px] opacity-70 font-mono">Auto</span>
                </button>
              )}
              <div className="my-1 border-t border-[#dcdcdc]" />
              <button
                type="button"
                onClick={() => handleItemClick(onSaveJournal)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Save size={13} />
                  <span>Save Journal (.xoj)</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">Ctrl+S</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onExportPdf)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer font-bold text-blue-900 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Download size={13} />
                  <span>Export to Annotated PDF</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">Ctrl+E</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onPrint)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Printer size={13} />
                  <span>Print Document</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">Ctrl+P</span>
              </button>
              {onClose && (
                <>
                  <div className="my-1 border-t border-[#dcdcdc]" />
                  <button
                    type="button"
                    onClick={() => handleItemClick(onClose)}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#d93838] hover:text-white flex items-center justify-between cursor-pointer text-rose-700"
                  >
                    <span>Close Xournal++</span>
                    <span className="text-[10px] opacity-70 font-mono">Esc</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 2. Edit Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('edit')}
            className={`px-2.5 py-1 hover:bg-[#d0d0d0] rounded-xs cursor-pointer ${
              openMenu === 'edit' ? 'bg-[#c5c5c5] shadow-inner' : ''
            }`}
          >
            Edit
          </button>
          {openMenu === 'edit' && (
            <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#f7f7f7] border border-[#a8a8a8] shadow-lg rounded-xs py-1 z-50 text-[11px] text-slate-800">
              <button
                type="button"
                disabled={!canUndo}
                onClick={() => handleItemClick(onUndo)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-800"
              >
                <span className="flex items-center gap-2">
                  <Undo2 size={13} />
                  <span>Undo ({activePageLabel || 'Page'})</span>
                  {undoCount !== undefined && undoCount > 0 && (
                    <span className="text-[10px] bg-slate-200/80 text-slate-800 px-1.5 py-0.2 rounded font-mono font-bold">
                      {undoCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] opacity-70 font-mono">Ctrl+Z</span>
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onClick={() => handleItemClick(onRedo)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-800"
              >
                <span className="flex items-center gap-2">
                  <Redo2 size={13} />
                  <span>Redo ({activePageLabel || 'Page'})</span>
                  {redoCount !== undefined && redoCount > 0 && (
                    <span className="text-[10px] bg-slate-200/80 text-slate-800 px-1.5 py-0.2 rounded font-mono font-bold">
                      {redoCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] opacity-70 font-mono">Ctrl+Y</span>
              </button>
              <div className="my-1 border-t border-[#dcdcdc]" />
              <button
                type="button"
                onClick={() => handleItemClick(onClearPage)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer text-amber-900 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Trash2 size={13} />
                  <span>Clear Current Page Ink</span>
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 3. View Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('view')}
            className={`px-2.5 py-1 hover:bg-[#d0d0d0] rounded-xs cursor-pointer ${
              openMenu === 'view' ? 'bg-[#c5c5c5] shadow-inner' : ''
            }`}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className="absolute top-full left-0 mt-0.5 w-60 bg-[#f7f7f7] border border-[#a8a8a8] shadow-lg rounded-xs py-1 z-50 text-[11px] text-slate-800">
              <button
                type="button"
                onClick={() => handleItemClick(onFitWidth)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Fit Page Width</span>
                <span className="text-[10px] opacity-70 font-mono">W</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onFitPage)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Fit Whole Page</span>
                <span className="text-[10px] opacity-70 font-mono">F</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onZoom100)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Actual Size (100%)</span>
                <span className="text-[10px] opacity-70 font-mono">1</span>
              </button>
              <div className="my-1 border-t border-[#dcdcdc]" />
              <button
                type="button"
                onClick={() => handleItemClick(onZoomIn)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ZoomIn size={13} />
                  <span>Zoom In</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">Ctrl++</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onZoomOut)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ZoomOut size={13} />
                  <span>Zoom Out</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">Ctrl+-</span>
              </button>
              <div className="my-1 border-t border-[#dcdcdc]" />
              <button
                type="button"
                onClick={() => handleItemClick(() => onStartPresentation?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer font-bold text-blue-700 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Presentation size={13} />
                  <span>Interactive Slideshow (عرض الشرائح)</span>
                </span>
                <span className="text-[10px] opacity-90 font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">F5</span>
              </button>
              <div className="my-1 border-t border-[#dcdcdc]" />
              <button
                type="button"
                onClick={() => handleItemClick(onToggleSidebar)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>{showSidebar ? 'Hide Page Sidebar' : 'Show Page Sidebar'}</span>
                <span className="text-[10px] opacity-70 font-mono">F9</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onToggleFullscreen)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Window'}</span>
                <span className="text-[10px] opacity-70 font-mono">F11</span>
              </button>

              {onSetPageLayoutMode && (
                <>
                  <div className="my-1 border-t border-[#dcdcdc]" />
                  <div className="px-3 py-1 text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-150">
                    نمط عرض الصفحات (Page Layout)
                  </div>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onSetPageLayoutMode('single'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
                  >
                    <span>صفحة مفردة (Single Page)</span>
                    {pageLayoutMode === 'single' && <Check size={13} className="text-emerald-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onSetPageLayoutMode('side-by-side'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer font-bold text-blue-700 hover:text-white"
                  >
                    <span>صفحتين جنباً إلى جنب (Side-by-Side) 📑</span>
                    {pageLayoutMode === 'side-by-side' && <Check size={13} className="text-emerald-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onSetPageLayoutMode('continuous'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
                  >
                    <span>تتابع مستمر عمودي (Continuous Flow)</span>
                    {pageLayoutMode === 'continuous' && <Check size={13} className="text-emerald-600" />}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 4. Navigation Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('navigation')}
            className={`px-2.5 py-1 hover:bg-[#d0d0d0] rounded-xs cursor-pointer ${
              openMenu === 'navigation' ? 'bg-[#c5c5c5] shadow-inner' : ''
            }`}
          >
            Navigation
          </button>
          {openMenu === 'navigation' && (
            <div className="absolute top-full left-0 mt-0.5 w-52 bg-[#f7f7f7] border border-[#a8a8a8] shadow-lg rounded-xs py-1 z-50 text-[11px] text-slate-800">
              <button
                type="button"
                disabled={currentPageIndex <= 0}
                onClick={() => handleItemClick(() => onGoToPage(0))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <ChevronsLeft size={13} />
                  <span>First Page</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">Home</span>
              </button>
              <button
                type="button"
                disabled={currentPageIndex <= 0}
                onClick={() => handleItemClick(() => onGoToPage(currentPageIndex - 1))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <ChevronLeft size={13} />
                  <span>Previous Page</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">PgUp</span>
              </button>
              <button
                type="button"
                disabled={currentPageIndex >= totalPages - 1}
                onClick={() => handleItemClick(() => onGoToPage(currentPageIndex + 1))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <ChevronRight size={13} />
                  <span>Next Page</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">PgDn</span>
              </button>
              <button
                type="button"
                disabled={currentPageIndex >= totalPages - 1}
                onClick={() => handleItemClick(() => onGoToPage(totalPages - 1))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <ChevronsRight size={13} />
                  <span>Last Page</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">End</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. Journal Menu (DYNAMIC PAGE INSERTION ENGINE) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('journal')}
            className={`px-2.5 py-1 hover:bg-[#d0d0d0] rounded-xs cursor-pointer font-bold ${
              openMenu === 'journal' ? 'bg-[#c5c5c5] shadow-inner' : ''
            }`}
          >
            Journal
          </button>
          {openMenu === 'journal' && (
            <div className="absolute top-full left-0 mt-0.5 w-72 bg-[#f7f7f7] border border-[#a8a8a8] shadow-lg rounded-xs py-1 z-50 text-[11px] text-slate-800">
              <div className="px-3 py-1 text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-150">
                إدراج الصفحات (Page Insertion & Sizing)
              </div>
              {onInsertPageBeside && (
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onInsertPageBeside('plain'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer font-bold text-teal-800 hover:text-white bg-teal-50/50"
                  title="إدراج صفحة بيضاء فارغة متطابقة المقاس والأبعاد بجانب الصفحة الحالية (جنباً إلى جنب)"
                >
                  <span className="flex items-center gap-2">
                    <PlusCircle size={14} className="text-teal-600" />
                    <span>إدراج صفحة بيضاء بجانبها (Side-by-Side) 📑</span>
                  </span>
                  <span className="text-[10px] opacity-70 font-mono">مطابقة الحجم</span>
                </button>
              )}
              {onInsertPageBelow && (
                <>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => onInsertPageBelow('plain'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer font-bold text-emerald-800 hover:text-white bg-emerald-50/50"
                    title="إدراج صفحة بيضاء فارغة متطابقة الحجم تحت الصفحة الحالية مباشرة"
                  >
                    <span className="flex items-center gap-2">
                      <PlusCircle size={14} className="text-emerald-600" />
                      <span>إدراج صفحة بيضاء تحتها (Below) ⬇️</span>
                    </span>
                    <span className="text-[10px] opacity-70 font-mono">مطابقة الحجم</span>
                  </button>
                  <button
                    type="button"
                    id="xournal-menu-quick-notes-ruled-btn"
                    onClick={() => handleItemClick(() => onInsertPageBelow('ruled'))}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer font-bold text-amber-900 hover:text-white bg-amber-50/70"
                    title="إدراج صفحة بيضاء فارغة بنمط 'مسطرة' (ruled) مباشرة تحت الصفحة الحالية دون تغيير طريقة العرض الحالية"
                  >
                    <span className="flex items-center gap-2">
                      <PlusCircle size={14} className="text-amber-600" />
                      <span>إضافة صفحة ملاحظات سريعة (مسطرة) 📝</span>
                    </span>
                    <span className="text-[10px] opacity-70 font-mono">مسطرة Ruled</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => handleItemClick(() => onInsertPageAfter('ruled'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer font-semibold"
              >
                <span className="flex items-center gap-2 text-slate-700 hover:text-white">
                  <PlusCircle size={14} className="text-slate-500" />
                  <span>Insert Ruled Page After Current</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">Ctrl+Enter</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => onInsertPageBefore('ruled'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <PlusCircle size={14} className="text-blue-600" />
                  <span>Insert Ruled Page Before Current</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">Shift+Enter</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onDuplicatePage)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <CopyPlus size={13} />
                  <span>Duplicate Current Page</span>
                </span>
              </button>
              <button
                type="button"
                disabled={totalPages <= 1}
                onClick={() => handleItemClick(onDeleteCurrentPage)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#d93838] hover:text-white flex items-center justify-between cursor-pointer text-rose-700 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <Trash2 size={13} />
                  <span>Delete Current Page</span>
                </span>
              </button>

              <div className="my-1 border-t border-[#dcdcdc]" />
              <div className="px-3 py-1 text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-150">
                Page Background Style
              </div>
              <button
                type="button"
                onClick={() => handleItemClick(() => onChangePageBackground('plain'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Plain White Page</span>
                {currentPageBackground === 'plain' && <Check size={13} className="text-emerald-600" />}
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => onChangePageBackground('ruled'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Ruled / Lined Notebook Paper</span>
                {currentPageBackground === 'ruled' && <Check size={13} className="text-emerald-600" />}
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => onChangePageBackground('grid'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Coordinate Grid Paper (5mm)</span>
                {currentPageBackground === 'grid' && <Check size={13} className="text-emerald-600" />}
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => onChangePageBackground('dotted'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Dotted Bullet Journal</span>
                {currentPageBackground === 'dotted' && <Check size={13} className="text-emerald-600" />}
              </button>
            </div>
          )}
        </div>

        {/* 6. Tools Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('tools')}
            className={`px-2.5 py-1 hover:bg-[#d0d0d0] rounded-xs cursor-pointer ${
              openMenu === 'tools' ? 'bg-[#c5c5c5] shadow-inner' : ''
            }`}
          >
            Tools
          </button>
          {openMenu === 'tools' && (
            <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#f7f7f7] border border-[#a8a8a8] shadow-lg rounded-xs py-1 z-50 text-[11px] text-slate-800">
              <button
                type="button"
                onClick={() => handleItemClick(() => onSelectTool('pen'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <PenTool size={13} />
                  <span>Pen</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">P</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => onSelectTool('eraser'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Eraser size={13} />
                  <span>Eraser</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">E</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => onSelectTool('highlighter'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Highlighter size={13} />
                  <span>Highlighter</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">H</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => onSelectTool('text'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Type size={13} />
                  <span>Text Box</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">T</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => onSelectTool('laser'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer text-red-600 hover:text-white font-bold"
              >
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600"></span>
                  </span>
                  <span>Laser Pointer (مؤشر الليزر)</span>
                </span>
                <span className="text-[10px] opacity-70 font-mono">L</span>
              </button>
              <div className="my-1 border-t border-[#dcdcdc]" />
              <button
                type="button"
                onClick={() => handleItemClick(() => onSelectTool('shape-recognizer'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={13} className="text-amber-600" />
                  <span>Shape Recognizer</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => onSelectTool('coord-axes'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Grid size={13} />
                  <span>Coordinate Axes Tool</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => onSelectTool('ruler'))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Compass size={13} />
                  <span>Straight Ruler Tool</span>
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 7. Plugin Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('plugin')}
            className={`px-2.5 py-1 hover:bg-[#d0d0d0] rounded-xs cursor-pointer ${
              openMenu === 'plugin' ? 'bg-[#c5c5c5] shadow-inner' : ''
            }`}
          >
            Plugin
          </button>
          {openMenu === 'plugin' && (
            <div className="absolute top-full left-0 mt-0.5 w-64 bg-[#f7f7f7] border border-[#a8a8a8] shadow-lg rounded-xs py-1 z-50 text-[11px] text-slate-800">
              <button
                type="button"
                onClick={() => handleItemClick(onToggleStylusPressure)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Stylus Pressure Sensitivity</span>
                {stylusPressureEnabled && <Check size={13} className="text-emerald-600" />}
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(onTogglePalmRejection)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Hardware Palm Rejection</span>
                {palmRejectionEnabled && <Check size={13} className="text-emerald-600" />}
              </button>
            </div>
          )}
        </div>

        {/* 8. Help Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleMenuClick('help')}
            className={`px-2.5 py-1 hover:bg-[#d0d0d0] rounded-xs cursor-pointer ${
              openMenu === 'help' ? 'bg-[#c5c5c5] shadow-inner' : ''
            }`}
          >
            Help
          </button>
          {openMenu === 'help' && (
            <div className="absolute top-full left-0 mt-0.5 w-52 bg-[#f7f7f7] border border-[#a8a8a8] shadow-lg rounded-xs py-1 z-50 text-[11px] text-slate-800">
              <button
                type="button"
                onClick={() => handleItemClick(() => setShowHelpModal(true))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <HelpCircle size={13} />
                <span>Shortcuts & Stylus Guide</span>
              </button>
              <button
                type="button"
                onClick={() => handleItemClick(() => setShowHelpModal(true))}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3875d7] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <Layout size={13} />
                <span>About Xournal++ Web</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right side info / quick close */}
      <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono pr-2">
        {onStartPresentation && (
          <button
            type="button"
            onClick={onStartPresentation}
            className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-600 text-white rounded text-[11px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer border border-blue-400/30"
            title="بدء وضع عرض الشرائح التفاعلي (F5)"
          >
            <Presentation size={13} className="text-amber-300" />
            <span className="font-sans">عرض الشرائح (F5)</span>
          </button>
        )}
        <span className="text-slate-400">|</span>
        <span>Page {currentPageIndex + 1} of {totalPages}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-rose-500 hover:text-white p-1 rounded-xs transition-colors cursor-pointer text-slate-500"
            title="Close Xournal++"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[300] p-4 text-left" dir="ltr">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-300 shadow-2xl overflow-hidden flex flex-col text-slate-800 font-sans text-xs">
            <div className="bg-slate-100 border-b border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-700 text-white rounded flex items-center justify-center font-black">
                  X
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Xournal++ Web Pro</h3>
                  <p className="text-[10px] text-slate-500">Interactive Whiteboard & PDF Annotation Suite</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-800 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">🌟 Key Features & Dynamic Insertion</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                  <li><strong>Unified Document Model:</strong> Both original PDF pages and blank scratchpad pages exist seamlessly in one unified document.</li>
                  <li><strong>Insert Blank Pages:</strong> Use the dedicated buttons to inject Ruled, Grid, or Plain whiteboard pages anywhere between PDF slides.</li>
                  <li><strong>Stylus & Palm Rejection:</strong> Native pressure sensitivity (Apple Pencil, Surface Pen, Wacom) and palm rejection.</li>
                  <li><strong>Full Vector PDF Export:</strong> Output high-resolution annotated PDFs with all inserted blank pages intact.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">⌨️ Keyboard Shortcuts</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div><span className="font-bold text-slate-800">Ctrl + N:</span> New Document</div>
                  <div><span className="font-bold text-slate-800">Ctrl + O:</span> Open PDF</div>
                  <div><span className="font-bold text-slate-800">Ctrl + E:</span> Export PDF</div>
                  <div><span className="font-bold text-slate-800">Ctrl + Enter:</span> Insert Page After</div>
                  <div><span className="font-bold text-slate-800">P:</span> Pen Tool</div>
                  <div><span className="font-bold text-slate-800">E:</span> Eraser Tool</div>
                  <div><span className="font-bold text-slate-800">H:</span> Highlighter Tool</div>
                  <div><span className="font-bold text-slate-800">T:</span> Text Annotation</div>
                  <div><span className="font-bold text-slate-800">F9:</span> Toggle Sidebar</div>
                  <div><span className="font-bold text-slate-800">F11:</span> Toggle Fullscreen</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
