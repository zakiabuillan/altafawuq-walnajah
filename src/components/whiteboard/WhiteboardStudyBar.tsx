import React, { useState, useRef } from 'react';
import { 
  Pencil, 
  Highlighter, 
  Eraser, 
  Sparkles, 
  Zap,
  Undo2, 
  Redo2, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  X, 
  Move, 
  Eye, 
  EyeOff, 
  FileText,
  MoveHorizontal,
  Maximize,
  Hand,
  MousePointer,
  Download,
  Ruler,
  Compass,
  Sigma,
  BookOpen,
  FlaskConical,
  FolderOpen
} from 'lucide-react';
import { WhiteboardTool, WhiteboardTheme } from '../../types/whiteboard';
import { getWhiteboardThemeConfig } from '../../lib/whiteboardThemes';
import { QUICK_PEN_COLORS, STROKE_WIDTHS } from './WhiteboardToolbar';
import { CollisionSafePopover } from './CollisionSafePopover';

interface WhiteboardStudyBarProps {
  activeTool: WhiteboardTool;
  setActiveTool: (tool: WhiteboardTool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentWidth: number;
  setCurrentWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitWidth: () => void;
  onFitScreen: () => void;
  currentPageIndex: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onExitStudyMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isDualSpread?: boolean;
  // Layer & OCR props
  showAnnotations?: boolean;
  onToggleAnnotations?: () => void;
  isPdfLocked?: boolean;
  onTogglePdfLock?: () => void;
  hasPdfBackground?: boolean;
  onClearAnnotationsOnly?: () => void;
  onOpenExportModal?: () => void;
  onOpenProjects?: () => void;
  // Measurement Tools
  isRulerOpen?: boolean;
  onToggleRuler?: () => void;
  isProtractorOpen?: boolean;
  onToggleProtractor?: () => void;
  // Whiteboard Theme
  theme?: WhiteboardTheme;
  onChangeTheme?: (theme: WhiteboardTheme) => void;
  // MathJax and Notes
  onOpenMathFormulaModal?: () => void;
  onOpenNotesDrawer?: () => void;
  onToggleStemPanel?: () => void;
  isStemPanelOpen?: boolean;
}

export const WhiteboardStudyBar: React.FC<WhiteboardStudyBarProps> = ({
  activeTool,
  setActiveTool,
  currentColor,
  setCurrentColor,
  currentWidth,
  setCurrentWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPage,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  onFitScreen,
  currentPageIndex,
  totalPages,
  onPrevPage,
  onNextPage,
  onExitStudyMode,
  isFullscreen,
  onToggleFullscreen,
  isDualSpread = false,
  showAnnotations = true,
  onToggleAnnotations,
  isPdfLocked = true,
  onTogglePdfLock,
  hasPdfBackground = false,
  onClearAnnotationsOnly,
  onOpenExportModal,
  onOpenProjects,
  isRulerOpen = false,
  onToggleRuler,
  isProtractorOpen = false,
  onToggleProtractor,
  theme = 'classic-dark',
  onChangeTheme,
  onOpenMathFormulaModal,
  onOpenNotesDrawer,
  onToggleStemPanel,
  isStemPanelOpen = false
}) => {
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const colorTriggerRef = useRef<HTMLButtonElement>(null);
  const themeConfig = getWhiteboardThemeConfig(theme);

  return (
    <>
      {/* Top Status Banner - Collision-safe, responsive reflow, safe margins */}
      <div 
        className="fixed sm:absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 bg-slate-950/90 backdrop-blur-xl border border-indigo-500/40 text-slate-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl shadow-2xl max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-2 select-none transition-all duration-200"
        dir="rtl"
      >
        <div className="flex items-center gap-2 font-black text-xs text-indigo-300 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>وضع الشرح والدراسة التفاعلي</span>
          {isDualSpread && (
            <span className="bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0">
              كتاب مفتوح
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1 shrink-0 hidden sm:block" />

        {/* Page Nav */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={currentPageIndex === 0}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
            title="الصفحة السابقة"
          >
            <ChevronRight size={16} />
          </button>
          <span className="px-2 py-0.5 bg-slate-900 rounded-lg text-xs font-mono font-bold text-amber-300 shrink-0">
            {currentPageIndex + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={onNextPage}
            disabled={currentPageIndex === totalPages - 1}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
            title="الصفحة التالية"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1 shrink-0" />

        {/* Export Modal Trigger in Top Banner */}
        {onOpenProjects && (
          <button
            type="button"
            onClick={onOpenProjects}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-amber-400 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700/80 shadow-xs"
            title="ملفاتي والألواح السابقة"
          >
            <FolderOpen size={13} className="shrink-0 text-amber-400" />
            <span className="hidden sm:inline">ملفاتي</span>
          </button>
        )}

        {onOpenExportModal && (
          <button
            type="button"
            onClick={onOpenExportModal}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
            title="تصدير ومشاركة الصفحة كـ PNG أو PDF"
          >
            <Download size={13} className="shrink-0" />
            <span className="hidden sm:inline">تصدير</span>
          </button>
        )}

        {/* Fullscreen & Exit */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="shrink-0 p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
          title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        <button
          type="button"
          onClick={onExitStudyMode}
          className="shrink-0 flex items-center gap-1 px-3 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm mr-1"
          title="الخروج من وضع الشرح والعودة للواجهة الكاملة"
        >
          <X size={14} className="shrink-0" />
          <span>إنهاء الشرح</span>
        </button>
      </div>

      {/* Floating Minimalist Study Toolbar at Bottom - Collision-free, responsive reflow */}
      <nav 
        className="fixed sm:absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] mx-auto transition-all duration-200"
        dir="rtl"
      >
        {isMinimized ? (
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-950/90 backdrop-blur-xl border border-slate-700 text-amber-300 rounded-2xl shadow-2xl text-xs font-black hover:bg-slate-900 cursor-pointer"
          >
            <Pencil size={15} />
            <span>إظهار شريط أدوات الشرح</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 text-white p-1.5 sm:p-2 rounded-3xl shadow-2xl ring-1 ring-white/10 max-h-[42vh] overflow-y-auto sm:overflow-y-visible custom-scrollbar transition-all duration-200">
            
            {/* Cluster 1: Pointer & Pan */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-900/60 p-0.5 rounded-2xl border border-white/5">
              {/* Pointer / Select */}
              <button
                type="button"
                onClick={() => setActiveTool('select')}
                className={`shrink-0 p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                  activeTool === 'select'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md scale-105'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
                title="تحديد وتحريك (V)"
              >
                <MousePointer size={18} />
              </button>

              {/* Pan Hand */}
              <button
                type="button"
                onClick={() => setActiveTool('pan')}
                className={`shrink-0 p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                  activeTool === 'pan'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md scale-105'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
                title="سحب وتحريك الصفحة (H / Space)"
              >
                <Hand size={18} />
              </button>
            </div>

            {/* Cluster 2: Stylus & Drawing Tools */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-900/60 p-0.5 rounded-2xl border border-white/5">
              {/* Stylus / Pen */}
              <button
                type="button"
                onClick={() => setActiveTool('pen')}
                className={`shrink-0 p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer relative ${
                  activeTool === 'pen'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 scale-105'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
                title="قلم الكتابة الذكي (P / Stylus)"
              >
                <Pencil size={18} />
                {activeTool === 'pen' && (
                  <span 
                    className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-slate-950 ring-1 ring-white/40"
                    style={{ backgroundColor: currentColor }}
                  />
                )}
              </button>

              {/* Highlighter */}
              <button
                type="button"
                onClick={() => setActiveTool('highlighter')}
                className={`shrink-0 p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                  activeTool === 'highlighter'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/40 scale-105'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
                title="قلم التمييز والتظليل الشفاف (M)"
              >
                <Highlighter size={18} />
              </button>

              {/* Eraser */}
              <button
                type="button"
                onClick={() => setActiveTool('eraser')}
                className={`shrink-0 p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                  activeTool === 'eraser'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 scale-105'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
                title="ممحاة الشرح (E)"
              >
                <Eraser size={18} />
              </button>

              {/* Laser Pointer */}
              <button
                type="button"
                onClick={() => setActiveTool('laser')}
                className={`shrink-0 p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer relative ${
                  activeTool === 'laser'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl shadow-red-600/50 scale-105 ring-2 ring-red-400'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
                title="مؤشر ليزر تفاعلي للشرح (L) - ضوء مؤقت يتلاشى تلقائياً دون ترك أثر"
              >
                <Zap size={18} className={activeTool === 'laser' ? 'animate-pulse text-amber-300 fill-amber-300' : ''} />
                {activeTool === 'laser' && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-slate-950"></span>
                  </span>
                )}
              </button>
            </div>

            {/* Cluster 3: Styling (Color & Width) with Collision-Safe Popover */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-900/60 p-0.5 rounded-2xl border border-white/5 relative">
              <button
                ref={colorTriggerRef}
                type="button"
                onClick={() => setShowColorMenu(!showColorMenu)}
                className="shrink-0 p-2 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700/60"
                title="تغيير لون وسمك القلم"
              >
                <div 
                  className="w-5 h-5 rounded-full border-2 border-white shadow-sm ring-1 ring-black/40"
                  style={{ backgroundColor: currentColor }}
                />
              </button>

              <CollisionSafePopover
                isOpen={showColorMenu}
                onClose={() => setShowColorMenu(false)}
                triggerRef={colorTriggerRef}
                className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-3 rounded-3xl shadow-2xl w-64 space-y-3"
              >
                <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>ألوان القلم السريعة:</span>
                  <span className="font-mono text-[10px] text-amber-300">{currentColor}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_PEN_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setCurrentColor(c.value);
                        setShowColorMenu(false);
                      }}
                      className={`w-9 h-9 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center ${
                        currentColor === c.value ? 'scale-110 border-amber-400 shadow-md' : 'border-slate-800 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {currentColor === c.value && (
                        <Check size={14} className={c.value === '#FFFFFF' ? 'text-slate-950' : 'text-white'} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Width selector */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-bold text-slate-300 mb-1.5">سمك القلم:</div>
                  <div className="flex items-center gap-1">
                    {STROKE_WIDTHS.slice(0, 4).map(sw => (
                      <button
                        key={sw.value}
                        type="button"
                        onClick={() => {
                          setCurrentWidth(sw.value);
                          setShowColorMenu(false);
                        }}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          currentWidth === sw.value ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {sw.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CollisionSafePopover>
            </div>

            {/* Cluster 4: STEM & Geometric Tools */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-900/60 p-0.5 rounded-2xl border border-white/5">
              {/* Measurement Tools (Ruler & Protractor) in Study Mode */}
              {onToggleRuler && (
                <button
                  type="button"
                  onClick={onToggleRuler}
                  className={`shrink-0 p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer relative ${
                    isRulerOpen
                      ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/30 scale-105'
                      : 'hover:bg-slate-800 text-amber-400 hover:text-amber-300'
                  }`}
                  title="المسطرة الافتراضية الذكية (قياس الأطوال ورسم مستقيمات)"
                >
                  <Ruler size={18} />
                  {isRulerOpen && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                  )}
                </button>
              )}

              {onToggleProtractor && (
                <button
                  type="button"
                  onClick={onToggleProtractor}
                  className={`shrink-0 p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer relative ${
                    isProtractorOpen
                      ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/30 scale-105'
                      : 'hover:bg-slate-800 text-amber-400 hover:text-amber-300'
                  }`}
                  title="المنقلة الهندسية الذكية (قياس ورسم الزوايا)"
                >
                  <Compass size={18} />
                  {isProtractorOpen && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                  )}
                </button>
              )}

              {/* MathJax Formula Equation Button in Study Mode */}
              {onOpenMathFormulaModal && (
                <button
                  type="button"
                  onClick={onOpenMathFormulaModal}
                  className="shrink-0 p-2 sm:p-2.5 rounded-2xl hover:bg-slate-800 text-teal-400 hover:text-teal-300 transition-all cursor-pointer bg-teal-950/40 border border-teal-500/30"
                  title="محرر المعادلات والكيمياء MathJax"
                >
                  <Sigma size={18} />
                </button>
              )}

              {/* STEM Tools & Teacher Palette */}
              {onToggleStemPanel && (
                <button
                  type="button"
                  onClick={onToggleStemPanel}
                  className={`shrink-0 p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                    isStemPanelOpen
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                      : 'hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-500/30'
                  }`}
                  title="لوحة أدوات STEM العلمية والمجسمات ثلاثية الأبعاد"
                >
                  <FlaskConical size={18} />
                </button>
              )}

              {/* Notes Drawer Button in Study Mode */}
              {onOpenNotesDrawer && (
                <button
                  type="button"
                  onClick={onOpenNotesDrawer}
                  className="shrink-0 p-2 sm:p-2.5 rounded-2xl hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-all cursor-pointer bg-amber-950/40 border border-amber-500/30"
                  title="مفكرة وملاحظات الحصة اللحظية"
                >
                  <BookOpen size={18} />
                </button>
              )}
            </div>

            {/* Cluster 5: View & Zoom Controls */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-900/60 p-0.5 rounded-2xl border border-white/5">
              {/* Fit Width & Fit Screen Buttons */}
              <button
                type="button"
                onClick={onFitWidth}
                className="shrink-0 px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="ملاءمة العرض للشاشة (Fit Width)"
              >
                <MoveHorizontal size={14} className="shrink-0" />
                <span className="hidden sm:inline">ملاءمة العرض</span>
              </button>

              <button
                type="button"
                onClick={onFitScreen}
                className="shrink-0 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="ملاءمة الصفحة كاملة داخل الشاشة (Fit Page)"
              >
                <Maximize size={14} className="shrink-0" />
                <span className="hidden sm:inline">ملاءمة الصفحة</span>
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-0.5 bg-slate-900 rounded-xl p-0.5 border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={onZoomOut}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer shrink-0"
                  title="تصغير (-)"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={onResetZoom}
                  className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-amber-300 hover:text-white shrink-0"
                  title="إعادة ضبط الحجم (100%)"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={onZoomIn}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer shrink-0"
                  title="تكبير (+)"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>

            {/* Cluster 6: History, Actions & Output */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-900/60 p-0.5 rounded-2xl border border-white/5">
              {/* Undo / Redo */}
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="shrink-0 p-2 rounded-xl hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                title="تراجع (Ctrl+Z)"
              >
                <Undo2 size={16} />
              </button>

              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="shrink-0 p-2 rounded-xl hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                title="إعادة (Ctrl+Y)"
              >
                <Redo2 size={16} />
              </button>

              {/* Toggle Annotations Layer Visibility */}
              {onToggleAnnotations && (
                <button
                  type="button"
                  onClick={onToggleAnnotations}
                  className={`shrink-0 p-2 rounded-xl transition-all cursor-pointer ${
                    showAnnotations
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                  title={showAnnotations ? 'إخفاء طبقة التعليقات والرسومات' : 'إظهار طبقة التعليقات'}
                >
                  {showAnnotations ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              )}

              {/* Clear Page / Annotations */}
              <button
                type="button"
                onClick={onClearAnnotationsOnly || onClearPage}
                className="shrink-0 p-2 rounded-xl hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                title={hasPdfBackground ? "مسح الرسومات والتعليقات فقط" : "مسح الشروحات على هذه الصفحة"}
              >
                <Trash2 size={16} />
              </button>

              {/* Quick Export Button */}
              {onOpenExportModal && (
                <button
                  type="button"
                  onClick={onOpenExportModal}
                  className="shrink-0 p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer transition-all"
                  title="تصدير ومشاركة السبورة للطلاب (PNG / PDF)"
                >
                  <Download size={16} />
                </button>
              )}

              {/* Hide / Minimize */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="shrink-0 p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer mr-0.5"
                title="تصغير شريط الأدوات"
              >
                <EyeOff size={15} />
              </button>
            </div>

          </div>
        )}
      </nav>
    </>
  );
};
