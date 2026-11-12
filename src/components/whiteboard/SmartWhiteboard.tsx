import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  WhiteboardTool, 
  WhiteboardBackgroundType, 
  WhiteboardPage, 
  WhiteboardProject, 
  DrawStroke, 
  DrawPoint, 
  TextItem, 
  ImageItem,
  WhiteboardTheme
} from '../../types/whiteboard';
import { getWhiteboardThemeConfig, getThemeDefaultBackground } from '../../lib/whiteboardThemes';
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { WhiteboardStudyBar } from './WhiteboardStudyBar';
import { WhiteboardPagesDrawer } from './WhiteboardPagesDrawer';
import { WhiteboardProjectsModal } from './WhiteboardProjectsModal';
import { WhiteboardFileManager } from './WhiteboardFileManager';
import { 
  PdfImportSelectorModal, 
  PdfImportLayoutMode, 
  ScratchpadStyle 
} from './PdfImportSelectorModal';
import { 
  EducationalImageModal, 
  InsertedImageOptions 
} from './EducationalImageModal';
import { WhiteboardImportModal } from './WhiteboardImportModal';
import { WhiteboardExportModal } from './WhiteboardExportModal';
import { MathFormulaModal, MathFormulaInsertOptions } from './MathFormulaModal';
import { WhiteboardNotesDrawer, LessonNoteItem } from './WhiteboardNotesDrawer';
import { StemItem, StemToolDef } from '../../types/stemWhiteboard';
import { StemObjectRenderer } from './StemObjectRenderer';
import { StemSidePanel } from './StemSidePanel';
import { StemItemInspector } from './StemItemInspector';
import { STEM_TOOL_DEFINITIONS } from '../../lib/stemToolsData';
import { recognizeDrawnShape } from './shapeRecognizer';
import { VirtualRuler } from './VirtualRuler';
import { VirtualProtractor } from './VirtualProtractor';
import { 
  loadPdfPages, 
  loadPdfMetadataAndThumbnails, 
  loadSelectedPdfPages, 
  createDualPageSpread, 
  createVerticalStackedPagesSpread,
  PdfDocumentInfo, 
  exportWhiteboardToPdf, 
  downloadCanvasImage 
} from '../../lib/pdfWhiteboardUtils';
import { 
  saveWhiteboardProjectToStorage, 
  loadWhiteboardProjectFromStorage, 
  loadAllWhiteboardProjectsFromStorage, 
  deleteWhiteboardProjectFromStorage, 
  getLastProjectId, 
  migrateLegacyProjects,
  saveWhiteboardAutosaveToLocalStorage,
  loadWhiteboardAutosaveFromLocalStorage,
  clearWhiteboardAutosaveFromLocalStorage 
} from '../../lib/whiteboardStorage';
import { db } from '../../lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { 
  FileUp, 
  Image as ImageIcon, 
  X, 
  Check, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Loader2,
  Sparkles,
  Move,
  CornerDownLeft,
  ChevronUp,
  ChevronDown,
  Plus,
  Layers,
  Pencil,
  Hand
} from 'lucide-react';

interface SmartWhiteboardProps {
  teacherId?: string;
  teacherName?: string;
  onClose?: () => void;
  isStandalone?: boolean;
  theme?: WhiteboardTheme;
  defaultBackground?: WhiteboardBackgroundType;
  onChangeTheme?: (theme: WhiteboardTheme) => void;
  initialScreen?: 'launcher' | 'canvas';
}

const createDefaultPage = (
  id: string, 
  title: string = 'صفحة 1', 
  bg?: WhiteboardBackgroundType,
  theme?: WhiteboardTheme | string
): WhiteboardPage => {
  // Default background is white ruled notebook paper ('ruled' - أبيض مخطط سطور هيئة دفتر)
  // unless explicitly chosen otherwise (such as grid / blank / chalkboard / dark)
  const backgroundType: WhiteboardBackgroundType = bg || 'ruled';

  let backgroundColor = '#ffffff';
  if (backgroundType === 'chalkboard') {
    backgroundColor = '#1b4332';
  } else if (backgroundType === 'dark') {
    const themeConfig = getWhiteboardThemeConfig(theme);
    backgroundColor = themeConfig.defaultPageBgColor && themeConfig.defaultPageBgColor !== '#ffffff' ? themeConfig.defaultPageBgColor : '#0f172a';
  } else {
    // Ruled notebook, math grid, blank white, dots, isometric, and coordinate plane default to clean white surface
    backgroundColor = '#ffffff';
  }

  return {
    id,
    title,
    backgroundType,
    backgroundColor,
    strokes: [],
    textItems: [],
    imageItems: [],
    stemItems: [],
    createdAt: new Date().toISOString()
  };
};

const createInitialProject = (
  teacherId?: string, 
  teacherName?: string,
  theme?: WhiteboardTheme | string,
  defaultBg?: WhiteboardBackgroundType
): WhiteboardProject => {
  const initialPage = createDefaultPage('page_1', 'صفحة الشرح 1', defaultBg || 'ruled', theme);
  return {
    id: `board_${Date.now()}`,
    title: 'شرح الحصة الذكية',
    teacherId: teacherId || 'teacher_guest',
    teacherName: teacherName || 'المعلم',
    pages: [initialPage],
    activePageIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const SmartWhiteboard: React.FC<SmartWhiteboardProps> = ({
  teacherId,
  teacherName,
  onClose,
  isStandalone = false,
  theme = 'classic-dark',
  defaultBackground,
  onChangeTheme,
  initialScreen
}) => {
  // Theme state
  const [activeTheme, setActiveTheme] = useState<WhiteboardTheme>(() => {
    try {
      return theme || (localStorage.getItem('whiteboard_theme') as WhiteboardTheme) || 'classic-dark';
    } catch {
      return theme || 'classic-dark';
    }
  });

  useEffect(() => {
    if (theme) {
      setActiveTheme(theme);
    }
  }, [theme]);

  const handleThemeChange = (newTheme: WhiteboardTheme) => {
    setActiveTheme(newTheme);
    try {
      localStorage.setItem('whiteboard_theme', newTheme);
    } catch {
      // ignore storage write errors
    }
    onChangeTheme?.(newTheme);
    const newDefaults = getThemeDefaultBackground(newTheme);
    if (newDefaults.penColor) {
      setCurrentColor(newDefaults.penColor);
    }
  };

  const themeConfig = getWhiteboardThemeConfig(activeTheme);

  // Main Project State - with Instant synchronous localStorage caching restore
  const [project, setProject] = useState<WhiteboardProject>(() => {
    try {
      const cached = loadWhiteboardAutosaveFromLocalStorage();
      if (cached && cached.pages && cached.pages.length > 0) {
        // If the only page is an untouched empty blank page, apply the default background
        const isUntouchedEmpty = 
          cached.pages.length === 1 && 
          (!cached.pages[0].strokes || cached.pages[0].strokes.length === 0) &&
          (!cached.pages[0].textItems || cached.pages[0].textItems.length === 0) &&
          (!cached.pages[0].imageItems || cached.pages[0].imageItems.length === 0) &&
          (!cached.pages[0].stemItems || cached.pages[0].stemItems.length === 0);

        if (isUntouchedEmpty && !defaultBackground) {
          cached.pages[0].backgroundType = 'ruled';
          cached.pages[0].backgroundColor = '#ffffff';
        }
        return cached;
      }
    } catch (e) {
      console.warn('Notice loading cached whiteboard project on mount:', e);
    }
    return createInitialProject(teacherId, teacherName, activeTheme, defaultBackground || 'ruled');
  });

  const [activePageIndex, setActivePageIndex] = useState<number>(() => {
    try {
      const cached = loadWhiteboardAutosaveFromLocalStorage();
      if (cached && typeof cached.activePageIndex === 'number' && cached.pages && cached.pages[cached.activePageIndex]) {
        return cached.activePageIndex;
      }
    } catch {}
    return 0;
  });

  // Load last active project asynchronously on mount from IndexedDB (with localStorage autosave fallback)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await migrateLegacyProjects();
        const lastId = await getLastProjectId();
        if (lastId) {
          const loaded = await loadWhiteboardProjectFromStorage(lastId);
          if (loaded && isMounted) {
            // Check if local cache has newer unsaved edits
            const cached = loadWhiteboardAutosaveFromLocalStorage();
            if (cached && cached.id === loaded.id && cached._autosaveTimestamp) {
              const loadedTime = new Date(loaded.updatedAt || 0).getTime();
              if (cached._autosaveTimestamp > loadedTime) {
                // The localStorage cache has newer work; keep cached
                return;
              }
            }

            if (!Array.isArray(loaded.pages) || loaded.pages.length === 0) {
              loaded.pages = [createDefaultPage('page_1', 'صفحة الشرح 1', defaultBackground || 'ruled', activeTheme)];
            }

            // If the project is an untouched empty project from a prior session, apply default background
            const isUntouchedEmpty = 
              loaded.pages.length === 1 && 
              (!loaded.pages[0].strokes || loaded.pages[0].strokes.length === 0) &&
              (!loaded.pages[0].textItems || loaded.pages[0].textItems.length === 0) &&
              (!loaded.pages[0].imageItems || loaded.pages[0].imageItems.length === 0) &&
              (!loaded.pages[0].stemItems || loaded.pages[0].stemItems.length === 0);

            if (isUntouchedEmpty && !defaultBackground) {
              loaded.pages[0].backgroundType = 'ruled';
              loaded.pages[0].backgroundColor = '#ffffff';
            }

            setProject(loaded);
            if (typeof loaded.activePageIndex === 'number' && loaded.pages && loaded.pages[loaded.activePageIndex]) {
              setActivePageIndex(loaded.activePageIndex);
            }
          }
        } else {
          // Fallback to localStorage autosave if no IndexedDB lastId was found
          const autoSaved = loadWhiteboardAutosaveFromLocalStorage();
          if (autoSaved && isMounted) {
            if (!Array.isArray(autoSaved.pages) || autoSaved.pages.length === 0) {
              autoSaved.pages = [createDefaultPage('page_1', 'صفحة الشرح 1', defaultBackground || 'ruled', activeTheme)];
            }

            const isUntouchedEmpty = 
              autoSaved.pages.length === 1 && 
              (!autoSaved.pages[0].strokes || autoSaved.pages[0].strokes.length === 0) &&
              (!autoSaved.pages[0].textItems || autoSaved.pages[0].textItems.length === 0) &&
              (!autoSaved.pages[0].imageItems || autoSaved.pages[0].imageItems.length === 0) &&
              (!autoSaved.pages[0].stemItems || autoSaved.pages[0].stemItems.length === 0);

            if (isUntouchedEmpty && !defaultBackground) {
              autoSaved.pages[0].backgroundType = 'ruled';
              autoSaved.pages[0].backgroundColor = '#ffffff';
            }

            setProject(autoSaved);
            if (typeof autoSaved.activePageIndex === 'number' && autoSaved.pages && autoSaved.pages[autoSaved.activePageIndex]) {
              setActivePageIndex(autoSaved.activePageIndex);
            }
          }
        }
      } catch (err) {
        console.warn('Notice checking initial whiteboard project from storage:', err);
      }
    })();
    return () => { isMounted = false; };
  }, [activeTheme, defaultBackground]);
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>(() => {
    const initialBg = defaultBackground || 'ruled';
    if (initialBg === 'dark' || initialBg === 'chalkboard') {
      return '#FFFFFF';
    }
    return '#1E293B';
  });
  const [currentWidth, setCurrentWidth] = useState<number>(4);
  const [isShapeFilled, setIsShapeFilled] = useState<boolean>(false);
  const [shapeDashStyle, setShapeDashStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isStudyMode, setIsStudyMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string>('');
  const [currentScreen, setCurrentScreen] = useState<'launcher' | 'canvas'>(() => {
    if (initialScreen) return initialScreen;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('screen') === 'canvas') return 'canvas';
    }
    return 'launcher';
  });

  // Set dedicated document title when opened in standalone mode
  useEffect(() => {
    if (isStandalone) {
      const originalTitle = document.title;
      document.title = 'اللوح الذكي - أكاديمية التفوق أون لاين';
      return () => {
        document.title = originalTitle;
      };
    }
  }, [isStandalone]);

  // Modals & Drawers
  const [isPagesDrawerOpen, setIsPagesDrawerOpen] = useState<boolean>(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState<boolean>(false);
  const [savedProjectsList, setSavedProjectsList] = useState<WhiteboardProject[]>([]);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const [pdfProgressText, setPdfProgressText] = useState<string>('');
  const [pdfDocInfo, setPdfDocInfo] = useState<PdfDocumentInfo | null>(null);
  const [isPdfSelectorOpen, setIsPdfSelectorOpen] = useState<boolean>(false);
  const [isEducationalImageModalOpen, setIsEducationalImageModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isDualViewMode, setIsDualViewMode] = useState<boolean>(false);
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [isShapeRecognitionEnabled, setIsShapeRecognitionEnabled] = useState<boolean>(true);
  const [shapeRecognitionFeedback, setShapeRecognitionFeedback] = useState<{ text: string; confidence: number; timestamp: number } | null>(null);
  
  // Measurement Tools State (Virtual Ruler & Protractor)
  const [isRulerOpen, setIsRulerOpen] = useState<boolean>(false);
  const [isProtractorOpen, setIsProtractorOpen] = useState<boolean>(false);

  // MathJax & Chemistry Formula Modal State
  const [isMathModalOpen, setIsMathModalOpen] = useState<boolean>(false);
  const [mathModalInitialLatex, setMathModalInitialLatex] = useState<string>('');
  const [mathModalInitialColor, setMathModalInitialColor] = useState<string>('#38bdf8');
  const [mathModalInitialIsChem, setMathModalInitialIsChem] = useState<boolean>(false);
  const [editingFormulaItemId, setEditingFormulaItemId] = useState<string | null>(null);

  // Real-time Lesson Notes Drawer State
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState<boolean>(false);
  const [lessonNotes, setLessonNotes] = useState<LessonNoteItem[]>([
    {
      id: 'note-1',
      title: 'أهداف الحصة التعليمية',
      content: '1. استيعاب المفاهيم الأساسية للمعادلات والمتطابقات الرياضية والكيميائية.\n2. التطبيق العملي على حل المسائل الحسابية وحساب الموازنات.\n3. تصدير الشرح واللوح بالكامل كملف PDF مع الملاحظات.',
      category: 'objective',
      color: '#fef08a',
      createdAt: new Date().toISOString()
    }
  ]);

  // STEM Tools & Teacher Palette State
  const [isStemPanelOpen, setIsStemPanelOpen] = useState<boolean>(false);
  const [selectedStemId, setSelectedStemId] = useState<string | null>(null);

  // Undo / Redo Stacks per page
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [historyStack, setHistoryStack] = useState<any[]>([]);

  // Continuous Autosave tracking & metadata
  const [lastAutosaveTime, setLastAutosaveTime] = useState<string>(() => {
    try {
      const meta = localStorage.getItem('wb_autosave_meta');
      if (meta) {
        const d = new Date(Number(meta));
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
      }
      return '';
    } catch {
      return '';
    }
  });

  // Debounced continuous auto-save to localStorage on project changes
  useEffect(() => {
    if (!project || !project.pages || project.pages.length === 0) return;
    const timer = setTimeout(() => {
      const projToCache = { ...project, activePageIndex };
      const saved = saveWhiteboardAutosaveToLocalStorage(projToCache);
      if (saved) {
        const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastAutosaveTime(timeStr);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [project, activePageIndex]);

  // Synchronous flush on page reload or navigation to ensure zero data loss
  useEffect(() => {
    const handleUnload = () => {
      if (project && project.pages && project.pages.length > 0) {
        saveWhiteboardAutosaveToLocalStorage({ ...project, activePageIndex });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [project, activePageIndex]);

  // Selected item on canvas
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'text' | 'image' | 'stroke' | null>(null);

  // Active editing text modal/inline
  const [editingTextItem, setEditingTextItem] = useState<TextItem | null>(null);

  // Canvas Refs & Image Cache
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const isDrawingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentStrokeRef = useRef<DrawStroke | null>(null);
  const laserPointsRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const hoverLaserPosRef = useRef<{ x: number; y: number } | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const quickPdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isDraggingItemRef = useRef<boolean>(false);
  const dragItemDataRef = useRef<{ id: string; initialX: number; initialY: number; startMouseX: number; startMouseY: number; pageIndex: number; itemType: 'image' | 'text' } | null>(null);

  // Save project to IndexedDB & optionally Firestore (Declared early to prevent TDZ ReferenceError)
  const persistProject = useCallback(async (projToSave: WhiteboardProject, silent = false) => {
    try {
      if (!silent) setIsSaving(true);

      // Capture lightweight thumbnail data URL from the active canvas
      let thumbUrl = projToSave.thumbnailUrl;
      try {
        const canvas = canvasRef.current;
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 300;
          thumbCanvas.height = 180;
          const ctx = thumbCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 300, 180);
            ctx.drawImage(canvas, 0, 0, 300, 180);
            thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.6);
          }
        }
      } catch (e) {
        // ignore thumb generation err
      }

      const updatedProj: WhiteboardProject = {
        ...projToSave,
        thumbnailUrl: thumbUrl,
        updatedAt: new Date().toISOString()
      };

      // High-capacity IndexedDB save (unlimited quota)
      await saveWhiteboardProjectToStorage(updatedProj);

      // LocalStorage autosave snapshot for instant session recovery
      saveWhiteboardAutosaveToLocalStorage(updatedProj);
      const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastAutosaveTime(timeStr);

      // Update state in memory list
      setSavedProjectsList(prev => {
        const remaining = prev.filter(p => p.id !== updatedProj.id);
        return [updatedProj, ...remaining];
      });

      // Cloud Firestore save
      try {
        const cloudDocRef = doc(db, 'whiteboardProjects', updatedProj.id);
        // Exclude huge base64 PDF backgrounds from cloud root doc if needed, or save cleanly
        const lightweightPages = updatedProj.pages.map(p => ({
          ...p,
          // If background is huge base64, save reference
          backgroundImage: p.backgroundImage ? (p.backgroundImage.length > 500000 ? p.backgroundImage.slice(0, 100) + '...' : p.backgroundImage) : undefined
        }));

        await setDoc(cloudDocRef, {
          id: updatedProj.id,
          title: updatedProj.title,
          teacherId: updatedProj.teacherId,
          teacherName: updatedProj.teacherName,
          activePageIndex: updatedProj.activePageIndex,
          thumbnailUrl: updatedProj.thumbnailUrl,
          createdAt: updatedProj.createdAt,
          updatedAt: updatedProj.updatedAt,
          pagesCount: updatedProj.pages.length,
          pages: lightweightPages
        }, { merge: true });
      } catch (cloudErr) {
        console.warn('Cloud save warning (local cache retained):', cloudErr);
      }

      if (!silent) {
        setSaveNotice('تم حفظ اللوح بنجاح ✨');
        setTimeout(() => setSaveNotice(''), 3000);
      }
    } catch (err) {
      console.error('Error persisting whiteboard project:', err);
    } finally {
      if (!silent) setIsSaving(false);
    }
  }, []);

  // Continuous Vertical Document Layout definitions
  const activeDrawingPageLayoutRef = useRef<{ index: number; page: WhiteboardPage; x: number; y: number; width: number; height: number } | null>(null);
  const zoomRef = useRef<number>(zoom);
  const panOffsetRef = useRef<{ x: number; y: number }>(panOffset);
  const totalDocHeightRef = useRef<number>(1600);

  // Touch & Swipe Mode State ('pen' for drawing with touch / 'pan' for 1-finger page swiping)
  const [touchInteractionMode, setTouchInteractionMode] = useState<'pen' | 'pan'>('pen');
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const [isQuickJumpOpen, setIsQuickJumpOpen] = useState<boolean>(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Smooth scroll, kinetic glide and inertia refs
  const smoothScrollAnimationRef = useRef<number | null>(null);
  const kineticAnimIdRef = useRef<number | null>(null);
  const wheelVelocityYRef = useRef<number>(0);
  const wheelVelocityXRef = useRef<number>(0);
  const wheelInertiaIdRef = useRef<number | null>(null);

  // Multi-touch tracking refs for tablets and mobile devices
  const activePointersRef = useRef<Map<number, { clientX: number; clientY: number; time: number; pointerType: string }>>(new Map());
  const twoFingerGestureRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialMid: { x: number; y: number };
    initialPan: { x: number; y: number };
    lastMidY: number;
    lastTime: number;
    velocityY: number;
  } | null>(null);

  const singleTouchSwipeRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    lastY: number;
    lastTime: number;
    velocityY: number;
  } | null>(null);

  // Synchronous active page ref for high-frequency event listeners
  const activePageIndexRef = useRef<number>(activePageIndex);
  useEffect(() => {
    activePageIndexRef.current = activePageIndex;
  }, [activePageIndex]);

  // Wheel page navigation and stylus tracking refs
  const lastWheelNavTimeRef = useRef<number>(0);
  const wheelDeltaAccumulatorRef = useRef<number>(0);
  const wheelResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStylusActiveRef = useRef<boolean>(false);

  const initialRestorationDoneRef = useRef<boolean>(false);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  const safePages = useMemo(() => {
    return Array.isArray(project?.pages) && project.pages.length > 0
      ? project.pages
      : [createDefaultPage('page_1', 'صفحة الشرح 1', defaultBackground, activeTheme)];
  }, [project?.pages, defaultBackground, activeTheme]);

  const currentPage = safePages[activePageIndex] || safePages[0];

  // Calculate stack-based undo and redo counts
  const undoCount = historyIndex > 0 ? historyIndex : (currentPage?.strokes?.length > 0 ? 1 : 0);
  const redoCount = Math.max(0, historyStack.length - 1 - historyIndex);

  // Vertical Document Gap and Margins
  const PAGE_GAP = 54;
  const PAGE_TOP_MARGIN = 32;

  // Compute exact sequential vertical layout geometry for all pages
  const pageLayouts = useMemo(() => {
    let currentY = PAGE_TOP_MARGIN;

    const rawDims = safePages.map((page) => {
      let width = 1200;
      let height = 1600;

      if (page.backgroundImage) {
        const cachedImg = imageCacheRef.current.get(page.backgroundImage);
        if (cachedImg && cachedImg.naturalWidth > 0 && cachedImg.naturalHeight > 0) {
          if (page.isDualSpread) {
            width = 1920;
            height = 1080;
          } else {
            width = 1200;
            height = Math.round((cachedImg.naturalHeight / cachedImg.naturalWidth) * 1200);
          }
        } else if (page.isDualSpread) {
          width = 1920;
          height = 1080;
        } else {
          width = 1200;
          height = 1600;
        }
      } else if (page.isDualSpread) {
        width = 1920;
        height = 1080;
      }
      return { width, height };
    });

    const maxWidth = Math.max(...rawDims.map(d => d.width), 1200);

    const layouts = safePages.map((page, index) => {
      const { width, height } = rawDims[index];
      const x = Math.round((maxWidth - width) / 2);
      const layout = {
        index,
        page,
        x,
        y: currentY,
        width,
        height
      };
      currentY += height + PAGE_GAP;
      return layout;
    });

    return layouts;
  }, [safePages]);

  const maxDocumentWidth = useMemo(() => {
    return pageLayouts.length > 0 ? Math.max(...pageLayouts.map(l => l.width), 1200) : 1200;
  }, [pageLayouts]);

  const totalDocumentHeight = useMemo(() => {
    if (pageLayouts.length === 0) return 1600;
    const last = pageLayouts[pageLayouts.length - 1];
    return last.y + last.height + 180;
  }, [pageLayouts]);

  useEffect(() => {
    totalDocHeightRef.current = totalDocumentHeight;
  }, [totalDocumentHeight]);

  // Cancel any ongoing smooth scroll or kinetic glide animations
  const cancelSmoothScroll = useCallback(() => {
    if (smoothScrollAnimationRef.current !== null) {
      cancelAnimationFrame(smoothScrollAnimationRef.current);
      smoothScrollAnimationRef.current = null;
    }
    if (kineticAnimIdRef.current !== null) {
      cancelAnimationFrame(kineticAnimIdRef.current);
      kineticAnimIdRef.current = null;
    }
  }, []);

  // Stop mouse wheel momentum loop
  const stopWheelInertia = useCallback(() => {
    if (wheelInertiaIdRef.current !== null) {
      cancelAnimationFrame(wheelInertiaIdRef.current);
      wheelInertiaIdRef.current = null;
    }
    wheelVelocityYRef.current = 0;
    wheelVelocityXRef.current = 0;
  }, []);

  // Smoothly animated vertical slide scroll to any specific page in the continuous document (300ms)
  const smoothScrollToPage = useCallback((index: number, duration: number = 300) => {
    if (pageLayouts.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(pageLayouts.length - 1, index));
    const layout = pageLayouts[clampedIndex];
    if (!layout) return;

    const container = canvasContainerRef.current || containerRef.current;
    const containerW = container ? container.clientWidth : 1200;
    const currentZ = zoomRef.current || 1;
    const targetX = Math.max(10, Math.floor((containerW - maxDocumentWidth * currentZ) / 2));
    const targetY = -layout.y * currentZ + 32;

    cancelSmoothScroll();
    stopWheelInertia();

    const startX = panOffsetRef.current.x;
    const startY = panOffsetRef.current.y;
    const startTime = performance.now();

    // Natural smooth ease-in-out cubic for realistic, fluid vertical slide transition (300ms)
    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeInOutCubic(progress);

      const currentX = Math.round(startX + (targetX - startX) * eased);
      const currentY = Math.round(startY + (targetY - startY) * eased);

      setPanOffset({ x: currentX, y: currentY });

      if (progress < 1) {
        smoothScrollAnimationRef.current = requestAnimationFrame(step);
      } else {
        smoothScrollAnimationRef.current = null;
        setActivePageIndex(clampedIndex);
      }
    };

    smoothScrollAnimationRef.current = requestAnimationFrame(step);
    setActivePageIndex(clampedIndex);
  }, [pageLayouts, maxDocumentWidth, cancelSmoothScroll, stopWheelInertia]);

  const scrollToPage = smoothScrollToPage;

  // Kinetic Inertia Glide for Touch Releases & Swipes
  const startKineticGlide = useCallback((initialVelocityY: number) => {
    if (kineticAnimIdRef.current !== null) {
      cancelAnimationFrame(kineticAnimIdRef.current);
      kineticAnimIdRef.current = null;
    }

    let vy = initialVelocityY;
    const friction = 0.91;

    const step = () => {
      if (Math.abs(vy) < 0.25) {
        kineticAnimIdRef.current = null;
        return;
      }

      const container = canvasContainerRef.current;
      if (container) {
        const containerH = container.clientHeight || 800;
        const currentZ = zoomRef.current || 1;
        const docH = totalDocHeightRef.current || 1600;
        const maxTop = 48;
        const minTop = Math.min(maxTop - 60, -(docH * currentZ - containerH + 160));

        setPanOffset(prev => {
          const nextY = Math.min(maxTop, Math.max(minTop, prev.y + vy));
          return { x: prev.x, y: nextY };
        });
      }

      vy *= friction;
      kineticAnimIdRef.current = requestAnimationFrame(step);
    };

    kineticAnimIdRef.current = requestAnimationFrame(step);
  }, []);

  // Kinetic Deceleration Runner for Mouse Wheel
  const runWheelInertia = useCallback(() => {
    if (wheelInertiaIdRef.current !== null) return;

    const step = () => {
      const vy = wheelVelocityYRef.current;
      const vx = wheelVelocityXRef.current;

      if (Math.abs(vy) < 0.25 && Math.abs(vx) < 0.25) {
        wheelVelocityYRef.current = 0;
        wheelVelocityXRef.current = 0;
        wheelInertiaIdRef.current = null;
        return;
      }

      const container = canvasContainerRef.current;
      if (container) {
        const containerH = container.clientHeight || 800;
        const currentZ = zoomRef.current || 1;
        const docH = totalDocHeightRef.current || 1600;
        const maxTop = 48;
        const minTop = Math.min(maxTop - 60, -(docH * currentZ - containerH + 160));

        setPanOffset(prev => {
          const nextY = Math.min(maxTop, Math.max(minTop, prev.y + vy));
          const nextX = prev.x + vx;
          return { x: nextX, y: nextY };
        });
      }

      wheelVelocityYRef.current *= 0.88;
      wheelVelocityXRef.current *= 0.88;
      wheelInertiaIdRef.current = requestAnimationFrame(step);
    };

    wheelInertiaIdRef.current = requestAnimationFrame(step);
  }, []);

  // Synchronize activePageIndex with page currently centered in viewport while scrolling
  useEffect(() => {
    const container = canvasContainerRef.current || containerRef.current;
    if (!container || pageLayouts.length === 0) return;
    const containerH = container.clientHeight || 800;

    const viewCenterDocY = (-panOffset.y + containerH / 2) / zoom;

    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < pageLayouts.length; i++) {
      const layout = pageLayouts[i];
      const pageCenter = layout.y + layout.height / 2;
      const dist = Math.abs(viewCenterDocY - pageCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    if (closestIndex !== activePageIndex) {
      setActivePageIndex(closestIndex);
    }
  }, [panOffset.y, zoom, pageLayouts, activePageIndex]);

  // Persist current page index to localStorage for seamless restoration across reloads
  useEffect(() => {
    if (project?.id) {
      try {
        localStorage.setItem(`wb_active_page_${project.id}`, String(activePageIndex));
        localStorage.setItem(`wb_active_pan_y_${project.id}`, String(panOffset.y));
      } catch {
        // ignore localStorage errors
      }
    }
  }, [activePageIndex, panOffset.y, project?.id]);

  // Initial restoration of saved page position on mount / project load
  useEffect(() => {
    if (initialRestorationDoneRef.current || pageLayouts.length === 0) return;
    try {
      if (project?.id) {
        const savedPage = localStorage.getItem(`wb_active_page_${project.id}`);
        if (savedPage !== null) {
          const parsedIdx = parseInt(savedPage, 10);
          if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < pageLayouts.length) {
            initialRestorationDoneRef.current = true;
            setTimeout(() => {
              smoothScrollToPage(parsedIdx, 300);
            }, 80);
            return;
          }
        }
      }
      if (typeof project?.activePageIndex === 'number' && project.activePageIndex > 0 && project.activePageIndex < pageLayouts.length) {
        initialRestorationDoneRef.current = true;
        setTimeout(() => {
          smoothScrollToPage(project.activePageIndex, 300);
        }, 80);
        return;
      }

      // If at page 0, auto-center page horizontally on wide screens (e.g. interactive displays/boards)
      const container = canvasContainerRef.current || containerRef.current;
      if (container && container.clientWidth > 0 && pageLayouts[0]) {
        const curLayout = pageLayouts[0];
        if (container.clientWidth > curLayout.width) {
          const xOffset = Math.floor((container.clientWidth - curLayout.width) / 2);
          setPanOffset(prev => (prev.x === 0 ? { x: xOffset, y: prev.y || 32 } : prev));
        }
      }
    } catch {
      // ignore
    }
  }, [pageLayouts, project.id, project.activePageIndex, smoothScrollToPage]);

  // Continuous vertical document scrolling with mouse wheel (Xournal++ style)
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // Prevent native browser scroll and pinch-zoom
      e.preventDefault();
      e.stopPropagation();

      // Stylus and drawing compatibility: ignore wheel events if user is actively in the middle of drawing a stroke
      if (
        isStylusActiveRef.current ||
        isDrawingRef.current ||
        currentStrokeRef.current !== null
      ) {
        return;
      }

      // 1. Ctrl / Meta + Wheel: Smooth Zoom centered around the mouse cursor (Xournal++ standard)
      if (e.ctrlKey || e.metaKey) {
        cancelSmoothScroll();
        stopWheelInertia();

        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        const currentZoom = zoomRef.current || 1;
        const newZoom = Math.min(4.0, Math.max(0.25, Number((currentZoom * zoomFactor).toFixed(3))));
        
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const currentPan = panOffsetRef.current;
        
        const newPanX = mouseX - (mouseX - currentPan.x) * (newZoom / currentZoom);
        const newPanY = mouseY - (mouseY - currentPan.y) * (newZoom / currentZoom);
        
        zoomRef.current = newZoom;
        setZoom(newZoom);
        panOffsetRef.current = { x: Math.round(newPanX), y: Math.round(newPanY) };
        setPanOffset({ x: Math.round(newPanX), y: Math.round(newPanY) });
        return;
      }

      // 2. Shift + Wheel or trackpad horizontal delta: Horizontal Panning
      if (e.shiftKey || (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.8 && Math.abs(e.deltaX) > 2)) {
        cancelSmoothScroll();
        let deltaX = e.shiftKey ? e.deltaY : e.deltaX;
        if (e.deltaMode === 1) deltaX *= 28;
        else if (e.deltaMode === 2) deltaX *= 320;

        const currentPan = panOffsetRef.current;
        const newPanX = currentPan.x - deltaX;
        panOffsetRef.current = { ...currentPan, x: Math.round(newPanX) };
        setPanOffset(prev => ({ ...prev, x: Math.round(newPanX) }));
        return;
      }

      // 3. Standard Mouse Wheel: Continuous Vertical Scrolling (Xournal++ style)
      // Moving seamlessly through the document, showing the end of the current page
      // and beginning of the next page simultaneously without jumping.
      cancelSmoothScroll();

      let deltaY = e.deltaY;
      if (e.deltaMode === 1) deltaY *= 32; // lines (mouse notch)
      else if (e.deltaMode === 2) deltaY *= 380; // pages

      const containerH = container.clientHeight || 800;
      const docH = totalDocHeightRef.current || 2000;
      const currentZ = zoomRef.current || 1;

      // Allow scrolling from top margin (showing page 1 header) all the way through the last page
      const maxPanY = 40;
      const minPanY = Math.min(-40, -(docH * currentZ - containerH + 160));

      const currentPan = panOffsetRef.current;
      const targetY = currentPan.y - deltaY;
      const clampedY = Math.max(minPanY, Math.min(maxPanY, targetY));

      panOffsetRef.current = { ...currentPan, y: Math.round(clampedY) };
      setPanOffset(prev => ({ ...prev, y: Math.round(clampedY) }));
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
      if (wheelResetTimeoutRef.current) {
        clearTimeout(wheelResetTimeoutRef.current);
      }
      stopWheelInertia();
    };
  }, [cancelSmoothScroll, stopWheelInertia]);

  // Auto-switch default pen color when chalkboard or dark board is selected for contrast
  useEffect(() => {
    if (currentPage?.backgroundType === 'chalkboard' || currentPage?.backgroundType === 'dark') {
      if (currentColor === '#1E293B' || currentColor === '#000000') {
        setCurrentColor('#FFFFFF');
      }
    } else if (currentPage?.backgroundType === 'blank' || currentPage?.backgroundType === 'ruled' || currentPage?.backgroundType === 'lined') {
      if (currentColor === '#FFFFFF') {
        setCurrentColor('#1E293B');
      }
    }
  }, [currentPage?.backgroundType]);

  // Auto-clear shape recognition feedback banner
  useEffect(() => {
    if (!shapeRecognitionFeedback) return;
    const timer = setTimeout(() => {
      setShapeRecognitionFeedback(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [shapeRecognitionFeedback]);

  // Push to history when page content changes
  const saveSnapshotToHistory = useCallback((customSnapshot?: { strokes?: DrawStroke[]; textItems?: TextItem[]; imageItems?: ImageItem[]; stemItems?: StemItem[] }) => {
    const pageStrokes = customSnapshot?.strokes !== undefined ? customSnapshot.strokes : (currentPage?.strokes || []);
    const pageTextItems = customSnapshot?.textItems !== undefined ? customSnapshot.textItems : (currentPage?.textItems || []);
    const pageImageItems = customSnapshot?.imageItems !== undefined ? customSnapshot.imageItems : (currentPage?.imageItems || []);
    const pageStemItems = customSnapshot?.stemItems !== undefined ? customSnapshot.stemItems : (currentPage?.stemItems || []);

    const snapshot = {
      strokes: JSON.parse(JSON.stringify(pageStrokes)),
      textItems: JSON.parse(JSON.stringify(pageTextItems)),
      imageItems: JSON.parse(JSON.stringify(pageImageItems)),
      stemItems: JSON.parse(JSON.stringify(pageStemItems))
    };

    setHistoryStack(prev => {
      const base = prev.length === 0 ? [{ strokes: [], textItems: [], imageItems: [], stemItems: [] }] : prev;
      const sliced = base.slice(0, historyIndex + 1);
      return [...sliced, snapshot];
    });
    setHistoryIndex(prev => prev + 1);
  }, [currentPage, historyIndex]);

  // Safe close handler that ensures project is persisted to storage first
  const handleSafeClose = useCallback(() => {
    if (project) {
      persistProject(project, false);
    }
    onClose?.();
  }, [project, persistProject, onClose]);

  // Auto-save debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (project && currentScreen === 'canvas') {
        persistProject(project, true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [project, persistProject, currentScreen]);

  // Load all local + cloud projects for the project manager modal & launcher
  const fetchAllSavedProjects = useCallback(async () => {
    try {
      const localProjects = await loadAllWhiteboardProjectsFromStorage();

      // Merge with cloud projects
      try {
        const snap = await getDocs(collection(db, 'whiteboardProjects'));
        snap.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (data && data.id && !localProjects.some(p => p.id === data.id)) {
            localProjects.push({
              id: data.id,
              title: data.title || 'لوح محفوظ',
              teacherId: data.teacherId,
              teacherName: data.teacherName,
              pages: data.pages || [createDefaultPage('p1', 'صفحة 1')],
              activePageIndex: 0,
              thumbnailUrl: data.thumbnailUrl,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString()
            });
          }
        });
      } catch (cloudErr) {
        console.warn('Cloud projects fetch error:', cloudErr);
      }

      // If empty, create initial sample boards matching the user's uploaded image (سيف- التأكسد, بهاء-4, بهاء-3, بهاء-2, سنيال - القطبية, Whiteboard 60, Annotations)
      if (localProjects.length === 0) {
        const now = Date.now();
        const sample1: WhiteboardProject = {
          id: `board_${now}_1`,
          title: 'سيف- التأكسد',
          teacherId: teacherId || 'teacher_guest',
          teacherName: teacherName || 'المعلم',
          pages: [createDefaultPage('p1', 'صفحة 1', 'blank', activeTheme)],
          activePageIndex: 0,
          createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString()
        };
        const sample2: WhiteboardProject = {
          id: `board_${now}_2`,
          title: 'بهاء-4',
          teacherId: teacherId || 'teacher_guest',
          teacherName: teacherName || 'المعلم',
          pages: [createDefaultPage('p1', 'صفحة 1', 'blank', activeTheme)],
          activePageIndex: 0,
          createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString()
        };
        const sample3: WhiteboardProject = {
          id: `board_${now}_3`,
          title: 'بهاء-3',
          teacherId: teacherId || 'teacher_guest',
          teacherName: teacherName || 'المعلم',
          pages: [createDefaultPage('p1', 'صفحة 1', 'blank', activeTheme)],
          activePageIndex: 0,
          createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
        };
        const sample4: WhiteboardProject = {
          id: `board_${now}_4`,
          title: 'بهاء-2',
          teacherId: teacherId || 'teacher_guest',
          teacherName: teacherName || 'المعلم',
          pages: [createDefaultPage('p1', 'صفحة 1', 'blank', activeTheme)],
          activePageIndex: 0,
          createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString()
        };
        const sample5: WhiteboardProject = {
          id: `board_${now}_5`,
          title: 'سنيال - القطبية',
          teacherId: teacherId || 'teacher_guest',
          teacherName: teacherName || 'المعلم',
          pages: [createDefaultPage('p1', 'صفحة 1', 'blank', activeTheme)],
          activePageIndex: 0,
          createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString()
        };
        const sample6: WhiteboardProject = {
          id: `board_${now}_6`,
          title: 'Whiteboard 60',
          teacherId: teacherId || 'teacher_guest',
          teacherName: teacherName || 'المعلم',
          pages: [createDefaultPage('p1', 'صفحة 1', 'blank', activeTheme)],
          activePageIndex: 0,
          createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString()
        };
        const sample7: WhiteboardProject = {
          id: `board_${now}_7`,
          title: 'Annotations - غرفة 3',
          teacherId: teacherId || 'teacher_guest',
          teacherName: teacherName || 'المعلم',
          pages: [createDefaultPage('p1', 'صفحة 1', 'blank', activeTheme)],
          activePageIndex: 0,
          createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString()
        };
        (sample7 as any).isShared = true;
        localProjects.push(sample1, sample2, sample3, sample4, sample5, sample6, sample7);
        saveWhiteboardProjectToStorage(sample1, false);
        saveWhiteboardProjectToStorage(sample2, false);
        saveWhiteboardProjectToStorage(sample3, false);
        saveWhiteboardProjectToStorage(sample4, false);
        saveWhiteboardProjectToStorage(sample5, false);
        saveWhiteboardProjectToStorage(sample6, false);
        saveWhiteboardProjectToStorage(sample7, false);
      }

      localProjects.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
      setSavedProjectsList(localProjects);
    } catch (err) {
      console.error('Error reading saved projects:', err);
    }
  }, [teacherId, teacherName]);

  // Initial load of saved projects for file manager
  useEffect(() => {
    fetchAllSavedProjects();
  }, [fetchAllSavedProjects]);

  // Update canvas sizing & DPR
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    redrawCanvas();
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Background Grid and Template Drawing Helper with Independent Layer Support
  const drawBackgroundPattern = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    bgType: WhiteboardBackgroundType,
    showTemplatePattern: boolean = true,
    templateOpacity: number = 1,
    pageBgColor?: string
  ) => {
    ctx.save();
    
    // Always render base background surface color
    const baseBgColor = pageBgColor || (
      bgType === 'chalkboard' 
        ? '#1b4332' 
        : bgType === 'dark' 
          ? (themeConfig.defaultPageBgColor || '#0f172a') 
          : '#ffffff'
    );

    ctx.fillStyle = baseBgColor;
    ctx.fillRect(0, 0, width, height);

    // If background template pattern is hidden, do not draw grid, dots, ruled or math axes
    if (!showTemplatePattern) {
      ctx.restore();
      return;
    }

    if (templateOpacity < 1) {
      ctx.globalAlpha = Math.max(0, Math.min(1, templateOpacity));
    }

    if (bgType === 'chalkboard') {
      // Subtle chalk slate noise/texture
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
    } else if (bgType === 'dark') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
    } else if (bgType === 'blank') {
      // Clean white board without any lines or patterns (أبيض بدون تخطيط)
    } else if (bgType === 'ruled' || bgType === 'lined') {
      // Notebook lined paper (أبيض مخطط سطور مثل هيئة الدفتر)
      const lineGap = 34;
      const topMargin = 70;

      // Soft notebook horizontal writing lines
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = topMargin; y < height - 20; y += lineGap) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Top notebook header margin double line
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, topMargin - 4);
      ctx.lineTo(width, topMargin - 4);
      ctx.stroke();

      // Right-side vertical margin line for Arabic notebook layout
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width - 65, 0);
      ctx.lineTo(width - 65, height);
      ctx.stroke();
    } else if (bgType === 'grid') {
      // Math & graph paper (ورق مربعات بياني / حسابي)
      const gridSize = 28;
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (bgType === 'dots') {
      const dotGap = 24;
      ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
      for (let x = dotGap; x < width; x += dotGap) {
        for (let y = dotGap; y < height; y += dotGap) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bgType === 'isometric') {
      const isoSize = 30;
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let x = -height; x < width + height; x += isoSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height, height);
        ctx.moveTo(x, 0);
        ctx.lineTo(x - height, height);
      }
      ctx.stroke();
      } else if (bgType === 'math-plane' || bgType === 'graph') {
        // Cartesian Coordinate system in center
        const cx = Math.floor(width / 2);
        const cy = Math.floor(height / 2);
        const step = 30;

        // Background subtle grid
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (let x = cx % step; x < width; x += step) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = cy % step; y < height; y += step) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Main Axes
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // X Axis
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        // X Arrow
        ctx.lineTo(width - 12, cy - 6);
        ctx.moveTo(width, cy);
        ctx.lineTo(width - 12, cy + 6);

        // Y Axis
        ctx.moveTo(cx, height);
        ctx.lineTo(cx, 0);
        // Y Arrow
        ctx.lineTo(cx - 6, 12);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx + 6, 12);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = '#1e3a8a';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('X+', width - 25, cy - 10);
        ctx.fillText('Y+', cx + 10, 20);
        ctx.fillText('(0,0)', cx + 6, cy + 16);
      }
    ctx.restore();
  };

  // Render a Single Stroke on Canvas
  const drawStrokePath = (ctx: CanvasRenderingContext2D, stroke: DrawStroke) => {
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = stroke.opacity || 0.4;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width || 18;
      ctx.globalCompositeOperation = 'multiply';
    } else if (stroke.tool === 'eraser' || stroke.tool === 'pixel-eraser') {
      ctx.strokeStyle = currentPage.backgroundColor || '#ffffff';
      ctx.lineWidth = stroke.width * 3 || 24;
    } else {
      ctx.globalAlpha = stroke.opacity || 1.0;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width || 4;
      ctx.fillStyle = stroke.fillColor || stroke.color;
    }

    if (stroke.dashStyle === 'dashed') {
      ctx.setLineDash([8, 8]);
    } else if (stroke.dashStyle === 'dotted') {
      ctx.setLineDash([3, 6]);
    } else {
      ctx.setLineDash([]);
    }

    const pts = stroke.points;
    const first = pts[0];
    const last = pts[pts.length - 1];

    if (stroke.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    } else if (stroke.tool === 'arrow' || stroke.tool === 'double-arrow') {
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();

      // Draw arrow head at end
      const angle = Math.atan2(last.y - first.y, last.x - first.x);
      const headLen = Math.max(12, stroke.width * 2.5);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - headLen * Math.cos(angle - Math.PI / 6), last.y - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - headLen * Math.cos(angle + Math.PI / 6), last.y - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();

      if (stroke.tool === 'double-arrow') {
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        ctx.lineTo(first.x + headLen * Math.cos(angle - Math.PI / 6), first.y + headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(first.x, first.y);
        ctx.lineTo(first.x + headLen * Math.cos(angle + Math.PI / 6), first.y + headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    } else if (stroke.tool === 'rect') {
      const minX = Math.min(first.x, last.x);
      const minY = Math.min(first.y, last.y);
      const w = Math.abs(last.x - first.x);
      const h = Math.abs(last.y - first.y);
      ctx.beginPath();
      ctx.strokeRect(minX, minY, w, h);
      if (stroke.isFilled) {
        ctx.fillRect(minX, minY, w, h);
      }
    } else if (stroke.tool === 'rounded-rect') {
      const minX = Math.min(first.x, last.x);
      const minY = Math.min(first.y, last.y);
      const w = Math.abs(last.x - first.x);
      const h = Math.abs(last.y - first.y);
      const radius = Math.min(18, w / 4, h / 4);
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(minX, minY, w, h, radius);
      } else {
        ctx.rect(minX, minY, w, h);
      }
      if (stroke.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (stroke.tool === 'circle') {
      const rx = Math.abs(last.x - first.x) / 2;
      const ry = Math.abs(last.y - first.y) / 2;
      const cx = Math.min(first.x, last.x) + rx;
      const cy = Math.min(first.y, last.y) + ry;
      const r = Math.max(rx, ry);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (stroke.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (stroke.tool === 'ellipse') {
      const rx = Math.abs(last.x - first.x) / 2;
      const ry = Math.abs(last.y - first.y) / 2;
      const cx = Math.min(first.x, last.x) + rx;
      const cy = Math.min(first.y, last.y) + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (stroke.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (stroke.tool === 'triangle') {
      ctx.beginPath();
      ctx.moveTo((first.x + last.x) / 2, first.y);
      ctx.lineTo(last.x, last.y);
      ctx.lineTo(first.x, last.y);
      ctx.closePath();
      if (stroke.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (stroke.tool === 'right-triangle') {
      const minX = Math.min(first.x, last.x);
      const maxX = Math.max(first.x, last.x);
      const minY = Math.min(first.y, last.y);
      const maxY = Math.max(first.y, last.y);
      ctx.beginPath();
      ctx.moveTo(minX, minY);
      ctx.lineTo(minX, maxY);
      ctx.lineTo(maxX, maxY);
      ctx.closePath();
      if (stroke.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
      // Right angle marker
      const sq = Math.min(14, (maxX - minX) / 4, (maxY - minY) / 4);
      if (sq > 4) {
        ctx.beginPath();
        ctx.moveTo(minX, maxY - sq);
        ctx.lineTo(minX + sq, maxY - sq);
        ctx.lineTo(minX + sq, maxY);
        ctx.stroke();
      }
    } else if (stroke.tool === 'diamond') {
      const minX = Math.min(first.x, last.x);
      const maxX = Math.max(first.x, last.x);
      const minY = Math.min(first.y, last.y);
      const maxY = Math.max(first.y, last.y);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, minY);
      ctx.lineTo(maxX, cy);
      ctx.lineTo(cx, maxY);
      ctx.lineTo(minX, cy);
      ctx.closePath();
      if (stroke.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (stroke.tool === 'pentagon' || stroke.tool === 'hexagon') {
      const rx = Math.abs(last.x - first.x) / 2;
      const ry = Math.abs(last.y - first.y) / 2;
      const cx = Math.min(first.x, last.x) + rx;
      const cy = Math.min(first.y, last.y) + ry;
      const sides = stroke.tool === 'pentagon' ? 5 : 6;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
        const px = cx + rx * Math.cos(angle);
        const py = cy + ry * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (stroke.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (stroke.tool === 'star') {
      const cx = (first.x + last.x) / 2;
      const cy = (first.y + last.y) / 2;
      const r = Math.hypot(last.x - first.x, last.y - first.y) / 2;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(
          cx + r * Math.cos((18 + i * 72) * Math.PI / 180),
          cy - r * Math.sin((18 + i * 72) * Math.PI / 180)
        );
        ctx.lineTo(
          cx + (r / 2) * Math.cos((54 + i * 72) * Math.PI / 180),
          cy - (r / 2) * Math.sin((54 + i * 72) * Math.PI / 180)
        );
      }
      ctx.closePath();
      if (stroke.isFilled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (stroke.tool === 'cube-3d') {
      const minX = Math.min(first.x, last.x);
      const maxX = Math.max(first.x, last.x);
      const minY = Math.min(first.y, last.y);
      const maxY = Math.max(first.y, last.y);
      const w = (maxX - minX) * 0.75;
      const h = (maxY - minY) * 0.75;
      const depthX = (maxX - minX) * 0.25;
      const depthY = (maxY - minY) * 0.25;

      // Front Face
      ctx.beginPath();
      ctx.strokeRect(minX, minY + depthY, w, h);
      if (stroke.isFilled) {
        ctx.fillRect(minX, minY + depthY, w, h);
      }
      // Back Face
      ctx.strokeRect(minX + depthX, minY, w, h);
      // Connecting 4 corner lines
      ctx.beginPath();
      ctx.moveTo(minX, minY + depthY);
      ctx.lineTo(minX + depthX, minY);
      ctx.moveTo(minX + w, minY + depthY);
      ctx.lineTo(minX + w + depthX, minY);
      ctx.moveTo(minX, minY + depthY + h);
      ctx.lineTo(minX + depthX, minY + h);
      ctx.moveTo(minX + w, minY + depthY + h);
      ctx.lineTo(minX + w + depthX, minY + h);
      ctx.stroke();
    } else if (stroke.tool === 'cylinder-3d') {
      const minX = Math.min(first.x, last.x);
      const maxX = Math.max(first.x, last.x);
      const minY = Math.min(first.y, last.y);
      const maxY = Math.max(first.y, last.y);
      const rx = (maxX - minX) / 2;
      const ry = Math.min(22, (maxY - minY) / 6);
      const cx = (minX + maxX) / 2;
      const topCy = minY + ry;
      const botCy = maxY - ry;

      // Top ellipse
      ctx.beginPath();
      ctx.ellipse(cx, topCy, rx, ry, 0, 0, Math.PI * 2);
      if (stroke.isFilled) ctx.fill();
      ctx.stroke();

      // Bottom ellipse arc
      ctx.beginPath();
      ctx.ellipse(cx, botCy, rx, ry, 0, 0, Math.PI);
      ctx.stroke();

      // Side vertical lines
      ctx.beginPath();
      ctx.moveTo(minX, topCy);
      ctx.lineTo(minX, botCy);
      ctx.moveTo(maxX, topCy);
      ctx.lineTo(maxX, botCy);
      ctx.stroke();
    } else if (stroke.tool === 'number-line') {
      const minX = Math.min(first.x, last.x);
      const maxX = Math.max(first.x, last.x);
      const cy = (first.y + last.y) / 2;

      ctx.beginPath();
      ctx.moveTo(minX, cy);
      ctx.lineTo(maxX, cy);

      // Arrows at both ends
      const arr = 10;
      ctx.moveTo(minX + arr, cy - 6);
      ctx.lineTo(minX, cy);
      ctx.lineTo(minX + arr, cy + 6);

      ctx.moveTo(maxX - arr, cy - 6);
      ctx.lineTo(maxX, cy);
      ctx.lineTo(maxX - arr, cy + 6);

      // Ticks (-3 to +3)
      const steps = 6;
      const stepW = Math.max(12, (maxX - minX - arr * 2) / steps);
      for (let i = 0; i <= steps; i++) {
        const tx = minX + arr + i * stepW;
        if (tx < maxX - arr + 2) {
          const tickH = i === steps / 2 ? 14 : 8;
          ctx.moveTo(tx, cy - tickH / 2);
          ctx.lineTo(tx, cy + tickH / 2);
        }
      }
      ctx.stroke();
    } else if (stroke.tool === 'trig-circle') {
      const rx = Math.abs(last.x - first.x) / 2;
      const ry = Math.abs(last.y - first.y) / 2;
      const cx = Math.min(first.x, last.x) + rx;
      const cy = Math.min(first.y, last.y) + ry;
      const r = Math.max(10, Math.min(rx, ry));

      // Circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (stroke.isFilled) ctx.fill();
      ctx.stroke();

      // Axes X and Y
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.25, cy);
      ctx.lineTo(cx + r * 1.25, cy);
      ctx.moveTo(cx, cy - r * 1.25);
      ctx.lineTo(cx, cy + r * 1.25);
      ctx.stroke();
    } else if (stroke.tool === 'callout') {
      const minX = Math.min(first.x, last.x);
      const minY = Math.min(first.y, last.y);
      const w = Math.abs(last.x - first.x);
      const h = Math.abs(last.y - first.y);
      const r = Math.min(16, w / 6, h / 6);
      const tailW = Math.min(24, w / 4);
      const tailH = Math.min(20, h / 4);

      ctx.beginPath();
      ctx.moveTo(minX + r, minY);
      ctx.lineTo(minX + w - r, minY);
      ctx.quadraticCurveTo(minX + w, minY, minX + w, minY + r);
      ctx.lineTo(minX + w, minY + h - r - tailH);
      ctx.quadraticCurveTo(minX + w, minY + h - tailH, minX + w - r, minY + h - tailH);
      ctx.lineTo(minX + w * 0.6 + tailW, minY + h - tailH);
      ctx.lineTo(minX + w * 0.6, minY + h);
      ctx.lineTo(minX + w * 0.6 - tailW / 2, minY + h - tailH);
      ctx.lineTo(minX + r, minY + h - tailH);
      ctx.quadraticCurveTo(minX, minY + h - tailH, minX, minY + h - r - tailH);
      ctx.lineTo(minX, minY + r);
      ctx.quadraticCurveTo(minX, minY, minX + r, minY);
      ctx.closePath();
      if (stroke.isFilled) ctx.fill();
      ctx.stroke();
    } else if (stroke.tool === 'math-axis') {
      const minX = Math.min(first.x, last.x);
      const maxX = Math.max(first.x, last.x);
      const minY = Math.min(first.y, last.y);
      const maxY = Math.max(first.y, last.y);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      ctx.beginPath();
      // X Axis & arrow
      ctx.moveTo(minX, cy);
      ctx.lineTo(maxX, cy);
      ctx.moveTo(maxX - 8, cy - 5);
      ctx.lineTo(maxX, cy);
      ctx.lineTo(maxX - 8, cy + 5);

      // Y Axis & arrow
      ctx.moveTo(cx, maxY);
      ctx.lineTo(cx, minY);
      ctx.moveTo(cx - 5, minY + 8);
      ctx.lineTo(cx, minY);
      ctx.lineTo(cx + 5, minY + 8);

      // Ticks
      const step = Math.min(30, (maxX - minX) / 8);
      if (step > 10) {
        for (let x = cx + step; x < maxX - 10; x += step) {
          ctx.moveTo(x, cy - 4);
          ctx.lineTo(x, cy + 4);
        }
        for (let x = cx - step; x > minX + 10; x -= step) {
          ctx.moveTo(x, cy - 4);
          ctx.lineTo(x, cy + 4);
        }
        for (let y = cy + step; y < maxY - 10; y += step) {
          ctx.moveTo(cx - 4, y);
          ctx.lineTo(cx + 4, y);
        }
        for (let y = cy - step; y > minY + 10; y -= step) {
          ctx.moveTo(cx - 4, y);
          ctx.lineTo(cx + 4, y);
        }
      }
      ctx.stroke();
    } else {
      // Freehand Pen / Highlighter with smooth bezier curves & stylus pressure
      if (pts.length === 1) {
        ctx.beginPath();
        const rad = Math.max(1, (stroke.width / 2) * (pts[0].pressure || 1));
        ctx.arc(pts[0].x, pts[0].y, rad, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  // Redraw Complete Canvas Scene in Continuous Vertical Sequence
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Apply Zoom & Pan Transform
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // High quality smoothing settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Viewport optical boundaries in document coordinates for performance culling
    const viewTop = -panOffset.y / zoom;
    const viewBottom = (-panOffset.y + height) / zoom;
    const cullingBuffer = 350;

    // Draw every page in continuous vertical sequence
    pageLayouts.forEach((layout) => {
      // Culling: Skip pages that are entirely outside the current viewport
      const isVisible = (layout.y + layout.height >= viewTop - cullingBuffer) && (layout.y <= viewBottom + cullingBuffer);
      if (!isVisible) return;

      const page = layout.page;
      const isDarkPage = page.backgroundType === 'chalkboard' || page.backgroundType === 'dark';
      const isCurrentActive = layout.index === activePageIndex;

      ctx.save();
      ctx.translate(layout.x, layout.y);

      // 1. Realistic Page Sheet Drop Shadow & Base Background
      ctx.save();
      if (isCurrentActive) {
        ctx.shadowColor = isDarkPage ? 'rgba(16, 185, 129, 0.55)' : 'rgba(16, 185, 129, 0.42)';
        ctx.shadowBlur = 38;
        ctx.shadowOffsetY = 12;
      } else {
        ctx.shadowColor = isDarkPage ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.22)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 10;
      }
      ctx.fillStyle = page.backgroundColor || (
        page.backgroundType === 'chalkboard' 
          ? '#1b4332' 
          : page.backgroundType === 'dark' 
            ? (themeConfig.defaultPageBgColor || '#0f172a') 
            : page.backgroundType === 'ruled'
              ? '#fdfbf7'
              : '#ffffff'
      );
      ctx.fillRect(0, 0, layout.width, layout.height);
      ctx.restore();

      // Page Border / Distinct Active Frame
      ctx.save();
      if (isCurrentActive) {
        ctx.strokeStyle = '#10b981'; // Vibrant emerald outline for the currently focused page
        ctx.lineWidth = 3 / zoom;
        ctx.strokeRect(-2, -2, layout.width + 4, layout.height + 4);

        // Elegant active page badge on top corner
        const badgeW = 126;
        const badgeH = 26;
        const badgeX = layout.width - badgeW - 16;
        const badgeY = -13;
        ctx.save();
        ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`الصفحة ${layout.index + 1} (النشطة)`, badgeX + badgeW / 2, badgeY + badgeH / 2);
        ctx.restore();
      } else {
        ctx.strokeStyle = isDarkPage ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, layout.width, layout.height);
      }
      ctx.restore();

      // 2. Draw Page Background Pattern Template
      drawBackgroundPattern(
        ctx, 
        layout.width, 
        layout.height, 
        page.backgroundType || themeConfig.defaultPageBgType || 'dark',
        page.showBackgroundTemplate !== false,
        page.backgroundTemplateOpacity ?? 1,
        page.backgroundColor
      );

      // 3. Draw Imported PDF background or Image background
      if (page.backgroundImage && page.showPdfBackground !== false) {
        let img = imageCacheRef.current.get(page.backgroundImage);
        if (!img) {
          img = new Image();
          img.src = page.backgroundImage;
          img.onload = () => redrawCanvas();
          imageCacheRef.current.set(page.backgroundImage, img);
        }

        if (img.complete && img.naturalWidth > 0) {
          ctx.save();
          if (page.pdfBackgroundOpacity !== undefined && page.pdfBackgroundOpacity < 1) {
            ctx.globalAlpha = Math.max(0, Math.min(1, page.pdfBackgroundOpacity));
          }
          ctx.drawImage(img, 0, 0, layout.width, layout.height);
          ctx.restore();
        }
      }

      // 4. Draw Imported Images (Educational diagrams & media layer)
      if (page.imageItems && page.showImageItems !== false) {
        ctx.save();
        if (page.imageItemsOpacity !== undefined && page.imageItemsOpacity < 1) {
          ctx.globalAlpha = Math.max(0, Math.min(1, page.imageItemsOpacity));
        }

        page.imageItems.forEach(imgItem => {
          let img = imageCacheRef.current.get(imgItem.src);
          if (!img) {
            img = new Image();
            img.src = imgItem.src;
            img.onload = () => redrawCanvas();
            imageCacheRef.current.set(imgItem.src, img);
          }

          if (img.complete) {
            ctx.drawImage(img, imgItem.x, imgItem.y, imgItem.width, imgItem.height);
            if (selectedItemId === imgItem.id) {
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 2 / zoom;
              ctx.strokeRect(imgItem.x - 2, imgItem.y - 2, imgItem.width + 4, imgItem.height + 4);
            }
          }
        });
        ctx.restore();
      }

      // 5. Draw All Saved Strokes on this Page (Annotation Layer)
      if (page.strokes && page.showAnnotations !== false) {
        if (page.annotationsOpacity !== undefined && page.annotationsOpacity < 1) {
          ctx.save();
          ctx.globalAlpha = page.annotationsOpacity;
          page.strokes.forEach(stroke => drawStrokePath(ctx, stroke));
          ctx.restore();
        } else {
          page.strokes.forEach(stroke => drawStrokePath(ctx, stroke));
        }
      }

      // 6. Official Academy Footer & Page Numbering (Fixed & Non-editable at bottom of every page)
      ctx.save();
      const sepY = layout.height - 40;
      const footerY = layout.height - 20;

      // Divider separator line
      ctx.strokeStyle = isDarkPage ? 'rgba(255, 255, 255, 0.14)' : 'rgba(30, 58, 138, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(36, sepY);
      ctx.lineTo(layout.width - 36, sepY);
      ctx.stroke();

      // Main Academy Footer: Center Aligned, Academic Blue / Dark Slate, with page numbers
      ctx.fillStyle = isDarkPage ? '#cbd5e1' : '#1e3a8a';
      ctx.font = 'bold 13px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      const footerText = `🎓 أكاديمية التفوق أون لاين   |   صفحة ${layout.index + 1} من ${project.pages.length}`;
      ctx.fillText(footerText, layout.width / 2, footerY);

      // Page Title on the Right Corner (if specified)
      if (page.title) {
        ctx.fillStyle = isDarkPage ? 'rgba(255, 255, 255, 0.45)' : 'rgba(71, 85, 105, 0.75)';
        ctx.font = '600 11px Cairo, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(page.title, layout.width - 36, footerY);
      }

      // Accreditation / Brand Tag on Left Corner
      ctx.fillStyle = isDarkPage ? 'rgba(255, 255, 255, 0.35)' : 'rgba(71, 85, 105, 0.6)';
      ctx.font = '600 10.5px Cairo, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('منصة إدراك التعليمية', 36, footerY);

      ctx.restore();

      ctx.restore(); // end page translation

      // 7. Divider connector line between pages with badge
      if (layout.index < pageLayouts.length - 1) {
        const dividerY = layout.y + layout.height + PAGE_GAP / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 1.5 / zoom;
        ctx.beginPath();
        ctx.moveTo(layout.x - 40, dividerY);
        ctx.lineTo(layout.x + layout.width + 40, dividerY);
        ctx.stroke();

        // Page connector indicator badge
        const nextLayout = pageLayouts[layout.index + 1];
        const pillW = 140;
        const pillH = 26;
        const pillX = layout.x + (layout.width - pillW) / 2;
        const pillY = dividerY - pillH / 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 13);
        ctx.fill();
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`الصفحة ${nextLayout.index + 1} ⬇`, pillX + pillW / 2, dividerY);
        ctx.restore();
      }
    });

    // 8. Bottom "Add Page" prompt at the end of the vertical sequence
    const lastLayout = pageLayouts[pageLayouts.length - 1];
    if (lastLayout) {
      const endY = lastLayout.y + lastLayout.height + 40;
      const addBoxW = Math.min(lastLayout.width, 680);
      const addBoxH = 74;
      const addBoxX = lastLayout.x + (lastLayout.width - addBoxW) / 2;

      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.roundRect(addBoxX, endY, addBoxW, addBoxH, 18);
      ctx.stroke();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fill();

      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 14px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('➕ نهاية المستند — انقر هنا لإضافة صفحة جديدة بالأسفل', addBoxX + addBoxW / 2, endY + addBoxH / 2);
      ctx.restore();
    }

    // 9. Draw Active Real-Time Stroke being drawn
    if (currentStrokeRef.current && activeDrawingPageLayoutRef.current) {
      ctx.save();
      ctx.translate(activeDrawingPageLayoutRef.current.x, activeDrawingPageLayoutRef.current.y);
      drawStrokePath(ctx, currentStrokeRef.current);
      ctx.restore();
    }

    // 10. Draw Laser Pointer (Luminous Glowing Beam & Auto-Fading Trail)
    const now = Date.now();
    laserPointsRef.current = laserPointsRef.current.filter(p => now - p.time < 1000);
    
    const hasLaserTrail = laserPointsRef.current.length > 1;
    const currentLaserPos = hoverLaserPosRef.current || (laserPointsRef.current.length > 0 ? laserPointsRef.current[laserPointsRef.current.length - 1] : null);

    if (hasLaserTrail || (activeTool === 'laser' && currentLaserPos)) {
      ctx.save();

      // Laser trail drawing
      if (laserPointsRef.current.length > 1) {
        for (let i = 1; i < laserPointsRef.current.length; i++) {
          const p1 = laserPointsRef.current[i - 1];
          const p2 = laserPointsRef.current[i];
          const age = now - p2.time;
          const progress = Math.max(0, 1 - age / 1000);
          const alpha = Math.pow(progress, 1.4);

          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.35})`;
          ctx.lineWidth = Math.max(2, (18 * progress) / zoom);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          ctx.strokeStyle = `rgba(255, 45, 85, ${alpha * 0.9})`;
          ctx.lineWidth = Math.max(1.5, (8 * progress) / zoom);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
          ctx.lineWidth = Math.max(1, (3 * progress) / zoom);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      if (currentLaserPos && activeTool === 'laser') {
        const pulse = (Math.sin(Date.now() / 90) + 1) / 2;
        const baseRadius = 7 / zoom;
        const outerHaloRadius = (16 + pulse * 4) / zoom;

        const radialGrad = ctx.createRadialGradient(
          currentLaserPos.x, currentLaserPos.y, 1 / zoom,
          currentLaserPos.x, currentLaserPos.y, outerHaloRadius
        );
        radialGrad.addColorStop(0, 'rgba(255, 45, 85, 0.95)');
        radialGrad.addColorStop(0.35, 'rgba(239, 68, 68, 0.45)');
        radialGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.fillStyle = radialGrad;
        ctx.beginPath();
        ctx.arc(currentLaserPos.x, currentLaserPos.y, outerHaloRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff2442';
        ctx.beginPath();
        ctx.arc(currentLaserPos.x, currentLaserPos.y, baseRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.45})`;
        ctx.lineWidth = 1.5 / zoom;
        ctx.beginPath();
        ctx.arc(currentLaserPos.x, currentLaserPos.y, baseRadius * 1.35, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(currentLaserPos.x, currentLaserPos.y, Math.max(2 / zoom, baseRadius * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }, [pageLayouts, activePageIndex, panOffset, zoom, selectedItemId, activeTool, safePages.length]);

  // Fit Page to Available Viewport Width (Fit Width)
  const fitToWidth = useCallback(() => {
    const container = canvasContainerRef.current || containerRef.current;
    if (!container || pageLayouts.length === 0) return;
    const containerWidth = container.clientWidth - 48;
    const calculatedZoom = Math.min(3.5, Math.max(0.25, Number((containerWidth / maxDocumentWidth).toFixed(2))));
    
    setZoom(calculatedZoom);
    const xOffset = Math.max(20, Math.floor((container.clientWidth - maxDocumentWidth * calculatedZoom) / 2));
    const curLayout = pageLayouts[activePageIndex] || pageLayouts[0];
    const yOffset = -curLayout.y * calculatedZoom + 32;
    setPanOffset({ x: xOffset, y: yOffset });
  }, [pageLayouts, activePageIndex, maxDocumentWidth]);

  // Fit Complete Page within Viewport (Fit Page)
  const fitToScreen = useCallback(() => {
    const container = canvasContainerRef.current || containerRef.current;
    if (!container || pageLayouts.length === 0) return;
    const curLayout = pageLayouts[activePageIndex] || pageLayouts[0];
    const containerWidth = container.clientWidth - 48;
    const containerHeight = container.clientHeight - 80;
    
    const scaleX = containerWidth / curLayout.width;
    const scaleY = containerHeight / curLayout.height;
    const calculatedZoom = Math.min(3.5, Math.max(0.25, Number(Math.min(scaleX, scaleY).toFixed(2))));
    
    setZoom(calculatedZoom);
    const xOffset = Math.max(20, Math.floor((container.clientWidth - curLayout.width * calculatedZoom) / 2));
    const yOffset = -curLayout.y * calculatedZoom + Math.max(20, Math.floor((containerHeight - curLayout.height * calculatedZoom) / 2));
    setPanOffset({ x: xOffset, y: yOffset });
  }, [pageLayouts, activePageIndex]);

  // Request redraw on state change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Laser Pointer Animation & Auto-Fade Loop (Smooth 60 FPS decay)
  useEffect(() => {
    let animId: number;
    const loop = () => {
      const now = Date.now();
      const hasDecayingPoints = laserPointsRef.current.some(p => now - p.time < 1000);

      if (hasDecayingPoints || (activeTool === 'laser' && hoverLaserPosRef.current)) {
        redrawCanvas();
        animId = requestAnimationFrame(loop);
      } else if (laserPointsRef.current.length > 0) {
        laserPointsRef.current = [];
        redrawCanvas();
      }
    };

    if (activeTool === 'laser' || laserPointsRef.current.length > 0) {
      animId = requestAnimationFrame(loop);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [activeTool, redrawCanvas]);

  // Pointer Event Coordinates Normalized to Canvas Space
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number; pressure: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Inverse zoom & pan
    const x = (clientX - panOffset.x) / zoom;
    const y = (clientY - panOffset.y) / zoom;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    return { x, y, pressure };
  };

  // Pointer Down (Mouse, Touch, Stylus Pen)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Capture pointer for flawless touch / stylus tracking on interactive boards
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if unsupported in older browsers
    }

    // Track stylus state for gesture and wheel isolation
    if (e.pointerType === 'pen') {
      isStylusActiveRef.current = true;
    }

    // Track pointer for multi-touch gestures and touch swipe
    activePointersRef.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
      time: Date.now(),
      pointerType: e.pointerType
    });

    // Multi-touch Gesture (Pinch Zoom & Two-Finger Swipe across pages on tablets/phones)
    if (activePointersRef.current.size >= 2) {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        currentStrokeRef.current = null;
        redrawCanvas();
      }
      isPanningRef.current = false;
      cancelSmoothScroll();
      stopWheelInertia();

      const pointers = Array.from(activePointersRef.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      const initialDist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      const initialMid = { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };

      twoFingerGestureRef.current = {
        initialDist: Math.max(10, initialDist),
        initialZoom: zoomRef.current,
        initialMid,
        initialPan: { ...panOffsetRef.current },
        lastMidY: initialMid.y,
        lastTime: Date.now(),
        velocityY: 0
      };
      return;
    }

    // Pan mode: explicit pan tool, middle click, pan touch mode, or study mode
    const isPanMode = e.button === 1 || activeTool === 'pan' || (e.buttons === 4) || touchInteractionMode === 'pan' || isStudyMode;
    if (isPanMode) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      singleTouchSwipeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        lastY: e.clientY,
        lastTime: Date.now(),
        velocityY: 0
      };
      cancelSmoothScroll();
      stopWheelInertia();
      return;
    }

    // Record touch tracking for swipe detection
    if (e.pointerType === 'touch') {
      singleTouchSwipeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        lastY: e.clientY,
        lastTime: Date.now(),
        velocityY: 0
      };
    }

    // Palm Rejection: If user is drawing with a stylus (pen), ignore finger touches
    if (e.pointerType === 'touch' && activeTool === 'pen' && e.isPrimary === false) {
      return;
    }

    const { x, y, pressure } = getCanvasCoords(e);

    // Check click on the bottom "Add Page" prompt
    const lastLayout = pageLayouts[pageLayouts.length - 1];
    if (lastLayout) {
      const endY = lastLayout.y + lastLayout.height + 40;
      const addBoxW = Math.min(lastLayout.width, 680);
      const addBoxH = 74;
      const addBoxX = lastLayout.x + (lastLayout.width - addBoxW) / 2;
      if (x >= addBoxX && x <= addBoxX + addBoxW && y >= endY && y <= endY + addBoxH) {
        handleAddPage();
        return;
      }
    }

    if (activeTool === 'laser') {
      isDrawingRef.current = true;
      hoverLaserPosRef.current = { x, y };
      laserPointsRef.current.push({ x, y, time: Date.now() });
      redrawCanvas();
      return;
    }

    // Determine target page layout in vertical sequence
    let targetLayout = pageLayouts.find(l => 
      x >= l.x && x <= l.x + l.width &&
      y >= l.y && y <= l.y + l.height + PAGE_GAP
    );
    if (!targetLayout) {
      let minD = Infinity;
      targetLayout = pageLayouts[0];
      for (const l of pageLayouts) {
        const d = Math.abs(y - (l.y + l.height / 2));
        if (d < minD) {
          minD = d;
          targetLayout = l;
        }
      }
    }

    activeDrawingPageLayoutRef.current = targetLayout;
    setActivePageIndex(targetLayout.index);
    const localX = x - targetLayout.x;
    const localY = y - targetLayout.y;

    // Interactive Stroke Eraser across all pages
    if (activeTool === 'eraser' || activeTool === 'pixel-eraser') {
      isDrawingRef.current = true;
      const eraserRadius = Math.max(18, currentWidth * 2.5);
      let changed = false;
      const updatedPages = [...project.pages];

      pageLayouts.forEach(layout => {
        if (y >= layout.y - eraserRadius && y <= layout.y + layout.height + eraserRadius) {
          const lX = x - layout.x;
          const lY = y - layout.y;
          const p = updatedPages[layout.index];
          const remaining = (p.strokes || []).filter(stroke => {
            return !stroke.points.some(pt => Math.hypot(pt.x - lX, pt.y - lY) <= eraserRadius);
          });
          if (remaining.length !== (p.strokes || []).length) {
            updatedPages[layout.index] = { ...p, strokes: remaining };
            changed = true;
          }
        }
      });

      if (changed) {
        setProject(prev => ({ ...prev, pages: updatedPages }));
        redrawCanvas();
      }
      return;
    }

    if (activeTool === 'select') {
      for (const layout of pageLayouts) {
        const lX = x - layout.x;
        const lY = y - layout.y;
        const clickedText = layout.page.textItems?.find(t => 
          lX >= t.x && lX <= t.x + t.width && lY >= t.y && lY <= t.y + t.height
        );
        if (clickedText) {
          setActivePageIndex(layout.index);
          setSelectedItemId(clickedText.id);
          setSelectedItemType('text');
          isDraggingItemRef.current = true;
          dragItemDataRef.current = {
            id: clickedText.id,
            initialX: clickedText.x,
            initialY: clickedText.y,
            startMouseX: x,
            startMouseY: y,
            pageIndex: layout.index,
            itemType: 'text'
          };
          return;
        }

        const clickedImg = layout.page.imageItems?.find(img => 
          lX >= img.x && lX <= img.x + img.width && lY >= img.y && lY <= img.y + img.height
        );
        if (clickedImg) {
          setActivePageIndex(layout.index);
          setSelectedItemId(clickedImg.id);
          setSelectedItemType('image');
          isDraggingItemRef.current = true;
          dragItemDataRef.current = {
            id: clickedImg.id,
            initialX: clickedImg.x,
            initialY: clickedImg.y,
            startMouseX: x,
            startMouseY: y,
            pageIndex: layout.index,
            itemType: 'image'
          };
          return;
        }
      }

      setSelectedItemId(null);
      setSelectedItemType(null);
      return;
    }

    if (activeTool === 'text' || activeTool === 'sticky') {
      const newItem: TextItem = {
        id: `text_${Date.now()}`,
        x: localX,
        y: localY,
        width: activeTool === 'sticky' ? 180 : 220,
        height: activeTool === 'sticky' ? 140 : 60,
        text: activeTool === 'sticky' ? 'ملاحظة مهمة 📌\n' : 'أدخل نص الشرح هنا...',
        fontSize: 16,
        fontFamily: 'Cairo, sans-serif',
        color: activeTool === 'sticky' ? '#1E293B' : currentColor,
        bgColor: activeTool === 'sticky' ? '#FEF08A' : 'transparent',
        isSticky: activeTool === 'sticky'
      };

      setProject(prev => {
        const pages = [...prev.pages];
        pages[targetLayout.index] = {
          ...pages[targetLayout.index],
          textItems: [...(pages[targetLayout.index].textItems || []), newItem]
        };
        return { ...prev, pages };
      });

      setSelectedItemId(newItem.id);
      setSelectedItemType('text');
      setEditingTextItem(newItem);
      saveSnapshotToHistory();
      setActiveTool('select');
      return;
    }

    // Stroke Drawing initialization with local page coordinates
    isDrawingRef.current = true;
    currentStrokeRef.current = {
      id: `stroke_${Date.now()}`,
      tool: activeTool as any,
      points: [{ x: localX, y: localY, pressure, time: Date.now() }],
      color: currentColor,
      width: activeTool === 'highlighter' ? currentWidth * 3 : currentWidth,
      opacity: activeTool === 'highlighter' ? 0.38 : 1.0,
      isFilled: isShapeFilled,
      fillColor: currentColor + '33',
      dashStyle: shapeDashStyle
    };

    redrawCanvas();
  };

  // Pointer Move (Drawing, Smoothing, Laser, Eraser, Multi-touch Pinch & Touch Swipe)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Update pointer tracking
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
        time: Date.now(),
        pointerType: e.pointerType
      });
    }

    // Multi-touch Gesture (Smooth Two-Finger Page Panning & Navigation; Zooming Disabled)
    if (twoFingerGestureRef.current) {
      const pointers = Array.from(activePointersRef.current.values());
      if (pointers.length >= 2) {
        const p1 = pointers[0];
        const p2 = pointers[1];
        const currMid = { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };
        const gesture = twoFingerGestureRef.current;

        // Keep zoom scale locked without resizing/distorting the presentation
        const fixedZoom = gesture.initialZoom;

        const dx = currMid.x - gesture.initialMid.x;
        const dy = currMid.y - gesture.initialMid.y;

        const nextPanX = gesture.initialPan.x + dx;
        const nextPanY = gesture.initialPan.y + dy;

        const dt = Date.now() - gesture.lastTime;
        if (dt > 8) {
          gesture.velocityY = (currMid.y - gesture.lastMidY) / dt;
          gesture.lastMidY = currMid.y;
          gesture.lastTime = Date.now();
        }

        const container = canvasContainerRef.current;
        const containerH = container?.clientHeight || 800;
        const docH = totalDocHeightRef.current || 1600;
        const maxTop = 48;
        const minTop = Math.min(maxTop - 60, -(docH * fixedZoom - containerH + 160));

        setPanOffset({
          x: nextPanX,
          y: Math.min(maxTop, Math.max(minTop, nextPanY))
        });
        return;
      }
    }

    if (isPanningRef.current) {
      const rawX = e.clientX - panStartRef.current.x;
      const rawY = e.clientY - panStartRef.current.y;

      if (singleTouchSwipeRef.current) {
        const dt = Date.now() - singleTouchSwipeRef.current.lastTime;
        if (dt > 8) {
          singleTouchSwipeRef.current.velocityY = (e.clientY - singleTouchSwipeRef.current.lastY) / dt;
          singleTouchSwipeRef.current.lastY = e.clientY;
          singleTouchSwipeRef.current.lastTime = Date.now();
        }
      }

      const container = canvasContainerRef.current;
      const containerH = container?.clientHeight || 800;
      const currentZ = zoomRef.current || 1;
      const docH = totalDocHeightRef.current || 1600;
      const maxTop = 48;
      const minTop = Math.min(maxTop - 60, -(docH * currentZ - containerH + 160));

      setPanOffset({
        x: rawX,
        y: Math.min(maxTop, Math.max(minTop, rawY))
      });
      return;
    }

    const { x, y, pressure } = getCanvasCoords(e);

    // Dragging selected item on canvas (Image or Text)
    if (isDraggingItemRef.current && dragItemDataRef.current) {
      const { id, initialX, initialY, startMouseX, startMouseY, pageIndex, itemType } = dragItemDataRef.current;
      const dx = x - startMouseX;
      const dy = y - startMouseY;

      setProject(prev => {
        const pages = [...prev.pages];
        const page = pages[pageIndex];
        if (!page) return prev;

        if (itemType === 'image') {
          const imageItems = (page.imageItems || []).map(img => {
            if (img.id === id) {
              return { ...img, x: Math.max(0, Math.round(initialX + dx)), y: Math.max(0, Math.round(initialY + dy)) };
            }
            return img;
          });
          pages[pageIndex] = { ...page, imageItems };
        } else if (itemType === 'text') {
          const textItems = (page.textItems || []).map(txt => {
            if (txt.id === id) {
              return { ...txt, x: Math.max(0, Math.round(initialX + dx)), y: Math.max(0, Math.round(initialY + dy)) };
            }
            return txt;
          });
          pages[pageIndex] = { ...page, textItems };
        }

        return { ...prev, pages };
      });
      redrawCanvas();
      return;
    }

    // Dynamic Laser Pointer (Live hover pointing & glowing trail on press)
    if (activeTool === 'laser') {
      hoverLaserPosRef.current = { x, y };
      if (isDrawingRef.current) {
        laserPointsRef.current.push({ x, y, time: Date.now() });
      }
      redrawCanvas();
      return;
    }

    if (!isDrawingRef.current) return;

    // Active Eraser Path Deletion across any intersecting pages
    if ((activeTool === 'eraser' || activeTool === 'pixel-eraser')) {
      const eraserRadius = Math.max(18, currentWidth * 2.5);
      let changed = false;
      const updatedPages = [...project.pages];

      pageLayouts.forEach(layout => {
        if (y >= layout.y - eraserRadius && y <= layout.y + layout.height + eraserRadius) {
          const lX = x - layout.x;
          const lY = y - layout.y;
          const p = updatedPages[layout.index];
          const remaining = (p.strokes || []).filter(stroke => {
            return !stroke.points.some(pt => Math.hypot(pt.x - lX, pt.y - lY) <= eraserRadius);
          });
          if (remaining.length !== (p.strokes || []).length) {
            updatedPages[layout.index] = { ...p, strokes: remaining };
            changed = true;
          }
        }
      });

      if (changed) {
        setProject(prev => ({ ...prev, pages: updatedPages }));
        redrawCanvas();
      }
      return;
    }

    if (currentStrokeRef.current && activeDrawingPageLayoutRef.current) {
      const activeLayout = activeDrawingPageLayoutRef.current;
      const localX = x - activeLayout.x;
      const localY = y - activeLayout.y;
      const pts = currentStrokeRef.current.points;
      const lastPt = pts[pts.length - 1];

      // If geometric shape tool, replace the end point
      const isGeometricShape = [
        'line', 'arrow', 'double-arrow', 
        'rect', 'rounded-rect', 'circle', 'ellipse', 
        'triangle', 'right-triangle', 'diamond', 'pentagon', 'hexagon', 'star', 
        'cube-3d', 'cylinder-3d', 'math-axis', 'number-line', 'trig-circle', 'callout'
      ].includes(activeTool);

      if (isGeometricShape) {
        let finalX = localX;
        let finalY = localY;
        // Shift key snap to horizontal/vertical
        if (e.shiftKey && pts.length > 0) {
          const dx = Math.abs(localX - pts[0].x);
          const dy = Math.abs(localY - pts[0].y);
          if (dx > dy) finalY = pts[0].y;
          else finalX = pts[0].x;
        }
        currentStrokeRef.current.points = [pts[0], { x: finalX, y: finalY, pressure }];
      } else {
        // Freehand Pen / Highlighter distance filter for performance
        if (!lastPt || Math.hypot(localX - lastPt.x, localY - lastPt.y) > 2) {
          currentStrokeRef.current.points.push({ x: localX, y: localY, pressure, time: Date.now() });
        }
      }

      redrawCanvas();
    }
  };

  // Pointer Up (Commit Stroke, Touch Swipe Release & Kinetic Glide)
  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    if (e?.pointerType === 'pen') {
      isStylusActiveRef.current = false;
    }
    if (e && activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.delete(e.pointerId);
    } else if (!e) {
      activePointersRef.current.clear();
    }
    if (activePointersRef.current.size === 0) {
      isStylusActiveRef.current = false;
    }

    if (isDraggingItemRef.current) {
      isDraggingItemRef.current = false;
      dragItemDataRef.current = null;
      saveSnapshotToHistory();
    }

    // Complete Two-Finger Swipe Gesture
    if (twoFingerGestureRef.current && activePointersRef.current.size < 2) {
      const vy = twoFingerGestureRef.current.velocityY;
      twoFingerGestureRef.current = null;

      if (vy < -0.38 && activePageIndex < pageLayouts.length - 1) {
        smoothScrollToPage(activePageIndex + 1);
        return;
      } else if (vy > 0.38 && activePageIndex > 0) {
        smoothScrollToPage(activePageIndex - 1);
        return;
      } else if (Math.abs(vy) > 0.12) {
        startKineticGlide(vy * 14);
        return;
      }
    }

    // Complete Single-Finger Touch Pan / Swipe
    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (singleTouchSwipeRef.current) {
        const { startY, startTime, velocityY } = singleTouchSwipeRef.current;
        const currentClientY = e ? e.clientY : singleTouchSwipeRef.current.lastY;
        const deltaY = currentClientY - startY;
        const duration = Date.now() - startTime;
        singleTouchSwipeRef.current = null;

        // Smooth Page Transition on Swipe
        if ((velocityY < -0.38 || (deltaY < -80 && duration < 320)) && activePageIndex < pageLayouts.length - 1) {
          smoothScrollToPage(activePageIndex + 1);
          return;
        } else if ((velocityY > 0.38 || (deltaY > 80 && duration < 320)) && activePageIndex > 0) {
          smoothScrollToPage(activePageIndex - 1);
          return;
        } else if (Math.abs(velocityY) > 0.12) {
          startKineticGlide(velocityY * 14);
          return;
        }
      }
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (activeTool === 'laser') {
      redrawCanvas();
      return;
    }

    // Save history snapshot if eraser deleted strokes
    if (activeTool === 'eraser' || activeTool === 'pixel-eraser') {
      saveSnapshotToHistory();
      redrawCanvas();
      return;
    }

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      const rawStroke = { ...currentStrokeRef.current };
      currentStrokeRef.current = null;
      const targetIdx = activeDrawingPageLayoutRef.current ? activeDrawingPageLayoutRef.current.index : activePageIndex;
      const targetPage = project.pages[targetIdx] || project.pages[0];
      const currentStrokes = targetPage.strokes || [];

      // Smart Hand-Drawn Geometric Shape Recognition
      if (isShapeRecognitionEnabled && (rawStroke.tool === 'pen' || rawStroke.tool === 'highlighter')) {
        const recognized = recognizeDrawnShape(rawStroke);
        if (recognized) {
          const recognizedStroke: DrawStroke = {
            ...rawStroke,
            tool: recognized.tool,
            points: recognized.points,
            isRecognizedShape: true,
            recognizedLabel: recognized.labelAr,
            rawPoints: rawStroke.points,
            rawTool: rawStroke.tool
          };

          const rawStrokesList = [...currentStrokes, rawStroke];
          const recognizedStrokesList = [...currentStrokes, recognizedStroke];

          setProject(prev => {
            const pages = [...prev.pages];
            pages[targetIdx] = {
              ...pages[targetIdx],
              strokes: recognizedStrokesList
            };
            return { ...prev, pages };
          });

          setActivePageIndex(targetIdx);

          setHistoryStack(prev => {
            const base = prev.length === 0 
              ? [{ strokes: JSON.parse(JSON.stringify(currentStrokes)), textItems: targetPage.textItems || [], imageItems: targetPage.imageItems || [] }] 
              : prev.slice(0, historyIndex + 1);

            const rawSnapshot = {
              strokes: JSON.parse(JSON.stringify(rawStrokesList)),
              textItems: JSON.parse(JSON.stringify(targetPage.textItems || [])),
              imageItems: JSON.parse(JSON.stringify(targetPage.imageItems || []))
            };

            const recognizedSnapshot = {
              strokes: JSON.parse(JSON.stringify(recognizedStrokesList)),
              textItems: JSON.parse(JSON.stringify(targetPage.textItems || [])),
              imageItems: JSON.parse(JSON.stringify(targetPage.imageItems || []))
            };

            return [...base, rawSnapshot, recognizedSnapshot];
          });
          setHistoryIndex(prev => prev + 2);

          setShapeRecognitionFeedback({
            text: recognized.labelAr,
            confidence: recognized.confidence,
            timestamp: Date.now()
          });

          redrawCanvas();
          return;
        }
      }

      // Standard stroke commit
      const updatedStrokes = [...currentStrokes, rawStroke];
      setProject(prev => {
        const pages = [...prev.pages];
        pages[targetIdx] = {
          ...pages[targetIdx],
          strokes: updatedStrokes
        };
        return { ...prev, pages };
      });

      setActivePageIndex(targetIdx);
      saveSnapshotToHistory({ strokes: updatedStrokes });
    }

    redrawCanvas();
  };

  // Pointer Leave Viewport
  const handlePointerLeave = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e?.pointerType === 'pen') {
      isStylusActiveRef.current = false;
    }
    if (e && activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.delete(e.pointerId);
    }
    if (activePointersRef.current.size === 0) {
      isStylusActiveRef.current = false;
      twoFingerGestureRef.current = null;
      singleTouchSwipeRef.current = null;
    }
    if (isPanningRef.current) {
      handlePointerUp(e);
    }
    if (activeTool === 'laser') {
      hoverLaserPosRef.current = null;
      isDrawingRef.current = false;
      redrawCanvas();
    }
  };

  // Keyboard Shortcuts (Undo, Redo, Zoom, Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || !e.key) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      const k = (e.key || '').toLowerCase();

      if ((e.ctrlKey || e.metaKey) && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && k === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && k === 'p') {
        e.preventDefault();
        handlePrintBoard();
      } else if ((e.ctrlKey || e.metaKey) && k === 's') {
        e.preventDefault();
        persistProject(project, false);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemId) {
          handleDeleteItem(selectedItemId);
        }
      } else if (k === 'p') {
        setActiveTool('pen');
      } else if (k === 'l') {
        setActiveTool('laser');
      } else if (k === 'e') {
        setActiveTool('eraser');
      } else if (k === 'h') {
        setActiveTool('pan');
      } else if (k === 'v') {
        setActiveTool('select');
      } else if (k === 'm') {
        setActiveTool('highlighter');
      } else if (k === 't') {
        setActiveTool('text');
      } else if ((e.ctrlKey || e.metaKey) && k === 'i') {
        e.preventDefault();
        setIsImportModalOpen(true);
      } else if (k === 'i' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsImportModalOpen(true);
      } else if (k === 'w') {
        fitToWidth();
      } else if (k === 'f') {
        fitToScreen();
      } else if (k === 's') {
        setIsStudyMode(prev => !prev);
      } else if (e.key === 'Escape') {
        if (isStudyMode) setIsStudyMode(false);
      } else if (e.altKey && k === 'a') {
        e.preventDefault();
        handleToggleAnnotations();
      } else if (e.altKey && k === 'b') {
        e.preventDefault();
        handleToggleBackgroundTemplate();
      } else if (e.altKey && k === 'p') {
        e.preventDefault();
        handleTogglePdfBackground();
      } else if (e.key === '=' || e.key === '+') {
        setZoom(prev => Math.min(4.0, Number((prev + 0.15).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        setZoom(prev => Math.max(0.25, Number((prev - 0.15).toFixed(2))));
      } else if (e.key === '0') {
        fitToScreen();
      } else if (e.key === 'PageUp' || (e.altKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        smoothScrollToPage(Math.max(0, activePageIndexRef.current - 1), 300);
      } else if (e.key === 'PageDown' || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        smoothScrollToPage(Math.min(project.pages.length - 1, activePageIndexRef.current + 1), 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyStack, selectedItemId, isStudyMode, fitToWidth, fitToScreen, project.pages.length]);

  // Undo / Redo Logic
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetSnapshot = historyStack[historyIndex - 1];
      if (targetSnapshot) {
        setProject(prev => {
          const pages = [...prev.pages];
          pages[activePageIndex] = {
            ...pages[activePageIndex],
            strokes: targetSnapshot.strokes,
            textItems: targetSnapshot.textItems,
            imageItems: targetSnapshot.imageItems
          };
          return { ...prev, pages };
        });
        setHistoryIndex(prev => prev - 1);
        redrawCanvas();
      }
    } else if (currentPage?.strokes?.length > 0) {
      // Pop last stroke if stack is fresh
      setProject(prev => {
        const pages = [...prev.pages];
        pages[activePageIndex] = {
          ...pages[activePageIndex],
          strokes: pages[activePageIndex].strokes.slice(0, -1)
        };
        return { ...prev, pages };
      });
      redrawCanvas();
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const targetSnapshot = historyStack[historyIndex + 1];
      if (targetSnapshot) {
        setProject(prev => {
          const pages = [...prev.pages];
          pages[activePageIndex] = {
            ...pages[activePageIndex],
            strokes: targetSnapshot.strokes,
            textItems: targetSnapshot.textItems,
            imageItems: targetSnapshot.imageItems
          };
          return { ...prev, pages };
        });
        setHistoryIndex(prev => prev + 1);
        redrawCanvas();
      }
    }
  };

  // Clear Current Page
  const handleClearPage = () => {
    if (!confirm('هل تريد مسح جميع الرسومات والنصوص في هذه الصفحة؟')) return;
    setProject(prev => {
      const pages = [...prev.pages];
      pages[activePageIndex] = {
        ...pages[activePageIndex],
        strokes: [],
        textItems: [],
        imageItems: []
      };
      return { ...prev, pages };
    });
    saveSnapshotToHistory();
    redrawCanvas();
  };

  // Delete Selected Item
  const handleDeleteItem = (id: string) => {
    setProject(prev => {
      const pages = prev.pages.map(page => ({
        ...page,
        textItems: page.textItems?.filter(t => t.id !== id),
        imageItems: page.imageItems?.filter(img => img.id !== id),
        strokes: page.strokes?.filter(s => s.id !== id),
        stemItems: page.stemItems?.filter(si => si.id !== id)
      }));
      return { ...prev, pages };
    });
    setSelectedItemId(null);
    setSelectedStemId(null);
    setSelectedItemType(null);
    saveSnapshotToHistory();
  };

  // Multi-Page PDF Import & Selection Trigger
  const processPdfFile = async (file: File) => {
    try {
      setIsPdfLoading(true);
      setPdfProgressText('جاري قراءة صفحات وفهرس ملف PDF...');

      const meta = await loadPdfMetadataAndThumbnails(file);
      if (meta.numPages === 0) {
        alert('لم يتم العثور على صفحات قابلة للقراءة في هذا الملف.');
        return;
      }

      setPdfDocInfo(meta);
      setIsPdfSelectorOpen(true);
    } catch (err) {
      console.error('PDF Import metadata error:', err);
      alert('حدث خطأ أثناء قراءة ملف PDF، يرجى التأكد من صحة الملف وإعادة المحاولة.');
    } finally {
      setIsPdfLoading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processPdfFile(file);
  };

  // Quick Direct PDF Import: Automatically loads all PDF pages and splits them into drawable canvas pages
  const handleQuickPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsPdfLoading(true);
      setPdfProgressText('جاري فحص وقراءة ملف PDF...');

      const metadata = await loadPdfMetadataAndThumbnails(file);
      if (!metadata || metadata.numPages === 0) {
        alert('لم يتم العثور على صفحات في ملف PDF المحدد.');
        return;
      }

      const totalPages = metadata.numPages;
      setPdfProgressText(`جاري استخراج وتحويل ${totalPages} صفحة للوح الذكي... (0/${totalPages})`);

      const allPageNums = Array.from({ length: totalPages }, (_, i) => i + 1);
      const renderedPages = await loadSelectedPdfPages(
        metadata.pdfDoc,
        allPageNums,
        (completed, total) => {
          setPdfProgressText(`جاري تحويل صفحات PDF للرسم... (${completed}/${total})`);
        },
        2.0
      );

      if (!renderedPages || renderedPages.length === 0) {
        alert('تعذر استخراج صفحات الملف.');
        return;
      }

      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
      const newPages: WhiteboardPage[] = renderedPages.map((p) => ({
        id: `quick_pdf_${timestamp}_${p.pageNumber}`,
        title: `${cleanFileName} - صفحة ${p.pageNumber}`,
        backgroundType: 'pdf',
        backgroundColor: '#ffffff',
        backgroundImage: p.dataUrl,
        pdfPageNumber: p.pageNumber,
        isDualSpread: false,
        strokes: [],
        textItems: [],
        imageItems: [],
        createdAt: new Date().toISOString()
      }));

      const targetIndex = project.pages.length;
      const isFirstPageBlank = project.pages.length === 1 && 
        (!project.pages[0].strokes || project.pages[0].strokes.length === 0) &&
        (!project.pages[0].textItems || project.pages[0].textItems.length === 0) &&
        (!project.pages[0].imageItems || project.pages[0].imageItems.length === 0) &&
        !project.pages[0].backgroundImage;

      const updatedPages = isFirstPageBlank ? newPages : [...project.pages, ...newPages];
      const newActiveIndex = isFirstPageBlank ? 0 : targetIndex;

      const updatedProject: WhiteboardProject = {
        ...project,
        title: project.title.startsWith('سبورة') || project.title.startsWith('مشروع') ? cleanFileName : project.title,
        pages: updatedPages,
        activePageIndex: newActiveIndex,
        updatedAt: new Date().toISOString()
      };

      setProject(updatedProject);
      persistProject(updatedProject);
      setActivePageIndex(newActiveIndex);
      setCurrentScreen('canvas');
      setSaveNotice(`⚡ تم استيراد PDF سريعاً وتقسيمه إلى ${renderedPages.length} صفحة قابلة للرسم بنجاح!`);
      setTimeout(() => setSaveNotice(''), 4500);

      setTimeout(() => {
        fitToWidth();
      }, 150);
    } catch (err) {
      console.error('Quick PDF import failed:', err);
      alert('حدث خطأ أثناء الاستيراد السريع لملف PDF، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsPdfLoading(false);
      if (quickPdfInputRef.current) quickPdfInputRef.current.value = '';
    }
  };

  // Confirm PDF Import with selected pages & layout mode
  const handleConfirmPdfImport = async ({
    selectedPages,
    layoutMode,
    scratchpadStyle,
    verticalChunkSize = 'all',
    hasVerticalScratchpad = false
  }: {
    selectedPages: number[];
    layoutMode: PdfImportLayoutMode;
    scratchpadStyle: ScratchpadStyle;
    verticalChunkSize?: 'all' | 2 | 3 | 4;
    hasVerticalScratchpad?: boolean;
  }) => {
    if (!pdfDocInfo || selectedPages.length === 0) return;

    try {
      setIsPdfLoading(true);
      setPdfProgressText(`جاري استرداد وبناء ${selectedPages.length} صفحة بدقة فائقة...`);

      // 1. Render requested high-res pages from PDF
      const renderedPages = await loadSelectedPdfPages(pdfDocInfo.pdfDoc, selectedPages);
      if (renderedPages.length === 0) return;

      const newPages: WhiteboardPage[] = [];
      const timestamp = Date.now();

      if (layoutMode === 'vertical_stack') {
        // Group pages vertically under each other
        const chunkSize = verticalChunkSize === 'all' 
          ? renderedPages.length 
          : (typeof verticalChunkSize === 'number' ? verticalChunkSize : renderedPages.length);

        for (let i = 0; i < renderedPages.length; i += chunkSize) {
          const chunk = renderedPages.slice(i, i + chunkSize);
          const spreadDataUrl = await createVerticalStackedPagesSpread(chunk, {
            spreadWidth: 1600,
            hasScratchpadSideLane: hasVerticalScratchpad !== false,
            scratchpadBg: scratchpadStyle,
            margin: 32,
            pageGap: 52,
            showPageHeaders: true,
            canvasBgColor: '#0f172a'
          });

          const chunkPageNums = chunk.map(p => p.pageNumber);
          const title = chunk.length > 1
            ? `صفحات متتابعة (PDF يسار + بيضاء يمين) (صـ ${chunkPageNums[0]} إلى ${chunkPageNums[chunkPageNums.length - 1]})`
            : `صفحة ${chunkPageNums[0]} (PDF يسار + بيضاء يمين)`;

          newPages.push({
            id: `v_stack_${timestamp}_${i}`,
            title,
            backgroundType: 'pdf',
            backgroundColor: '#0f172a',
            backgroundImage: spreadDataUrl,
            pdfPageNumbers: chunkPageNums,
            pdfPageNumber: chunkPageNums[0],
            isVerticalStack: true,
            dualSpreadType: 'vertical_stack',
            strokes: [],
            textItems: [],
            imageItems: [],
            createdAt: new Date().toISOString()
          });
        }
      } else if (layoutMode === 'dual_spread') {
        // Pair adjacent pages: [1, 2], [3, 4], etc.
        for (let i = 0; i < renderedPages.length; i += 2) {
          const pageA = renderedPages[i];
          const pageB = renderedPages[i + 1] || null;

          const spreadDataUrl = await createDualPageSpread(pageA, pageB, {
            scratchpadBg: scratchpadStyle,
            rightLabel: `الصفحة ${pageA.pageNumber}`,
            leftLabel: pageB ? `الصفحة ${pageB.pageNumber}` : 'مسودة حل الشرح'
          });

          const pageNumbers = [pageA.pageNumber];
          if (pageB) pageNumbers.push(pageB.pageNumber);

          const title = pageB 
            ? `كتاب مفتوح (صـ ${pageA.pageNumber} - ${pageB.pageNumber})`
            : `كتاب مفتوح (صـ ${pageA.pageNumber} + مسودة)`;

          newPages.push({
            id: `spread_${timestamp}_${i}`,
            title,
            backgroundType: 'pdf',
            backgroundColor: '#ffffff',
            backgroundImage: spreadDataUrl,
            pdfPageNumbers: pageNumbers,
            pdfPageNumber: pageA.pageNumber,
            isDualSpread: true,
            dualSpreadType: 'dual_pdf',
            strokes: [],
            textItems: [],
            imageItems: [],
            createdAt: new Date().toISOString()
          });
        }
      } else if (layoutMode === 'pdf_plus_scratchpad') {
        // Every single page is paired with Whiteboard on the RIGHT and PDF on the LEFT
        for (let i = 0; i < renderedPages.length; i++) {
          const page = renderedPages[i];
          const spreadDataUrl = await createDualPageSpread(null, page, {
            scratchpadBg: scratchpadStyle,
            rightLabel: 'اللوح الأبيض للشرح وحل المسائل',
            leftLabel: `صفحة المستند (${page.pageNumber})`
          });

          newPages.push({
            id: `pdf_scratch_${timestamp}_${page.pageNumber}`,
            title: `صفحة ${page.pageNumber} (PDF يسار + بيضاء يمين)`,
            backgroundType: 'pdf',
            backgroundColor: '#ffffff',
            backgroundImage: spreadDataUrl,
            pdfPageNumber: page.pageNumber,
            isDualSpread: true,
            dualSpreadType: 'pdf_and_scratchpad',
            strokes: [],
            textItems: [],
            imageItems: [],
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // Standard single pages
        renderedPages.forEach((p) => {
          newPages.push({
            id: `pdf_page_${timestamp}_${p.pageNumber}`,
            title: `ملف PDF - صفحة ${p.pageNumber}`,
            backgroundType: 'pdf',
            backgroundColor: '#ffffff',
            backgroundImage: p.dataUrl,
            pdfPageNumber: p.pageNumber,
            isDualSpread: false,
            strokes: [],
            textItems: [],
            imageItems: [],
            createdAt: new Date().toISOString()
          });
        });
      }

      // Add to project pages
      const targetIndex = project.pages.length;
      setProject(prev => ({
        ...prev,
        title: pdfDocInfo.title || prev.title,
        pages: [...prev.pages, ...newPages],
        activePageIndex: targetIndex
      }));

      setActivePageIndex(targetIndex);
      setCurrentScreen('canvas');
      setIsDualViewMode(layoutMode === 'dual_spread' || layoutMode === 'pdf_plus_scratchpad');
      setSaveNotice(`🎉 تم استرداد وتنسيق ${selectedPages.length} صفحة بنجاح بدقة فائقة!`);
      setTimeout(() => setSaveNotice(''), 4000);
      
      // Auto fit page to width for instant optimal high-res viewing
      setTimeout(() => {
        fitToWidth();
      }, 150);
    } catch (err) {
      console.error('Failed to confirm and build PDF pages:', err);
      alert('حدث خطأ أثناء معالجة الصفحات المختارة، يرجى المحاولة ثانية.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  // Image Upload and Processing
  const processImageFile = (file: File, insertAsBackground: boolean = false) => {
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      if (!src) return;

      if (insertAsBackground) {
        setProject(prev => {
          const pages = [...prev.pages];
          const targetPage = pages[activePageIndex];
          if (!targetPage) return prev;
          pages[activePageIndex] = {
            ...targetPage,
            backgroundImage: src,
            showPdfBackground: true
          };
          return { ...prev, pages };
        });
        saveSnapshotToHistory();
        setSaveNotice('🖼️ تم تعيين الصورة كخلفية لصفحة اللوح، يمكنك الآن الشرح والكتابة فوقها بحرية!');
        setTimeout(() => setSaveNotice(''), 3000);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxWidth = 550;
        const scale = Math.min(1, maxWidth / img.width);
        const container = canvasContainerRef.current || containerRef.current;
        const cx = (-(panOffset.x) + (container?.clientWidth || 800) / 2) / zoom;
        const cy = (-(panOffset.y) + (container?.clientHeight || 600) / 2) / zoom;
        const targetWidth = Math.round(img.width * scale);
        const targetHeight = Math.round(img.height * scale);

        const newImgItem: ImageItem = {
          id: `img_${Date.now()}`,
          x: Math.max(20, Math.round(cx - targetWidth / 2)),
          y: Math.max(20, Math.round(cy - targetHeight / 2)),
          width: targetWidth,
          height: targetHeight,
          src,
          aspectRatio: img.width / img.height
        };

        setProject(prev => {
          const pages = [...prev.pages];
          const targetPage = pages[activePageIndex];
          if (!targetPage) return prev;
          pages[activePageIndex] = {
            ...targetPage,
            imageItems: [...(targetPage.imageItems || []), newImgItem]
          };
          return { ...prev, pages };
        });

        setSelectedItemId(newImgItem.id);
        setSelectedItemType('image');
        saveSnapshotToHistory();
        setSaveNotice('✨ تم إدراج الصورة بنجاح على اللوح الذكي، يمكنك الآن الرسم والكتابة فوقها!');
        setTimeout(() => setSaveNotice(''), 3000);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Process multiple images as sequential vertical pages (Xournal++ multi-page document style)
  const processMultipleImageFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    try {
      setSaveNotice(`جاري قراءة واستيراد ${files.length} صورة كصفحات متتابعة...`);
      const newPages: WhiteboardPage[] = [];
      const timestamp = Date.now();

      // Natural sort by file name so images 1, 2, 3 appear in proper order
      const sortedFiles = [...files].sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth || 1200, height: img.naturalHeight || 1600 });
          img.onerror = () => resolve({ width: 1200, height: 1600 });
          img.src = dataUrl;
        });

        // Preload and cache image so pageLayouts computes exact aspect ratio immediately
        const preloaded = new Image();
        preloaded.src = dataUrl;
        imageCacheRef.current.set(dataUrl, preloaded);

        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const title = sortedFiles.length === 1 
          ? `صفحة مصورة (${cleanName})`
          : `صفحة مصورة ${i + 1} (${cleanName})`;

        newPages.push({
          id: `img_page_${timestamp}_${i}`,
          title,
          backgroundType: 'blank',
          backgroundColor: '#ffffff',
          backgroundImage: dataUrl,
          showPdfBackground: true,
          strokes: [],
          textItems: [],
          imageItems: [],
          stemItems: [],
          createdAt: new Date().toISOString()
        });
      }

      setProject(prev => {
        const isInitialEmpty = 
          prev.pages.length === 1 && 
          (!prev.pages[0].strokes || prev.pages[0].strokes.length === 0) &&
          (!prev.pages[0].textItems || prev.pages[0].textItems.length === 0) &&
          (!prev.pages[0].imageItems || prev.pages[0].imageItems.length === 0) &&
          (!prev.pages[0].backgroundImage);

        const pages = isInitialEmpty ? newPages : [...prev.pages, ...newPages];
        const targetIdx = isInitialEmpty ? 0 : prev.pages.length;

        return {
          ...prev,
          pages,
          activePageIndex: targetIdx
        };
      });

      setCurrentScreen('canvas');
      setSaveNotice(`🎉 تم بنجاح استيراد ${sortedFiles.length} صفحة مصورة بالتتابع العمودي! يمكنك التمرير بعجلة الماوس والشرح بحرية.`);
      setTimeout(() => setSaveNotice(''), 4500);

      setTimeout(() => fitToWidth(), 150);
    } catch (err) {
      console.error('Failed to import multiple images as pages:', err);
      alert('حدث خطأ أثناء معالجة الصور المختارة.');
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }, [fitToWidth]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    if (files.length > 1) {
      processMultipleImageFiles(files);
    } else {
      processImageFile(files[0], false);
    }
  };

  // Clipboard Paste Handler (Ctrl+V and direct paste)
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `clipboard_${Date.now()}.png`, { type: imageType });
          processImageFile(file, false);
          return;
        }
      }
      alert('لم يتم العثور على صورة في الحافظة. يرجى نسخ صورة أولاً ثم الضغط على لصق أو Ctrl+V.');
    } catch (err) {
      console.warn('Clipboard read error:', err);
      alert('يرجى استخدام اختصار لوحة المفاتيح Ctrl+V للصق الصورة مباشرة على اللوح.');
    }
  }, [activePageIndex, panOffset, zoom]);

  // Global paste event listener for seamless screenshot pasting
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file, false);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [activePageIndex, panOffset, zoom]);

  // Canvas Drag & Drop File Handlers (Images & PDF documents)
  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOverCanvas) setIsDragOverCanvas(true);
  }, [isDragOverCanvas]);

  const handleCanvasDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(false);
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    // Check if any file is PDF
    const pdfFile = files.find(f => f.type === 'application/pdf');
    if (pdfFile) {
      processPdfFile(pdfFile);
      return;
    }

    // Check image files
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 1) {
      processMultipleImageFiles(imageFiles);
    } else if (imageFiles.length === 1) {
      processImageFile(imageFiles[0], false);
    } else {
      alert('يرجى سحب وإفلات صورة (PNG, JPG, WebP) أو ملف مستند PDF.');
    }
  }, [processPdfFile, processImageFile, processMultipleImageFiles]);

  // AI OCR Function to extract text, equations and solution steps from an image or selected image
  const handleRunOcrOnSelectedImage = async (targetImgSrc?: string) => {
    let imageBase64 = targetImgSrc;
    if (!imageBase64 && selectedItemId && selectedItemType === 'image') {
      const imgItem = currentPage.imageItems?.find(img => img.id === selectedItemId);
      if (imgItem) imageBase64 = imgItem.src;
    }
    if (!imageBase64 && currentPage.backgroundImage) {
      imageBase64 = currentPage.backgroundImage;
    }

    if (!imageBase64) {
      alert('يرجى تحديد صورة مسألة أو استيراد ملف PDF لاستخراج النص بالذكاء الاصطناعي.');
      return;
    }

    try {
      setIsOcrLoading(true);
      setSaveNotice('🤖 جاري قراءة المسألة واستخراج المعادلات والحل بالذكاء الاصطناعي...');

      const response = await fetch('/api/whiteboard/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          extractSolution: true
        })
      });

      if (!response.ok) {
        throw new Error('فشل الاتصال بخدمة التعرف على النصوص');
      }

      const data = await response.json();
      if (data && data.extractedText) {
        let contentText = data.extractedText;
        if (data.solutionSteps && data.solutionSteps.length > 0) {
          contentText += '\n\n📝 خطوات الحل المقترحة:\n' + data.solutionSteps.map((s: string, idx: number) => `${idx + 1}. ${s}`).join('\n');
        }

        const newSticky: TextItem = {
          id: `ocr_text_${Date.now()}`,
          x: 120,
          y: 120,
          width: 320,
          height: 220,
          text: `📌 مسألة: ${data.title || 'مسألة مستخرجة'}\n\n${contentText}`,
          fontSize: 15,
          fontFamily: 'Cairo, sans-serif',
          color: '#1E293B',
          bgColor: '#FEF08A',
          isSticky: true
        };

        setProject(prev => {
          const pages = [...prev.pages];
          pages[activePageIndex] = {
            ...pages[activePageIndex],
            textItems: [...(pages[activePageIndex].textItems || []), newSticky]
          };
          return { ...prev, pages };
        });

        setSelectedItemId(newSticky.id);
        setSelectedItemType('text');
        saveSnapshotToHistory();
        setSaveNotice('✨ تم استخراج نص المسألة وخطوات الحل بنجاح!');
        setTimeout(() => setSaveNotice(''), 5000);
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      alert('حدث خطأ أثناء التعرف على نص المسألة، يرجى المحاولة ثانية.');
    } finally {
      setIsOcrLoading(false);
    }
  };

  // Comprehensive Layer Management Handlers
  const handleUpdatePageLayer = useCallback((updates: Partial<WhiteboardPage>) => {
    setProject(prev => {
      const pages = [...prev.pages];
      pages[activePageIndex] = {
        ...pages[activePageIndex],
        ...updates
      };
      return { ...prev, pages };
    });
    saveSnapshotToHistory();
    setTimeout(() => redrawCanvas(), 10);
  }, [activePageIndex, saveSnapshotToHistory, redrawCanvas]);

  const handleToggleBackgroundTemplate = useCallback(() => {
    const isVisible = currentPage?.showBackgroundTemplate !== false;
    handleUpdatePageLayer({ showBackgroundTemplate: !isVisible });
    setSaveNotice(!isVisible ? '👁️ تم إظهار قالب خلفية السبورة' : 'قالب السبورة مخفي مؤقتاً (لوح فارغ نقي)');
    setTimeout(() => setSaveNotice(''), 2500);
  }, [currentPage?.showBackgroundTemplate, handleUpdatePageLayer]);

  const handleTogglePdfBackground = useCallback(() => {
    const isVisible = currentPage?.showPdfBackground !== false;
    handleUpdatePageLayer({ showPdfBackground: !isVisible });
    setSaveNotice(!isVisible ? '👁️ تم إظهار مستند الـ PDF' : 'مستند الـ PDF مخفي مؤقتاً');
    setTimeout(() => setSaveNotice(''), 2500);
  }, [currentPage?.showPdfBackground, handleUpdatePageLayer]);

  const handleToggleAnnotations = useCallback(() => {
    const isVisible = currentPage?.showAnnotations !== false;
    handleUpdatePageLayer({ showAnnotations: !isVisible });
    setSaveNotice(!isVisible ? '👁️ تم إظهار طبقة التعليقات والرسومات' : 'طبقة الرسومات مخفية مؤقتاً (وضع المسألة/الاختبار)');
    setTimeout(() => setSaveNotice(''), 2500);
  }, [currentPage?.showAnnotations, handleUpdatePageLayer]);

  const handleToggleTextItems = useCallback(() => {
    const isVisible = currentPage?.showTextItems !== false;
    handleUpdatePageLayer({ showTextItems: !isVisible });
    setSaveNotice(!isVisible ? '👁️ تم إظهار طبقة الملاحظات والنصوص' : 'طبقة النصوص مخفية مؤقتاً');
    setTimeout(() => setSaveNotice(''), 2500);
  }, [currentPage?.showTextItems, handleUpdatePageLayer]);

  const handleToggleImageItems = useCallback(() => {
    const isVisible = currentPage?.showImageItems !== false;
    handleUpdatePageLayer({ showImageItems: !isVisible });
    setSaveNotice(!isVisible ? '👁️ تم إظهار طبقة الصور والمخططات' : 'طبقة الصور مخفية مؤقتاً');
    setTimeout(() => setSaveNotice(''), 2500);
  }, [currentPage?.showImageItems, handleUpdatePageLayer]);

  const handleTogglePdfLock = useCallback(() => {
    const currentLocked = currentPage?.isPdfLocked !== false;
    handleUpdatePageLayer({ isPdfLocked: !currentLocked });
    setSaveNotice(!currentLocked ? '🔒 تم قفل المستند لحمايته من الإزاحة' : '🔓 تم إلغاء قفل المستند');
    setTimeout(() => setSaveNotice(''), 2500);
  }, [currentPage?.isPdfLocked, handleUpdatePageLayer]);

  const handleClearBackgroundDocument = useCallback(() => {
    if (!confirm('هل تريد إزالة خلفية مستند الـ PDF والتحويل إلى سبورة بيضاء عادية؟')) return;
    handleUpdatePageLayer({
      backgroundImage: undefined,
      showPdfBackground: true,
      pdfPageNumber: undefined,
      pdfPageNumbers: undefined,
      isDualSpread: false
    });
    setSaveNotice('🗑️ تمت إزالة خلفية المستند بنجاح');
    setTimeout(() => setSaveNotice(''), 2500);
  }, [handleUpdatePageLayer]);

  const handleClearAnnotationsOnly = useCallback(() => {
    if (!confirm('هل تريد مسح الرسومات والتعليقات فقط مع الإبقاء على ملف الـ PDF والنصوص والقوالب؟')) return;
    setProject(prev => {
      const pages = [...prev.pages];
      pages[activePageIndex] = {
        ...pages[activePageIndex],
        strokes: []
      };
      return { ...prev, pages };
    });
    saveSnapshotToHistory();
    redrawCanvas();
    setSaveNotice('🧹 تم مسح التعليقات والرسومات بنجاح');
    setTimeout(() => setSaveNotice(''), 2500);
  }, [activePageIndex, saveSnapshotToHistory, redrawCanvas]);

  // Clipboard Paste Support (Ctrl+V / Paste image screenshot)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              const src = loadEvt.target?.result as string;
              if (src) {
                const img = new Image();
                img.onload = () => {
                  const maxWidth = 400;
                  const scale = Math.min(1, maxWidth / img.width);
                  const newImgItem: ImageItem = {
                    id: `img_${Date.now()}`,
                    x: 150,
                    y: 150,
                    width: img.width * scale,
                    height: img.height * scale,
                    src,
                    aspectRatio: img.width / img.height
                  };

                  setProject(prev => {
                    const pages = [...prev.pages];
                    pages[activePageIndex] = {
                      ...pages[activePageIndex],
                      imageItems: [...(pages[activePageIndex].imageItems || []), newImgItem]
                    };
                    return { ...prev, pages };
                  });

                  setSelectedItemId(newImgItem.id);
                  setSelectedItemType('image');
                  saveSnapshotToHistory();
                  setSaveNotice('📋 تم لصق الصورة بنجاح!');
                  setTimeout(() => setSaveNotice(''), 3000);
                };
                img.src = src;
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activePageIndex, saveSnapshotToHistory]);

  // Render Page To Offscreen Canvas For High-Res PDF / Image Export (Honoring Layer Toggles & Opacity)
  const renderPageToOffscreenCanvas = async (page: WhiteboardPage, scaleMultiplier: number = 1): Promise<HTMLCanvasElement> => {
    let baseWidth = 1200;
    let baseHeight = 1600;

    let preloadedBgImg: HTMLImageElement | null = null;
    if (page.backgroundImage) {
      preloadedBgImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = page.backgroundImage!;
      });
    }

    if (page.isVerticalStack && preloadedBgImg && preloadedBgImg.naturalWidth > 0) {
      baseWidth = preloadedBgImg.naturalWidth;
      baseHeight = preloadedBgImg.naturalHeight;
    } else if (!page.isDualSpread && !page.isVerticalStack && preloadedBgImg && preloadedBgImg.naturalWidth > 0) {
      baseWidth = 1200;
      baseHeight = Math.round((preloadedBgImg.naturalHeight / preloadedBgImg.naturalWidth) * 1200);
    } else if (page.isDualSpread) {
      baseWidth = 1920;
      baseHeight = 1080;
    } else {
      // Blank or template page (e.g. blank white page inserted into a PDF document)
      // Match PDF dimensions if document has PDF pages for consistent multi-page PDF export
      const firstPdfPage = project.pages.find(p => p.backgroundImage);
      if (firstPdfPage && firstPdfPage.backgroundImage) {
        const cached = imageCacheRef.current.get(firstPdfPage.backgroundImage);
        if (cached && cached.naturalWidth > 0 && cached.naturalHeight > 0) {
          baseWidth = 1200;
          baseHeight = Math.round((cached.naturalHeight / cached.naturalWidth) * 1200);
        } else {
          baseWidth = 1200;
          baseHeight = 1697; // Standard A4 ratio
        }
      } else {
        baseWidth = 1200;
        baseHeight = 1600;
      }
    }

    const offCanvas = document.createElement('canvas');
    const exportWidth = baseWidth * scaleMultiplier;
    const exportHeight = baseHeight * scaleMultiplier;
    offCanvas.width = exportWidth;
    offCanvas.height = exportHeight;

    const ctx = offCanvas.getContext('2d');
    if (!ctx) return offCanvas;

    if (scaleMultiplier !== 1) {
      ctx.scale(scaleMultiplier, scaleMultiplier);
    }

    // 1. Draw Background Pattern (if showBackgroundTemplate is not false)
    drawBackgroundPattern(
      ctx, 
      baseWidth, 
      baseHeight, 
      page.backgroundType,
      page.showBackgroundTemplate !== false,
      page.backgroundTemplateOpacity ?? 1,
      page.backgroundColor
    );

    // 2. Draw PDF/Image background (if showPdfBackground is not false)
    if (preloadedBgImg && page.showPdfBackground !== false) {
      ctx.save();
      if (page.pdfBackgroundOpacity !== undefined && page.pdfBackgroundOpacity < 1) {
        ctx.globalAlpha = Math.max(0, Math.min(1, page.pdfBackgroundOpacity));
      }
      ctx.drawImage(preloadedBgImg, 0, 0, baseWidth, baseHeight);
      ctx.restore();
    }

    // 3. Draw Images (if showImageItems is not false)
    if (page.imageItems && page.showImageItems !== false) {
      for (const imgItem of page.imageItems) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.save();
            if (page.imageItemsOpacity !== undefined && page.imageItemsOpacity < 1) {
              ctx.globalAlpha = Math.max(0, Math.min(1, page.imageItemsOpacity));
            }
            ctx.drawImage(img, imgItem.x, imgItem.y, imgItem.width, imgItem.height);
            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = imgItem.src;
        });
      }
    }

    // 4. Draw Strokes (if showAnnotations is not false)
    if (page.strokes && page.showAnnotations !== false) {
      ctx.save();
      if (page.annotationsOpacity !== undefined && page.annotationsOpacity < 1) {
        ctx.globalAlpha = Math.max(0, Math.min(1, page.annotationsOpacity));
      }
      page.strokes.forEach(s => drawStrokePath(ctx, s));
      ctx.restore();
    }

    // 5. Draw Text Items & Math Formulas (if showTextItems is not false)
    if (page.textItems && page.showTextItems !== false) {
      for (const t of page.textItems) {
        ctx.save();
        if (page.textItemsOpacity !== undefined && page.textItemsOpacity < 1) {
          ctx.globalAlpha = Math.max(0, Math.min(1, page.textItemsOpacity));
        }

        if (t.isFormula && t.renderedSvgDataUrl) {
          // Draw rendered MathJax SVG equation with crisp vector quality
          if (t.bgColor && t.bgColor !== 'transparent') {
            ctx.fillStyle = t.bgColor;
            ctx.beginPath();
            ctx.roundRect(t.x, t.y, t.width, t.height, 12);
            ctx.fill();
            if (t.borderColor) {
              ctx.strokeStyle = t.borderColor;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          }

          await new Promise<void>((resolve) => {
            const svgImg = new Image();
            svgImg.onload = () => {
              const pad = 12;
              const drawW = t.width - pad * 2;
              const drawH = t.height - pad * 2;
              ctx.drawImage(svgImg, t.x + pad, t.y + pad, drawW, drawH);
              resolve();
            };
            svgImg.onerror = () => resolve();
            svgImg.src = t.renderedSvgDataUrl!;
          });
        } else if (t.isSticky) {
          ctx.fillStyle = t.bgColor || '#FEF08A';
          ctx.fillRect(t.x, t.y, t.width, t.height);
          ctx.strokeStyle = t.borderColor || '#EAB308';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(t.x, t.y, t.width, t.height);

          ctx.fillStyle = t.color || '#1E293B';
          ctx.font = `bold ${t.fontSize || 16}px Cairo, sans-serif`;
          ctx.textAlign = 'right';
          ctx.direction = 'rtl';
          const lines = t.text.split('\n');
          lines.forEach((line, lineIdx) => {
            ctx.fillText(line, t.x + t.width - 12, t.y + 24 + lineIdx * ((t.fontSize || 16) + 6));
          });
        } else {
          ctx.fillStyle = t.color || '#1E293B';
          ctx.font = `bold ${t.fontSize || 16}px Cairo, sans-serif`;
          ctx.textAlign = 'right';
          ctx.direction = 'rtl';
          const lines = t.text.split('\n');
          lines.forEach((line, lineIdx) => {
            ctx.fillText(line, t.x + t.width - 10, t.y + 24 + lineIdx * ((t.fontSize || 16) + 6));
          });
        }
        ctx.restore();
      }
    }

    // 6. Draw STEM Items (if showStemItems is not false)
    if (page.stemItems && page.showStemItems !== false) {
      for (const item of page.stemItems) {
        ctx.save();
        if (page.stemItemsOpacity !== undefined && page.stemItemsOpacity < 1) {
          ctx.globalAlpha = Math.max(0, Math.min(1, page.stemItemsOpacity));
        }
        ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
        if (item.rotation) {
          ctx.rotate((item.rotation * Math.PI) / 180);
        }
        ctx.translate(-(item.x + item.width / 2), -(item.y + item.height / 2));

        ctx.strokeStyle = item.color || '#3b82f6';
        ctx.fillStyle = item.fillColor || 'rgba(59, 130, 246, 0.15)';
        ctx.lineWidth = item.strokeWidth || 2;
        
        ctx.beginPath();
        ctx.roundRect(item.x, item.y, item.width, item.height, 8);
        ctx.fill();
        ctx.stroke();

        if (item.label) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.label, item.x + item.width / 2, item.y + item.height / 2 + 4);
        }
        ctx.restore();
      }
    }

    // 7. Official Academy Footer (Fixed & Non-editable on PDF, Images, and Print)
    const isDarkPage = page.backgroundType === 'dark' || page.backgroundType === 'chalkboard';
    const pageIndex = project.pages.findIndex(p => p.id === page.id);
    const currentPageNum = pageIndex >= 0 ? pageIndex + 1 : (page.pageNumber || 1);
    const totalPagesCount = project.pages.length;

    const sepY = baseHeight - 40;
    const footerY = baseHeight - 20;

    ctx.save();
    // Separator line
    ctx.strokeStyle = isDarkPage ? 'rgba(255, 255, 255, 0.15)' : 'rgba(30, 58, 138, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, sepY);
    ctx.lineTo(baseWidth - 36, sepY);
    ctx.stroke();

    // Center Footer Text
    ctx.fillStyle = isDarkPage ? '#cbd5e1' : '#1e3a8a';
    ctx.font = 'bold 13px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    const footerText = `🎓 أكاديمية التفوق أون لاين   |   صفحة ${currentPageNum} من ${totalPagesCount}`;
    ctx.fillText(footerText, baseWidth / 2, footerY);

    // Page Title (Right Corner)
    if (page.title) {
      ctx.fillStyle = isDarkPage ? 'rgba(255, 255, 255, 0.45)' : 'rgba(71, 85, 105, 0.75)';
      ctx.font = '600 11px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(page.title, baseWidth - 36, footerY);
    }

    // Accreditation Tag (Left Corner)
    ctx.fillStyle = isDarkPage ? 'rgba(255, 255, 255, 0.35)' : 'rgba(71, 85, 105, 0.6)';
    ctx.font = '600 10.5px Cairo, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('منصة إدراك التعليمية', 36, footerY);

    ctx.restore();

    return offCanvas;
  };

  // MathJax & Chemistry Formula Insertion & Update Handler
  const handleInsertMathFormula = (options: MathFormulaInsertOptions) => {
    const container = containerRef.current;
    const targetWidth = options.width || 380;
    const targetHeight = options.height || 140;

    if (editingFormulaItemId) {
      // Update existing equation item
      setProject(prev => {
        const pages = [...prev.pages];
        const targetPage = pages[activePageIndex];
        if (!targetPage) return prev;
        const updatedTextItems = (targetPage.textItems || []).map(item => {
          if (item.id === editingFormulaItemId) {
            return {
              ...item,
              latex: options.latex,
              text: options.latex,
              isChemistry: options.isChemistry,
              renderedSvgDataUrl: options.svgDataUrl,
              bgColor: options.bgColor || 'rgba(15, 23, 42, 0.95)',
              borderColor: options.color || '#38bdf8',
              color: options.color || '#38bdf8',
              fontSize: options.fontSize || 22,
              width: targetWidth,
              height: targetHeight
            };
          }
          return item;
        });
        pages[activePageIndex] = { ...targetPage, textItems: updatedTextItems };
        return { ...prev, pages };
      });
      setSaveNotice('تم تحديث المعادلة الرياضية بنجاح 🧮✨');
    } else {
      // Insert brand new equation
      const cx = (-(panOffset.x) + (container?.clientWidth || 800) / 2) / zoom;
      const cy = (-(panOffset.y) + (container?.clientHeight || 600) / 2) / zoom;

      const newFormulaItem: TextItem = {
        id: `formula_${Date.now()}`,
        x: Math.max(20, Math.round(cx - targetWidth / 2)),
        y: Math.max(20, Math.round(cy - targetHeight / 2)),
        width: targetWidth,
        height: targetHeight,
        text: options.latex,
        latex: options.latex,
        isFormula: true,
        isChemistry: options.isChemistry,
        renderedSvgDataUrl: options.svgDataUrl,
        fontSize: options.fontSize || 22,
        fontFamily: 'Cairo, sans-serif',
        color: options.color || '#38bdf8',
        bgColor: options.bgColor || 'rgba(15, 23, 42, 0.95)',
        borderColor: options.color || '#38bdf8'
      };

      setProject(prev => {
        const pages = [...prev.pages];
        const targetPage = pages[activePageIndex];
        if (!targetPage) return prev;
        pages[activePageIndex] = {
          ...targetPage,
          textItems: [...(targetPage.textItems || []), newFormulaItem]
        };
        return { ...prev, pages };
      });

      setSelectedItemId(newFormulaItem.id);
      setSelectedItemType('text');
      setSaveNotice(options.isChemistry ? 'تم إدراج المعادلة الكيميائية بنجاح ⚗️' : 'تم إدراج المعادلة الرياضية MathJax 📐');
    }

    saveSnapshotToHistory();
    setEditingFormulaItemId(null);
    setTimeout(() => setSaveNotice(''), 2500);
  };

  // Convert Note from Real-time Notes Drawer to Sticky Note on Canvas
  const handleInsertNoteAsSticky = (note: LessonNoteItem) => {
    const container = containerRef.current;
    const targetWidth = 280;
    const targetHeight = 180;
    const cx = (-(panOffset.x) + (container?.clientWidth || 800) / 2) / zoom;
    const cy = (-(panOffset.y) + (container?.clientHeight || 600) / 2) / zoom;

    const newSticky: TextItem = {
      id: `sticky_${Date.now()}`,
      x: Math.max(20, Math.round(cx - targetWidth / 2)),
      y: Math.max(20, Math.round(cy - targetHeight / 2)),
      width: targetWidth,
      height: targetHeight,
      text: `${note.title}\n\n${note.content}`,
      fontSize: 16,
      fontFamily: 'Cairo, sans-serif',
      color: '#0f172a',
      bgColor: note.color || '#fef08a',
      borderColor: '#eab308',
      isSticky: true
    };

    setProject(prev => {
      const pages = [...prev.pages];
      const targetPage = pages[activePageIndex];
      if (!targetPage) return prev;
      pages[activePageIndex] = {
        ...targetPage,
        textItems: [...(targetPage.textItems || []), newSticky]
      };
      return { ...prev, pages };
    });

    setSelectedItemId(newSticky.id);
    setSelectedItemType('text');
    saveSnapshotToHistory();
    setSaveNotice('تم تحويل الملاحظة إلى بطاقة لاصقة على اللوح 📌');
    setTimeout(() => setSaveNotice(''), 2500);
  };

  // Educational Image & Diagram Insertion Handler
  const handleInsertEducationalImage = (options: InsertedImageOptions) => {
    if (options.insertAsBackground) {
      setProject(prev => {
        const pages = [...prev.pages];
        pages[activePageIndex] = {
          ...pages[activePageIndex],
          backgroundImage: options.src,
          showPdfBackground: true
        };
        return { ...prev, pages };
      });
      saveSnapshotToHistory();
      setSaveNotice('تم تعيين الرسم كخلفية لصفحة الشرح 🖼️');
      setTimeout(() => setSaveNotice(''), 2500);
    } else {
      const container = containerRef.current;
      const targetWidth = options.width || 450;
      const targetHeight = options.height || 350;
      
      // Place near center of current view
      const cx = (-(panOffset.x) + (container?.clientWidth || 800) / 2) / zoom;
      const cy = (-(panOffset.y) + (container?.clientHeight || 600) / 2) / zoom;

      const newImgItem: ImageItem = {
        id: `img_${Date.now()}`,
        src: options.src,
        x: Math.max(20, Math.round(cx - targetWidth / 2)),
        y: Math.max(20, Math.round(cy - targetHeight / 2)),
        width: targetWidth,
        height: targetHeight,
        aspectRatio: targetWidth / targetHeight
      };

      setProject(prev => {
        const pages = [...prev.pages];
        pages[activePageIndex] = {
          ...pages[activePageIndex],
          imageItems: [...(pages[activePageIndex].imageItems || []), newImgItem]
        };
        return { ...prev, pages };
      });

      setSelectedItemId(newImgItem.id);
      setSelectedItemType('image');
      saveSnapshotToHistory();
      setSaveNotice(`تم إدراج: ${options.title || 'رسم تعليمي'} ✨`);
      setTimeout(() => setSaveNotice(''), 2500);
    }
  };

  // STEM Tool Insertion Handler
  const handleInsertStemItem = (toolDef: StemToolDef) => {
    const container = containerRef.current;
    const targetWidth = toolDef.defaultWidth || 200;
    const targetHeight = toolDef.defaultHeight || 140;
    
    // Position at current viewport center
    const cx = (-(panOffset.x) + (container?.clientWidth || 800) / 2) / zoom;
    const cy = (-(panOffset.y) + (container?.clientHeight || 600) / 2) / zoom;

    const newStemItem: StemItem = {
      id: `stem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: toolDef.type,
      x: Math.max(30, Math.round(cx - targetWidth / 2)),
      y: Math.max(30, Math.round(cy - targetHeight / 2)),
      width: targetWidth,
      height: targetHeight,
      color: toolDef.category === '3d-shapes' ? '#3b82f6' : toolDef.category === 'circuits' ? '#f59e0b' : toolDef.category === 'physics' ? '#10b981' : '#8b5cf6',
      fillColor: toolDef.category === '3d-shapes' ? '#dbeafe' : toolDef.category === 'circuits' ? '#fef3c7' : toolDef.category === 'physics' ? '#d1fae5' : '#ede9fe',
      strokeWidth: 2,
      label: toolDef.titleAr,
      params: { ...(toolDef.defaultParams || {}) },
      zIndex: (currentPage?.stemItems?.length || 0) + 1
    };

    setProject(prev => {
      const pages = [...prev.pages];
      const targetPage = pages[activePageIndex];
      if (!targetPage) return prev;
      pages[activePageIndex] = {
        ...targetPage,
        stemItems: [...(targetPage.stemItems || []), newStemItem]
      };
      return { ...prev, pages };
    });

    setSelectedItemId(newStemItem.id);
    setSelectedStemId(newStemItem.id);
    setSelectedItemType('stem' as any);
    saveSnapshotToHistory();
    setSaveNotice(`📐 تم إدراج: ${toolDef.titleAr} بنجاح! ✨`);
    setTimeout(() => setSaveNotice(''), 2500);
  };

  // Update Stem Item (mass, velocity, dimensions, colors, formulas)
  const handleUpdateStemItem = (updatedItem: StemItem) => {
    setProject(prev => {
      const pages = prev.pages.map(page => {
        if (!page.stemItems?.some(si => si.id === updatedItem.id)) return page;
        return {
          ...page,
          stemItems: (page.stemItems || []).map(si => si.id === updatedItem.id ? updatedItem : si)
        };
      });
      return { ...prev, pages };
    });
  };

  // Duplicate Stem Item
  const handleDuplicateStemItem = (item: StemItem) => {
    const duplicated: StemItem = {
      ...JSON.parse(JSON.stringify(item)),
      id: `stem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: item.x + 35,
      y: item.y + 35
    };

    setProject(prev => {
      const pages = prev.pages.map(page => {
        if (!page.stemItems?.some(si => si.id === item.id)) return page;
        return {
          ...page,
          stemItems: [...(page.stemItems || []), duplicated]
        };
      });
      return { ...prev, pages };
    });

    setSelectedItemId(duplicated.id);
    setSelectedStemId(duplicated.id);
    saveSnapshotToHistory();
    setSaveNotice('تم نسخ العنصر بنجاح 📋');
    setTimeout(() => setSaveNotice(''), 2000);
  };

  // Delete Stem Item
  const handleDeleteStemItem = (id: string) => {
    setProject(prev => {
      const pages = prev.pages.map(page => ({
        ...page,
        stemItems: (page.stemItems || []).filter(si => si.id !== id)
      }));
      return { ...prev, pages };
    });

    if (selectedItemId === id) setSelectedItemId(null);
    if (selectedStemId === id) setSelectedStemId(null);
    saveSnapshotToHistory();
    setSaveNotice('تم حذف العنصر 🗑️');
    setTimeout(() => setSaveNotice(''), 2000);
  };

  // Handler for drawing accurate straight line from Virtual Ruler
  const handleDrawRulerStroke = (stroke: DrawStroke) => {
    setProject(prev => {
      const pages = [...prev.pages];
      const targetPage = pages[activePageIndex];
      if (!targetPage) return prev;
      pages[activePageIndex] = {
        ...targetPage,
        strokes: [...(targetPage.strokes || []), stroke]
      };
      return { ...prev, pages };
    });
    saveSnapshotToHistory();
    setSaveNotice('📏 تم رسم الخط المستقيم بالمسطرة بدقة!');
    setTimeout(() => setSaveNotice(''), 2000);
  };

  // Handler for drawing angle rays, arc, and label from Virtual Protractor
  const handleDrawProtractorStrokes = (strokes: DrawStroke[], textItem?: TextItem) => {
    setProject(prev => {
      const pages = [...prev.pages];
      const targetPage = pages[activePageIndex];
      if (!targetPage) return prev;
      pages[activePageIndex] = {
        ...targetPage,
        strokes: [...(targetPage.strokes || []), ...strokes],
        textItems: textItem ? [...(targetPage.textItems || []), textItem] : (targetPage.textItems || [])
      };
      return { ...prev, pages };
    });
    saveSnapshotToHistory();
    setSaveNotice('📐 تم رسم الزاوية الهندسية وقوس القياس بدقة!');
    setTimeout(() => setSaveNotice(''), 2000);
  };

  // Export to Merged PDF
  const handleExportPdf = async () => {
    try {
      setIsPdfLoading(true);
      setPdfProgressText('جاري تجميع ودمج صفحات اللوح في مستند PDF عالي الجودة...');
      await exportWhiteboardToPdf(
        project.pages,
        renderPageToOffscreenCanvas,
        `${project.title || 'شرح_اللوح_الذكي'}.pdf`
      );
      setSaveNotice('تم تصدير ملف PDF بنجاح! 📥');
      setTimeout(() => setSaveNotice(''), 3000);
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('حدث خطأ أثناء تصدير ملف PDF.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  // Export Current Page as PNG Image
  const handleExportImage = async () => {
    try {
      const pageCanvas = await renderPageToOffscreenCanvas(currentPage);
      downloadCanvasImage(pageCanvas, `${project.title}_صفحة_${activePageIndex + 1}.png`, 'png');
    } catch (err) {
      console.error('Export Image error:', err);
    }
  };

  // Direct Print of Active Whiteboard Page
  const handlePrintBoard = async () => {
    if (!currentPage) return;
    try {
      const pageCanvas = await renderPageToOffscreenCanvas(currentPage);
      if (!pageCanvas) {
        window.print();
        return;
      }
      const imgData = pageCanvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank', 'width=1000,height=750');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
            <head>
              <meta charset="utf-8">
              <title>${project.title || 'طباعة اللوح الذكي'}</title>
              <style>
                @page { size: landscape; margin: 8mm; }
                body { 
                  margin: 0; 
                  padding: 12px; 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  font-family: 'Cairo', system-ui, sans-serif;
                  background-color: #ffffff;
                  color: #0f172a;
                }
                .header-bar { 
                  width: 100%; 
                  display: flex; 
                  justify-content: space-between; 
                  align-items: center;
                  border-bottom: 2px solid #0d9488;
                  padding-bottom: 6px;
                  margin-bottom: 12px; 
                  font-size: 13px; 
                }
                .header-title { font-weight: 800; color: #0f172a; }
                .header-meta { font-size: 11px; color: #64748b; }
                img { 
                  max-width: 100%; 
                  max-height: 82vh; 
                  height: auto; 
                  border: 1px solid #cbd5e1; 
                  border-radius: 8px; 
                }
                .footer-bar {
                  margin-top: 8px;
                  font-size: 10px;
                  color: #94a3b8;
                  width: 100%;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="header-bar">
                <div class="header-title">أكاديمية التفوق أون لاين - اللوح الذكي التفاعلي</div>
                <div class="header-meta">${project.title || 'لوح الشرح'} | ${currentPage.title || 'الصفحة'} | ${new Date().toLocaleDateString('ar-EG')}</div>
              </div>
              <img src="${imgData}" onload="setTimeout(() => { window.focus(); window.print(); }, 250);" alt="Whiteboard Content" />
              <div class="footer-bar">تم التصدير والطباعة من منصة أكاديمية التفوق أون لاين</div>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Export Print error:', err);
      window.print();
    }
  };

  // Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Page Management Handlers
  const handleAddPage = () => {
    const newPage = createDefaultPage(
      `page_${Date.now()}`, 
      `صفحة ${project.pages.length + 1}`, 
      currentPage?.backgroundType || themeConfig.defaultPageBgType, 
      activeTheme
    );
    const newIdx = project.pages.length;
    setProject(prev => ({
      ...prev,
      pages: [...prev.pages, newPage],
      activePageIndex: newIdx
    }));
    setActivePageIndex(newIdx);
    setTimeout(() => {
      scrollToPage(newIdx);
    }, 60);
  };

  // Insert Blank Page at specific location in the document (before or after a page)
  const handleInsertPageAt = (index: number, position: 'before' | 'after') => {
    const targetIdx = position === 'before' ? Math.max(0, index) : index + 1;
    const newPage: WhiteboardPage = {
      id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: `صفحة بيضاء ${targetIdx + 1}`,
      backgroundType: 'blank',
      backgroundColor: '#ffffff',
      strokes: [],
      textItems: [],
      imageItems: [],
      stemItems: [],
      createdAt: new Date().toISOString()
    };

    setProject(prev => {
      const pages = [...prev.pages];
      pages.splice(targetIdx, 0, newPage);
      // Automatically maintain clean sequential page numbering
      const updatedPages = pages.map((p, idx) => {
        if (/^صفحة(\sبيضاء)?\s\d+$/.test(p.title)) {
          return {
            ...p,
            title: p.backgroundType === 'blank' && !p.backgroundImage ? `صفحة بيضاء ${idx + 1}` : `صفحة ${idx + 1}`
          };
        }
        return p;
      });
      return { ...prev, pages: updatedPages, activePageIndex: targetIdx };
    });
    setActivePageIndex(targetIdx);
    setSaveNotice(`📄 تم إدراج صفحة بيضاء في الموقع ${targetIdx + 1}`);
    setTimeout(() => setSaveNotice(''), 3000);
    setTimeout(() => {
      scrollToPage(targetIdx);
    }, 60);
  };

  // Insert Blank Page beside page and activate Side-by-Side Dual View immediately with auto-zoom fitting
  const handleInsertBlankPageBeside = (index: number) => {
    const targetIdx = index + 1;
    const newPage: WhiteboardPage = {
      id: `page_side_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: `مسودة بيضاء (بجانب صـ ${index + 1})`,
      backgroundType: 'blank',
      backgroundColor: '#ffffff',
      strokes: [],
      textItems: [],
      imageItems: [],
      stemItems: [],
      createdAt: new Date().toISOString()
    };

    setProject(prev => {
      const pages = [...prev.pages];
      pages.splice(targetIdx, 0, newPage);
      return { ...prev, pages, activePageIndex: index };
    });
    setActivePageIndex(index);
    setIsDualViewMode(true);

    // Auto-adjust Zoom to fit both pages comfortably within viewport
    const container = canvasContainerRef.current || containerRef.current;
    const containerW = container?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200);
    const fitZoom = Math.min(1.15, Math.max(0.28, Number(((containerW - 64) / 2400).toFixed(2))));
    setZoom(fitZoom);

    const zoomPct = Math.round(fitZoom * 100);
    setSaveNotice(`📑 تم إدراج صفحة بيضاء بجانب الصفحة ${index + 1} وتفعيل نمط العرض جنباً إلى جنب مع ضبط الـ Zoom تلقائياً (${zoomPct}%) لتناسب عرض الصفحتين داخل الشاشة`);
    setTimeout(() => setSaveNotice(''), 4500);
    setTimeout(() => {
      scrollToPage(index);
    }, 60);
  };

  const handleInsertPageAfterCurrent = () => {
    handleInsertPageAt(activePageIndex, 'after');
  };

  const handleDuplicatePage = (index: number) => {
    const target = project.pages[index];
    if (!target) return;
    const duplicated: WhiteboardPage = {
      ...JSON.parse(JSON.stringify(target)),
      id: `page_${Date.now()}`,
      title: `${target.title} (نسخة)`
    };
    const targetIdx = index + 1;
    setProject(prev => {
      const pages = [...prev.pages];
      pages.splice(targetIdx, 0, duplicated);
      return { ...prev, pages };
    });
    setActivePageIndex(targetIdx);
    setTimeout(() => {
      scrollToPage(targetIdx);
    }, 60);
  };

  const handleDeletePage = (index: number) => {
    if (project.pages.length <= 1) return;
    setProject(prev => {
      const pages = prev.pages.filter((_, idx) => idx !== index);
      const newActive = Math.min(activePageIndex, pages.length - 1);
      return { ...prev, pages, activePageIndex: newActive };
    });
    setActivePageIndex(prev => Math.min(prev, project.pages.length - 2));
  };

  if (currentScreen === 'launcher') {
    return (
      <div 
        ref={containerRef}
        className={`relative w-full h-full min-h-[600px] flex flex-col bg-slate-50 dark:bg-slate-950 font-sans select-none overflow-hidden ${
          isFullscreen || isStandalone ? 'fixed inset-0 z-50 h-screen w-screen' : 'rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl'
        }`}
        dir="rtl"
      >
        {/* Hidden File Inputs for Import */}
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfUpload}
          className="hidden"
        />
        <input
          ref={quickPdfInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleQuickPdfUpload}
          className="hidden"
          data-testid="whiteboard-quick-pdf-input-launcher"
        />
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleImageUpload}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Loading Overlay for PDF Processing */}
        {isPdfLoading && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 size={36} className="animate-spin text-amber-400" />
            <p className="text-sm font-black text-amber-300">{pdfProgressText}</p>
            <span className="text-xs text-slate-400">يرجى الانتظار قليلاً...</span>
          </div>
        )}

        {/* Interactive PDF Page Selector & Spread Mode Modal */}
        <PdfImportSelectorModal
          isOpen={isPdfSelectorOpen}
          onClose={() => {
            setIsPdfSelectorOpen(false);
            setPdfDocInfo(null);
          }}
          pdfInfo={pdfDocInfo}
          isLoading={isPdfLoading}
          onConfirmImport={handleConfirmPdfImport}
        />

        {/* The Teacher's Whiteboard File Manager & Launcher */}
        <WhiteboardFileManager
          projects={savedProjectsList}
          currentProjectId={project.id}
          onSelectProject={(selectedProj) => {
            setProject(selectedProj);
            setActivePageIndex(selectedProj.activePageIndex || 0);
            setCurrentScreen('canvas');
          }}
          onNewProject={(newTitle, bg) => {
            const chosenBg = bg || themeConfig.defaultPageBgType;
            const newProj: WhiteboardProject = {
              id: `board_${Date.now()}`,
              title: newTitle || `سبورة جديدة ${savedProjectsList.length + 1}`,
              teacherId: teacherId || 'teacher_guest',
              teacherName: teacherName || 'المعلم',
              pages: [createDefaultPage('p1', 'صفحة 1', chosenBg, activeTheme)],
              activePageIndex: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setProject(newProj);
            setActivePageIndex(0);
            persistProject(newProj);
            setSavedProjectsList(prev => [newProj, ...prev]);
            setCurrentScreen('canvas');
          }}
          onDeleteProject={async (projId) => {
            await deleteWhiteboardProjectFromStorage(projId);
            try {
              await deleteDoc(doc(db, 'whiteboardProjects', projId));
            } catch (e) {}
            setSavedProjectsList(prev => prev.filter(p => p.id !== projId));
            if (project.id === projId) {
              const remaining = savedProjectsList.filter(p => p.id !== projId);
              if (remaining.length > 0) {
                setProject(remaining[0]);
              } else {
                const defaultP = createInitialProject(teacherId, teacherName, activeTheme, defaultBackground);
                setProject(defaultP);
              }
            }
          }}
          onRenameProject={(projId, newTitle) => {
            setSavedProjectsList(prev => prev.map(p => p.id === projId ? { ...p, title: newTitle } : p));
            if (project.id === projId) {
              setProject(prev => ({ ...prev, title: newTitle }));
            }
            const target = savedProjectsList.find(p => p.id === projId);
            if (target) {
              saveWhiteboardProjectToStorage({ ...target, title: newTitle });
            }
          }}
          onDuplicateProject={(projToDup) => {
            const cloned: WhiteboardProject = {
              ...projToDup,
              id: `board_${Date.now()}`,
              title: `نسخة من ${projToDup.title}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            saveWhiteboardProjectToStorage(cloned);
            setSavedProjectsList(prev => [cloned, ...prev]);
          }}
          onImportPdf={() => pdfInputRef.current?.click()}
          onClose={onClose}
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full min-h-[600px] flex flex-col ${themeConfig.canvasBg} text-slate-100 select-none overflow-hidden font-sans ${
        isFullscreen || isStandalone ? 'fixed inset-0 z-50 h-screen w-screen' : 'rounded-3xl border border-slate-800 shadow-2xl'
      }`}
      dir="rtl"
    >
      {/* Hidden File Inputs for Import */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        onChange={handlePdfUpload}
        className="hidden"
      />
      <input
        ref={quickPdfInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleQuickPdfUpload}
        className="hidden"
        data-testid="whiteboard-quick-pdf-input-canvas"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Floating Save / Status Notification */}
      {saveNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
          <Check size={14} />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Hand-Drawn Geometric Shape Recognition Feedback Toast */}
      {shapeRecognitionFeedback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-teal-500/60 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <Sparkles size={14} className="text-amber-400" />
          <span>تم التعرف وتحويل الرسم إلى: {shapeRecognitionFeedback.text}</span>
          <button
            type="button"
            onClick={handleUndo}
            className="mr-2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-[10px] font-bold cursor-pointer border border-slate-700 transition-colors"
            title="تراجع إلى الرسم اليدوي الأصلي"
          >
            تراجع (Ctrl+Z)
          </button>
        </div>
      )}

      {/* Loading Overlay for PDF Processing */}
      {isPdfLoading && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 size={36} className="animate-spin text-amber-400" />
          <p className="text-sm font-black text-amber-300">{pdfProgressText}</p>
          <span className="text-xs text-slate-400">يرجى الانتظار قليلاً...</span>
        </div>
      )}

      {/* Top and Bottom Toolbars or Minimalist Study Mode Bar */}
      {isStudyMode ? (
        <WhiteboardStudyBar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          currentColor={currentColor}
          setCurrentColor={setCurrentColor}
          currentWidth={currentWidth}
          setCurrentWidth={setCurrentWidth}
          canUndo={historyIndex > 0 || (currentPage?.strokes?.length > 0)}
          canRedo={historyIndex < historyStack.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClearPage={handleClearPage}
          zoom={zoom}
          onZoomIn={() => setZoom(prev => Math.min(Number((prev + 0.15).toFixed(2)), 4.0))}
          onZoomOut={() => setZoom(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.25))}
          onResetZoom={() => { setZoom(1.0); setPanOffset({ x: 0, y: 0 }); }}
          onFitWidth={fitToWidth}
          onFitScreen={fitToScreen}
          currentPageIndex={activePageIndex}
          totalPages={project.pages.length}
          onPrevPage={() => scrollToPage(Math.max(0, activePageIndex - 1))}
          onNextPage={() => scrollToPage(Math.min(project.pages.length - 1, activePageIndex + 1))}
          onExitStudyMode={() => setIsStudyMode(false)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          isDualSpread={!!currentPage?.isDualSpread}
          showAnnotations={currentPage?.showAnnotations !== false}
          onToggleAnnotations={handleToggleAnnotations}
          isPdfLocked={currentPage?.isPdfLocked !== false}
          onTogglePdfLock={handleTogglePdfLock}
          hasPdfBackground={!!currentPage?.backgroundImage}
          onClearAnnotationsOnly={handleClearAnnotationsOnly}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          isRulerOpen={isRulerOpen}
          onToggleRuler={() => setIsRulerOpen(prev => !prev)}
          isProtractorOpen={isProtractorOpen}
          onToggleProtractor={() => setIsProtractorOpen(prev => !prev)}
          theme={activeTheme}
          onChangeTheme={handleThemeChange}
          onOpenMathFormulaModal={() => {
            setEditingFormulaItemId(null);
            setMathModalInitialLatex('');
            setIsMathModalOpen(true);
          }}
          onOpenNotesDrawer={() => setIsNotesDrawerOpen(true)}
          onToggleStemPanel={() => setIsStemPanelOpen(prev => !prev)}
          isStemPanelOpen={isStemPanelOpen}
          onOpenProjects={() => {
            fetchAllSavedProjects();
            setCurrentScreen('launcher');
          }}
        />
      ) : (
        <WhiteboardToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          currentColor={currentColor}
          setCurrentColor={setCurrentColor}
          currentWidth={currentWidth}
          setCurrentWidth={setCurrentWidth}
          currentBackground={currentPage?.backgroundType || 'ruled'}
          setCurrentBackground={(bg) => {
            setProject(prev => {
              const pages = [...prev.pages];
              let newBgColor = '#ffffff';
              if (bg === 'chalkboard') newBgColor = '#1b4332';
              else if (bg === 'dark') newBgColor = themeConfig.defaultPageBgColor || '#0f172a';
              else newBgColor = '#ffffff';

              pages[activePageIndex] = { 
                ...pages[activePageIndex], 
                backgroundType: bg,
                backgroundColor: newBgColor
              };
              return { ...prev, pages };
            });
            try {
              if (teacherId) {
                localStorage.setItem(`teacher_whiteboard_bg_${teacherId}`, bg);
              }
              localStorage.setItem('whiteboard_preferred_bg', bg);
            } catch (e) {}
          }}
          canUndo={historyIndex > 0 || (currentPage?.strokes?.length > 0)}
          canRedo={historyIndex < historyStack.length - 1}
          undoCount={undoCount}
          redoCount={redoCount}
          lastAutosaveTime={lastAutosaveTime}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClearPage={handleClearPage}
          onQuickPdfImport={() => quickPdfInputRef.current?.click()}
          onOpenPdfImport={() => pdfInputRef.current?.click()}
          onOpenImageImport={() => setIsEducationalImageModalOpen(true)}
          onOpenUnifiedImportModal={() => setIsImportModalOpen(true)}
          onUploadDeviceImage={() => imageInputRef.current?.click()}
          onCaptureCameraImage={() => cameraInputRef.current?.click()}
          onExportPdf={handleExportPdf}
          onExportImage={handleExportImage}
          onPrint={handlePrintBoard}
          onClose={onClose ? handleSafeClose : undefined}
          isStandalone={isStandalone}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenProjects={() => {
            fetchAllSavedProjects();
            setCurrentScreen('launcher');
          }}
          onNewProjectDirect={() => {
            const pageBg: WhiteboardBackgroundType = 'ruled';
            const newProj: WhiteboardProject = {
              id: `board_${Date.now()}`,
              title: `سبورة مسطرة جديدة ${savedProjectsList.length + 1}`,
              teacherId: teacherId || 'teacher_guest',
              teacherName: teacherName || 'المعلم',
              pages: [createDefaultPage('p1', 'صفحة 1', pageBg, activeTheme)],
              activePageIndex: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setProject(newProj);
            setActivePageIndex(0);
            persistProject(newProj);
            setSavedProjectsList(prev => [newProj, ...prev]);
            setCurrentScreen('canvas');
          }}
          onSaveProject={() => persistProject(project)}
          zoom={zoom}
          onZoomIn={() => setZoom(prev => Math.min(Number((prev + 0.15).toFixed(2)), 4.0))}
          onZoomOut={() => setZoom(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.25))}
          onResetZoom={() => { setZoom(1.0); setPanOffset({ x: 0, y: 0 }); }}
          onFitWidth={fitToWidth}
          onFitScreen={fitToScreen}
          onToggleStudyMode={() => setIsStudyMode(true)}
          isStudyMode={isStudyMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          currentPageIndex={activePageIndex}
          totalPages={project.pages.length}
          onPrevPage={() => scrollToPage(Math.max(0, activePageIndex - 1))}
          onNextPage={() => scrollToPage(Math.min(project.pages.length - 1, activePageIndex + 1))}
          onAddPage={handleAddPage}
          onInsertPageAfterCurrent={handleInsertPageAfterCurrent}
          onTogglePagesDrawer={() => setIsPagesDrawerOpen(true)}
          isSaving={isSaving}
          isDualView={isDualViewMode || !!currentPage?.isDualSpread}
          onToggleDualView={() => setIsDualViewMode(prev => !prev)}
          isShapeFilled={isShapeFilled}
          setIsShapeFilled={setIsShapeFilled}
          dashStyle={shapeDashStyle}
          setDashStyle={setShapeDashStyle}
          page={currentPage}
          onUpdatePageLayer={handleUpdatePageLayer}
          showBackgroundTemplate={currentPage?.showBackgroundTemplate !== false}
          onToggleBackgroundTemplate={handleToggleBackgroundTemplate}
          onClearBackgroundDocument={handleClearBackgroundDocument}
          isPdfLocked={currentPage?.isPdfLocked !== false}
          onTogglePdfLock={handleTogglePdfLock}
          showAnnotations={currentPage?.showAnnotations !== false}
          onToggleAnnotations={handleToggleAnnotations}
          showPdfBackground={currentPage?.showPdfBackground !== false}
          onTogglePdfBackground={handleTogglePdfBackground}
          onClearAnnotationsOnly={handleClearAnnotationsOnly}
          hasPdfBackground={!!currentPage?.backgroundImage}
          strokesCount={currentPage?.strokes?.length || 0}
          textItemsCount={currentPage?.textItems?.length || 0}
          imageItemsCount={currentPage?.imageItems?.length || 0}
          isShapeRecognitionEnabled={isShapeRecognitionEnabled}
          onToggleShapeRecognition={() => setIsShapeRecognitionEnabled(prev => !prev)}
          onRunOcrOnSelectedImage={handleRunOcrOnSelectedImage}
          isOcrLoading={isOcrLoading}
          selectedItemType={selectedItemType}
          isRulerOpen={isRulerOpen}
          onToggleRuler={() => setIsRulerOpen(prev => !prev)}
          isProtractorOpen={isProtractorOpen}
          onToggleProtractor={() => setIsProtractorOpen(prev => !prev)}
          theme={activeTheme}
          onChangeTheme={handleThemeChange}
          onOpenMathFormulaModal={() => {
            setEditingFormulaItemId(null);
            setMathModalInitialLatex('');
            setIsMathModalOpen(true);
          }}
          onOpenNotesDrawer={() => setIsNotesDrawerOpen(true)}
          onToggleStemPanel={() => setIsStemPanelOpen(prev => !prev)}
          isStemPanelOpen={isStemPanelOpen}
        />
      )}

      {/* Interactive HTML5 Canvas Viewport with Continuous Multi-Page Document Layout */}
      <div 
        ref={canvasContainerRef}
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
        className={`relative flex-1 w-full h-full overflow-hidden touch-none cursor-crosshair ${themeConfig.canvasBg || 'bg-slate-950'}`}
      >
        {/* Drag and Drop Visual Feedback Overlay */}
        {isDragOverCanvas && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 border-4 border-dashed border-cyan-400 m-4 rounded-3xl pointer-events-none animate-in fade-in zoom-in-95" dir="rtl">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-bounce shadow-xl shadow-cyan-950">
              <Upload size={38} />
            </div>
            <h3 className="text-xl font-black text-white">أفلت الملف هنا لإدراجه فوراً على اللوح الذكي</h3>
            <p className="text-sm text-cyan-200 font-bold">
              سيتم إدراج المستند أو الصورة تلقائياً لتبدأ بالكتابة والشرح وحل المسائل عليها ✏️
            </p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="absolute inset-0 block w-full h-full"
          style={{
            cursor: activeTool === 'pan' 
              ? 'grab' 
              : activeTool === 'select' 
                ? 'default' 
                : activeTool === 'eraser' 
                  ? 'cell' 
                  : activeTool === 'laser' 
                    ? 'crosshair' 
                    : 'crosshair'
          }}
        />

        {/* Dual Page Spread Status Indicator Badge - Positioned safely below top header */}
        {currentPage?.isDualSpread && (
          <div className="absolute top-18 sm:top-20 left-3 sm:left-4 pointer-events-none z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-indigo-500/40 text-indigo-200 px-3 py-1.5 rounded-2xl shadow-xl text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>📖 وضع الكتاب المزدوج: PDF على اليسار ⟵ والصفحة البيضاء على اليمين ⟶</span>
            {currentPage.pdfPageNumbers && (
              <span className="bg-indigo-500/30 px-1.5 py-0.5 rounded text-[11px] font-mono text-indigo-300">
                صـ {currentPage.pdfPageNumbers.join(' و ')}
              </span>
            )}
          </div>
        )}

        {/* Floating Vertical Document Navigation Rail & Page Dots (Left side) */}
        {pageLayouts.length > 1 && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 p-2 bg-slate-950/90 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl animate-in fade-in select-none">
            {/* Top Jump to First Page Button */}
            <button
              type="button"
              onClick={() => smoothScrollToPage(0)}
              disabled={activePageIndex === 0}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
              title="الصفحة الأولى"
            >
              <ChevronUp size={14} />
            </button>

            {/* Scrubber & Page Dots Container */}
            <div className="relative flex flex-col items-center gap-1.5 py-1 max-h-[60vh] overflow-y-auto overflow-x-hidden scrollbar-none px-0.5">
              {pageLayouts.map((l, idx) => {
                const isActive = idx === activePageIndex;
                return (
                  <button
                    key={l.page.id || idx}
                    type="button"
                    onClick={() => smoothScrollToPage(idx)}
                    className={`group relative flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isActive ? 'scale-110' : 'hover:scale-105'
                    }`}
                    title={`الانتقال إلى صفحة ${idx + 1}`}
                  >
                    <div
                      className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                        isActive
                          ? 'w-7 h-7 bg-emerald-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-950'
                          : 'w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-bold border border-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Popover Tooltip with Page Title */}
                    <span className="absolute left-9 px-2.5 py-1 bg-slate-900 text-amber-300 text-xs font-bold rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>صفحة {idx + 1}</span>
                      {l.page.title && <span className="text-slate-400 font-normal">: {l.page.title}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Jump to Last Page Button */}
            <button
              type="button"
              onClick={() => smoothScrollToPage(pageLayouts.length - 1)}
              disabled={activePageIndex >= pageLayouts.length - 1}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
              title="الصفحة الأخيرة"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}

        {/* Floating Vertical Continuous Document Navigation HUD - Safely positioned below header */}
        <div className="absolute top-18 sm:top-20 right-3 sm:right-4 z-20 flex items-center gap-2.5 bg-slate-950/95 backdrop-blur-md border border-emerald-500/40 text-emerald-200 px-3.5 py-2 rounded-2xl shadow-2xl text-xs font-black select-none animate-in fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          
          {/* Active Page Indicator & Clickable Dropdown Trigger */}
          <div className="relative flex flex-col text-right">
            <div className="flex items-center gap-1.5">
              <span className="text-white hidden sm:inline">تصفح متصل:</span>
              <button
                type="button"
                onClick={() => setIsQuickJumpOpen(prev => !prev)}
                className="text-amber-300 hover:text-amber-200 font-bold font-mono text-xs sm:text-sm px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900/80 rounded-xl border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                title="انقر للانتقال السريع إلى أي صفحة"
              >
                <span>الصفحة {activePageIndex + 1} من {project.pages.length}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isQuickJumpOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-normal mt-0.5 hidden sm:inline">
              عجلة الماوس 🖱️ أو السحب بالإصبع 📱 للتنقل السلس
            </span>

            {/* Quick Jump Page Selector Popover */}
            {isQuickJumpOpen && (
              <div className="absolute top-12 left-0 w-64 sm:w-72 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl p-2 z-50 max-h-80 overflow-y-auto divide-y divide-slate-800 animate-in fade-in zoom-in-95">
                <div className="p-2 text-xs font-bold text-slate-400 flex items-center justify-between">
                  <span>الانتقال السريع للصفحة</span>
                  <span className="text-emerald-400 font-mono">{project.pages.length} صفحات</span>
                </div>
                <div className="py-1 space-y-1">
                  {pageLayouts.map((layout, idx) => {
                    const isAct = idx === activePageIndex;
                    return (
                      <button
                        key={layout.page.id || idx}
                        type="button"
                        onClick={() => {
                          smoothScrollToPage(idx);
                          setIsQuickJumpOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isAct
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full ${isAct ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span className="truncate">صفحة {idx + 1}: {layout.page.title || 'صفحة الشرح'}</span>
                        </div>
                        {isAct && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                            النشطة
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 mr-1 border-r border-slate-700/80 pr-2">
            {/* Touch Device / Responsive Mode Switcher */}
            <button
              type="button"
              onClick={() => setTouchInteractionMode(prev => prev === 'pan' ? 'pen' : 'pan')}
              className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                touchInteractionMode === 'pan'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title={touchInteractionMode === 'pan' ? 'انقر للرسم بالقلم بالإصبع' : 'انقر للتمرير والسحب بالإصبع'}
            >
              {touchInteractionMode === 'pan' ? <Hand size={13} className="text-slate-950" /> : <Pencil size={13} />}
              <span className="hidden sm:inline">{touchInteractionMode === 'pan' ? 'سحب ✋' : 'قلم ✏️'}</span>
            </button>

            <button
              type="button"
              onClick={() => smoothScrollToPage(Math.max(0, activePageIndex - 1))}
              disabled={activePageIndex === 0}
              className="p-1.5 hover:bg-emerald-500/20 text-emerald-300 rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="التمرير للأعلى للصفحة السابقة"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              onClick={() => smoothScrollToPage(Math.min(project.pages.length - 1, activePageIndex + 1))}
              disabled={activePageIndex >= project.pages.length - 1}
              className="p-1.5 hover:bg-emerald-500/20 text-emerald-300 rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="التمرير للأسفل للصفحة التالية"
            >
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsPagesDrawerOpen(true)}
              className="px-2 py-1 hover:bg-emerald-500/20 text-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="عرض فهرس الصفحات"
            >
              <Layers size={13} />
              <span className="hidden sm:inline">الفهرس</span>
            </button>
            <button
              type="button"
              onClick={handleAddPage}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
              title="إضافة صفحة جديدة بالأسفل"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* Floating Text, Math Formulas, and Sticky Notes Overlay across Continuous Document */}
        {pageLayouts.flatMap(layout => {
          if (layout.page.showTextItems === false) return [];
          const containerH = canvasContainerRef.current?.clientHeight || 800;
          const viewTop = -panOffset.y / zoom;
          const viewBottom = (-panOffset.y + containerH) / zoom;
          const isLayoutVisible = (layout.y + layout.height >= viewTop - 500) && (layout.y <= viewBottom + 500);
          if (!isLayoutVisible) return [];

          return (layout.page.textItems || []).map(item => {
            const isSelected = selectedItemId === item.id;
            const left = (layout.x + item.x) * zoom + panOffset.x;
            const top = (layout.y + item.y) * zoom + panOffset.y;
            const opacity = layout.page.textItemsOpacity ?? 1;

            if (item.isFormula) {
              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(item.id);
                    setSelectedItemType('text');
                  }}
                  onDoubleClick={() => {
                    setEditingFormulaItemId(item.id);
                    setMathModalInitialLatex(item.latex || item.text);
                    setMathModalInitialColor(item.color || '#38bdf8');
                    setMathModalInitialIsChem(!!item.isChemistry);
                    setIsMathModalOpen(true);
                  }}
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${item.width * zoom}px`,
                    height: `${item.height * zoom}px`,
                    backgroundColor: item.bgColor || 'rgba(15, 23, 42, 0.95)',
                    borderColor: item.borderColor || item.color || '#38bdf8',
                    opacity
                  }}
                  className={`absolute p-3 rounded-2xl border-2 transition-shadow select-none flex items-center justify-center shadow-xl backdrop-blur-md ${
                    (isStudyMode || activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'laser')
                      ? 'pointer-events-none'
                      : 'pointer-events-auto cursor-move'
                  } ${
                    isSelected ? 'ring-4 ring-teal-400 ring-offset-2 ring-offset-slate-950 scale-[1.01]' : 'hover:border-teal-400/80'
                  }`}
                  title="معادلة رياضية / كيميائية (انقر نقراً مزدوجاً للتعديل)"
                >
                  {item.renderedSvgDataUrl ? (
                    <img
                      src={item.renderedSvgDataUrl}
                      alt={item.latex || item.text}
                      className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-sm select-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="font-mono text-center text-teal-300 font-bold overflow-hidden text-ellipsis">
                      {item.latex || item.text}
                    </div>
                  )}

                  {/* Formula Selection Toolbar */}
                  {isSelected && (
                    <div className="absolute -top-9 left-0 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md text-white p-1 rounded-xl shadow-2xl border border-teal-500/50 z-30">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFormulaItemId(item.id);
                          setMathModalInitialLatex(item.latex || item.text);
                          setMathModalInitialColor(item.color || '#38bdf8');
                          setMathModalInitialIsChem(!!item.isChemistry);
                          setIsMathModalOpen(true);
                        }}
                        className="px-2 py-0.5 bg-teal-600 hover:bg-teal-500 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles size={12} />
                        <span>تعديل المعادلة</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                        className="p-1 text-rose-400 hover:bg-rose-950 rounded-lg cursor-pointer"
                        title="حذف المعادلة"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItemId(item.id);
                  setSelectedItemType('text');
                }}
                onDoubleClick={() => setEditingTextItem(item)}
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${item.width * zoom}px`,
                  minHeight: `${item.height * zoom}px`,
                  backgroundColor: item.bgColor || 'transparent',
                  color: item.color,
                  fontSize: `${item.fontSize * zoom}px`,
                  opacity
                }}
                className={`absolute p-2.5 rounded-xl transition-shadow select-none ${
                  (isStudyMode || activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'laser')
                    ? 'pointer-events-none'
                    : 'pointer-events-auto cursor-move'
                } ${
                  item.isSticky ? 'shadow-lg border-2 border-amber-300' : ''
                } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-900' : ''}`}
              >
                <div className="whitespace-pre-wrap font-bold leading-relaxed">{item.text}</div>
                {isSelected && (
                  <div className="absolute -top-7 left-0 flex items-center gap-1 bg-slate-900 text-white p-1 rounded-lg shadow-md border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setEditingTextItem(item)}
                      className="px-2 py-0.5 bg-indigo-600 rounded text-[10px] font-bold cursor-pointer"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-0.5 text-rose-400 hover:bg-rose-950 rounded cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          });
        })}

        {/* Floating Controls for Selected Images (OCR, Delete, Info) across Continuous Document */}
        {pageLayouts.flatMap(layout => {
          if (layout.page.showImageItems === false) return [];
          return (layout.page.imageItems || []).map(imgItem => {
            const isSelected = selectedItemId === imgItem.id;
            if (!isSelected) return null;
            const left = (layout.x + imgItem.x) * zoom + panOffset.x;
            const top = (layout.y + imgItem.y) * zoom + panOffset.y;

            return (
              <div
                key={imgItem.id}
                style={{
                  left: `${left}px`,
                  top: `${top - 36}px`,
                  width: `${imgItem.width * zoom}px`
                }}
                className="absolute pointer-events-auto flex items-center justify-between gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700 px-2 py-1 rounded-xl shadow-xl z-20"
                dir="rtl"
              >
                <button
                  type="button"
                  onClick={() => handleRunOcrOnSelectedImage(imgItem.src)}
                  disabled={isOcrLoading}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  title="استخراج نص ومعادلات المسألة بالذكاء الاصطناعي"
                >
                  <Sparkles size={13} className={isOcrLoading ? 'animate-spin text-amber-300' : 'text-amber-300'} />
                  <span>{isOcrLoading ? 'جاري الاستخراج...' : 'قراءة بالذكاء الاصطناعي 🪄'}</span>
                </button>

                {/* Set as full page background */}
                <button
                  type="button"
                  onClick={() => {
                    setProject(prev => {
                      const pages = [...prev.pages];
                      const p = pages[layout.index];
                      if (!p) return prev;
                      pages[layout.index] = {
                        ...p,
                        backgroundImage: imgItem.src,
                        showPdfBackground: true,
                        imageItems: (p.imageItems || []).filter(im => im.id !== imgItem.id)
                      };
                      return { ...prev, pages };
                    });
                    setSelectedItemId(null);
                    setSelectedItemType(null);
                    saveSnapshotToHistory();
                    setSaveNotice('🖼️ تم تثبيت الصورة كخلفية لصفحة اللوح، يمكنك الآن الكتابة والشرح عليها بحرية!');
                    setTimeout(() => setSaveNotice(''), 3000);
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-600/70 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  title="تثبيت الصورة كخلفية كاملة لصفحة اللوح للكتابة فوقها مثل ورقة عمل"
                >
                  <Maximize size={12} />
                  <span className="hidden sm:inline">كخلفية كاملة</span>
                </button>

                {/* Resize controls */}
                <div className="flex items-center gap-1 bg-slate-800/80 px-1 py-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setProject(prev => {
                        const pages = [...prev.pages];
                        const p = pages[layout.index];
                        if (!p) return prev;
                        pages[layout.index] = {
                          ...p,
                          imageItems: (p.imageItems || []).map(im => {
                            if (im.id === imgItem.id) {
                              return { ...im, width: Math.round(im.width * 1.15), height: Math.round(im.height * 1.15) };
                            }
                            return im;
                          })
                        };
                        return { ...prev, pages };
                      });
                      saveSnapshotToHistory();
                    }}
                    className="w-5 h-5 flex items-center justify-center hover:bg-slate-700 text-slate-200 rounded text-xs font-black cursor-pointer"
                    title="تكبير حجم الصورة"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProject(prev => {
                        const pages = [...prev.pages];
                        const p = pages[layout.index];
                        if (!p) return prev;
                        pages[layout.index] = {
                          ...p,
                          imageItems: (p.imageItems || []).map(im => {
                            if (im.id === imgItem.id) {
                              return { ...im, width: Math.max(80, Math.round(im.width * 0.85)), height: Math.max(60, Math.round(im.height * 0.85)) };
                            }
                            return im;
                          })
                        };
                        return { ...prev, pages };
                      });
                      saveSnapshotToHistory();
                    }}
                    className="w-5 h-5 flex items-center justify-center hover:bg-slate-700 text-slate-200 rounded text-xs font-black cursor-pointer"
                    title="تصغير حجم الصورة"
                  >
                    -
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteItem(imgItem.id)}
                  className="p-1 text-rose-400 hover:bg-rose-950/60 rounded-lg cursor-pointer"
                  title="حذف الصورة"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          });
        })}

        {/* Interactive STEM Objects across Continuous Document */}
        {pageLayouts.flatMap(layout => {
          if (layout.page.showStemItems === false) return [];
          const pageIdx = layout.index;
          return (layout.page.stemItems || []).map(stemItem => {
            const isSelected = selectedItemId === stemItem.id || selectedStemId === stemItem.id;
            const left = (layout.x + stemItem.x) * zoom + panOffset.x;
            const top = (layout.y + stemItem.y) * zoom + panOffset.y;
            const opacity = layout.page.stemItemsOpacity ?? 1;

            return (
              <div
                key={stemItem.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedItemId(stemItem.id);
                  setSelectedStemId(stemItem.id);
                  setSelectedItemType('stem' as any);
                  
                  const clientX = e.clientX;
                  const clientY = e.clientY;
                  const startX = stemItem.x;
                  const startY = stemItem.y;

                  const onMove = (moveEvt: PointerEvent) => {
                    const dx = (moveEvt.clientX - clientX) / zoom;
                    const dy = (moveEvt.clientY - clientY) / zoom;
                    setProject(prev => {
                      const pages = [...prev.pages];
                      const curPage = pages[pageIdx];
                      if (!curPage) return prev;
                      pages[pageIdx] = {
                        ...curPage,
                        stemItems: (curPage.stemItems || []).map(si => si.id === stemItem.id ? {
                          ...si,
                          x: Math.round(startX + dx),
                          y: Math.round(startY + dy)
                        } : si)
                      };
                      return { ...prev, pages };
                    });
                  };

                  const onUp = () => {
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                    saveSnapshotToHistory();
                  };

                  window.addEventListener('pointermove', onMove);
                  window.addEventListener('pointerup', onUp);
                }}
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${stemItem.width * zoom}px`,
                  height: `${stemItem.height * zoom}px`,
                  transform: stemItem.rotation ? `rotate(${stemItem.rotation}deg)` : undefined,
                  opacity
                }}
                className={`absolute select-none transition-shadow ${
                  (isStudyMode || activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'laser')
                    ? 'pointer-events-none'
                    : 'pointer-events-auto cursor-move'
                } ${
                  isSelected 
                    ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 shadow-2xl z-30' 
                    : 'hover:ring-1 hover:ring-indigo-400/60 z-10'
                }`}
              >
                <StemObjectRenderer
                  item={stemItem}
                  isSelected={isSelected}
                  zoom={zoom}
                />
              </div>
            );
          });
        })}
      </div>

      {/* STEM Contextual Parameter Inspector */}
      {(() => {
        let activeStem: StemItem | undefined;
        let stemLayout = pageLayouts[activePageIndex];
        for (const layout of pageLayouts) {
          const found = (layout.page.stemItems || []).find(si => si.id === selectedStemId || si.id === selectedItemId);
          if (found) {
            activeStem = found;
            stemLayout = layout;
            break;
          }
        }
        if (!activeStem || !stemLayout) return null;
        const adjustedPanOffset = {
          x: panOffset.x + stemLayout.x * zoom,
          y: panOffset.y + stemLayout.y * zoom
        };
        return (
          <StemItemInspector
            item={activeStem}
            zoom={zoom}
            panOffset={adjustedPanOffset}
            onUpdateItem={handleUpdateStemItem}
            onDuplicateItem={handleDuplicateStemItem}
            onDeleteItem={handleDeleteStemItem}
            onClose={() => {
              setSelectedStemId(null);
              setSelectedItemId(null);
            }}
          />
        );
      })()}

      {/* STEM Teacher Side Panel / Drawer */}
      <StemSidePanel
        isOpen={isStemPanelOpen}
        onClose={() => setIsStemPanelOpen(false)}
        onInsertStemItem={handleInsertStemItem}
        teacherName={project.teacherName || teacherName || 'أ. دهم عبد اللطيف'}
        teacherTitle="أستاذ الرياضيات والذكاء الاصطناعي"
      />

      {/* Inline Text Editor Dialog */}
      {editingTextItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-amber-300">
                {editingTextItem.isSticky ? 'تحرير الملاحظة اللاصقة 📌' : 'تحرير النص'}
              </h4>
              <button
                type="button"
                onClick={() => setEditingTextItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={editingTextItem.text}
              onChange={(e) => setEditingTextItem({ ...editingTextItem, text: e.target.value })}
              rows={4}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-400"
              placeholder="اكتب هنا..."
              autoFocus
            />

            {editingTextItem.isSticky && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">لون البطاقة:</span>
                {[
                  { name: 'أصفر', color: '#FEF08A' },
                  { name: 'أخضر', color: '#BBF7D0' },
                  { name: 'وردي', color: '#FECDD3' },
                  { name: 'أزرق', color: '#BAE6FD' },
                  { name: 'بنفسجي', color: '#DDD6FE' }
                ].map(c => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setEditingTextItem({ ...editingTextItem, bgColor: c.color })}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                      editingTextItem.bgColor === c.color ? 'scale-125 border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingTextItem(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setProject(prev => {
                    const pages = [...prev.pages];
                    pages[activePageIndex] = {
                      ...pages[activePageIndex],
                      textItems: pages[activePageIndex].textItems?.map(t => 
                        t.id === editingTextItem.id ? editingTextItem : t
                      )
                    };
                    return { ...prev, pages };
                  });
                  setEditingTextItem(null);
                  saveSnapshotToHistory();
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                حفظ النص ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pages Drawer */}
      <WhiteboardPagesDrawer
        isOpen={isPagesDrawerOpen}
        onClose={() => setIsPagesDrawerOpen(false)}
        pages={project.pages}
        currentPageIndex={activePageIndex}
        onSelectPage={(idx) => {
          setActivePageIndex(idx);
          scrollToPage(idx);
        }}
        onAddPage={handleAddPage}
        onInsertPageAt={handleInsertPageAt}
        onInsertBlankPageBeside={handleInsertBlankPageBeside}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        onQuickPdfImport={() => quickPdfInputRef.current?.click()}
        onOpenPdfImport={() => pdfInputRef.current?.click()}
      />

      {/* Projects and Saved Boards Modal */}
      <WhiteboardProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        projects={savedProjectsList}
        currentProjectId={project.id}
        onSelectProject={(proj) => {
          setProject(proj);
          setActivePageIndex(0);
        }}
        onNewProject={(title, bg) => {
          const newProj: WhiteboardProject = {
            id: `board_${Date.now()}`,
            title,
            teacherId: teacherId || 'teacher_guest',
            teacherName: teacherName || 'المعلم',
            pages: [createDefaultPage('p1', 'صفحة 1', bg || 'ruled', activeTheme)],
            activePageIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setProject(newProj);
          setActivePageIndex(0);
          persistProject(newProj);
        }}
        onDeleteProject={async (projId) => {
          await deleteWhiteboardProjectFromStorage(projId);
          try {
            await deleteDoc(doc(db, 'whiteboardProjects', projId));
          } catch (e) {}
          setSavedProjectsList(prev => prev.filter(p => p.id !== projId));
        }}
        onRenameProject={(projId, newTitle) => {
          setSavedProjectsList(prev => prev.map(p => p.id === projId ? { ...p, title: newTitle } : p));
          if (project.id === projId) {
            setProject(prev => ({ ...prev, title: newTitle }));
          }
        }}
      />

      {/* Unified Import Files & Images Modal (PDFs, Device Images, Worksheets, Clipboard) */}
      <WhiteboardImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSelectPdfFile={processPdfFile}
        onInsertImageFile={processImageFile}
        onOpenEducationalLibrary={() => setIsEducationalImageModalOpen(true)}
        onPasteFromClipboard={handlePasteFromClipboard}
      />

      {/* Interactive PDF Page Selector & Spread Mode Modal */}
      <PdfImportSelectorModal
        isOpen={isPdfSelectorOpen}
        onClose={() => {
          setIsPdfSelectorOpen(false);
          setPdfDocInfo(null);
        }}
        pdfInfo={pdfDocInfo}
        isLoading={isPdfLoading}
        onConfirmImport={handleConfirmPdfImport}
      />

      {/* Educational Graphics, Diagrams & Image Search Library Modal */}
      <EducationalImageModal
        isOpen={isEducationalImageModalOpen}
        onClose={() => setIsEducationalImageModalOpen(false)}
        onInsertImage={handleInsertEducationalImage}
      />

      {/* High-Res Image & PDF Export / Student Share Modal */}
      <WhiteboardExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        activePageIndex={activePageIndex}
        renderPageToOffscreenCanvas={renderPageToOffscreenCanvas}
        onShowNotice={(msg) => {
          setSaveNotice(msg);
          setTimeout(() => setSaveNotice(''), 3500);
        }}
      />

      {/* MathJax and Chemistry Equation Editor Modal */}
      <MathFormulaModal
        isOpen={isMathModalOpen}
        onClose={() => {
          setIsMathModalOpen(false);
          setEditingFormulaItemId(null);
        }}
        onInsertFormula={handleInsertMathFormula}
        initialLatex={mathModalInitialLatex}
        initialColor={mathModalInitialColor}
        initialIsChemistry={mathModalInitialIsChem}
      />

      {/* Real-time Lesson Notes & Scratchpad Drawer */}
      <WhiteboardNotesDrawer
        isOpen={isNotesDrawerOpen}
        onClose={() => setIsNotesDrawerOpen(false)}
        notes={lessonNotes}
        onNotesChange={setLessonNotes}
        onConvertToSticky={handleInsertNoteAsSticky}
      />
    </div>
  );
};
