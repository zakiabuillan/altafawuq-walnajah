import React from 'react';
import { 
  Pencil, 
  Highlighter, 
  Eraser, 
  Square, 
  Circle, 
  Minus, 
  ArrowRight, 
  ArrowLeftRight,
  Triangle, 
  Star, 
  Grid, 
  Type, 
  StickyNote, 
  MousePointer, 
  Hand, 
  Sparkles, 
  Zap,
  Flame,
  Undo2, 
  Redo2, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Download, 
  FileUp, 
  Upload,
  Clipboard,
  Image as ImageIcon, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  FilePlus,
  Layers, 
  Palette, 
  FolderOpen, 
  Save, 
  Compass,
  Ruler,
  FileText,
  BookOpen,
  Columns,
  Box,
  Shapes,
  MessageSquare,
  Hexagon,
  Check,
  CheckSquare,
  MoveHorizontal,
  Maximize,
  Presentation,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Wand2,
  Sliders,
  Camera,
  Sigma,
  FlaskConical,
  Printer,
  Home,
  ExternalLink
} from 'lucide-react';
import { 
  WhiteboardTool, 
  WhiteboardBackgroundType, 
  WhiteboardPresetColor,
  WhiteboardPage,
  WhiteboardTheme
} from '../../types/whiteboard';
import { getWhiteboardThemeConfig, WHITEBOARD_THEMES_LIST } from '../../lib/whiteboardThemes';
import { WhiteboardLayersPanel } from './WhiteboardLayersPanel';

export const PRESET_COLORS: WhiteboardPresetColor[] = [
  { name: 'أسود فحمي', value: '#1E293B', glow: 'rgba(30, 41, 59, 0.3)' },
  { name: 'أزرق ملكي', value: '#2563EB', glow: 'rgba(37, 99, 235, 0.4)' },
  { name: 'أحمر قرمزي', value: '#DC2626', glow: 'rgba(220, 38, 38, 0.4)' },
  { name: 'أخضر زمردي', value: '#16A34A', glow: 'rgba(22, 163, 74, 0.4)' },
  { name: 'ذهبي عنبري', value: '#D97706', glow: 'rgba(217, 119, 6, 0.4)' },
  { name: 'بنفسجي زاهي', value: '#9333EA', glow: 'rgba(147, 51, 234, 0.4)' },
  { name: 'تركواز بحري', value: '#0D9488', glow: 'rgba(13, 148, 136, 0.4)' },
  { name: 'وردي فاقع', value: '#E11D48', glow: 'rgba(225, 29, 72, 0.4)' },
  { name: 'أبيض ناصع', value: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.5)' },
  { name: 'نيون ليموني', value: '#84CC16', glow: 'rgba(132, 204, 22, 0.4)' },
  { name: 'سماوي كهربائي', value: '#06B6D4', glow: 'rgba(6, 182, 212, 0.4)' },
  { name: 'برتقالي مشرق', value: '#EA580C', glow: 'rgba(234, 88, 12, 0.4)' },
];

export const QUICK_PEN_COLORS = [
  { name: 'أسود / داكن', value: '#1E293B' },
  { name: 'أزرق', value: '#2563EB' },
  { name: 'أحمر', value: '#DC2626' },
  { name: 'أخضر', value: '#16A34A' },
  { name: 'ذهبي', value: '#D97706' },
  { name: 'بنفسجي', value: '#9333EA' },
  { name: 'أبيض', value: '#FFFFFF' },
];

export const STROKE_WIDTHS = [
  { label: 'دقيق جداً', value: 2 },
  { label: 'عادي', value: 4 },
  { label: 'متوسط', value: 8 },
  { label: 'عريض', value: 14 },
  { label: 'سميك جداً', value: 24 }
];

export const BACKGROUND_TEMPLATES: { type: WhiteboardBackgroundType; name: string; icon: string; previewClass: string }[] = [
  { type: 'ruled', name: 'أبيض مخطط سطور (دفتر)', icon: '📝', previewClass: 'bg-white border-slate-300' },
  { type: 'grid', name: 'ورق مربعات (بياني / حسابي)', icon: '📐', previewClass: 'bg-white border-slate-300' },
  { type: 'blank', name: 'أبيض بدون تخطيط (سادة)', icon: '⚪', previewClass: 'bg-white border-slate-300' },
  { type: 'dots', name: 'شبكة نقاط منتظمة', icon: '⁖', previewClass: 'bg-white border-slate-300' },
  { type: 'math-plane', name: 'محاور إحداثيات (X/Y)', icon: '📊', previewClass: 'bg-white border-slate-300' },
  { type: 'isometric', name: 'شبكة أيزومترك 3D', icon: '🧊', previewClass: 'bg-white border-slate-300' },
  { type: 'chalkboard', name: 'سبورة خضراء (طباشير)', icon: '🟢', previewClass: 'bg-[#1b4332] text-white border-emerald-800' },
  { type: 'dark', name: 'سبورة داكنة فحمية', icon: '⚫', previewClass: 'bg-[#0f172a] text-white border-slate-700' }
];

export interface QuickBgOption {
  id: WhiteboardBackgroundType;
  alias: 'lined' | 'grid' | 'graph' | 'blank';
  name: string;
  shortLabel: string;
  iconType: 'lined' | 'grid' | 'graph' | 'blank';
}

export const QUICK_BG_MODES: QuickBgOption[] = [
  { id: 'ruled', alias: 'lined', name: 'ورق مسطر (دفتر سطور)', shortLabel: 'مسطر', iconType: 'lined' },
  { id: 'grid', alias: 'grid', name: 'ورق مربعات (بياني / حسابي)', shortLabel: 'مربعات', iconType: 'grid' },
  { id: 'math-plane', alias: 'graph', name: 'رسم بياني (محاور X/Y)', shortLabel: 'بياني', iconType: 'graph' },
  { id: 'blank', alias: 'blank', name: 'أبيض سادة (بدون تخطيط)', shortLabel: 'سادة', iconType: 'blank' },
];

interface WhiteboardToolbarProps {
  activeTool: WhiteboardTool;
  setActiveTool: (tool: WhiteboardTool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentWidth: number;
  setCurrentWidth: (width: number) => void;
  currentBackground: WhiteboardBackgroundType;
  setCurrentBackground: (bg: WhiteboardBackgroundType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;
  onQuickPdfImport?: () => void;
  onOpenPdfImport: () => void;
  onOpenImageImport: () => void;
  onOpenUnifiedImportModal?: () => void;
  onUploadDeviceImage?: () => void;
  onCaptureCameraImage?: () => void;
  onExportPdf: () => void;
  onExportImage: () => void;
  onPrint?: () => void;
  onClose?: () => void;
  isStandalone?: boolean;
  onOpenExportModal?: () => void;
  onOpenProjects: () => void;
  onNewProjectDirect?: () => void;
  onSaveProject: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitWidth?: () => void;
  onFitScreen?: () => void;
  lastAutosaveTime?: string | Date | null;
  undoCount?: number;
  redoCount?: number;
  onToggleStudyMode?: () => void;
  isStudyMode?: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  currentPageIndex: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  onInsertPageAfterCurrent?: () => void;
  onTogglePagesDrawer: () => void;
  isSaving?: boolean;
  isDualView?: boolean;
  onToggleDualView?: () => void;
  // Shape styling props
  isShapeFilled?: boolean;
  setIsShapeFilled?: (filled: boolean) => void;
  dashStyle?: 'solid' | 'dashed' | 'dotted';
  setDashStyle?: (style: 'solid' | 'dashed' | 'dotted') => void;
  // Layer Management Props
  page?: WhiteboardPage;
  onUpdatePageLayer?: (updates: Partial<WhiteboardPage>) => void;
  showBackgroundTemplate?: boolean;
  onToggleBackgroundTemplate?: () => void;
  onClearBackgroundDocument?: () => void;
  isPdfLocked?: boolean;
  onTogglePdfLock?: () => void;
  showAnnotations?: boolean;
  onToggleAnnotations?: () => void;
  showPdfBackground?: boolean;
  onTogglePdfBackground?: () => void;
  onClearAnnotationsOnly?: () => void;
  hasPdfBackground?: boolean;
  strokesCount?: number;
  textItemsCount?: number;
  imageItemsCount?: number;
  // Shape Recognition (Magic Shape)
  isShapeRecognitionEnabled?: boolean;
  onToggleShapeRecognition?: () => void;
  // AI OCR on Questions
  onRunOcrOnSelectedImage?: () => void;
  isOcrLoading?: boolean;
  selectedItemType?: 'text' | 'image' | null;
  // Measurement Tools (Virtual Ruler & Protractor)
  isRulerOpen?: boolean;
  onToggleRuler?: () => void;
  isProtractorOpen?: boolean;
  onToggleProtractor?: () => void;
  // Whiteboard Interface Theme
  theme?: WhiteboardTheme;
  onChangeTheme?: (theme: WhiteboardTheme) => void;
  // MathJax Formulas & Real-time Notes
  onOpenMathFormulaModal?: () => void;
  onOpenNotesDrawer?: () => void;
  // STEM Tools (Physics, Chemistry, 3D Shapes, Circuits, Optics)
  onToggleStemPanel?: () => void;
  isStemPanelOpen?: boolean;
}

export const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
  activeTool,
  setActiveTool,
  currentColor,
  setCurrentColor,
  currentWidth,
  setCurrentWidth,
  currentBackground,
  setCurrentBackground,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPage,
  onQuickPdfImport,
  onOpenPdfImport,
  onOpenImageImport,
  onOpenUnifiedImportModal,
  onUploadDeviceImage,
  onCaptureCameraImage,
  onExportPdf,
  onExportImage,
  onPrint,
  onClose,
  isStandalone = false,
  onOpenExportModal,
  onOpenProjects,
  onNewProjectDirect,
  onSaveProject,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  onFitScreen,
  lastAutosaveTime,
  undoCount,
  redoCount,
  onToggleStudyMode,
  isStudyMode = false,
  isFullscreen,
  onToggleFullscreen,
  currentPageIndex,
  totalPages,
  onPrevPage,
  onNextPage,
  onAddPage,
  onInsertPageAfterCurrent,
  onTogglePagesDrawer,
  isSaving,
  isDualView = false,
  onToggleDualView,
  isShapeFilled = false,
  setIsShapeFilled,
  dashStyle = 'solid',
  setDashStyle,
  page,
  onUpdatePageLayer,
  showBackgroundTemplate = true,
  onToggleBackgroundTemplate,
  onClearBackgroundDocument,
  isPdfLocked = true,
  onTogglePdfLock,
  showAnnotations = true,
  onToggleAnnotations,
  showPdfBackground = true,
  onTogglePdfBackground,
  onClearAnnotationsOnly,
  hasPdfBackground = false,
  strokesCount = 0,
  textItemsCount = 0,
  imageItemsCount = 0,
  isShapeRecognitionEnabled = true,
  onToggleShapeRecognition,
  onRunOcrOnSelectedImage,
  isOcrLoading = false,
  selectedItemType,
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
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [showWidthMenu, setShowWidthMenu] = React.useState(false);
  const [showShapesMenu, setShowShapesMenu] = React.useState(false);
  const [showMeasurementMenu, setShowMeasurementMenu] = React.useState(false);
  const [shapesCategory, setShapesCategory] = React.useState<'2d' | '3d_math' | 'lines'>('2d');
  const [showBgMenu, setShowBgMenu] = React.useState(false);
  const [showLayersMenu, setShowLayersMenu] = React.useState(false);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [showThemeMenu, setShowThemeMenu] = React.useState(false);

  // Quick background toggle calculation ('lined'/'ruled' -> 'grid' -> 'graph'/'math-plane' -> 'blank')
  const currentQuickBgIndex = React.useMemo(() => {
    if (currentBackground === 'ruled' || currentBackground === 'lined') return 0;
    if (currentBackground === 'grid') return 1;
    if (currentBackground === 'math-plane' || currentBackground === 'graph') return 2;
    if (currentBackground === 'blank') return 3;
    return -1;
  }, [currentBackground]);

  const activeQuickBg = currentQuickBgIndex !== -1 ? QUICK_BG_MODES[currentQuickBgIndex] : null;
  const nextQuickBgIndex = currentQuickBgIndex === -1 ? 0 : (currentQuickBgIndex + 1) % QUICK_BG_MODES.length;
  const nextQuickBg = QUICK_BG_MODES[nextQuickBgIndex];

  const handleQuickToggleBg = () => {
    setCurrentBackground(nextQuickBg.id);
  };

  const themeConfig = getWhiteboardThemeConfig(theme);

  const isShapeTool = [
    'line', 'arrow', 'double-arrow', 
    'rect', 'rounded-rect', 'circle', 'ellipse', 
    'triangle', 'right-triangle', 'diamond', 'pentagon', 'hexagon', 'star', 
    'cube-3d', 'cylinder-3d', 'math-axis', 'number-line', 'trig-circle', 'callout'
  ].includes(activeTool);

  const getShapeIcon = (tool: WhiteboardTool) => {
    switch (tool) {
      case 'line': return <Minus size={18} />;
      case 'arrow': return <ArrowRight size={18} />;
      case 'double-arrow': return <ArrowLeftRight size={18} />;
      case 'rect': return <Square size={18} />;
      case 'rounded-rect': return <Square size={18} className="rounded-sm" />;
      case 'circle': return <Circle size={18} />;
      case 'ellipse': return <Circle size={18} className="scale-x-125" />;
      case 'triangle': return <Triangle size={18} />;
      case 'right-triangle': return <Triangle size={18} className="rotate-90" />;
      case 'diamond': return <Square size={18} className="rotate-45" />;
      case 'pentagon': return <Shapes size={18} />;
      case 'hexagon': return <Hexagon size={18} />;
      case 'star': return <Star size={18} />;
      case 'cube-3d': return <Box size={18} />;
      case 'cylinder-3d': return <Box size={18} className="rounded-full" />;
      case 'math-axis': return <Compass size={18} />;
      case 'number-line': return <Minus size={18} />;
      case 'trig-circle': return <Compass size={18} />;
      case 'callout': return <MessageSquare size={18} />;
      default: return <Shapes size={18} />;
    }
  };

  return (
    <>
      {/* Top Floating Control Header */}
      <header className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none gap-2" dir="rtl">
        {/* Left Side: Title, New File, Open File & Project Actions */}
        <div className={`pointer-events-auto flex items-center gap-1 sm:gap-1.5 ${themeConfig.headerBg} backdrop-blur-md ${themeConfig.textColor} p-1.5 rounded-2xl shadow-xl border`}>
          {/* Back to Platform Button (for standalone / dedicated window mode) */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-rose-600/90 text-slate-200 hover:text-white rounded-xl text-xs font-black transition-all cursor-pointer border border-slate-700/80 shadow-xs"
              title="العودة إلى الصفحة الرئيسية للمنصة دون فقدان المحتوى"
            >
              <Home size={14} className="text-amber-400" />
              <span className="hidden sm:inline">العودة للمنصة</span>
              <span className="sm:hidden">الرئيسية</span>
            </button>
          )}

          {/* New Whiteboard Button */}
          <button
            type="button"
            onClick={onNewProjectDirect || onOpenProjects}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
            title="إنشاء ملف / لوح جديد (Ctrl+N)"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">ملف جديد</span>
          </button>

          {/* Open Saved Projects Button */}
          <button
            type="button"
            onClick={onOpenProjects}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer border border-slate-700/80"
            title="استعراض وإدارة ملفاتي والألواح السابقة (Ctrl+O)"
          >
            <FolderOpen size={15} className="text-amber-400" />
            <span className="hidden sm:inline">ملفاتي (الألواح)</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={onSaveProject}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="حفظ المشروع (Ctrl+S)"
          >
            <Save size={14} className={isSaving ? 'animate-spin' : ''} />
            <span className="hidden md:inline">{isSaving ? 'جاري الحفظ...' : 'حفظ'}</span>
          </button>

          {/* Top Quick Undo / Redo */}
          <div className="flex items-center gap-0.5 bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/50">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all flex items-center gap-1"
              title={canUndo && undoCount ? `تراجع (${undoCount}) (Ctrl+Z)` : 'تراجع (Ctrl+Z)'}
            >
              <Undo2 size={14} />
              {canUndo && undoCount !== undefined && undoCount > 0 && (
                <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">{undoCount}</span>
              )}
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all flex items-center gap-1"
              title={canRedo && redoCount ? `إعادة (${redoCount}) (Ctrl+Y)` : 'إعادة (Ctrl+Y)'}
            >
              <Redo2 size={14} />
              {canRedo && redoCount !== undefined && redoCount > 0 && (
                <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">{redoCount}</span>
              )}
            </button>
          </div>

          {/* Real-time localStorage Auto-save Indicator Badge */}
          <div 
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-[11px] font-bold select-none cursor-default shadow-2xs"
            title="حفظ تلقائي مستمر في الذاكرة المحلية (localStorage) يحمي الشرح من أي انقطاع أو خروج مفاجئ"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>حفظ تلقائي (localStorage)</span>
            {Boolean(lastAutosaveTime) && (
              <span className="text-[10px] text-emerald-300 font-mono font-normal">
                ✓ {typeof lastAutosaveTime === 'string'
                  ? lastAutosaveTime
                  : (lastAutosaveTime as any) instanceof Date
                    ? (lastAutosaveTime as any).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : String(lastAutosaveTime || '')}
              </span>
            )}
          </div>


          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Quick PDF Import Button */}
          {onQuickPdfImport && (
            <button
              type="button"
              onClick={onQuickPdfImport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:via-rose-400 hover:to-purple-500 text-slate-950 hover:text-slate-900 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md hover:shadow-amber-500/30 active:scale-95 shrink-0 border border-amber-300/40"
              title="استيراد PDF سريع: يتيح تحميل ملف PDF وتقسيمه تلقائياً إلى صفحات قابلة للرسم والشرح الفوري"
              data-testid="whiteboard-quick-pdf-import-btn"
            >
              <Zap size={14} className="text-slate-950 fill-slate-950 animate-pulse shrink-0" />
              <span className="font-black whitespace-nowrap">استيراد PDF سريع ⚡</span>
            </button>
          )}

          {/* Import Files & Images Actions */}
          <button
            type="button"
            onClick={onOpenUnifiedImportModal || onOpenPdfImport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 hover:from-cyan-600/40 hover:to-indigo-600/40 text-cyan-200 border border-cyan-500/40 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
            title="استيراد ملفات PDF، كتب مدرسية، صور ومسائل من جهازك للكتابة والرسم عليها"
            data-testid="whiteboard-unified-import-btn"
          >
            <Upload size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">استيراد ملفات وصور 📁</span>
            <span className="sm:hidden">استيراد</span>
          </button>

          {onUploadDeviceImage && (
            <button
              type="button"
              onClick={onUploadDeviceImage}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
              title="رفع صورة مباشرة من الكمبيوتر أو الهاتف للشرح والكتابة فوقها فوراً"
              data-testid="whiteboard-upload-direct-btn"
            >
              <Upload size={14} className="text-emerald-400" />
              <span className="hidden lg:inline">رفع صورة من جهازك 🖼️</span>
              <span className="lg:hidden">رفع صورة</span>
            </button>
          )}

          {onCaptureCameraImage && (
            <button
              type="button"
              onClick={onCaptureCameraImage}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/40 hover:to-blue-600/40 text-cyan-200 border border-cyan-500/40 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
              title="التقاط صورة مباشرة بكاميرا الجهاز وإدراجها على الصفحة النشطة"
              data-testid="whiteboard-camera-capture-btn-main"
            >
              <Camera size={14} className="text-cyan-400" />
              <span className="hidden lg:inline">التقاط بالكاميرا 📷</span>
              <span className="lg:hidden">كاميرا</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPdfImport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600/30 to-purple-600/30 hover:from-rose-600/40 hover:to-purple-600/40 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
            title="استرداد وتضمين صفحات من ملف PDF للشرح والرسم عليها"
          >
            <FileText size={14} className="text-rose-400" />
            <span className="hidden sm:inline">استرداد صفحات (PDF)</span>
            <span className="sm:hidden">PDF</span>
          </button>

          <button
            type="button"
            onClick={onOpenImageImport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 text-sky-200 border border-sky-500/40 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
            title="مكتبة الصور والرسومات التعليمية، المخططات، والبحث المباشر"
          >
            <ImageIcon size={14} className="text-sky-400" />
            <span className="hidden md:inline">مكتبة الصور التعليمية 🎨</span>
            <span className="md:hidden">صور</span>
          </button>

          {/* AI OCR & Question Extractor Action */}
          {onRunOcrOnSelectedImage && (
            <button
              type="button"
              onClick={onRunOcrOnSelectedImage}
              disabled={isOcrLoading}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs border ${
                selectedItemType === 'image'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 animate-pulse'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
              } disabled:opacity-50`}
              title="استخراج وقراءة نص ومعادلات المسألة بالذكاء الاصطناعي (AI OCR)"
            >
              <Wand2 size={14} className={`text-emerald-300 ${isOcrLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isOcrLoading ? 'جاري التعرف...' : 'OCR ذكي'}</span>
            </button>
          )}

          {/* Whiteboard Color Theme Customizer */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-amber-500/20 hover:from-purple-500/30 hover:to-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
              title="تغيير سمة الألوان ومظهر اللوح الذكي"
            >
              <Palette size={14} className="text-amber-400" />
              <span className="hidden xl:inline text-[11px]">{themeConfig.arabicName}</span>
            </button>

            {showThemeMenu && (
              <div 
                className={`absolute right-0 top-full mt-2 w-72 ${themeConfig.panelBg} rounded-2xl shadow-2xl ${themeConfig.panelBorder} border p-3 z-50 animate-in fade-in zoom-in-95`}
                onMouseLeave={() => setShowThemeMenu(false)}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60 text-right">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                    <Palette size={14} />
                    <span>سمات ألوان اللوح الذكي 🎨</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">تفضيل المعلم</span>
                </div>
                
                <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar">
                  {WHITEBOARD_THEMES_LIST.map(th => {
                    const isSelected = (theme || 'classic-dark') === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          onChangeTheme?.(th.id);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 shadow-sm'
                            : 'bg-black/20 hover:bg-white/5 border-transparent hover:border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base shrink-0">{th.icon}</span>
                          <div className="text-right">
                            <div className="text-xs font-black text-white flex items-center gap-1.5">
                              <span>{th.arabicName}</span>
                              {isSelected && <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-md">مفعّل</span>}
                            </div>
                            <div className="text-[9px] text-slate-400 font-medium line-clamp-1">{th.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {th.previewColors.map((col, idx) => (
                            <span 
                              key={idx} 
                              className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-xs" 
                              style={{ backgroundColor: col }} 
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Page Navigation Pill */}
        <div className={`pointer-events-auto flex items-center gap-1 ${themeConfig.headerBg} backdrop-blur-md ${themeConfig.textColor} p-1 rounded-2xl shadow-xl border`}>
          <button
            type="button"
            onClick={onPrevPage}
            disabled={currentPageIndex === 0}
            className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="الصفحة السابقة"
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={onTogglePagesDrawer}
            className="px-2.5 py-1 hover:bg-slate-800 text-xs font-mono font-bold rounded-lg cursor-pointer flex items-center gap-1.5 text-amber-300"
            title="عرض فهرس الصفحات"
          >
            <Layers size={13} />
            <span>{currentPageIndex + 1} / {totalPages}</span>
          </button>

          <button
            type="button"
            onClick={onNextPage}
            disabled={currentPageIndex === totalPages - 1}
            className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="الصفحة التالية"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={onAddPage}
            className="p-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl cursor-pointer mr-1"
            title="إضافة صفحة بيضاء في نهاية اللوح"
          >
            <Plus size={15} />
          </button>

          {onInsertPageAfterCurrent && (
            <button
              type="button"
              onClick={onInsertPageAfterCurrent}
              className="p-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl cursor-pointer mr-0.5 flex items-center gap-1 shadow-sm"
              title="إدراج صفحة بيضاء جديدة فوراً بعد الصفحة الحالية مع الحفاظ على الترقيم التلقائي"
            >
              <FilePlus size={14} />
              <span className="hidden xl:inline text-[10px] font-black">+ صفحة هنا</span>
            </button>
          )}

          {onToggleDualView && (
            <button
              type="button"
              onClick={onToggleDualView}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDualView
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title={isDualView ? 'التبديل إلى وضع الصفحة المفردة' : 'التبديل إلى وضع صفحتين متجاورتين (عرض الكتاب المزدوج)'}
            >
              <BookOpen size={14} className={isDualView ? 'text-slate-950' : 'text-indigo-400'} />
              <span className="hidden lg:inline text-[11px]">
                {isDualView ? 'صفحتان' : 'مفرد'}
              </span>
            </button>
          )}
        </div>

        {/* Right Side: Zoom, Fit, Study Mode, Fullscreen & Export */}
        <div className={`pointer-events-auto flex items-center gap-1 ${themeConfig.headerBg} backdrop-blur-md ${themeConfig.textColor} p-1.5 rounded-2xl shadow-xl border`}>
          
          {/* Fit Width & Fit Screen Buttons */}
          {onFitWidth && (
            <button
              type="button"
              onClick={onFitWidth}
              className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="ملاءمة العرض لشاشة اللوح (Fit Width)"
            >
              <MoveHorizontal size={13} />
              <span className="hidden xl:inline text-[11px]">ملاءمة العرض</span>
            </button>
          )}

          {onFitScreen && (
            <button
              type="button"
              onClick={onFitScreen}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="ملاءمة الصفحة كاملة داخل الشاشة (Fit Page)"
            >
              <Maximize size={13} />
              <span className="hidden xl:inline text-[11px]">ملاءمة الصفحة</span>
            </button>
          )}

          {/* Study Mode Presentation Toggle */}
          {onToggleStudyMode && (
            <button
              type="button"
              onClick={onToggleStudyMode}
              className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              title="تفعيل وضع الشرح والدراسة التفاعلي (إخفاء القوائم مع أدوات القلم والممحاة)"
            >
              <Presentation size={13} className="text-amber-400" />
              <span className="hidden md:inline text-[11px]">وضع الشرح</span>
            </button>
          )}

          <div className="flex items-center gap-0.5 bg-slate-800/80 rounded-xl p-0.5">
            <button
              type="button"
              onClick={onZoomOut}
              className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 cursor-pointer"
              title="تصغير (-)"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={onResetZoom}
              className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-slate-200 hover:text-white"
              title="إعادة ضبط الحجم (100%)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={onZoomIn}
              className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 cursor-pointer"
              title="تكبير (+)"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (onOpenExportModal) {
                  onOpenExportModal();
                } else {
                  setShowExportMenu(!showExportMenu);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20"
              title="تصدير ومشاركة محتويات اللوح كـ PNG أو PDF للطلاب"
            >
              <Download size={14} />
              <span className="hidden sm:inline">تصدير ومشاركة</span>
            </button>

            {showExportMenu && (
              <div 
                className="absolute left-0 top-full mt-2 w-56 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 mb-1 border-b border-slate-800">
                  خيارات التصدير والمشاركة للطلاب
                </div>
                {onOpenExportModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onOpenExportModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-right text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-all cursor-pointer mb-1 border border-amber-500/30"
                  >
                    <Download size={14} className="text-amber-400" />
                    <span>نافذة التصدير والمشاركة الشاملة...</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportImage();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-right text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-sky-300 rounded-xl transition-all cursor-pointer"
                >
                  <ImageIcon size={14} className="text-sky-400" />
                  <span>تصدير الصفحة كصورة PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportPdf();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-right text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-rose-300 rounded-xl transition-all cursor-pointer"
                >
                  <FileText size={14} className="text-rose-400" />
                  <span>تصدير كملف PDF مدمج</span>
                </button>
                {onPrint && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onPrint();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-right text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-emerald-300 rounded-xl transition-all cursor-pointer"
                  >
                    <Printer size={14} className="text-emerald-400" />
                    <span>طباعة اللوحة مباشرة (Ctrl+P)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Direct Print Button */}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
              title="طباعة اللوحة أو الصفحة الحالية (Ctrl+P)"
            >
              <Printer size={14} className="text-emerald-400" />
              <span className="hidden xl:inline text-[11px]">طباعة</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl cursor-pointer"
            title={isFullscreen ? 'الخروج من ملء الشاشة' : 'وضع ملء الشاشة الكامل'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* Main Floating Bottom Drawing Toolbar */}
      <nav className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-[96vw]" dir="rtl">
        <div className={`smart-whiteboard-toolbar flex items-center gap-1 sm:gap-1.5 ${themeConfig.toolbarBg} backdrop-blur-xl ${themeConfig.textColor} p-1.5 sm:p-2 rounded-3xl shadow-2xl border`}>
          
          {/* Select & Move */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTool === 'select' 
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-105 font-bold' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="تحديد وتحريك وتعديل العناصر (V)"
            >
              <MousePointer size={18} />
            </button>
            <div className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-amber-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>تحديد وتحريك</span>
                <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">V</kbd>
              </div>
              <span className="text-[9px] text-slate-400 font-normal">اختيار ونقل العناصر</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>

          {/* Pan Canvas */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setActiveTool('pan')}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTool === 'pan' 
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-105 font-bold' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="سحب وتحريك مساحة العمل (H / Space)"
            >
              <Hand size={18} />
            </button>
            <div className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-slate-700 flex flex-col items-center gap-0.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>تحريك اللوح</span>
                <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">H</kbd>
              </div>
              <span className="text-[9px] text-slate-400 font-normal">التمرير في مساحة العمل</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5" />

          {/* Freehand Pen */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer relative ${
                activeTool === 'pen' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="قلم الكتابة والرسم (Pen): رسم وكتابة يدوية سلسة مع حساسية الضغط وسن القلم الذكي (P)"
              aria-label="قلم الكتابة والرسم الحر (Pen)"
              data-tooltip="قلم الكتابة والرسم الحر (Pen)"
            >
              <Pencil size={18} />
              {activeTool === 'pen' && (
                <span 
                  className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-slate-950 shadow-xs ring-1 ring-white/30" 
                  style={{ backgroundColor: currentColor }} 
                />
              )}
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-indigo-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>قلم الكتابة والرسم (Pen)</span>
                <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">P</kbd>
              </div>
              <span className="text-[9px] text-slate-400 font-normal">دليل المعلم: رسم وكتابة يدوية سلسة مع حساسية الضغط وسن القلم الذكي</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>

          {/* Highlighter */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setActiveTool('highlighter')}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTool === 'highlighter' 
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-105 font-bold' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="قلم التمييز والتظليل (Highlighter): تظليل شفاف فوق النصوص والمعادلات لإبراز النقاط المهمة (M)"
              aria-label="قلم التمييز الشفاف الفسفوري (Highlighter)"
              data-tooltip="قلم التمييز الشفاف الفسفوري"
            >
              <Highlighter size={18} />
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-amber-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>قلم التمييز (Highlighter)</span>
                <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">M</kbd>
              </div>
              <span className="text-[9px] text-slate-400 font-normal">تظليل شفاف فوق النصوص والمعادلات لإبراز النقاط المهمة</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>

          {/* Eraser */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setActiveTool('eraser')}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTool === 'eraser' 
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-105' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="الممحاة الذكية (Eraser): مسح فوري للخطوط والأشكال لتصحيح الشرح وتنظيف اللوح (E)"
              aria-label="الممحاة الذكية (Eraser)"
              data-tooltip="الممحاة الذكية (Eraser)"
            >
              <Eraser size={18} />
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-rose-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>الممحاة الذكية (Eraser)</span>
                <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">E</kbd>
              </div>
              <span className="text-[9px] text-slate-400 font-normal">دليل المعلم: مسح فوري للخطوط والأشكال لتصحيح الشرح وتنظيف اللوح</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>

          {/* Laser Pointer (Temporary fading light for classroom explanation) */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setActiveTool('laser')}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer relative ${
                activeTool === 'laser' 
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl shadow-red-600/50 scale-105 ring-2 ring-red-400' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="قلم ليزر تفاعلي (L) - ضوء مؤقت يتلاشى تلقائياً للشرح والإشارة دون ترك أي أثر على اللوح"
              aria-label="مؤشر الليزر التفاعلي (Laser)"
              data-tooltip="مؤشر الليزر التفاعلي (Laser)"
            >
              <Zap size={18} className={activeTool === 'laser' ? 'animate-pulse text-amber-300 fill-amber-300' : ''} />
              {activeTool === 'laser' && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-slate-950"></span>
                </span>
              )}
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-red-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                <span>مؤشر الليزر (Laser)</span>
                <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">L</kbd>
              </div>
              <span className="text-[9px] text-slate-400 font-normal">إشارة مؤقتة تتلاشى تلقائياً للشرح دون ترك أثر على اللوح</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5" />

          {/* Shapes & Geometric Objects Popup Trigger */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => {
                setShowShapesMenu(!showShapesMenu);
                setShowColorPicker(false);
                setShowBgMenu(false);
              }}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-1 ${
                isShapeTool 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 scale-105' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="الأشكال الهندسية والمجسمات (Shapes): رسم وتوليد الدوائر والمربعات والمثلثات والمجسمات 3D والمحاور (S)"
              aria-label="الأشكال الهندسية والمجسمات (Shapes)"
              data-tooltip="الأشكال الهندسية والمجسمات (Shapes)"
            >
              {getShapeIcon(activeTool)}
            </button>
            {!showShapesMenu && (
              <div 
                role="tooltip"
                className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-teal-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>الأشكال الهندسية (Shapes)</span>
                  <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">S</kbd>
                </div>
                <span className="text-[9px] text-slate-400 font-normal">دليل المعلم: رسم وتوليد الدوائر والمربعات والمثلثات والمجسمات 3D والمحاور</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
              </div>
            )}

            {/* Magic Shape Recognition Quick Indicator */}
            {onToggleShapeRecognition && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleShapeRecognition();
                }}
                className={`absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] transition-all cursor-pointer shadow-md ${
                  isShapeRecognitionEnabled 
                    ? 'bg-teal-400 text-slate-950 ring-2 ring-slate-900 shadow-teal-400/50' 
                    : 'bg-slate-700 text-slate-400 opacity-60 hover:opacity-100 ring-1 ring-slate-800'
                }`}
                title={`التعرف الذكي على الأشكال اليدوية: ${isShapeRecognitionEnabled ? 'مفعّل ✨ (انقر للتعطيل)' : 'معطّل (انقر للتفعيل)'}`}
              >
                <Wand2 size={10} />
              </button>
            )}

            {showShapesMenu && (
              <div 
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-3 rounded-3xl shadow-2xl w-80 sm:w-96 z-50 animate-in fade-in zoom-in-95 space-y-3"
                onMouseLeave={() => setShowShapesMenu(false)}
              >
                {/* Magic Shape Recognition Toggle Card */}
                {onToggleShapeRecognition && (
                  <div className="p-2.5 bg-gradient-to-r from-teal-950/70 to-indigo-950/70 border border-teal-500/30 rounded-2xl flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isShapeRecognitionEnabled 
                          ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Wand2 size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>التعرف الذكي على الأشكال</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isShapeRecognitionEnabled 
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isShapeRecognitionEnabled ? 'مفعّل ✨' : 'معطّل'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          يحول رسم الدوائر والمربعات والخطوط يدوياً لأشكال هندسية دقيقة
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onToggleShapeRecognition}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        isShapeRecognitionEnabled ? 'bg-teal-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isShapeRecognitionEnabled ? 'translate-x-0' : '-translate-x-4'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Category Tabs */}
                <div className="flex items-center justify-between gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShapesCategory('2d')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      shapesCategory === '2d' 
                        ? 'bg-teal-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    أشكال ثنائية 2D
                  </button>
                  <button
                    type="button"
                    onClick={() => setShapesCategory('3d_math')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      shapesCategory === '3d_math' 
                        ? 'bg-teal-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    مجسمات ومحاور 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setShapesCategory('lines')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      shapesCategory === 'lines' 
                        ? 'bg-teal-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    خطوط وأسهم
                  </button>
                </div>

                {/* Tab Content: 2D Shapes */}
                {shapesCategory === '2d' && (
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setActiveTool('circle'); setShowShapesMenu(false); }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'circle' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <Circle size={18} />
                      <span>دائرة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTool('ellipse'); setShowShapesMenu(false); }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'ellipse' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <Circle size={18} className="scale-x-125" />
                      <span>بيضاوي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTool('rect'); setShowShapesMenu(false); }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'rect' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <Square size={18} />
                      <span>مستطيل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTool('rounded-rect'); setShowShapesMenu(false); }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'rounded-rect' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <Square size={18} className="rounded-md" />
                      <span>مستدير</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTool('triangle'); setShowShapesMenu(false); }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'triangle' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <Triangle size={18} />
                      <span>مثلث</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTool('right-triangle'); setShowShapesMenu(false); }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'right-triangle' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <Triangle size={18} className="rotate-90" />
                      <span>قائم الزاوية</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTool('diamond'); setShowShapesMenu(false); }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'diamond' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <Square size={18} className="rotate-45" />
                      <span>معين</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTool('pentagon'); setShowShapesMenu(false); }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'pentagon' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <Shapes size={18} />
                      <span>خماسي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTool('hexagon'); setShowShapesMenu(false); }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'hexagon' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <Hexagon size={18} />
                      <span>سداسي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTool('star'); setShowShapesMenu(false); }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'star' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <Star size={18} />
                      <span>نجمة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTool('callout'); setShowShapesMenu(false); }}
                      className={`col-span-2 p-2 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-bold hover:bg-slate-800 transition-all ${activeTool === 'callout' ? 'bg-teal-600 text-white' : 'text-slate-300'}`}
                    >
                      <MessageSquare size={16} />
                      <span>فقاعة شرح وملاحظة</span>
                    </button>
                  </div>
                )}

                {/* Tab Content: 3D & Math Objects */}
                {shapesCategory === '3d_math' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setActiveTool('cube-3d'); setShowShapesMenu(false); }}
                      className={`p-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold border transition-all ${
                        activeTool === 'cube-3d' 
                          ? 'bg-teal-600 border-teal-400 text-white shadow-md' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <Box size={20} className="text-amber-400" />
                      <div className="text-right">
                        <div>مكعب ثلاثي الأبعاد</div>
                        <div className="text-[10px] text-slate-400 font-normal">3D Cube / منشور</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTool('cylinder-3d'); setShowShapesMenu(false); }}
                      className={`p-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold border transition-all ${
                        activeTool === 'cylinder-3d' 
                          ? 'bg-teal-600 border-teal-400 text-white shadow-md' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <Box size={20} className="text-sky-400 rounded-full" />
                      <div className="text-right">
                        <div>أسطوانة 3D</div>
                        <div className="text-[10px] text-slate-400 font-normal">Cylinder مجسم</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTool('math-axis'); setShowShapesMenu(false); }}
                      className={`p-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold border transition-all ${
                        activeTool === 'math-axis' 
                          ? 'bg-teal-600 border-teal-400 text-white shadow-md' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <Compass size={20} className="text-indigo-400" />
                      <div className="text-right">
                        <div>محاور إحداثيات (X/Y)</div>
                        <div className="text-[10px] text-slate-400 font-normal">شبكة مستوى ديكارتي</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTool('number-line'); setShowShapesMenu(false); }}
                      className={`p-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold border transition-all ${
                        activeTool === 'number-line' 
                          ? 'bg-teal-600 border-teal-400 text-white shadow-md' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <Minus size={20} className="text-emerald-400" />
                      <div className="text-right">
                        <div>خط الأعداد</div>
                        <div className="text-[10px] text-slate-400 font-normal">تدرجات وترقيم</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTool('trig-circle'); setShowShapesMenu(false); }}
                      className={`col-span-2 p-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold border transition-all ${
                        activeTool === 'trig-circle' 
                          ? 'bg-teal-600 border-teal-400 text-white shadow-md' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <Circle size={20} className="text-rose-400" />
                      <div className="text-right">
                        <div>الدائرة المثلثية (Unit Circle)</div>
                        <div className="text-[10px] text-slate-400 font-normal">دائرة الوحدة مع الأرباع والزوايا</div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Tab Content: Lines & Arrows */}
                {shapesCategory === 'lines' && (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { setActiveTool('line'); setShowShapesMenu(false); }}
                      className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-bold border transition-all ${
                        activeTool === 'line' 
                          ? 'bg-teal-600 border-teal-400 text-white' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <Minus size={22} />
                      <span>خط مستقيم</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTool('arrow'); setShowShapesMenu(false); }}
                      className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-bold border transition-all ${
                        activeTool === 'arrow' 
                          ? 'bg-teal-600 border-teal-400 text-white' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <ArrowRight size={22} />
                      <span>سهم أحادي</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveTool('double-arrow'); setShowShapesMenu(false); }}
                      className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-bold border transition-all ${
                        activeTool === 'double-arrow' 
                          ? 'bg-teal-600 border-teal-400 text-white' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <ArrowLeftRight size={22} />
                      <span>سهم مزدوج</span>
                    </button>
                  </div>
                )}

                {/* Shape Options (Fill & Stroke Style) */}
                <div className="pt-2.5 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">تعبئة الشكل:</span>
                    {setIsShapeFilled && (
                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setIsShapeFilled(false)}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                            !isShapeFilled ? 'bg-teal-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          مفرغ
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsShapeFilled(true)}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                            isShapeFilled ? 'bg-teal-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          ممتلئ (ملون)
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">نمط الإطار:</span>
                    {setDashStyle && (
                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setDashStyle('solid')}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                            dashStyle === 'solid' ? 'bg-teal-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          متصل
                        </button>
                        <button
                          type="button"
                          onClick={() => setDashStyle('dashed')}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                            dashStyle === 'dashed' ? 'bg-teal-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          متقطع
                        </button>
                        <button
                          type="button"
                          onClick={() => setDashStyle('dotted')}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                            dashStyle === 'dotted' ? 'bg-teal-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          منقط
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Text Tool */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setActiveTool('text')}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTool === 'text' 
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-105 font-bold' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="إضافة نص وملاحظات أكاديمية (T)"
              aria-label="إضافة نصوص وملاحظات (Text)"
              data-tooltip="إضافة نصوص وملاحظات (Text)"
            >
              <Type size={18} />
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-amber-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>أداة النصوص (Text)</span>
                <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">T</kbd>
              </div>
              <span className="text-[9px] text-slate-400 font-normal">إضافة عناوين وفقرات وملاحظات نصية للشرح</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>

          {/* Sticky Note */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setActiveTool('sticky')}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTool === 'sticky' 
                  ? 'bg-yellow-400 text-slate-950 shadow-md scale-105 font-bold' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="إضافة بطاقة ملونة وملاحظة لاصقة (N)"
              aria-label="إضافة بطاقة لاصقة (Sticky Note)"
              data-tooltip="إضافة بطاقة لاصقة (Sticky Note)"
            >
              <StickyNote size={18} />
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-yellow-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <span>ملاحظة لاصقة (Sticky Note)</span>
                <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">N</kbd>
              </div>
              <span className="text-[9px] text-slate-400 font-normal">بطاقات تذكيرية ملونة لإبراز القوانين والملاحظات</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>

          {/* Math & Chemistry Equation Editor (MathJax & mhchem) */}
          {onOpenMathFormulaModal && (
            <div className="relative group">
              <button
                type="button"
                onClick={onOpenMathFormulaModal}
                className="p-2 sm:p-2.5 rounded-2xl hover:bg-slate-800 text-teal-400 hover:text-teal-300 transition-all cursor-pointer relative flex items-center justify-center bg-teal-950/40 border border-teal-500/30 hover:border-teal-400/60"
                title="محرر المعادلات الرياضية والتفاعلات الكيميائية (MathJax & LaTeX & mhchem)"
                aria-label="محرر المعادلات الرياضية (Math Formula)"
                data-tooltip="محرر المعادلات الرياضية والكيميائية"
              >
                <Sigma size={18} className="text-teal-300 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
              </button>
              <div 
                role="tooltip"
                className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-teal-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>محرر المعادلات (Math Editor)</span>
                  <span className="text-[9px] bg-teal-900/60 text-teal-300 px-1 rounded">LaTeX</span>
                </div>
                <span className="text-[9px] text-slate-400 font-normal">كتابة معادلات الرياضيات والفيزياء والتفاعلات الكيميائية</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
              </div>
            </div>
          )}

          {/* STEM Tools & Teacher Palette (Physics, Chemistry, 3D Shapes, Circuits, Optics) */}
          {onToggleStemPanel && (
            <div className="relative group">
              <button
                type="button"
                onClick={onToggleStemPanel}
                className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer relative flex items-center justify-center ${
                  isStemPanelOpen
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 border border-indigo-400 scale-105'
                    : 'hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 hover:border-indigo-400/60'
                }`}
                title="لوحة الأدوات العلمية والمجسمات ثلاثية الأبعاد (فيزياء، كيمياء، كهرباء، بصريات، 3D، ذكاء اصطناعي)"
                aria-label="لوحة الأدوات العلمية STEM"
                data-tooltip="الأدوات العلمية التفاعلية STEM"
              >
                <FlaskConical size={18} className="group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
              </button>
              <div 
                role="tooltip"
                className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-indigo-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>الأدوات العلمية (STEM Tools)</span>
                </div>
                <span className="text-[9px] text-slate-400 font-normal">مختبر الفيزياء والكيمياء والدوائر الكهربائية والبصريات</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
              </div>
            </div>
          )}

          {/* Real-Time Lesson Notes Drawer */}
          {onOpenNotesDrawer && (
            <div className="relative group">
              <button
                type="button"
                onClick={onOpenNotesDrawer}
                className="p-2 sm:p-2.5 rounded-2xl hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-all cursor-pointer relative flex items-center justify-center bg-amber-950/30 border border-amber-500/30 hover:border-amber-400/60"
                title="مفكرة وملاحظات الحصة اللحظية (تدوين وحفظ فوري للأهداف والشرح والواجبات)"
                aria-label="مفكرة وملاحظات الحصة"
                data-tooltip="مفكرة وملاحظات الحصة"
              >
                <BookOpen size={18} className="text-amber-300 group-hover:scale-110 transition-transform" />
              </button>
              <div 
                role="tooltip"
                className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-amber-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>ملاحظات الحصة (Lesson Notes)</span>
                </div>
                <span className="text-[9px] text-slate-400 font-normal">تدوين أهداف الدرس والواجبات المدرسية ومشاركتها</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
              </div>
            </div>
          )}

          {/* Import Files & Images Action (PDF, Images, Worksheets, Diagrams) */}
          <div className="relative group">
            <button
              type="button"
              onClick={onOpenUnifiedImportModal || onOpenImageImport}
              className="p-2 sm:p-2.5 rounded-2xl hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition-all cursor-pointer relative"
              title="استيراد ملفات وصور: صور من جهازك، مستندات PDF، أو لصق لقطة شاشة للكتابة والشرح عليها (I / Ctrl+V)"
              aria-label="استيراد ملفات وصور للوح (Images & Files)"
              data-tooltip="استيراد ملفات وصور (Images & Files)"
              data-testid="whiteboard-floating-import-btn"
            >
              <Upload size={18} />
              <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-sky-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>استيراد ملفات وصور (Files & Images)</span>
                <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">I</kbd>
              </div>
              <span className="text-[9px] text-slate-400 font-normal">
                استيراد صور من الجهاز، ملفات PDF، ولصق لقطات الشاشة للكتابة فوقها
              </span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>

          {/* Measurement & Geometry Tools (Virtual Ruler & Protractor) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowMeasurementMenu(!showMeasurementMenu);
                setShowShapesMenu(false);
                setShowColorPicker(false);
                setShowWidthMenu(false);
                setShowBgMenu(false);
                setShowLayersMenu(false);
              }}
              className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-1 relative ${
                isRulerOpen || isProtractorOpen || showMeasurementMenu
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 scale-105 ring-2 ring-amber-300'
                  : 'hover:bg-slate-800 text-amber-400 hover:text-amber-300'
              }`}
              title="أدوات القياس والهندسة الافتراضية (المسطرة والمنقلة الذكية)"
            >
              <Ruler size={18} />
              {(isRulerOpen || isProtractorOpen) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950 shadow-xs animate-pulse" />
              )}
            </button>

            {showMeasurementMenu && (
              <div 
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900/98 backdrop-blur-2xl border border-amber-500/40 p-3 rounded-3xl shadow-2xl w-80 sm:w-92 z-50 animate-in fade-in zoom-in-95 space-y-2.5"
                onMouseLeave={() => setShowMeasurementMenu(false)}
                dir="rtl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                      <Ruler size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">أدوات القياس والرسم الهندسي</h4>
                      <p className="text-[10px] text-slate-400">مسطرة ومنقلة افتراضية للشرح ورسم أشكال دقيقة</p>
                    </div>
                  </div>
                </div>

                {/* Virtual Ruler Option Card */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleRuler?.();
                    setShowMeasurementMenu(false);
                  }}
                  className={`w-full p-2.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer text-right ${
                    isRulerOpen 
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md' 
                      : 'bg-slate-950/80 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                      isRulerOpen 
                        ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-md' 
                        : 'bg-slate-800 text-amber-400 border-slate-700'
                    }`}>
                      <Ruler size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black flex items-center gap-1.5">
                        <span>المسطرة الافتراضية الذكية</span>
                        {isRulerOpen && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                            نشطة 📏
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        قياس الأطوال بالسم والإنش، وتدويرها ورسم خطوط مستقيمة
                      </div>
                    </div>
                  </div>

                  <div className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                    isRulerOpen ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {isRulerOpen ? 'إخفاء' : 'إظهار'}
                  </div>
                </button>

                {/* Virtual Protractor Option Card */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleProtractor?.();
                    setShowMeasurementMenu(false);
                  }}
                  className={`w-full p-2.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer text-right ${
                    isProtractorOpen 
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md' 
                      : 'bg-slate-950/80 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                      isProtractorOpen 
                        ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-md' 
                        : 'bg-slate-800 text-amber-400 border-slate-700'
                    }`}>
                      <Compass size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black flex items-center gap-1.5">
                        <span>المنقلة الهندسية الذكية</span>
                        {isProtractorOpen && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                            نشطة 📐
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        قياس الزوايا وتصنيفها (حادة، قائمة، منفرجة) ورسمها
                      </div>
                    </div>
                  </div>

                  <div className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                    isProtractorOpen ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {isProtractorOpen ? 'إخفاء' : 'إظهار'}
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5" />

          {/* Quick Color Swatches Bar (One-click color change) */}
          <div className="hidden md:flex items-center gap-1 px-1 py-1 bg-slate-900/90 rounded-2xl border border-slate-800">
            {QUICK_PEN_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCurrentColor(c.value)}
                className={`w-5 h-5 rounded-full transition-all cursor-pointer ${
                  currentColor === c.value 
                    ? 'ring-2 ring-amber-400 scale-125 shadow-md z-10' 
                    : 'opacity-80 hover:opacity-100 hover:scale-110'
                }`}
                style={{ backgroundColor: c.value, border: c.value === '#FFFFFF' ? '1px solid #94a3b8' : 'none' }}
                title={`تغيير اللون إلى: ${c.name}`}
              />
            ))}
          </div>

          {/* Full Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowWidthMenu(false);
                setShowShapesMenu(false);
                setShowBgMenu(false);
              }}
              className="p-1.5 sm:p-2 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700/60"
              title="تغيير لون القلم والعناصر (لوحة الألوان)"
            >
              <div 
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white shadow-sm ring-1 ring-black/40"
                style={{ backgroundColor: currentColor }}
              />
            </button>

            {showColorPicker && (
              <div 
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-3.5 rounded-3xl shadow-2xl w-72 sm:w-80 z-50 animate-in fade-in zoom-in-95 space-y-3.5"
                onMouseLeave={() => setShowColorPicker(false)}
              >
                <div>
                  <div className="text-xs font-black text-amber-300 mb-2 flex items-center justify-between">
                    <span>تغيير لون القلم والعناصر:</span>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">{currentColor}</span>
                  </div>
                  
                  {/* Preset Colors Grid */}
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setCurrentColor(c.value);
                          setShowColorPicker(false);
                        }}
                        className={`w-8 h-8 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center ${
                          currentColor === c.value ? 'scale-115 border-amber-400 shadow-lg shadow-amber-400/20' : 'border-slate-800 hover:scale-105'
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

                  {/* Custom Hex / Color Input */}
                  <div className="mt-3 flex items-center justify-between p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                        title="اختر أي لون مخصص"
                      />
                      <span className="text-xs font-bold text-slate-300">لون مخصص بالكامل</span>
                    </div>
                    <div 
                      className="w-5 h-5 rounded-md border border-white/40"
                      style={{ backgroundColor: currentColor }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Stroke Width (Thickness) Dropdown & Slider */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowWidthMenu(!showWidthMenu);
                setShowColorPicker(false);
                setShowShapesMenu(false);
                setShowBgMenu(false);
              }}
              className={`p-1.5 sm:p-2 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700/60 ${
                showWidthMenu ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="سماكة وسمك القلم والممحاة (Stroke Width)"
            >
              <Sliders size={16} className="text-amber-400" />
              <div 
                className="rounded-full bg-amber-400" 
                style={{ 
                  width: `${Math.max(4, Math.min(18, currentWidth * 1.5))}px`, 
                  height: `${Math.max(4, Math.min(18, currentWidth * 1.5))}px` 
                }} 
              />
              <span className="text-[11px] font-mono font-bold hidden sm:inline">{currentWidth}px</span>
            </button>

            {showWidthMenu && (
              <div 
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-4 rounded-3xl shadow-2xl w-72 sm:w-80 z-50 animate-in fade-in zoom-in-95 space-y-4"
                onMouseLeave={() => setShowWidthMenu(false)}
                dir="rtl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-amber-400" />
                    <span className="text-xs font-black text-slate-200">سماكة القلم والرسم:</span>
                  </div>
                  <span className="font-mono text-xs font-black text-amber-300 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                    {currentWidth} px
                  </span>
                </div>

                {/* Visual Live Preview of Line Stroke */}
                <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-center justify-center min-h-[44px]">
                  <div 
                    className="w-full rounded-full transition-all duration-150"
                    style={{ 
                      backgroundColor: currentColor === '#FFFFFF' ? '#e2e8f0' : currentColor,
                      height: `${currentWidth}px`,
                      maxHeight: '40px'
                    }}
                  />
                </div>

                {/* Range Slider for Fine Precision Tuning */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
                    <span>دقيق (1px)</span>
                    <span>متوسط (15px)</span>
                    <span>عريض (50px)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={currentWidth}
                    onChange={(e) => setCurrentWidth(Number(e.target.value))}
                    className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-2.5"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 block">اختيارات سريعة جاهزة:</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { label: 'دقيق', value: 2 },
                      { label: 'عادي', value: 4 },
                      { label: 'وسط', value: 8 },
                      { label: 'عريض', value: 16 },
                      { label: 'سميك', value: 30 }
                    ].map(sw => (
                      <button
                        key={sw.value}
                        type="button"
                        onClick={() => setCurrentWidth(sw.value)}
                        className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          currentWidth === sw.value 
                            ? 'bg-amber-400 text-slate-950 font-black shadow-md scale-102' 
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <div 
                          className="rounded-full" 
                          style={{ 
                            width: `${Math.min(sw.value, 14)}px`, 
                            height: `${Math.min(sw.value, 14)}px`,
                            backgroundColor: currentWidth === sw.value ? '#0f172a' : '#fbbf24'
                          }} 
                        />
                        <span>{sw.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Layer Management (طبقة القوالب، مستند PDF، الرسومات، النصوص، الصور) */}
          <div className="relative">
            {(() => {
              const isAnyLayerHidden = 
                showAnnotations === false || 
                showPdfBackground === false || 
                showBackgroundTemplate === false ||
                (page?.showTextItems === false) ||
                (page?.showImageItems === false);
              
              const isAnyOpacityAdjusted = 
                (page?.backgroundTemplateOpacity !== undefined && page.backgroundTemplateOpacity < 1) ||
                (page?.pdfBackgroundOpacity !== undefined && page.pdfBackgroundOpacity < 1) ||
                (page?.annotationsOpacity !== undefined && page.annotationsOpacity < 1) ||
                (page?.textItemsOpacity !== undefined && page.textItemsOpacity < 1) ||
                (page?.imageItemsOpacity !== undefined && page.imageItemsOpacity < 1);

              return (
                <button
                  type="button"
                  onClick={() => {
                    setShowLayersMenu(!showLayersMenu);
                    setShowColorPicker(false);
                    setShowShapesMenu(false);
                    setShowBgMenu(false);
                    setShowWidthMenu(false);
                  }}
                  className={`p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-1 relative ${
                    showLayersMenu || isAnyLayerHidden || isAnyOpacityAdjusted
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                  title="إدارة الطبقات المتقدمة (قوالب السبورة، مستند الـ PDF، التعليقات والرسومات، النصوص، الصور)"
                >
                  <Layers size={18} />
                  {isAnyLayerHidden && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-950 shadow-xs animate-pulse" />
                  )}
                </button>
              );
            })()}

            {showLayersMenu && (
              <div 
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 p-1.5 rounded-3xl shadow-2xl w-84 sm:w-96 z-50 animate-in fade-in zoom-in-95"
                dir="rtl"
              >
                {page && onUpdatePageLayer ? (
                  <WhiteboardLayersPanel
                    page={page}
                    onUpdatePageLayer={onUpdatePageLayer}
                    onClearAnnotationsOnly={onClearAnnotationsOnly}
                    onClearBackgroundDocument={onClearBackgroundDocument}
                    hasPdfBackground={hasPdfBackground}
                    strokesCount={strokesCount}
                    textItemsCount={textItemsCount}
                    imageItemsCount={imageItemsCount}
                    onClose={() => setShowLayersMenu(false)}
                    isCompact={false}
                  />
                ) : (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-amber-400" />
                        <span className="text-xs font-black text-white">إدارة طبقات الصفحة</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                        {strokesCount} رسم / {textItemsCount} نص
                      </span>
                    </div>

                    {/* PDF Document Layer */}
                    {hasPdfBackground && (
                      <div className="p-2.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-rose-400" />
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-200">طبقة مستند الـ PDF</div>
                            <div className="text-[10px] text-slate-400">الصفحة الأصلية عالية الدقة</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {onTogglePdfBackground && (
                            <button
                              type="button"
                              onClick={onTogglePdfBackground}
                              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                showPdfBackground
                                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                              title={showPdfBackground ? 'إخفاء خلفية الـ PDF' : 'إظهار خلفية الـ PDF'}
                            >
                              {showPdfBackground ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                          )}
                          {onTogglePdfLock && (
                            <button
                              type="button"
                              onClick={onTogglePdfLock}
                              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                isPdfLocked
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-slate-800 text-slate-200 border-slate-700'
                              }`}
                              title={isPdfLocked ? 'الـ PDF مقفل ومحمي من الإزاحة' : 'الـ PDF غير مقفل'}
                            >
                              {isPdfLocked ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Drawing & Annotations Layer */}
                    <div className="p-2.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pencil size={16} className="text-indigo-400" />
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-200">طبقة التعليقات والرسومات</div>
                            <div className="text-[10px] text-slate-400">أقلام الشرح والتمييز ({strokesCount})</div>
                          </div>
                        </div>
                        {onToggleAnnotations && (
                          <button
                            type="button"
                            onClick={onToggleAnnotations}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                              showAnnotations
                                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                            title={showAnnotations ? 'إخفاء طبقة التعليقات' : 'إظهار طبقة التعليقات'}
                          >
                            {showAnnotations ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick-Toggle Background Button (lined / grid / graph / blank) */}
          <div className="relative group flex items-center">
            <div className="flex items-center bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 rounded-2xl p-0.5 shadow-sm transition-all">
              {/* Main Quick Toggle Button */}
              <button
                type="button"
                onClick={handleQuickToggleBg}
                className="smart-whiteboard-quick-bg-toggle px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/80 flex items-center gap-1.5 transition-all cursor-pointer font-bold text-xs"
                title={`تبديل سريع للخلفية: التبديل إلى "${nextQuickBg.name}" (انقر للتبديل الفوري دون فتح الإعدادات)`}
                aria-label={`تبديل سريع لخلفية السبورة إلى ${nextQuickBg.name}`}
                data-testid="smart-whiteboard-quick-bg-toggle"
              >
                {activeQuickBg?.iconType === 'grid' ? (
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <rect x="2" y="2" width="16" height="16" rx="2.5" strokeWidth="1.2" opacity="0.5" />
                    <line x1="7" y1="2" x2="7" y2="18" />
                    <line x1="13" y1="2" x2="13" y2="18" />
                    <line x1="2" y1="7" x2="18" y2="7" />
                    <line x1="2" y1="13" x2="18" y2="13" />
                  </svg>
                ) : activeQuickBg?.iconType === 'graph' ? (
                  <svg className="w-4 h-4 text-cyan-400 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <rect x="2" y="2" width="16" height="16" rx="2.5" strokeWidth="1" opacity="0.3" />
                    <line x1="5" y1="2" x2="5" y2="18" strokeWidth="0.8" opacity="0.3" />
                    <line x1="15" y1="2" x2="15" y2="18" strokeWidth="0.8" opacity="0.3" />
                    <line x1="2" y1="5" x2="18" y2="5" strokeWidth="0.8" opacity="0.3" />
                    <line x1="2" y1="15" x2="18" y2="15" strokeWidth="0.8" opacity="0.3" />
                    <line x1="10" y1="2" x2="10" y2="18" strokeWidth="2" className="text-cyan-400 stroke-cyan-400" />
                    <line x1="2" y1="10" x2="18" y2="10" strokeWidth="2" className="text-cyan-400 stroke-cyan-400" />
                  </svg>
                ) : activeQuickBg?.iconType === 'blank' ? (
                  <svg className="w-4 h-4 text-slate-300 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <rect x="3" y="3" width="14" height="14" rx="2.5" strokeDasharray="3 3" opacity="0.75" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <rect x="2" y="2" width="16" height="16" rx="2.5" strokeWidth="1.2" opacity="0.4" />
                    <line x1="5" y1="6" x2="15" y2="6" />
                    <line x1="5" y1="10" x2="15" y2="10" />
                    <line x1="5" y1="14" x2="15" y2="14" />
                  </svg>
                )}
                <span className="hidden sm:inline font-bold text-[11px] text-slate-200">
                  {activeQuickBg ? activeQuickBg.shortLabel : 'الخلفية'}
                </span>
                <span className="text-[10px] text-cyan-400 font-extrabold px-1.5 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30">
                  ⚡ تبديل
                </span>
              </button>

              {/* Direct 1-tap quick buttons for each of the 4 modes */}
              <div className="hidden md:flex items-center gap-0.5 border-r border-slate-700/60 pr-1 mr-0.5">
                {QUICK_BG_MODES.map((m) => {
                  const isCurrent = activeQuickBg?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCurrentBackground(m.id)}
                      className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={`تعيين فوري دون فتح الإعدادات: ${m.name}`}
                    >
                      {m.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Toggle Hover Tooltip */}
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-cyan-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-cyan-300 font-bold">تبديل سريع للخلفية:</span>
                <span className="text-slate-300 font-normal">
                  {activeQuickBg ? activeQuickBg.shortLabel : 'مخصص'} ➔ {nextQuickBg.shortLabel}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-normal">
                تبديل فوري بين: مسطر | مربعات | بياني | سادة دون فتح الإعدادات
              </span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>

          {/* Background Templates Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowBgMenu(!showBgMenu);
                setShowColorPicker(false);
                setShowShapesMenu(false);
              }}
              className="p-2 sm:p-2.5 rounded-2xl hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
              title="تغيير نوع وخلفية السبورة (بيضاء، خضراء، مسطر، بياني)"
            >
              <Palette size={18} />
            </button>

            {showBgMenu && (
              <div 
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-2.5 rounded-2xl shadow-2xl w-60 z-50 animate-in fade-in zoom-in-95 space-y-1.5"
                onMouseLeave={() => setShowBgMenu(false)}
              >
                <div className="text-[10px] font-bold text-slate-400 px-1 pb-1 border-b border-slate-800">
                  قوالب وخلفيات السبورة
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {BACKGROUND_TEMPLATES.map(bg => (
                    <button
                      key={bg.type}
                      type="button"
                      onClick={() => {
                        setCurrentBackground(bg.type);
                        setShowBgMenu(false);
                      }}
                      className={`p-2 rounded-xl text-right text-[11px] font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                        currentBackground === bg.type 
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300' 
                          : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <span className="text-sm">{bg.icon}</span>
                      <span className="truncate">{bg.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5" />

          {/* Undo / Redo */}
          <div className="relative group">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 sm:p-2.5 rounded-2xl hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="تراجع (Ctrl+Z)"
              aria-label="تراجع عن آخر خطوة (Undo)"
              data-tooltip="تراجع (Ctrl+Z)"
            >
              <Undo2 size={17} />
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold shadow-xl border border-slate-750 flex items-center gap-1.5 backdrop-blur-md"
            >
              <span>تراجع (Undo)</span>
              <kbd className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">Ctrl+Z</kbd>
            </div>
          </div>

          <div className="relative group">
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 sm:p-2.5 rounded-2xl hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="إعادة (Ctrl+Y / Ctrl+Shift+Z)"
              aria-label="إعادة الخطوة (Redo)"
              data-tooltip="إعادة (Ctrl+Y)"
            >
              <Redo2 size={17} />
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold shadow-xl border border-slate-750 flex items-center gap-1.5 backdrop-blur-md"
            >
              <span>إعادة (Redo)</span>
              <kbd className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-300 font-mono">Ctrl+Y</kbd>
            </div>
          </div>

          {/* Clear Page */}
          <div className="relative group">
            <button
              type="button"
              onClick={onClearPage}
              className="p-2 sm:p-2.5 rounded-2xl hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
              title="مسح محتوى الصفحة الحالية بالكامل"
              aria-label="مسح الصفحة بالكامل (Clear Page)"
              data-tooltip="مسح محتوى اللوح بالكامل"
            >
              <Trash2 size={17} />
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-rose-300 text-[10px] font-bold shadow-xl border border-rose-500/40 flex items-center gap-1.5 backdrop-blur-md"
            >
              <span>مسح اللوح بالكامل</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5" />

          {/* Quick Export / Share Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => {
                if (onOpenExportModal) {
                  onOpenExportModal();
                } else {
                  onExportImage();
                }
              }}
              className="p-2 sm:p-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer shadow-xs"
              title="تصدير ومشاركة محتويات اللوح للطلاب كصورة PNG أو مستند PDF"
              aria-label="تصدير وحفظ اللوح (Export)"
              data-tooltip="تصدير وحفظ اللوح (Export)"
            >
              <Download size={17} />
            </button>
            <div 
              role="tooltip"
              className="smart-toolbar-tooltip pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-amber-300 text-[10px] font-bold shadow-xl border border-amber-500/40 flex items-center gap-1.5 backdrop-blur-md"
            >
              <span>تصدير ومشاركة (PDF / PNG)</span>
            </div>
          </div>

          {/* Direct Print Button in Bottom Toolbar */}
          {onPrint && (
            <div className="relative group">
              <button
                type="button"
                onClick={onPrint}
                className="p-2 sm:p-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer shadow-xs"
                title="طباعة اللوحة مباشرة (Ctrl+P)"
                aria-label="طباعة اللوحة (Print)"
                data-tooltip="طباعة اللوحة (Print)"
              >
                <Printer size={17} />
              </button>
              <div 
                role="tooltip"
                className="smart-toolbar-tooltip pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-emerald-300 text-[10px] font-bold shadow-xl border border-emerald-500/40 flex items-center gap-1.5 backdrop-blur-md"
              >
                <span>طباعة السبورة مباشرة</span>
              </div>
            </div>
          )}

        </div>
      </nav>
    </>
  );
};
