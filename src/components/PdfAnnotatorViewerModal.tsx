import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Bookmark,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Highlighter,
  MessageSquare,
  Eye,
  ZoomIn,
  ZoomOut,
  Info,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Share2,
  Download,
  Volume2,
  VolumeX,
  MousePointerClick,
  Square,
  Search,
  Check,
  HelpCircle,
  Layers,
  ScrollText,
  ArrowDown,
  ArrowUp,
  Infinity as InfinityIcon,
  RotateCcw,
  RotateCw,
  Database,
  Cloud,
  RefreshCw,
  Edit3,
  Maximize2,
  Minimize2,
  Sliders,
  Image as ImageIcon,
  ImagePlus,
  Move,
  UploadCloud,
  Minus,
  Camera,
  SwitchCamera,
  Smartphone,
  Hand,
  Grab
} from 'lucide-react';
import { EducationalResourceDoc, PdfAnnotation } from '../types/educationalResources';
import {
  savePdfAnnotationsToFirestore,
  subscribeToPdfAnnotations,
  fetchPdfAnnotationsFromFirestore,
  savePageRotationsToFirestore
} from '../lib/pdfAnnotationsFirestore';
import html2canvas from 'html2canvas';

interface PdfAnnotatorViewerModalProps {
  resource: EducationalResourceDoc;
  mode: 'teacher' | 'student';
  currentTeacherName?: string;
  onClose: () => void;
  onUpdateAnnotations?: (updatedAnnotations: PdfAnnotation[]) => Promise<void> | void;
}

const COLOR_MAP: Record<
  PdfAnnotation['color'],
  {
    bg: string;
    border: string;
    badge: string;
    text: string;
    label: string;
    hex: string;
    inlineBg: string;
  }
> = {
  amber: {
    bg: 'bg-amber-400/25',
    border: 'border-amber-400',
    badge: 'bg-amber-500 text-slate-950',
    text: 'text-amber-300',
    label: 'تنبيه وملاحظة أساسية',
    hex: '#fbbf24',
    inlineBg: 'bg-amber-400/30 text-amber-100 hover:bg-amber-400/45 border-b-2 border-amber-400'
  },
  emerald: {
    bg: 'bg-emerald-400/25',
    border: 'border-emerald-400',
    badge: 'bg-emerald-500 text-slate-950',
    text: 'text-emerald-300',
    label: 'قانون ومفهوم رئيسي',
    hex: '#34d399',
    inlineBg: 'bg-emerald-400/30 text-emerald-100 hover:bg-emerald-400/45 border-b-2 border-emerald-400'
  },
  indigo: {
    bg: 'bg-indigo-400/25',
    border: 'border-indigo-400',
    badge: 'bg-indigo-500 text-white',
    text: 'text-indigo-300',
    label: 'توجيه امتحانات وبجروت',
    hex: '#818cf8',
    inlineBg: 'bg-indigo-400/30 text-indigo-100 hover:bg-indigo-400/45 border-b-2 border-indigo-400'
  },
  rose: {
    bg: 'bg-rose-400/25',
    border: 'border-rose-400',
    badge: 'bg-rose-500 text-white',
    text: 'text-rose-300',
    label: 'خطأ شائع يجب تجنبه',
    hex: '#fb7185',
    inlineBg: 'bg-rose-400/30 text-rose-100 hover:bg-rose-400/45 border-b-2 border-rose-400'
  },
  sky: {
    bg: 'bg-sky-400/25',
    border: 'border-sky-400',
    badge: 'bg-sky-500 text-slate-950',
    text: 'text-sky-300',
    label: 'إثراء ومعلومة إضافية',
    hex: '#38bdf8',
    inlineBg: 'bg-sky-400/30 text-sky-100 hover:bg-sky-400/45 border-b-2 border-sky-400'
  }
};

export const PdfAnnotatorViewerModal: React.FC<PdfAnnotatorViewerModalProps> = ({
  resource,
  mode,
  currentTeacherName = 'أ. د. زكي أبو علان',
  onClose,
  onUpdateAnnotations
}) => {
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>(
    resource.pdf_annotations || []
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSlideDirection, setPageSlideDirection] = useState<'next' | 'prev'>('next');
  const [viewMode, setViewMode] = useState<'continuous' | 'single'>('continuous'); // Default to continuous vertical organization!
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeColor, setActiveColor] = useState<PdfAnnotation['color']>('amber');
  const [isToolActive, setIsToolActive] = useState<boolean>(true);
  const [toolSubMode, setToolSubMode] = useState<'text_highlight' | 'area_box' | 'pan'>('text_highlight');
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [filterColor, setFilterColor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // PDF Page Rotation state (0, 90, 180, 270 degrees per page)
  const [pageRotations, setPageRotations] = useState<Record<number, number>>(() => {
    try {
      const cached = localStorage.getItem(`pdf_page_rotations_${resource.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<number, number>;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached page rotations:', e);
    }
    return resource.page_rotations || {};
  });

  // Rotate a page by 90-degree increments and persist the state
  const handleRotatePage = useCallback((pageNumber: number, delta: number = 90) => {
    setPageRotations((prev) => {
      const currentAngle = prev[pageNumber] || 0;
      const newAngle = ((currentAngle + delta) % 360 + 360) % 360;
      const nextRotations = { ...prev, [pageNumber]: newAngle };
      try {
        localStorage.setItem(`pdf_page_rotations_${resource.id}`, JSON.stringify(nextRotations));
      } catch (e) {
        console.warn('Failed to cache page rotation to localStorage:', e);
      }
      savePageRotationsToFirestore(resource.id, nextRotations).catch((err) => {
        console.warn('Failed to sync page rotation to Firestore:', err);
      });
      return nextRotations;
    });
  }, [resource.id]);

  // Reset page rotation back to 0°
  const handleResetPageRotation = useCallback((pageNumber: number) => {
    setPageRotations((prev) => {
      const nextRotations = { ...prev, [pageNumber]: 0 };
      try {
        localStorage.setItem(`pdf_page_rotations_${resource.id}`, JSON.stringify(nextRotations));
      } catch (e) {
        console.warn('Failed to cache page rotation to localStorage:', e);
      }
      savePageRotationsToFirestore(resource.id, nextRotations).catch((err) => {
        console.warn('Failed to sync page rotation to Firestore:', err);
      });
      return nextRotations;
    });
  }, [resource.id]);


  // Floating Toolbar for Text Selection
  const [floatingToolbar, setFloatingToolbar] = useState<{
    x: number;
    y: number;
    selectedText: string;
    targetPage: number;
    coords: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Selection state for Area Box drag (in teacher mode)
  const [isSelectingArea, setIsSelectingArea] = useState<boolean>(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [areaDragTargetPage, setAreaDragTargetPage] = useState<number>(1);
  
  // Pending note modal
  const [draftNote, setDraftNote] = useState<string>('');
  const [pendingSelection, setPendingSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    snippet?: string;
    targetPage?: number;
  } | null>(null);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Infinite Scrolling & Smooth Page Transition states
  const [transitioningPage, setTransitioningPage] = useState<number | null>(null);
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] = useState<boolean>(true);
  const [infiniteLoopCycle, setInfiniteLoopCycle] = useState<number>(1);
  const [showScrollToTop, setShowScrollToTop] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Scroll-stop active page spotlight & highlight states (.pdf-viewer-container)
  const [scrollStoppedPage, setScrollStoppedPage] = useState<number | null>(null);
  const [isScrollHighlightActive, setIsScrollHighlightActive] = useState<boolean>(false);
  const scrollStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollHighlightFadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Floating Resizable Image Annotation states
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingFileOverViewer, setIsDraggingFileOverViewer] = useState<boolean>(false);
  const [activeDragTargetPage, setActiveDragTargetPage] = useState<number>(1);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<{ url: string; title: string } | null>(null);

  // Pen stroke thickness for whiteboard annotations (1px to 20px)
  const [penStrokeThickness, setPenStrokeThickness] = useState<number>(4);

  // Moving & Resizing active floating image
  const [activeMovingImageId, setActiveMovingImageId] = useState<string | null>(null);
  const [activeResizingImageId, setActiveResizingImageId] = useState<string | null>(null);
  const dragImageRef = useRef<{
    annoId: string;
    targetPage: number;
    startClientX: number;
    startClientY: number;
    initialCoords: { x: number; y: number; width: number; height: number };
    pageRect: DOMRect;
  } | null>(null);

  // Device camera capture state & refs for whiteboard page insertion
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Mobile / Tablet touch & pinch-to-zoom state
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const zoomLevelRef = useRef<number>(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  const [pinchFeedback, setPinchFeedback] = useState<{
    active: boolean;
    zoom: number;
    source: 'pinch' | 'double-tap' | 'manual';
  }>({
    active: false,
    zoom: 100,
    source: 'pinch'
  });

  // Pan tool state (drag canvas / document to navigate freely)
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  isPanningRef.current = isPanning;
  const toolSubModeRef = useRef<'text_highlight' | 'area_box' | 'pan'>(toolSubMode);
  toolSubModeRef.current = toolSubMode;
  const panStartRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0
  });

  const pinchStateRef = useRef<{
    isPinching: boolean;
    initialDistance: number;
    initialZoom: number;
    initialCenter?: { x: number; y: number };
    initialScrollTop?: number;
    initialScrollLeft?: number;
  }>({
    isPinching: false,
    initialDistance: 0,
    initialZoom: 100
  });

  const pinchTimeoutRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const textContentRef = useRef<HTMLDivElement | null>(null);

  // Split resource content into logical pages
  const contentPages = useMemo(() => {
    const raw = resource.content || '';
    const paragraphs = raw.split(/\n\s*\n/).filter(Boolean);
    if (paragraphs.length <= 3) {
      return [paragraphs.join('\n\n')];
    }
    const chunks: string[] = [];
    const size = Math.ceil(paragraphs.length / (resource.page_count || 3));
    for (let i = 0; i < paragraphs.length; i += size) {
      chunks.push(paragraphs.slice(i, i + size).join('\n\n'));
    }
    return chunks.length > 0 ? chunks : [raw];
  }, [resource.content, resource.page_count]);

  const totalPages = Math.max(contentPages.length, resource.page_count || 1);

  // Annotations for the current page
  const currentPageAnnotations = useMemo(() => {
    return annotations.filter((a) => a.pageNumber === currentPage);
  }, [annotations, currentPage]);

  // Filtered annotations for sidebar
  const filteredAnnotations = useMemo(() => {
    return annotations.filter((a) => {
      const matchColor = filterColor === 'all' || a.color === filterColor;
      const q = (searchQuery || '').toLowerCase();
      const matchQuery =
        !searchQuery.trim() ||
        (a.note || '').toLowerCase().includes(q) ||
        (a.highlightText && (a.highlightText || '').toLowerCase().includes(q));
      return matchColor && matchQuery;
    });
  }, [annotations, filterColor, searchQuery]);

  // Voice narration of teacher note
  const speakNote = useCallback((textToSpeak: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking]);

  // =========================================================================
  // 1. TEXT HIGHLIGHTING SELECTION HANDLER (Selection API)
  // =========================================================================
  const handleMouseUpCapture = () => {
    if (mode !== 'teacher' || !isToolActive || toolSubMode !== 'text_highlight') return;

    // Small delay to let browser finish updating selection
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setFloatingToolbar(null);
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length < 2) {
        setFloatingToolbar(null);
        return;
      }

      try {
        const range = selection.getRangeAt(0);
        const startNode = range.startContainer.nodeType === Node.TEXT_NODE 
          ? range.startContainer.parentElement 
          : (range.startContainer as HTMLElement);
        
        // Find closest enclosing page container to identify exact page
        const pageElem = startNode?.closest('[data-page-number]') as HTMLElement | null;
        const pageNumber = pageElem ? parseInt(pageElem.getAttribute('data-page-number') || '1', 10) : currentPage;
        const container = pageElem || pageContainerRef.current;
        if (!container) return;

        const rangeRect = range.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Check if inside container
        if (rangeRect.width === 0 || rangeRect.height === 0) return;

        const x = Math.max(0, Math.min(95, ((rangeRect.left - containerRect.left) / containerRect.width) * 100));
        const y = Math.max(0, Math.min(95, ((rangeRect.top - containerRect.top) / containerRect.height) * 100));
        const width = Math.min(100 - x, Math.max(4, (rangeRect.width / containerRect.width) * 100));
        const height = Math.min(100 - y, Math.max(2.5, (rangeRect.height / containerRect.height) * 100));

        // Fixed screen coordinates for floating action bar with safe boundaries clamping
        const safeMargin = 16;
        const toolbarHalfWidth = 140;
        const rawX = rangeRect.left + rangeRect.width / 2;
        const toolbarX = Math.max(toolbarHalfWidth + safeMargin, Math.min(window.innerWidth - toolbarHalfWidth - safeMargin, rawX));
        const toolbarY = Math.max(68, Math.min(window.innerHeight - 80, rangeRect.top - 54));

        setFloatingToolbar({
          x: toolbarX,
          y: toolbarY,
          selectedText: text,
          targetPage: pageNumber,
          coords: { x, y, width, height }
        });
      } catch (err) {
        console.warn('Selection calculation issue:', err);
      }
    }, 20);
  };

  // Trigger Add Note from Floating Text Toolbar
  const handleHighlightSelectionWithColor = (color: PdfAnnotation['color']) => {
    if (!floatingToolbar) return;
    setActiveColor(color);
    setPendingSelection({
      ...floatingToolbar.coords,
      snippet: floatingToolbar.selectedText,
      targetPage: floatingToolbar.targetPage
    });
    setDraftNote('');
    setFloatingToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  // =========================================================================
  // 2. AREA BOX DRAG SELECTION HANDLER (For Diagrams / Tables)
  // =========================================================================
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'teacher' || !isToolActive || toolSubMode !== 'area_box') return;
    const target = e.currentTarget;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setIsSelectingArea(true);
    setSelectionStart({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
    setPendingSelection(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelectingArea || !selectionStart || mode !== 'teacher' || toolSubMode !== 'area_box') return;
    const target = e.currentTarget;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    const x = Math.max(0, Math.min(selectionStart.x, currentX));
    const y = Math.max(0, Math.min(selectionStart.y, currentY));
    const width = Math.min(100 - x, Math.abs(currentX - selectionStart.x));
    const height = Math.min(100 - y, Math.abs(currentY - selectionStart.y));

    setCurrentRect({ x, y, width, height });
  };

  const handleMouseUpArea = () => {
    if (!isSelectingArea || !currentRect || mode !== 'teacher' || toolSubMode !== 'area_box') return;
    setIsSelectingArea(false);
    setSelectionStart(null);

    if (currentRect.width > 2 && currentRect.height > 2) {
      setPendingSelection({
        ...currentRect,
        snippet: undefined,
        targetPage: areaDragTargetPage || currentPage
      });
      setCurrentRect(null);
      setDraftNote('');
    } else {
      setCurrentRect(null);
    }
  };

  // =========================================================================
  // 3. PAN TOOL (DRAG CANVAS & DOCUMENT NAVIGATION FOR TEACHERS)
  // =========================================================================
  const handlePanStart = useCallback((clientX: number, clientY: number, target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (element?.closest('button, input, select, textarea, [data-pan-ignore="true"], .resize-handle')) {
      return false;
    }
    const container = scrollContainerRef.current;
    if (!container) return false;

    setIsPanning(true);
    panStartRef.current = {
      x: clientX,
      y: clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    };
    return true;
  }, []);

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanningRef.current || !scrollContainerRef.current) return;
    const dx = clientX - panStartRef.current.x;
    const dy = clientY - panStartRef.current.y;
    scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  }, []);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Global mousemove/mouseup listener while mouse dragging to pan
  useEffect(() => {
    if (!isPanning) return;
    const onMouseMove = (e: MouseEvent) => {
      handlePanMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handlePanEnd();
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Spacebar quick shortcut to activate Pan mode temporarily
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        setToolSubMode('pan');
        setIsToolActive(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // State for high-resolution canvas download
  const [isDownloadingCanvas, setIsDownloadingCanvas] = useState<boolean>(false);

  // Download the canvas / active page as a high-resolution image with all teacher annotations preserved
  const handleDownloadCanvasImage = useCallback(async (targetMode: 'current_page' | 'full_canvas' = 'current_page') => {
    if (isDownloadingCanvas) return;
    setIsDownloadingCanvas(true);
    setImageNotice('جاري معالجة اللوح وتصديره كصورة عالية الدقة مع حفظ كامل الملاحظات والتظليلات... ⏳');

    try {
      // Find target DOM element: active page or entire scroll container
      const targetElement = targetMode === 'current_page'
        ? (document.getElementById(`pdf-page-${currentPage}`) || scrollContainerRef.current)
        : scrollContainerRef.current;

      if (!targetElement) {
        throw new Error('لم يتم العثور على مساحة العمل أو الصفحة المحددة.');
      }

      // Temporarily clear active annotation selection ring to avoid capturing selection borders or popovers
      const prevActiveId = activeAnnotationId;
      setActiveAnnotationId(null);

      // Brief delay to allow React state flush
      await new Promise((resolve) => setTimeout(resolve, 80));

      // Render high resolution canvas using html2canvas (scale 2.5 for crisp vector-like text & annotations)
      const capturedCanvas = await html2canvas(targetElement as HTMLElement, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#090d16',
        logging: false,
        imageTimeout: 15000,
        ignoreElements: (element) => {
          return (
            element.classList.contains('no-export') ||
            element.id === 'pdf-pan-active-hud' ||
            element.id === 'pdf-pinch-zoom-hud' ||
            element.id === 'whiteboard-camera-modal'
          );
        }
      });

      // Restore active annotation if any
      if (prevActiveId) {
        setActiveAnnotationId(prevActiveId);
      }

      // Export as high-quality PNG
      const imgDataUrl = capturedCanvas.toDataURL('image/png', 1.0);
      const cleanDocTitle = (resource.title || 'لوح_المعلم').trim().replace(/[^\w\u0600-\u06FF]+/g, '_');
      const filename = `${cleanDocTitle}_صفحة_${currentPage}_مع_ملاحظات_المعلم_${Date.now()}.png`;

      // Trigger automatic file download
      const downloadLink = document.createElement('a');
      downloadLink.href = imgDataUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setImageNotice(`🎉 تم بنجاح تنزيل صفحة ${currentPage} كصورة فائقة الدقة (PNG) مع كافة الملاحظات والرسومات!`);
      setTimeout(() => setImageNotice(null), 4500);
    } catch (err: any) {
      console.error('Error generating canvas image:', err);
      setImageNotice('حدث خطأ أثناء تنزيل الصورة، يرجى إعادة المحاولة.');
      setTimeout(() => setImageNotice(null), 4000);
    } finally {
      setIsDownloadingCanvas(false);
    }
  }, [currentPage, resource.title, activeAnnotationId, isDownloadingCanvas]);

  // Quick Annotation button
  const handleQuickAddAnnotation = () => {
    setPendingSelection({
      x: 10,
      y: 20 + (currentPageAnnotations.length * 15) % 60,
      width: 80,
      height: 12,
      snippet: 'توجيه وملاحظة عامة للصفحة',
      targetPage: currentPage
    });
    setDraftNote('');
  };

  // Save the new annotation (Persisted to Resource & Firestore)
  const handleSaveAnnotation = async () => {
    if (!pendingSelection || !draftNote.trim()) return;

    setIsSavingNote(true);
    const targetPage = pendingSelection.targetPage || currentPage;
    const newAnno: PdfAnnotation = {
      id: `anno-${Date.now()}`,
      pageNumber: targetPage,
      highlightText: pendingSelection.snippet,
      selectionCoords: {
        x: Math.round(pendingSelection.x),
        y: Math.round(pendingSelection.y),
        width: Math.round(pendingSelection.width),
        height: Math.round(pendingSelection.height)
      },
      note: draftNote.trim(),
      color: activeColor,
      strokeWidth: penStrokeThickness,
      authorName: currentTeacherName,
      createdAt: new Date().toISOString()
    };

    const updated = [...annotations, newAnno];
    setAnnotations(updated);
    setPendingSelection(null);
    setDraftNote('');
    setIsSavingNote(false);

    if (onUpdateAnnotations) {
      await onUpdateAnnotations(updated);
    }
  };

  // Delete annotation
  const handleDeleteAnnotation = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (mode !== 'teacher') return;

    const updated = annotations.filter((a) => a.id !== id);
    setAnnotations(updated);
    if (activeAnnotationId === id) setActiveAnnotationId(null);

    if (onUpdateAnnotations) {
      await onUpdateAnnotations(updated);
    }
  };

  // Helper to persist annotations to both callback and Firestore
  const persistAnnotationList = async (updated: PdfAnnotation[]) => {
    setAnnotations(updated);
    if (onUpdateAnnotations) {
      await onUpdateAnnotations(updated);
    }
    try {
      await savePdfAnnotationsToFirestore(resource.id, updated, {
        resourceTitle: resource.title,
        teacherName: currentTeacherName,
        subject: resource.subject
      });
    } catch (err) {
      console.warn('Direct Firestore annotation save note:', err);
    }
  };

  // Insert any image DataURL onto the specified whiteboard page as a floating, resizable annotation object
  const insertImageDataUrlAsAnnotation = useCallback(async (
    dataUrl: string, 
    targetPage: number = currentPage, 
    customTitle: string = 'صورة'
  ) => {
    const img = new Image();
    img.onload = async () => {
      const naturalWidth = img.naturalWidth || 640;
      const naturalHeight = img.naturalHeight || 480;
      const aspect = naturalWidth / Math.max(1, naturalHeight);

      // Responsive percentage sizing on whiteboard page (centered by default)
      const width = 45; // 45% width of page
      const height = Math.min(65, Math.max(16, Math.round((width / aspect) * 0.72)));
      const x = Math.max(5, Math.min(50, Math.round((100 - width) / 2)));
      const y = Math.max(10, Math.min(45, 15 + ((annotations.filter(a => a.pageNumber === targetPage).length * 8) % 35)));

      const cleanTitle = customTitle.replace(/\.[^/.]+$/, '');
      const newImageAnno: PdfAnnotation = {
        id: `anno-img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pageNumber: targetPage,
        isImageObject: true,
        imageUrl: dataUrl,
        imageTitle: cleanTitle,
        selectionCoords: {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height)
        },
        note: `عنصر صورة: ${cleanTitle}`,
        color: activeColor,
        strokeWidth: penStrokeThickness,
        authorName: currentTeacherName,
        createdAt: new Date().toISOString(),
        aspectRatio: aspect
      };

      const updated = [...annotations, newImageAnno];
      await persistAnnotationList(updated);
      setActiveAnnotationId(newImageAnno.id);

      setImageNotice(`📸 تم إدراج الصورة بنجاح كعنصر عائم فوق صفحة ${targetPage}`);
      setTimeout(() => setImageNotice(null), 4000);
    };
    img.src = dataUrl;
  }, [currentPage, annotations, activeColor, penStrokeThickness, currentTeacherName]);

  // Insert image file from local device as a floating resizable annotation object
  const insertImageFileAsAnnotation = async (file: File, targetPage: number = currentPage) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى تحديد ملف صورة صالح (PNG, JPG, WebP, SVG, GIF).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      await insertImageDataUrlAsAnnotation(dataUrl, targetPage, cleanTitle);
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await insertImageFileAsAnnotation(file, currentPage);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Camera streaming & capture lifecycle handlers
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop issue:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCameraStream = useCallback(async (facing: 'user' | 'environment') => {
    setIsCameraLoading(true);
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC_NOT_SUPPORTED');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Video auto-play interrupted:', playErr);
        });
      }
      setIsCameraLoading(false);
    } catch (err: any) {
      console.warn('Camera stream initialisation error:', err);
      setIsCameraLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('تم رفض إذن الوصول للكاميرا في هذا المتصفح. يمكنك التقاط صورة باستخدام كاميرا النظام عبر الزر المباشر بالأسفل.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('لم يتم العثور على كاميرا متصلة بالجهاز.');
      } else {
        setCameraError('تعذر تشغيل البث المباشر للكاميرا في المتصفح. يرجى استخدام التقاط كاميرا النظام بالأسفل.');
      }
    }
  }, [stopCameraStream]);

  const handleOpenLiveCamera = () => {
    setIsCameraModalOpen(true);
    setCapturedPhotoUrl(null);
    setCameraError(null);
    setTimeout(() => {
      startCameraStream(cameraFacingMode);
    }, 120);
  };

  const handleCloseCameraModal = () => {
    stopCameraStream();
    setIsCameraModalOpen(false);
    setCapturedPhotoUrl(null);
    setCameraError(null);
  };

  const handleToggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startCameraStream(nextFacing);
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // In user facing mode, flip horizontally for natural mirror behavior
    if (cameraFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhotoUrl(dataUrl);
    stopCameraStream();
  };

  const handleRetakeSnapshot = () => {
    setCapturedPhotoUrl(null);
    startCameraStream(cameraFacingMode);
  };

  const handleConfirmCapturedPhoto = async () => {
    if (!capturedPhotoUrl) return;
    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    await insertImageDataUrlAsAnnotation(capturedPhotoUrl, currentPage, `لقطة كاميرا - ${timeStr}`);
    handleCloseCameraModal();
  };

  const handleNativeCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await insertImageFileAsAnnotation(file, currentPage);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    handleCloseCameraModal();
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Drag and drop image files onto .pdf-viewer-container
  const handleViewerDragOver = (e: React.DragEvent) => {
    if (mode !== 'teacher') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFileOverViewer(true);

    const targetSheet = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement)?.closest('[data-page-number]') as HTMLElement | null;
    if (targetSheet) {
      const p = parseInt(targetSheet.getAttribute('data-page-number') || '1', 10);
      setActiveDragTargetPage(p);
    } else {
      setActiveDragTargetPage(currentPage);
    }
  };

  const handleViewerDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFileOverViewer(false);
  };

  const handleViewerDrop = async (e: React.DragEvent) => {
    if (mode !== 'teacher') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFileOverViewer(false);

    const files = Array.from(e.dataTransfer.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const targetSheet = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement)?.closest('[data-page-number]') as HTMLElement | null;
    const targetPage = targetSheet ? parseInt(targetSheet.getAttribute('data-page-number') || '1', 10) : activeDragTargetPage || currentPage;

    for (const file of imageFiles) {
      await insertImageFileAsAnnotation(file, targetPage);
    }
  };

  // Handlers for dragging and resizing floating image annotations
  const handleImageMoveStart = (e: React.MouseEvent, anno: PdfAnnotation, pageNumber: number) => {
    e.stopPropagation();
    if (mode !== 'teacher') return;

    const pageElement = document.getElementById(`pdf-page-${pageNumber}`);
    if (!pageElement) return;

    dragImageRef.current = {
      annoId: anno.id,
      targetPage: pageNumber,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialCoords: { ...anno.selectionCoords },
      pageRect: pageElement.getBoundingClientRect()
    };
    setActiveMovingImageId(anno.id);
    setActiveAnnotationId(anno.id);
  };

  const handleImageResizeStart = (e: React.MouseEvent, anno: PdfAnnotation, pageNumber: number) => {
    e.stopPropagation();
    if (mode !== 'teacher') return;

    const pageElement = document.getElementById(`pdf-page-${pageNumber}`);
    if (!pageElement) return;

    dragImageRef.current = {
      annoId: anno.id,
      targetPage: pageNumber,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialCoords: { ...anno.selectionCoords },
      pageRect: pageElement.getBoundingClientRect()
    };
    setActiveResizingImageId(anno.id);
    setActiveAnnotationId(anno.id);
  };

  // Moving and resizing listener
  useEffect(() => {
    if (!activeMovingImageId && !activeResizingImageId) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const state = dragImageRef.current;
      if (!state) return;

      const deltaX = ((e.clientX - state.startClientX) / state.pageRect.width) * 100;
      const deltaY = ((e.clientY - state.startClientY) / state.pageRect.height) * 100;

      if (activeMovingImageId) {
        const newX = Math.max(0, Math.min(100 - state.initialCoords.width, state.initialCoords.x + deltaX));
        const newY = Math.max(0, Math.min(100 - state.initialCoords.height, state.initialCoords.y + deltaY));

        setAnnotations((prev) =>
          prev.map((a) =>
            a.id === state.annoId
              ? {
                  ...a,
                  selectionCoords: {
                    ...a.selectionCoords,
                    x: Math.round(newX * 10) / 10,
                    y: Math.round(newY * 10) / 10
                  }
                }
              : a
          )
        );
      } else if (activeResizingImageId) {
        const newW = Math.max(12, Math.min(100 - state.initialCoords.x, state.initialCoords.width + deltaX));
        const newH = Math.max(8, Math.min(100 - state.initialCoords.y, state.initialCoords.height + deltaY));

        setAnnotations((prev) =>
          prev.map((a) =>
            a.id === state.annoId
              ? {
                  ...a,
                  selectionCoords: {
                    ...a.selectionCoords,
                    width: Math.round(newW * 10) / 10,
                    height: Math.round(newH * 10) / 10
                  }
                }
              : a
          )
        );
      }
    };

    const handleWindowMouseUp = async () => {
      if (dragImageRef.current) {
        setAnnotations((currentAnnos) => {
          persistAnnotationList(currentAnnos);
          return currentAnnos;
        });
      }
      setActiveMovingImageId(null);
      setActiveResizingImageId(null);
      dragImageRef.current = null;
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [activeMovingImageId, activeResizingImageId]);

  // =========================================================================
  // 3. INLINE TEXT HIGHLIGHTING RENDERER (Render sentences with highlights)
  // =========================================================================
  const renderPageContentWithHighlights = (targetPageNumber: number = currentPage) => {
    const rawText = contentPages[targetPageNumber - 1] || resource.content || '';
    const pageAnnos = annotations.filter((a) => a.pageNumber === targetPageNumber);
    const textAnnos = pageAnnos.filter(
      (a) => a.highlightText && a.highlightText.trim().length > 0
    );

    const dynamicTextStyle = {
      fontSize: `${Math.max(13, Math.min(26, Math.round(15 * (zoomLevel / 100))))}px`,
      lineHeight: 1.75
    };

    if (textAnnos.length === 0) {
      return (
        <div 
          className="text-slate-200 leading-relaxed space-y-4 font-sans whitespace-pre-line select-text transition-all duration-150"
          style={dynamicTextStyle}
        >
          {rawText}
        </div>
      );
    }

    // Split rawText into paragraphs
    const paragraphs = rawText.split('\n');

    return (
      <div 
        className="text-slate-200 leading-relaxed space-y-4 font-sans select-text transition-all duration-150"
        style={dynamicTextStyle}
      >
        {paragraphs.map((para, pIdx) => {
          if (!para.trim()) {
            return <div key={`p-empty-${pIdx}`} className="h-3" />;
          }

          // Search for text annotations that appear inside this paragraph
          interface Match {
            start: number;
            end: number;
            anno: PdfAnnotation;
          }

          const matches: Match[] = [];
          for (const anno of textAnnos) {
            const query = anno.highlightText!.trim();
            if (!query) continue;
            let startIndex = 0;
            while (startIndex < para.length) {
              const idx = para.indexOf(query, startIndex);
              if (idx === -1) break;
              matches.push({
                start: idx,
                end: idx + query.length,
                anno
              });
              startIndex = idx + query.length;
            }
          }

          if (matches.length === 0) {
            return <p key={`p-${pIdx}`} className="whitespace-pre-wrap">{para}</p>;
          }

          // Sort matches and remove overlapping segments safely
          matches.sort((a, b) => a.start - b.start);
          const nonOverlapping: Match[] = [];
          let lastEnd = -1;
          for (const m of matches) {
            if (m.start >= lastEnd) {
              nonOverlapping.push(m);
              lastEnd = m.end;
            }
          }

          // Assemble paragraph chunks
          const elements: React.ReactNode[] = [];
          let cursor = 0;

          nonOverlapping.forEach((match, mIdx) => {
            if (match.start > cursor) {
              elements.push(
                <span key={`plain-${pIdx}-${cursor}`}>
                  {para.slice(cursor, match.start)}
                </span>
              );
            }

            const c = COLOR_MAP[match.anno.color || 'amber'];
            const isActive = activeAnnotationId === match.anno.id;

            elements.push(
              <span
                key={`hl-${match.anno.id}-${mIdx}`}
                id={`highlight-text-${match.anno.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveAnnotationId(isActive ? null : match.anno.id);
                }}
                className={`inline-block relative rounded px-1.5 py-0.5 my-0.5 mx-0.5 font-medium transition-all cursor-pointer select-text ${c.inlineBg} ${
                  isActive
                    ? 'ring-2 ring-white shadow-xl scale-[1.02] z-30'
                    : 'hover:scale-[1.01]'
                }`}
                title={`تعليق المعلم: ${match.anno.note}`}
              >
                <span>{para.slice(match.start, match.end)}</span>
                
                {/* Note Indicator Pin */}
                <span
                  className={`inline-flex items-center justify-center align-middle mr-1.5 w-4 h-4 rounded-full text-[9px] font-black shadow-sm ${c.badge}`}
                >
                  💬
                </span>

                {/* Interactive Annotation Popover on click */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full right-0 mt-2 z-50 bg-slate-900 border-2 border-slate-700 rounded-2xl p-4 shadow-2xl w-80 sm:w-96 text-right space-y-3 cursor-default"
                      dir="rtl"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <div>
                            <span className="text-xs font-black text-white block">
                              {match.anno.authorName || 'معلم المادة'}
                            </span>
                            <span className="text-[10px] text-amber-300 font-bold">
                              {c.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => speakNote(match.anno.note)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isSpeaking
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                            }`}
                            title="الاستماع للتعليق صوتياً"
                          >
                            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            صـ {match.anno.pageNumber}
                          </span>
                        </div>
                      </div>

                      {/* Selected text quotation */}
                      <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded-xl border border-slate-800 font-mono leading-relaxed border-r-2 border-r-amber-400">
                        <span className="text-amber-400 font-bold">النص المميّز: </span>
                        «{match.anno.highlightText}»
                      </div>

                      {/* Teacher's Note */}
                      <div className="text-xs sm:text-sm text-amber-200 font-sans leading-relaxed bg-amber-950/30 p-3 rounded-xl border border-amber-500/30">
                        <strong className="block text-amber-400 text-xs mb-1">
                          💬 تعليق وتوضيح المعلم:
                        </strong>
                        {match.anno.note}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
                        <span>
                          {new Date(match.anno.createdAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        {mode === 'teacher' && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteAnnotation(match.anno.id, e)}
                            className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 p-1 hover:bg-rose-500/10 rounded cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>حذف التمييز</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </span>
            );

            cursor = match.end;
          });

          if (cursor < para.length) {
            elements.push(
              <span key={`plain-${pIdx}-${cursor}`}>{para.slice(cursor)}</span>
            );
          }

          return (
            <p key={`p-${pIdx}`} className="whitespace-pre-wrap leading-relaxed">
              {elements}
            </p>
          );
        })}
      </div>
    );
  };

  // Scroll to a specific page smoothly with vertical slide transition effect (300ms)
  const scrollToPage = (targetP: number) => {
    const clamped = Math.max(1, Math.min(totalPages, targetP));
    if (clamped !== currentPage) {
      setPageSlideDirection(clamped > currentPage ? 'next' : 'prev');
    }
    setCurrentPage(clamped);
    setTransitioningPage(clamped);
    setTimeout(() => {
      setTransitioningPage((prev) => (prev === clamped ? null : prev));
    }, 1600);

    if (viewMode === 'single') return;
    const el = document.getElementById(`pdf-page-${clamped}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Smooth Infinite Loop Trigger: scroll seamlessly back to page 1 for the next review cycle
  const handleInfiniteLoopCycle = () => {
    setInfiniteLoopCycle((prev) => prev + 1);
    scrollToPage(1);
  };

  // Quick return to top of document (Page 1)
  const handleScrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    scrollToPage(1);
    setCurrentPage(1);
  };

  // Toggle Full-screen / Expand mode for .pdf-viewer-container
  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  // Keyboard shortcut listener: Escape key exits full-screen mode, 'F' toggles full-screen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        e.stopPropagation();
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullScreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Scaled dimensions based on zoomLevel, screen full-screen status and sidebar
  const getZoomContainerStyle = (minH?: string) => {
    const baseMaxWidth = isFullScreen ? (isSidebarOpen ? 1350 : 1600) : 920;
    const scaledMaxWidth = Math.round(baseMaxWidth * Math.max(1, zoomLevel / 100));
    return {
      width: zoomLevel > 100 ? `${zoomLevel}%` : `${Math.max(70, zoomLevel)}%`,
      maxWidth: `${scaledMaxWidth}px`,
      ...(minH ? { minHeight: minH } : {})
    };
  };

  // Detect Touch screen support on device mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Multi-touch gestures: Pinch-to-zoom, Trackpad pinch & Touch Pan on .pdf-viewer-container
  useEffect(() => {
    const container = viewerContainerRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!container) return;

    const getTouchDistance = (touches: TouchList) => {
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
    };

    const getTouchCenter = (touches: TouchList) => {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Multi-touch pinch start
        const dist = getTouchDistance(e.touches);
        const center = getTouchCenter(e.touches);
        if (dist > 10) {
          pinchStateRef.current = {
            isPinching: true,
            initialDistance: dist,
            initialZoom: zoomLevelRef.current,
            initialCenter: center,
            initialScrollTop: scrollContainerRef.current?.scrollTop || 0,
            initialScrollLeft: scrollContainerRef.current?.scrollLeft || 0
          };
          if (pinchTimeoutRef.current) {
            window.clearTimeout(pinchTimeoutRef.current);
          }
          setPinchFeedback({
            active: true,
            zoom: zoomLevelRef.current,
            source: 'pinch'
          });
        }
      } else if (e.touches.length === 1) {
        // If in Pan tool mode, handle single-finger touch pan start
        if (toolSubModeRef.current === 'pan') {
          const t = e.touches[0];
          handlePanStart(t.clientX, t.clientY, e.target);
        }

        // Double-tap zoom detection (Quick toggle between 100% and 140%)
        const now = Date.now();
        const t = e.touches[0];
        const timeDiff = now - lastTapRef.current.time;
        const distDiff = Math.hypot(t.clientX - lastTapRef.current.x, t.clientY - lastTapRef.current.y);

        if (timeDiff > 40 && timeDiff < 320 && distDiff < 35) {
          const nextZoom = zoomLevelRef.current >= 130 ? 100 : 140;
          setZoomLevel(nextZoom);
          zoomLevelRef.current = nextZoom;
          setPinchFeedback({
            active: true,
            zoom: nextZoom,
            source: 'double-tap'
          });
          if (pinchTimeoutRef.current) {
            window.clearTimeout(pinchTimeoutRef.current);
          }
          pinchTimeoutRef.current = window.setTimeout(() => {
            setPinchFeedback((prev) => ({ ...prev, active: false }));
          }, 1400);
          lastTapRef.current = { time: 0, x: 0, y: 0 };
        } else {
          lastTapRef.current = { time: now, x: t.clientX, y: t.clientY };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        if (!pinchStateRef.current.isPinching) {
          const dist = getTouchDistance(e.touches);
          if (dist > 10) {
            pinchStateRef.current = {
              isPinching: true,
              initialDistance: dist,
              initialZoom: zoomLevelRef.current,
              initialCenter: getTouchCenter(e.touches),
              initialScrollTop: scrollContainerRef.current?.scrollTop || 0,
              initialScrollLeft: scrollContainerRef.current?.scrollLeft || 0
            };
          }
        }

        if (pinchStateRef.current.isPinching) {
          if (e.cancelable) {
            e.preventDefault();
          }

          const currentDist = getTouchDistance(e.touches);
          const { initialDistance, initialZoom } = pinchStateRef.current;

          if (initialDistance > 10) {
            const ratio = currentDist / initialDistance;
            const targetZoom = Math.round(initialZoom * ratio);
            // Clamp between 50% and 250%
            const clampedZoom = Math.min(250, Math.max(50, targetZoom));

            setZoomLevel(clampedZoom);
            zoomLevelRef.current = clampedZoom;
            setPinchFeedback({
              active: true,
              zoom: clampedZoom,
              source: 'pinch'
            });

            // Adjust scroll position to follow pinch center
            const currentCenter = getTouchCenter(e.touches);
            if (pinchStateRef.current.initialCenter && scrollContainerRef.current) {
              const deltaX = currentCenter.x - pinchStateRef.current.initialCenter.x;
              const deltaY = currentCenter.y - pinchStateRef.current.initialCenter.y;
              scrollContainerRef.current.scrollLeft = (pinchStateRef.current.initialScrollLeft || 0) - deltaX;
              scrollContainerRef.current.scrollTop = (pinchStateRef.current.initialScrollTop || 0) - deltaY;
            }
          }
        }
      } else if (toolSubModeRef.current === 'pan' && e.touches.length === 1 && isPanningRef.current) {
        const t = e.touches[0];
        handlePanMove(t.clientX, t.clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (pinchStateRef.current.isPinching && e.touches.length < 2) {
        pinchStateRef.current.isPinching = false;
        if (pinchTimeoutRef.current) {
          window.clearTimeout(pinchTimeoutRef.current);
        }
        pinchTimeoutRef.current = window.setTimeout(() => {
          setPinchFeedback((prev) => ({ ...prev, active: false }));
        }, 1200);
      }
      if (isPanningRef.current && e.touches.length === 0) {
        handlePanEnd();
      }
    };

    // Trackpad / Touchpad Pinch-to-zoom (Ctrl + Wheel)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.4;
        const currentZ = zoomLevelRef.current;
        const nextZoom = Math.round(Math.min(250, Math.max(50, currentZ + zoomDelta)));
        if (nextZoom !== currentZ) {
          setZoomLevel(nextZoom);
          zoomLevelRef.current = nextZoom;
          setPinchFeedback({
            active: true,
            zoom: nextZoom,
            source: 'pinch'
          });
          if (pinchTimeoutRef.current) {
            window.clearTimeout(pinchTimeoutRef.current);
          }
          pinchTimeoutRef.current = window.setTimeout(() => {
            setPinchFeedback((prev) => ({ ...prev, active: false }));
          }, 900);
        }
      }
    };

    const targets = [container, scrollContainer].filter(Boolean) as HTMLElement[];
    targets.forEach((elem) => {
      elem.addEventListener('touchstart', handleTouchStart, { passive: false });
      elem.addEventListener('touchmove', handleTouchMove, { passive: false });
      elem.addEventListener('touchend', handleTouchEnd, { passive: false });
      elem.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      elem.addEventListener('wheel', handleWheel, { passive: false });
    });

    return () => {
      targets.forEach((elem) => {
        elem.removeEventListener('touchstart', handleTouchStart);
        elem.removeEventListener('touchmove', handleTouchMove);
        elem.removeEventListener('touchend', handleTouchEnd);
        elem.removeEventListener('touchcancel', handleTouchEnd);
        elem.removeEventListener('wheel', handleWheel);
      });
      if (pinchTimeoutRef.current) {
        window.clearTimeout(pinchTimeoutRef.current);
      }
    };
  }, [handlePanStart, handlePanMove, handlePanEnd]);

  // =========================================================================
  // JavaScript Event Listener on .pdf-viewer-container:
  // Highlights the current PDF page being viewed when the user stops scrolling
  // =========================================================================
  useEffect(() => {
    const viewerElement = viewerContainerRef.current || document.querySelector<HTMLElement>('.pdf-viewer-container');
    const scrollElement = scrollContainerRef.current;
    if (!viewerElement) return;

    // Helper to calculate which page is currently most visible in the viewport
    const findCurrentVisiblePage = (): number => {
      const activeViewport = scrollElement || viewerElement;
      const vpRect = activeViewport.getBoundingClientRect();
      const readingLine = vpRect.top + Math.min(220, vpRect.height * 0.35);

      let bestPage = currentPage;
      let minDistance = Infinity;

      for (let i = 1; i <= totalPages; i++) {
        const pageEl = document.getElementById(`pdf-page-${i}`);
        if (pageEl) {
          const rect = pageEl.getBoundingClientRect();
          if (rect.top <= readingLine && rect.bottom >= readingLine) {
            return i;
          }
          const dist = Math.abs(rect.top - readingLine);
          if (dist < minDistance) {
            minDistance = dist;
            bestPage = i;
          }
        }
      }
      return bestPage;
    };

    const handleScrollStop = () => {
      if (viewMode !== 'continuous') return;
      const targetPage = findCurrentVisiblePage();
      setCurrentPage(targetPage);
      setScrollStoppedPage(targetPage);
      setIsScrollHighlightActive(true);

      // Add CSS highlight animation to target DOM element
      const targetEl = document.getElementById(`pdf-page-${targetPage}`);
      if (targetEl) {
        document.querySelectorAll('.pdf-page-scroll-highlight').forEach((el) => {
          el.classList.remove('pdf-page-scroll-highlight');
        });
        targetEl.classList.remove('pdf-page-scroll-highlight');
        // Force reflow to restart CSS animation cleanly
        void targetEl.offsetWidth;
        targetEl.classList.add('pdf-page-scroll-highlight');
      }

      // Automatically fade highlight after 2.5s of calm reading
      if (scrollHighlightFadeTimerRef.current) {
        clearTimeout(scrollHighlightFadeTimerRef.current);
      }
      scrollHighlightFadeTimerRef.current = setTimeout(() => {
        setIsScrollHighlightActive(false);
      }, 2500);
    };

    const handleScrollActivity = () => {
      if (scrollStopTimerRef.current) {
        clearTimeout(scrollStopTimerRef.current);
      }
      setIsScrollHighlightActive(false);

      // Debounced scroll stop detection (180ms of inactivity)
      scrollStopTimerRef.current = setTimeout(() => {
        handleScrollStop();
      }, 180);
    };

    const handleScrollEnd = () => {
      if (scrollStopTimerRef.current) {
        clearTimeout(scrollStopTimerRef.current);
      }
      handleScrollStop();
    };

    // Attach listeners to .pdf-viewer-container (using capture: true to ensure all descendant scrolls are captured)
    viewerElement.addEventListener('scroll', handleScrollActivity, { passive: true, capture: true });
    viewerElement.addEventListener('scrollend', handleScrollEnd, { passive: true, capture: true });

    if (scrollElement && scrollElement !== viewerElement) {
      scrollElement.addEventListener('scroll', handleScrollActivity, { passive: true });
      scrollElement.addEventListener('scrollend', handleScrollEnd, { passive: true });
    }

    return () => {
      if (scrollStopTimerRef.current) clearTimeout(scrollStopTimerRef.current);
      if (scrollHighlightFadeTimerRef.current) clearTimeout(scrollHighlightFadeTimerRef.current);
      viewerElement.removeEventListener('scroll', handleScrollActivity, { capture: true } as EventListenerOptions);
      viewerElement.removeEventListener('scrollend', handleScrollEnd, { capture: true } as EventListenerOptions);
      if (scrollElement && scrollElement !== viewerElement) {
        scrollElement.removeEventListener('scroll', handleScrollActivity);
        scrollElement.removeEventListener('scrollend', handleScrollEnd);
      }
    };
  }, [totalPages, viewMode]);

  // Dynamic scroll listener to track current page while scrolling vertically
  const handleContainerScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;

    // Show floating 'Back to Top' button only when scrolled down (e.g. > 180px)
    setShowScrollToTop(container.scrollTop > 180);

    if (viewMode !== 'continuous') return;
    const containerRect = container.getBoundingClientRect();
    const readingLine = containerRect.top + 140;

    let closestPage = currentPage;
    let minDistance = Infinity;

    for (let i = 1; i <= totalPages; i++) {
      const pageEl = document.getElementById(`pdf-page-${i}`);
      if (pageEl) {
        const rect = pageEl.getBoundingClientRect();
        if (rect.top <= readingLine && rect.bottom >= readingLine) {
          closestPage = i;
          break;
        }
        const dist = Math.abs(rect.top - readingLine);
        if (dist < minDistance) {
          minDistance = dist;
          closestPage = i;
        }
      }
    }

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
    }
  };

  // Prominent numbered divider between consecutive pages (كما في ملف PDF)
  const renderPageDivider = (fromPage: number, toPage: number) => {
    const progressPercent = Math.round((toPage / totalPages) * 100);
    const remainingPages = totalPages - toPage;
    const toPageAnnos = annotations.filter((a) => a.pageNumber === toPage);

    return (
      <div
        key={`page-divider-${fromPage}-${toPage}`}
        id={`pdf-divider-${fromPage}-${toPage}`}
        className="pdf-page-divider w-full my-10 py-4 flex flex-col items-center justify-center relative select-none scroll-mt-24 transition-all duration-200"
        style={getZoomContainerStyle()}
      >
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-0.5 bg-gradient-to-l from-amber-500 via-slate-700 to-transparent" />

          {/* Central Numbered Divider Card */}
          <div className="w-full max-w-2xl px-5 sm:px-8 py-4.5 rounded-2xl bg-slate-900/98 border-2 border-amber-500/80 shadow-2xl shadow-black/80 flex flex-col gap-3.5 text-xs text-white backdrop-blur-md hover:border-amber-400 transition-all">
            {/* Header info with prominent page numbers */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border-2 border-amber-500/60 text-amber-400 flex items-center justify-center font-black text-base shrink-0 shadow-inner">
                  #{toPage}
                </div>

                <div className="flex flex-col text-right">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-amber-300 text-sm">
                      فاصل صفحات مرقم • بين صفحة {fromPage} وصفحة {toPage}
                    </span>
                    <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-lg font-mono font-bold">
                      بداية صـ {toPage} من {totalPages}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md font-mono font-bold">
                      {progressPercent}% مكتمل
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="text-slate-300 font-mono">نهاية صفحة {fromPage}</span>
                    <span className="text-amber-400 font-black">⬅️ فاصل التتابع الرأسي ➡️</span>
                    <span className="text-emerald-400 font-bold font-mono">بداية صفحة {toPage}</span>
                    {remainingPages > 0 && (
                      <span className="text-slate-500 text-[11px] hidden sm:inline">
                        (متبقي {remainingPages} صفحات)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation buttons for teacher during lecture */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => scrollToPage(fromPage)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                  title={`العودة لصفحة ${fromPage}`}
                >
                  <ArrowUp size={13} />
                  <span>صفحة {fromPage}</span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToPage(toPage)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs border border-amber-400 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
                  title={`انتقال فوري لبداية صفحة ${toPage}`}
                >
                  <span>شرح صفحة {toPage}</span>
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Note indicator for next page if present */}
            {toPageAnnos.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px] text-amber-200">
                <span className="flex items-center gap-1.5 font-bold">
                  <span>💬 توجيهات الشرح المعتمدة:</span>
                  <span>تحتوي صفحة {toPage} على {toPageAnnos.length} شروح وملاحظات جاهزة للعرض.</span>
                </span>
                <span className="font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  صـ {toPage}
                </span>
              </div>
            )}

            {/* Reading Progress Indicator Bar */}
            <div className="w-full flex items-center gap-3">
              <span className="text-[11px] text-slate-400 font-mono shrink-0">
                التقدم في المستند: صـ {toPage} / {totalPages}
              </span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-amber-400 font-mono font-bold shrink-0">
                {progressPercent}%
              </span>
            </div>
          </div>

          <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-500 via-slate-700 to-transparent" />
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 font-mono">
          <ArrowDown size={14} className="text-amber-400 animate-bounce" />
          <span>تتابع الصفحات رأسياً • التمرير مستمر للأسفل لمتابعة الشرح</span>
        </div>
      </div>
    );
  };

  // Render a full page container with its text, inline highlights, and area overlays
  const renderSinglePageBlock = (pNum: number) => {
    const pageAnnos = annotations.filter((a) => a.pageNumber === pNum);
    const areaAnnos = pageAnnos.filter((a) => !a.highlightText && !a.isImageObject);
    const isCurrent = currentPage === pNum;
    const isTransitionTarget = transitioningPage === pNum;
    const isScrollHighlight = scrollStoppedPage === pNum && isScrollHighlightActive;
    const pageRotation = pageRotations[pNum] || 0;

    return (
      <div
        key={`page-card-${pNum}`}
        id={`pdf-page-${pNum}`}
        data-page-number={pNum}
        data-page-rotation={pageRotation}
        data-scroll-active={isScrollHighlight ? 'true' : undefined}
        ref={pNum === currentPage ? pageContainerRef : undefined}
        onMouseDown={(e) => {
          if (toolSubMode === 'pan' || e.button === 1) {
            if (handlePanStart(e.clientX, e.clientY, e.target)) {
              e.preventDefault();
            }
            return;
          }
          setAreaDragTargetPage(pNum);
          handleMouseDown(e);
        }}
        onMouseMove={toolSubMode === 'pan' ? undefined : handleMouseMove}
        onMouseUp={toolSubMode === 'pan' ? undefined : handleMouseUpArea}
        style={{
          ...getZoomContainerStyle('680px'),
          scrollSnapAlign: 'start',
          transform: pageRotation !== 0 ? `rotate(${pageRotation}deg)` : undefined,
          transformOrigin: 'center center',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease',
          margin: (pageRotation === 90 || pageRotation === 270) ? '60px auto' : undefined
        }}
        className={`pdf-page-sheet snap-start bg-slate-900 border-2 rounded-2xl p-6 sm:p-10 shadow-2xl relative transition-all duration-300 scroll-mt-24 ${
          isScrollHighlight
            ? 'pdf-page-scroll-highlight ring-4 ring-amber-400 border-amber-400 shadow-2xl shadow-amber-500/30'
            : isTransitionTarget
            ? 'pdf-page-transition-pulse ring-4 ring-amber-400 border-amber-400 shadow-2xl shadow-amber-500/25'
            : isCurrent
            ? 'ring-2 ring-amber-500/50 border-amber-500/60 shadow-amber-500/5'
            : 'border-slate-800'
        } ${
          isToolActive && mode === 'teacher' && toolSubMode === 'area_box'
            ? 'cursor-crosshair border-amber-500/50 hover:border-amber-500/70'
            : isToolActive && toolSubMode === 'pan'
            ? (isPanning ? 'cursor-grabbing select-none' : 'cursor-grab select-none')
            : ''
        }`}
      >
        {/* Page Number Ribbon Badge */}
        <div className="absolute top-0 left-8 -translate-y-1/2 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-full shadow-lg border-2 border-slate-900 flex items-center gap-1.5 z-20 select-none">
          <FileText size={13} />
          <span>صفحة {pNum}</span>
          <span className="text-[10px] text-slate-900/80 font-mono">/ {totalPages}</span>
        </div>

        {/* Page Rotation Indicator Ribbon */}
        {pageRotation !== 0 && (
          <div className="absolute top-0 left-36 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[11px] rounded-full shadow-lg border-2 border-slate-900 flex items-center gap-1 z-20 select-none animate-in fade-in">
            <RotateCw size={11} />
            <span>تدوير: {pageRotation}°</span>
          </div>
        )}

        {/* Scroll-stop Active Page Spotlight Badge */}
        {isScrollHighlight && (
          <div
            id={`pdf-scroll-stop-badge-${pNum}`}
            className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-full shadow-2xl border-2 border-slate-900 flex items-center gap-2 z-20 select-none animate-in fade-in zoom-in-95 duration-200"
          >
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
            <span>الصفحة المعروضة حالياً • صـ {pNum}</span>
          </div>
        )}

        {/* Document Header within the page */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-bold text-white">
            <BookOpen size={16} className="text-amber-400" />
            <span>{resource.title}</span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">• المرجع المعتمد</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Rotate Page Button (90-degree increments) */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 no-export">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRotatePage(pNum, 90);
                }}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 rounded-md text-[11px] font-bold border border-amber-500/30 hover:border-amber-400 transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                title={`تدوير صفحة ${pNum} بمقدار 90° باتجاه عقارب الساعة (الزاوية الحالية: ${pageRotation}°)`}
              >
                <RotateCw size={12} className="text-amber-400" />
                <span>تدوير 90°</span>
                {pageRotation !== 0 && (
                  <span className="font-mono text-[10px] text-amber-400 font-black bg-amber-500/20 px-1 rounded">
                    {pageRotation}°
                  </span>
                )}
              </button>

              {pageRotation !== 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetPageRotation(pNum);
                  }}
                  className="p-1 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-md transition-colors cursor-pointer"
                  title="إلغاء التدوير والعودة للوضع الرأسي 0°"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>

            {/* Quick Download Page Canvas */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage(pNum);
                handleDownloadCanvasImage('current_page');
              }}
              disabled={isDownloadingCanvas}
              className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-lg text-[11px] font-bold border border-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs no-export"
              title={`تنزيل صفحة ${pNum} كصورة فائقة الدقة مع الملاحظات`}
            >
              <Download size={12} className="text-emerald-400" />
              <span>تنزيل صـ {pNum} 📥</span>
            </button>
            {mode === 'teacher' && (
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(pNum);
                  imageInputRef.current?.click();
                }}
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg text-[11px] font-bold border border-amber-500/30 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title={`إدراج صورة عائمة فوق صفحة ${pNum}`}
              >
                <ImagePlus size={12} className="text-amber-400" />
                <span>+ صورة عائمة</span>
              </button>
            )}
            {pageAnnos.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg font-bold">
                💬 {pageAnnos.length} شروح وتوجيهات
              </span>
            )}
            <div className="font-mono text-xs text-amber-400 font-black bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-1">
              <span>صفحة</span>
              <span className="text-white font-bold">{pNum}</span>
              <span>من</span>
              <span>{totalPages}</span>
            </div>
          </div>
        </div>

        {/* Document Text Content with Interactive Highlights */}
        <div className="relative z-10 text-slate-200">
          {renderPageContentWithHighlights(pNum)}
        </div>

        {/* Document Footer within the page */}
        <div className="mt-12 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>أكاديمية التفوق أون لاين • نهاية صفحة {pNum} من {totalPages}</span>
          <span className="text-amber-400/90 font-bold">المعلم المعتمد: {resource.teacher_name}</span>
        </div>

        {/* AREA HIGHLIGHTS OVERLAY (For free rectangle selections) */}
        {areaAnnos.map((anno) => {
          const c = COLOR_MAP[anno.color || 'amber'];
          const isActive = activeAnnotationId === anno.id;

          return (
            <div
              key={anno.id}
              onClick={() => setActiveAnnotationId(isActive ? null : anno.id)}
              style={{
                left: `${anno.selectionCoords.x}%`,
                top: `${anno.selectionCoords.y}%`,
                width: `${anno.selectionCoords.width}%`,
                height: `${anno.selectionCoords.height}%`,
                borderWidth: `${anno.strokeWidth || 2}px`
              }}
              className={`absolute rounded-lg border-solid transition-all cursor-pointer z-20 ${c.bg} ${c.border} ${
                isActive ? 'ring-4 ring-white/70 shadow-xl scale-[1.01]' : 'hover:scale-[1.005]'
              }`}
              title={anno.note}
            >
              <div
                className={`absolute -top-3.5 right-2 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-md z-30 ${c.badge}`}
              >
                <MessageSquare size={10} />
                <span className="truncate max-w-[140px]">{anno.note}</span>
              </div>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full right-0 mt-2 z-40 bg-slate-900 border-2 border-slate-700 rounded-2xl p-4 shadow-2xl w-80 text-right space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-xs font-black text-white">
                          {c.label} (صـ {anno.pageNumber})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        بواسطة: {anno.authorName || 'معلم المادة'}
                      </span>
                    </div>

                    <div className="text-xs text-amber-200 font-sans leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                      💬 <strong>ملاحظة المعلم:</strong> {anno.note}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => speakNote(anno.note)}
                        className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 font-bold cursor-pointer"
                      >
                        {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        <span>استماع صوتي 🔊</span>
                      </button>

                      {mode === 'teacher' && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAnnotation(anno.id, e)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* FLOATING RESIZABLE IMAGE ANNOTATIONS OVERLAY */}
        {imageAnnos.map((anno) => {
          const isSelected = activeAnnotationId === anno.id;
          const c = COLOR_MAP[anno.color || 'amber'];

          return (
            <div
              key={anno.id}
              id={`floating-img-${anno.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveAnnotationId(isSelected ? null : anno.id);
              }}
              style={{
                left: `${anno.selectionCoords.x}%`,
                top: `${anno.selectionCoords.y}%`,
                width: `${anno.selectionCoords.width}%`,
                height: `${anno.selectionCoords.height}%`
              }}
              className={`absolute rounded-xl border-2 shadow-2xl transition-all duration-75 select-none z-25 bg-slate-950/90 backdrop-blur-xs flex flex-col group/img overflow-hidden ${
                c.border
              } ${
                isSelected
                  ? 'ring-4 ring-amber-400 shadow-amber-500/30 scale-[1.01]'
                  : 'hover:ring-2 hover:ring-white/40'
              }`}
            >
              {/* Image Control Header Strip */}
              <div 
                className={`px-2 py-1 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-1 text-[10px] select-none ${
                  mode === 'teacher' ? 'cursor-move active:bg-slate-800' : 'cursor-default'
                }`}
                onMouseDown={(e) => {
                  if (mode === 'teacher') handleImageMoveStart(e, anno, pNum);
                }}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {mode === 'teacher' && <Move size={12} className="text-amber-400 shrink-0" />}
                  <span className="font-bold text-white truncate max-w-[140px]">
                    {anno.imageTitle || 'شكل توضيحي'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImageUrl({ url: anno.imageUrl!, title: anno.imageTitle || anno.note });
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                    title="تكبير الصورة بالحجم الكامل"
                  >
                    <Maximize2 size={11} />
                  </button>

                  {mode === 'teacher' && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteAnnotation(anno.id, e)}
                      className="p-1 hover:bg-rose-950 text-rose-400 hover:text-rose-200 rounded cursor-pointer"
                      title="حذف هذا الشكل التوضيحي"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* Image Preview Area */}
              <div 
                className="flex-1 w-full h-full min-h-0 relative p-1.5 overflow-hidden flex items-center justify-center bg-slate-950/70"
                onDoubleClick={() => setLightboxImageUrl({ url: anno.imageUrl!, title: anno.imageTitle || anno.note })}
              >
                <img
                  src={anno.imageUrl}
                  alt={anno.imageTitle || anno.note}
                  className="max-w-full max-h-full object-contain rounded pointer-events-none select-none"
                  draggable={false}
                />
                {anno.note && (
                  <div className="absolute bottom-1 inset-x-1 px-1.5 py-0.5 bg-slate-950/85 backdrop-blur-xs rounded text-[9px] text-amber-200 text-center truncate border border-slate-800">
                    {anno.note}
                  </div>
                )}
              </div>

              {/* Resizable Corner Handle (Bottom-Right) in Teacher Mode */}
              {mode === 'teacher' && (
                <div
                  onMouseDown={(e) => handleImageResizeStart(e, anno, pNum)}
                  className="absolute bottom-0 right-0 w-5 h-5 bg-amber-400 hover:bg-amber-300 border-2 border-slate-950 rounded-tl-lg cursor-se-resize shadow-md flex items-center justify-center z-30 transition-transform active:scale-125"
                  title="اسحب لتغيير أبعاد وحجم الصورة"
                >
                  <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                </div>
              )}
            </div>
          );
        })}

        {/* ACTIVE DRAGGING RECTANGLE PREVIEW */}
        {isSelectingArea && currentRect && areaDragTargetPage === pNum && (
          <div
            style={{
              left: `${currentRect.x}%`,
              top: `${currentRect.y}%`,
              width: `${currentRect.width}%`,
              height: `${currentRect.height}%`,
              borderWidth: `${penStrokeThickness}px`
            }}
            className={`absolute rounded-lg border-dashed pointer-events-none z-30 animate-pulse ${COLOR_MAP[activeColor].bg} ${COLOR_MAP[activeColor].border}`}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isFullScreen ? 'p-0 bg-slate-950' : 'p-2 sm:p-4 bg-black/85 backdrop-blur-md'
      }`}
    >
      <motion.div
        layout
        transition={{
          layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.2 }
        }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`bg-slate-950 border flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ease-out ${
          isFullScreen
            ? 'w-full h-full max-w-none rounded-none border-none'
            : 'rounded-3xl w-full max-w-7xl h-[94vh] border-slate-800'
        }`}
        dir="rtl"
      >
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">{resource.title}</h2>
                {resource.pdf_category && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                    {resource.pdf_category}
                  </span>
                )}
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                    mode === 'teacher'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  <Sparkles size={12} />
                  {mode === 'teacher'
                    ? 'وضع المعلم (تمييز النصوص وإضافة شروح للطلاب)'
                    : 'بوابة الطالب (مطالعة شروح وتوجيهات المعلم المعتمدة)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                <span>{resource.subject}</span>
                <span>•</span>
                <span>{resource.unit_title}</span>
                {resource.academic_citation && (
                  <>
                    <span>•</span>
                    <span className="text-amber-300/80 truncate max-w-[280px]">
                      {resource.academic_citation}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Selector: Continuous vertical stack vs Single Page */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('continuous')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'continuous'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض تتابعي مستمر لكافة الصفحات رأسياً كما ملف PDF الأصلي مع فواصل مرقمة"
              >
                <ScrollText size={14} />
                <span className="hidden md:inline">تتابع مستمر (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض صفحة واحدة منفصلة"
              >
                <FileText size={14} />
                <span className="hidden md:inline">صفحة مفردة</span>
              </button>
            </div>

            {/* Page Navigation Controls */}
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs text-white">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => scrollToPage(currentPage - 1)}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="الصفحة السابقة"
              >
                <ChevronRight size={16} />
              </button>

              {/* Quick Jump Page Dropdown */}
              <select
                aria-label="الانتقال إلى صفحة"
                value={currentPage}
                onChange={(e) => scrollToPage(parseInt(e.target.value, 10))}
                className="bg-slate-900 text-amber-300 font-mono font-bold text-xs px-2 py-1 rounded-md border border-slate-700 outline-none cursor-pointer"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    صـ {p} من {totalPages}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => scrollToPage(currentPage + 1)}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                title="الصفحة التالية"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(75, z - 15))}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                title="تصغير"
              >
                <ZoomOut size={14} />
              </button>
              <span className="px-1 font-mono text-[11px] text-slate-300">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(140, z + 15))}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                title="تكبير"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Download Canvas as High-Res Image Button */}
            <button
              type="button"
              id="pdf-topbar-download-canvas-btn"
              onClick={() => handleDownloadCanvasImage('current_page')}
              disabled={isDownloadingCanvas}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-emerald-950 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 hover:border-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="تنزيل اللوح / الصفحة الحالية كصورة فائقة الدقة (PNG) مع الحفاظ على الملاحظات"
            >
              {isDownloadingCanvas ? (
                <RefreshCw size={14} className="animate-spin text-emerald-400" />
              ) : (
                <Download size={14} className="text-emerald-400" />
              )}
              <span className="hidden md:inline">{isDownloadingCanvas ? 'تصدير...' : 'تنزيل كصورة'}</span>
            </button>

            {/* Expand / Full-screen Toggle Button */}
            <button
              type="button"
              id="pdf-fullscreen-toggle-btn"
              onClick={toggleFullScreen}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border select-none active:scale-95 ${
                isFullScreen
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-850 border-slate-800 hover:border-slate-700'
              }`}
              title={isFullScreen ? 'تصغير وخروج من وضع ملء الشاشة' : 'توسيع لعرض كامل الشاشة (Full-screen mode)'}
              aria-label={isFullScreen ? 'إنهاء وضع ملء الشاشة' : 'توسيع وملء الشاشة'}
            >
              {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span className="hidden sm:inline">{isFullScreen ? 'تصغير' : 'توسيع (ملء الشاشة)'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY: PDF VIEWER CONTAINER (Exact CSS selector: .pdf-viewer-container) */}
        {/* ========================================================================= */}
        <div
          ref={viewerContainerRef}
          style={{
            scrollSnapType: 'y mandatory',
            overflowY: 'scroll',
          }}
          className={`pdf-viewer-container flex-1 overflow-y-scroll snap-y snap-mandatory flex flex-col bg-slate-950 relative select-auto ${
            toolSubMode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'touch-pan-y'
          }`}
          onMouseUp={handleMouseUpCapture}
          onDragOver={handleViewerDragOver}
          onDragLeave={handleViewerDragLeave}
          onDrop={handleViewerDrop}
        >
          {/* ========================================================================= */}
          {/* TEACHER HIGHLIGHTING TOOLBAR / SECONDARY TOOLBAR                          */}
          {/* ========================================================================= */}
          {mode === 'teacher' && (
            <div 
              id="pdf-secondary-toolbar"
              className="pdf-secondary-toolbar secondary-toolbar bg-slate-900/95 border-b border-slate-800 px-4 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20 shadow-md"
            >
              <div className="flex items-center gap-3 flex-wrap">
                {/* View Mode Toggle: Continuous Scrolling View vs Single-Page View (.pdf-viewer-container) */}
                <div 
                  className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shadow-inner"
                  title="التبديل بين وضع التمرير المستمر وعرض صفحة مفردة واحدة مع أسهم التنقل"
                >
                  <button
                    type="button"
                    id="pdf-viewer-toggle-continuous-btn"
                    data-testid="pdf-viewer-toggle-continuous"
                    onClick={() => setViewMode('continuous')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'continuous'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="عرض تتابعي مستمر لكافة الصفحات رأسياً (Continuous Scrolling View)"
                  >
                    <ScrollText size={14} />
                    <span>تمرير مستمر</span>
                  </button>

                  <button
                    type="button"
                    id="pdf-viewer-toggle-single-btn"
                    data-testid="pdf-viewer-toggle-single"
                    onClick={() => setViewMode('single')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'single'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="عرض صفحة واحدة فقط في كل مرة مع أسهم التنقل (Single-Page View with Navigation Arrows)"
                  >
                    <FileText size={14} />
                    <span>صفحة مفردة</span>
                  </button>
                </div>

                {/* If Single-Page View is active, show quick previous/next arrow buttons right in the secondary toolbar */}
                {viewMode === 'single' && (
                  <div className="flex items-center gap-1 bg-slate-950/90 px-2.5 py-1 rounded-xl border border-amber-500/30 text-xs animate-in fade-in">
                    <button
                      type="button"
                      id="pdf-toolbar-prev-page-btn"
                      data-testid="pdf-toolbar-prev-page"
                      disabled={currentPage <= 1}
                      onClick={() => scrollToPage(currentPage - 1)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-amber-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer flex items-center gap-1 transition-all"
                      title="الصفحة السابقة (Previous Page Arrow)"
                    >
                      <ChevronRight size={16} />
                      <span className="hidden sm:inline text-[11px] font-bold">السابقة</span>
                    </button>

                    <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold text-xs">
                      {currentPage} / {totalPages}
                    </div>

                    <button
                      type="button"
                      id="pdf-toolbar-next-page-btn"
                      data-testid="pdf-toolbar-next-page"
                      disabled={currentPage >= totalPages}
                      onClick={() => scrollToPage(currentPage + 1)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-amber-300 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer flex items-center gap-1 transition-all"
                      title="الصفحة التالية (Next Page Arrow)"
                    >
                      <span className="hidden sm:inline text-[11px] font-bold">التالية</span>
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                )}

                {/* PDF Page Rotation Controls (.pdf-viewer-container) */}
                <div 
                  className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shadow-inner gap-1"
                  title={`تدوير صفحة ${currentPage} بمقدار 90 درجة مع حفظ الزاوية في حالة الصفحة`}
                >
                  <span className="text-[11px] text-slate-400 font-bold px-1 flex items-center gap-1">
                    <RotateCw size={12} className="text-amber-400" />
                    <span className="hidden sm:inline">تدوير صـ {currentPage}:</span>
                  </span>

                  <button
                    type="button"
                    id="pdf-toolbar-rotate-cw-btn"
                    data-testid="pdf-toolbar-rotate-cw"
                    onClick={() => handleRotatePage(currentPage, 90)}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-400 font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
                    title="تدوير الصفحة بمقدار 90° باتجاه عقارب الساعة"
                  >
                    <RotateCw size={13} />
                    <span className="text-[11px]">+90°</span>
                  </button>

                  <button
                    type="button"
                    id="pdf-toolbar-rotate-ccw-btn"
                    data-testid="pdf-toolbar-rotate-ccw"
                    onClick={() => handleRotatePage(currentPage, -90)}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-400 font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
                    title="تدوير الصفحة بمقدار 90° عكس اتجاه عقارب الساعة"
                  >
                    <RotateCcw size={13} />
                    <span className="text-[11px]">-90°</span>
                  </button>

                  <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold text-xs" title="زاوية الدوران الحالية">
                    {pageRotations[currentPage] || 0}°
                  </div>

                  {(pageRotations[currentPage] || 0) !== 0 && (
                    <button
                      type="button"
                      id="pdf-toolbar-reset-rotation-btn"
                      onClick={() => handleResetPageRotation(currentPage)}
                      className="p-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-all cursor-pointer"
                      title="إعادة ضبط زاوية الدوران إلى الوضع الرأسي (0°)"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="h-4 w-px bg-slate-800 hidden sm:block" />

                {/* Tool Mode Selector: Text Highlighting vs Area Box vs Pan Tool */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolActive(true);
                      setToolSubMode('text_highlight');
                    }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      isToolActive && toolSubMode === 'text_highlight'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="حدد أي جملة أو فقرة بالفأرة لتظليلها وإضافة تعليق توضيحي"
                  >
                    <Highlighter size={14} />
                    <span>تمييز النصوص (Text Highlighting)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolActive(true);
                      setToolSubMode('area_box');
                    }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      isToolActive && toolSubMode === 'area_box'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="اسحب بالفأرة لتحديد مستطيل على شكل أو رسم بياني"
                  >
                    <Square size={14} />
                    <span>تحديد مساحة/شكل</span>
                  </button>

                  {/* Pan Tool Button */}
                  <button
                    type="button"
                    id="whiteboard-pan-tool-btn"
                    onClick={() => {
                      setIsToolActive(true);
                      setToolSubMode('pan');
                    }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      isToolActive && toolSubMode === 'pan'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="أداة التحريك (Pan) - انقر واسحب للتنقل بحرية داخل المستند والصفحات (أو اضغط باستمرار على زر المسافة Space)"
                    data-testid="whiteboard-pan-tool-btn"
                  >
                    <Hand size={14} className={isToolActive && toolSubMode === 'pan' ? 'text-slate-950' : 'text-amber-400'} />
                    <span>أداة التحريك (Pan) ✋</span>
                  </button>

                  {/* Insert Image from Local Device */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer bg-slate-950 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 shadow-xs"
                    title="إدراج صورة من جهازك كشكل عائم قابل للتحريك وإعادة التحجيم (أو اسحب وأفلت أي صورة مباشرة إلى الصفحة)"
                  >
                    <ImagePlus size={14} className="text-amber-400" />
                    <span>إدراج صورة 🖼️</span>
                  </button>

                  {/* Capture Image from Device Camera */}
                  <button
                    type="button"
                    id="whiteboard-camera-capture-btn"
                    onClick={handleOpenLiveCamera}
                    className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer bg-slate-950 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 shadow-xs active:scale-95"
                    title="التقاط صورة مباشرة بكاميرا الجهاز وإدراجها كشكل عائم على الصفحة النشطة"
                  >
                    <Camera size={14} className="text-cyan-400" />
                    <span>التقاط بالكاميرا 📷</span>
                  </button>
                </div>

                {/* Color Palette Selector */}
                <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-bold ml-1">لون التمييز:</span>
                  {(Object.keys(COLOR_MAP) as Array<PdfAnnotation['color']>).map((colorKey) => {
                    const c = COLOR_MAP[colorKey];
                    const isSelected = activeColor === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setActiveColor(colorKey)}
                        className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'scale-125 border-white ring-2 ring-amber-400/50'
                            : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    );
                  })}
                  <span className="text-[10px] text-slate-300 font-medium mr-1">
                    ({COLOR_MAP[activeColor].label})
                  </span>
                </div>

                {/* Pen Stroke Thickness Control: User-Friendly Range Slider (1px to 20px) + Numeric Indicator Badge + Quick Presets */}
                <div 
                  className="flex items-center gap-2.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner"
                  title="التحكم في سُمك خط القلم والتأطير على السبورة والمستند (1px - 20px)"
                >
                  <div className="flex items-center gap-1.5 text-slate-300 font-bold shrink-0">
                    <Sliders size={14} className="text-amber-400" />
                    <span className="text-[11px] text-slate-200 font-bold whitespace-nowrap">سُمك القلم:</span>
                  </div>

                  {/* Decrement Button [-] */}
                  <button
                    type="button"
                    onClick={() => setPenStrokeThickness((t) => Math.max(1, t - 1))}
                    disabled={penStrokeThickness <= 1}
                    className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer transition-all active:scale-95"
                    title="تقليل سُمك القلم بمقدار 1px"
                  >
                    <Minus size={11} />
                  </button>

                  {/* User-Friendly Range Slider (1px to 20px) */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={penStrokeThickness}
                      onChange={(e) => setPenStrokeThickness(Number(e.target.value))}
                      className="w-24 sm:w-32 accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-2 transition-all hover:bg-slate-700"
                      title={`سُمك خط القلم المختار: ${penStrokeThickness}px (النطاق: 1px إلى 20px)`}
                      aria-label="سُمك خط القلم (Pen stroke thickness)"
                    />
                  </div>

                  {/* Increment Button [+] */}
                  <button
                    type="button"
                    onClick={() => setPenStrokeThickness((t) => Math.min(20, t + 1))}
                    disabled={penStrokeThickness >= 20}
                    className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer transition-all active:scale-95"
                    title="زيادة سُمك القلم بمقدار 1px"
                  >
                    <Plus size={11} />
                  </button>

                  {/* Small Numeric Indicator Badge displaying currently selected stroke width value in pixels (e.g., '5px') */}
                  <span 
                    id="pdf-pen-stroke-thickness-badge"
                    className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/50 font-mono font-black text-xs shadow-xs min-w-[38px] text-center"
                    title="القيمة الحالية لسُمك الخط بالبكسل"
                  >
                    {penStrokeThickness}px
                  </span>

                  {/* Dynamic Live Preview Dot of current stroke width with active color */}
                  <div 
                    className="rounded-full shrink-0 border border-slate-700 shadow-sm transition-all duration-150"
                    style={{ 
                      width: `${Math.max(4, Math.min(20, penStrokeThickness))}px`,
                      height: `${Math.max(4, Math.min(20, penStrokeThickness))}px`,
                      backgroundColor: COLOR_MAP[activeColor].hex
                    }}
                    title={`معاينة بصرية حية لسُمك الخط (${penStrokeThickness}px)`}
                  />

                  {/* Quick Preset Buttons for Teacher Convenience */}
                  <div className="hidden lg:flex items-center gap-1 border-r border-slate-800 pr-1.5 mr-1">
                    {[
                      { label: 'دقيق', val: 2 },
                      { label: 'عادي', val: 5 },
                      { label: 'وسط', val: 10 },
                      { label: 'عريض', val: 18 }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setPenStrokeThickness(preset.val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          penStrokeThickness === preset.val
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                        title={`ضبط سريع إلى ${preset.val}px (${preset.label})`}
                      >
                        {preset.val}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download High-Resolution Canvas Image Button (Preserves all annotations) */}
                <button
                  type="button"
                  id="pdf-download-canvas-image-btn"
                  onClick={() => handleDownloadCanvasImage('current_page')}
                  disabled={isDownloadingCanvas}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50 border border-emerald-400/40"
                  title="تنزيل اللوح والصفحة الحالية كصورة فائقة الدقة (PNG) مع الحفاظ على كافة ملاحظات وتظليلات ورسومات المعلم"
                  data-testid="pdf-download-canvas-image-btn"
                >
                  {isDownloadingCanvas ? (
                    <RefreshCw size={14} className="animate-spin text-white" />
                  ) : (
                    <Download size={14} className="text-emerald-200" />
                  )}
                  <span>{isDownloadingCanvas ? 'جارٍ تصدير الصورة بدقة عالية...' : 'تنزيل اللوح كصورة عالية الدقة 📥'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickAddAnnotation}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>إضافة ملاحظة توضيحية سريعة</span>
                </button>
              </div>
            </div>
          )}

          {/* Reader / Student Secondary Toolbar with View Mode Toggle inside .pdf-viewer-container */}
          {mode !== 'teacher' && (
            <div 
              id="pdf-reader-secondary-toolbar"
              className="pdf-secondary-toolbar secondary-toolbar bg-slate-900/95 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20 shadow-md"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div 
                  className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shadow-inner"
                  title="التبديل بين وضع التمرير المستمر وعرض صفحة مفردة واحدة"
                >
                  <button
                    type="button"
                    id="pdf-reader-toggle-continuous-btn"
                    data-testid="pdf-reader-toggle-continuous"
                    onClick={() => setViewMode('continuous')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'continuous'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="عرض تتابعي مستمر لكافة الصفحات رأسياً (Continuous Scrolling View)"
                  >
                    <ScrollText size={14} />
                    <span>تمرير مستمر</span>
                  </button>

                  <button
                    type="button"
                    id="pdf-reader-toggle-single-btn"
                    data-testid="pdf-reader-toggle-single"
                    onClick={() => setViewMode('single')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'single'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="عرض صفحة واحدة فقط في كل مرة مع أسهم التنقل (Single-Page View with Navigation Arrows)"
                  >
                    <FileText size={14} />
                    <span>صفحة مفردة</span>
                  </button>
                </div>

                {viewMode === 'single' && (
                  <div className="flex items-center gap-1 bg-slate-950/90 px-2.5 py-1 rounded-xl border border-amber-500/30 text-xs animate-in fade-in">
                    <button
                      type="button"
                      id="pdf-reader-toolbar-prev-page-btn"
                      disabled={currentPage <= 1}
                      onClick={() => scrollToPage(currentPage - 1)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-amber-300 disabled:opacity-30 cursor-pointer flex items-center gap-1 transition-all"
                      title="الصفحة السابقة"
                    >
                      <ChevronRight size={16} />
                      <span className="hidden sm:inline text-[11px] font-bold">السابقة</span>
                    </button>

                    <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold text-xs">
                      {currentPage} / {totalPages}
                    </div>

                    <button
                      type="button"
                      id="pdf-reader-toolbar-next-page-btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => scrollToPage(currentPage + 1)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-amber-300 disabled:opacity-30 cursor-pointer flex items-center gap-1 transition-all"
                      title="الصفحة التالية"
                    >
                      <span className="hidden sm:inline text-[11px] font-bold">التالية</span>
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                )}

                {/* Reader PDF Page Rotation Controls (.pdf-viewer-container) */}
                <div 
                  className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shadow-inner gap-1"
                  title={`تدوير صفحة ${currentPage} بمقدار 90 درجة مع حفظ الزاوية`}
                >
                  <span className="text-[11px] text-slate-400 font-bold px-1 flex items-center gap-1">
                    <RotateCw size={12} className="text-amber-400" />
                    <span className="hidden sm:inline">تدوير صـ {currentPage}:</span>
                  </span>

                  <button
                    type="button"
                    id="pdf-reader-rotate-cw-btn"
                    data-testid="pdf-reader-rotate-cw"
                    onClick={() => handleRotatePage(currentPage, 90)}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-400 font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
                    title="تدوير الصفحة بمقدار 90° باتجاه عقارب الساعة"
                  >
                    <RotateCw size={13} />
                    <span className="text-[11px]">+90°</span>
                  </button>

                  <button
                    type="button"
                    id="pdf-reader-rotate-ccw-btn"
                    data-testid="pdf-reader-rotate-ccw"
                    onClick={() => handleRotatePage(currentPage, -90)}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-400 font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
                    title="تدوير الصفحة بمقدار 90° عكس اتجاه عقارب الساعة"
                  >
                    <RotateCcw size={13} />
                    <span className="text-[11px]">-90°</span>
                  </button>

                  <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold text-xs">
                    {pageRotations[currentPage] || 0}°
                  </div>

                  {(pageRotations[currentPage] || 0) !== 0 && (
                    <button
                      type="button"
                      id="pdf-reader-reset-rotation-btn"
                      onClick={() => handleResetPageRotation(currentPage)}
                      className="p-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-all cursor-pointer"
                      title="إعادة ضبط زاوية الدوران إلى الوضع الرأسي (0°)"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sub-container for Page Rail + Main Canvas */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative w-full h-full">
            {/* Hidden Image File Input */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileSelect}
            />

            {/* Hidden Native Camera Fallback Input */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleNativeCameraCapture}
            />

          {/* Drag & Drop Visual Overlay on .pdf-viewer-container */}
          {isDraggingFileOverViewer && (
            <div className="absolute inset-0 z-50 bg-amber-950/85 backdrop-blur-sm border-4 border-dashed border-amber-400 flex flex-col items-center justify-center p-6 text-center text-white pointer-events-none animate-in fade-in duration-150">
              <UploadCloud size={64} className="text-amber-400 animate-bounce mb-3" />
              <h3 className="text-xl font-black text-amber-300 mb-1">
                أفلت الصورة هنا لإدراجها فوق صفحة {activeDragTargetPage || currentPage}
              </h3>
              <p className="text-xs text-amber-100/90 font-bold max-w-sm">
                سيتم إدراج الصورة كشكل توضيحي عائم قابل للتحريك وإعادة التحجيم
              </p>
            </div>
          )}

          {/* Action Notification Banner */}
          {imageNotice && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in duration-200">
              <CheckCircle2 size={16} />
              <span>{imageNotice}</span>
            </div>
          )}
          {/* ========================================================================= */}
          {/* A. VERTICAL PAGE INDEX & THUMBNAILS RAIL (لتسهيل تصفح الصفحات المتتابعة)   */}
          {/* ========================================================================= */}
          {viewMode === 'continuous' && (
            <aside 
              className="hidden lg:flex flex-col w-32 bg-slate-950/95 border-l border-slate-800 p-2.5 overflow-y-auto custom-scrollbar space-y-2 shrink-0 select-none z-10" 
              dir="rtl"
              aria-label="شريط تصفح وفهرس صفحات المستند الرأسي"
            >
              <div className="text-[10px] font-black text-slate-300 text-center pb-2 border-b border-slate-800 flex items-center justify-between px-1">
                <span className="flex items-center gap-1 text-amber-400">
                  <FileText size={12} />
                  <span>فهرس الصفحات</span>
                </span>
                <span className="font-mono text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded text-[9px]">
                  {totalPages} صـ
                </span>
              </div>

              <div className="flex flex-col space-y-2">
                {Array.from({ length: totalPages }, (_, idx) => {
                  const pNum = idx + 1;
                  const isCurrent = currentPage === pNum;
                  const isScrollSpotlight = scrollStoppedPage === pNum && isScrollHighlightActive;
                  const pageAnnosCount = annotations.filter((a) => a.pageNumber === pNum).length;

                  return (
                    <button
                      key={`page-rail-btn-${pNum}`}
                      type="button"
                      onClick={() => scrollToPage(pNum)}
                      className={`w-full p-2 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        isScrollSpotlight
                          ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400 scale-[1.03]'
                          : isCurrent
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40'
                          : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title={`انتقال فوري إلى صفحة ${pNum}`}
                    >
                      {/* Visual Mini Page Card */}
                      <div
                        className={`w-14 h-18 rounded border p-1 flex flex-col justify-between transition-all ${
                          isScrollSpotlight
                            ? 'bg-slate-900 border-amber-300 shadow-amber-500/30 shadow-md ring-1 ring-amber-400'
                            : isCurrent
                            ? 'bg-slate-900 border-amber-400/60 shadow-inner'
                            : 'bg-slate-950 border-slate-700/80'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isScrollSpotlight
                                ? 'bg-amber-300 animate-ping'
                                : isCurrent
                                ? 'bg-amber-400 animate-pulse'
                                : 'bg-slate-600'
                            }`}
                          />
                          <span className="text-[8px] font-mono text-slate-500 font-bold">صـ {pNum}</span>
                        </div>
                        <div className="space-y-0.5 w-full">
                          <div className="h-0.5 w-full bg-slate-700 rounded-full" />
                          <div className="h-0.5 w-4/5 bg-slate-700 rounded-full" />
                          <div className="h-0.5 w-full bg-slate-700 rounded-full" />
                        </div>
                        <div className="text-[8px] font-mono text-center font-bold text-amber-400/90">
                          {pNum} / {totalPages}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold">
                        <span>صفحة {pNum}</span>
                        {isScrollSpotlight ? (
                          <span className="text-amber-300 text-xs animate-bounce" title="الصفحة النشطة المعروضة حالياً">📍</span>
                        ) : isCurrent ? (
                          <span className="text-amber-400 text-xs">👁️</span>
                        ) : null}
                      </div>

                      {pageAnnosCount > 0 && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-bold">
                          💬 {pageAnnosCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>
          )}

          {/* ========================================================================= */}
          {/* B. DOCUMENT VIEWING CANVAS (Right / Center)                               */}
          {/* ========================================================================= */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleContainerScroll}
            onMouseDown={(e) => {
              if (toolSubMode === 'pan' || e.button === 1) {
                if (handlePanStart(e.clientX, e.clientY, e.target)) {
                  e.preventDefault();
                }
              }
            }}
            style={{
              scrollSnapType: 'y mandatory',
            }}
            className={`pdf-infinite-scroll-canvas flex-1 overflow-y-auto snap-y snap-mandatory p-4 sm:p-6 flex flex-col items-center justify-start bg-slate-950/90 relative custom-scrollbar scroll-smooth ${
              toolSubMode === 'pan'
                ? isPanning
                  ? 'cursor-grabbing select-none'
                  : 'cursor-grab select-none'
                : ''
            }`}
          >
            {/* Pan Tool Active Floating HUD Indicator */}
            <AnimatePresence>
              {isToolActive && toolSubMode === 'pan' && (
                <motion.div
                  id="pdf-pan-active-hud"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border-2 border-amber-400 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md select-none text-xs ring-4 ring-amber-400/20"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-400/50">
                    <Hand size={18} className="animate-pulse" />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="font-bold text-amber-300">أداة التحريك (Pan) نشطة</span>
                    <span className="text-[11px] text-slate-300">اسحب بالفأرة أو اللمس للتنقل بحرية عبر صفحات المستند</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setToolSubMode('text_highlight')}
                    className="mr-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 font-bold text-xs cursor-pointer transition-all active:scale-95"
                  >
                    إنهاء التحريك
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Guide hint for teacher */}
            {mode === 'teacher' && (
              <div className="w-full max-w-4xl mb-3 p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-200 text-xs flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Highlighter size={16} className="shrink-0 text-amber-400" />
                  <span>
                    <strong>طريقة تمييز النصوص:</strong> قم بتحديد أي كلمة، جملة، أو فقرة بالفأرة مباشرة 🖱️ ليظهر شريط التمييز السريع وتكتب تعليقك التوضيحي للطلاب.
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-lg shrink-0">
                  تظهر الملاحظات والتظليلات فوراً في بوابة الطالب ✅
                </span>
              </div>
            )}

            {/* Guide hint for student */}
            {mode === 'student' && (
              <div className="w-full max-w-4xl mb-3 p-2.5 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl text-indigo-200 text-xs flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="shrink-0 text-indigo-400" />
                  <span>
                    <strong>توجيهات المعلم المعتمدة:</strong> انقر على أي عبارة أو جملة مُميّزة بالألوان لقراءة شرح وملاحظة المعلم والاستماع إليها صوتياً 🔊.
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-lg shrink-0">
                  {annotations.length} ملاحظات وتوجيهات
                </span>
              </div>
            )}

            {/* Top Document Header Banner (بداية المستند المتتابع) */}
            {viewMode === 'continuous' && (
              <div
                className="w-full mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right select-none transition-all duration-200"
                style={getZoomContainerStyle()}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-300">مستند PDF معتمد • تنظيم رأسي متتابع ومستمر</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                        {totalPages} صفحات كاملة
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {resource.title} — إعداد المعلم: {resource.teacher_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold">
                    {annotations.length} توجيهات معتمدة
                  </div>
                  <button
                    type="button"
                    onClick={toggleFullScreen}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isFullScreen
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
                    }`}
                    title={isFullScreen ? 'تصغير وخروج من ملء الشاشة' : 'توسيع لعرض كامل الشاشة'}
                  >
                    {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    <span>{isFullScreen ? 'تصغير' : 'توسيع الشاشة'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToPage(1)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30 transition-all cursor-pointer"
                    title="انتقال لأول صفحة"
                  >
                    صفحة 1 ⬇️
                  </button>
                </div>
              </div>
            )}

            {/* Sticky Page Navigation & Indicator Bar (يثبت بأعلى مساحة العرض لتسهيل التنقل أثناء الشرح) */}
            {viewMode === 'continuous' && (
              <div
                className="sticky top-0 z-20 w-full mb-6 px-4 py-2.5 rounded-2xl bg-slate-900/98 border-2 border-slate-700 shadow-2xl shadow-black/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs text-white select-none transition-all duration-200"
                style={getZoomContainerStyle()}
              >
                {/* Current Page Status */}
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-slate-300 font-bold">
                    {mode === 'teacher' ? 'وضع الشرح المباشر:' : 'أنت تطالع الآن:'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black border border-amber-500/40 text-xs">
                    صفحة {currentPage} من {totalPages}
                  </span>
                </div>

                {/* Teacher Lecture Step Controls (السابق والتالي) */}
                <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => scrollToPage(currentPage - 1)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1 cursor-pointer transition-all"
                    title="الانتقال إلى الصفحة السابقة"
                  >
                    <ChevronRight size={15} />
                    <span className="hidden sm:inline">السابقة</span>
                  </button>

                  <div className="h-4 w-px bg-slate-800" />

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => scrollToPage(currentPage + 1)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1 cursor-pointer transition-all"
                    title="الانتقال إلى الصفحة التالية"
                  >
                    <span className="hidden sm:inline">التالية</span>
                    <ChevronLeft size={15} />
                  </button>
                </div>

                {/* Page Jump Direct Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-bold ml-1 hidden lg:inline">انتقال لصفحة:</span>
                  {Array.from({ length: totalPages }, (_, i) => {
                    const p = i + 1;
                    const isCurr = p === currentPage;
                    return (
                      <button
                        key={`sticky-quick-p-${p}`}
                        type="button"
                        onClick={() => scrollToPage(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          isCurr
                            ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-400/50 scale-105'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                        }`}
                        title={`انتقال مباشر لصفحة ${p}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {/* Secondary In-Canvas Pen Stroke Slider for Continuous View (1px to 20px) */}
                {mode === 'teacher' && (
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-[11px]" title="سُمك القلم والتأطير (1px - 20px)">
                    <Sliders size={12} className="text-amber-400" />
                    <span className="text-slate-400 font-bold hidden md:inline">سُمك القلم:</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={penStrokeThickness}
                      onChange={(e) => setPenStrokeThickness(Number(e.target.value))}
                      className="w-16 sm:w-20 accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                      aria-label="سُمك خط القلم (Pen stroke thickness)"
                    />
                    <span className="font-mono text-[10px] font-black text-amber-300 bg-slate-900 px-1 rounded border border-slate-700">
                      {penStrokeThickness}px
                    </span>
                  </div>
                )}

                {/* Teacher Presentation Zoom Quick Toggles */}
                <div className="hidden xl:flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-xl border border-slate-800 text-[11px]">
                  <span className="text-slate-400 font-bold ml-1">عرض الشرح:</span>
                  {[90, 100, 115, 130].map((level) => (
                    <button
                      key={`zoom-btn-${level}`}
                      type="button"
                      onClick={() => setZoomLevel(level)}
                      className={`px-1.5 py-0.5 rounded font-mono font-bold cursor-pointer ${
                        zoomLevel === level
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {level}%
                    </button>
                  ))}
                </div>

                {/* Infinite Scrolling Status & Toggle Button */}
                <button
                  type="button"
                  onClick={() => setInfiniteScrollEnabled(!infiniteScrollEnabled)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                    infiniteScrollEnabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="تفعيل/تعطيل ميزة التمرير اللانهائي المستمر للمستند"
                >
                  <InfinityIcon size={14} className={infiniteScrollEnabled ? 'text-amber-400' : 'text-slate-500'} />
                  <span className="hidden sm:inline">التمرير اللانهائي:</span>
                  <span>{infiniteScrollEnabled ? 'مفعّل ♾️' : 'موقف'}</span>
                </button>

                {/* Expand / Full-screen Toggle in Sticky Bar */}
                <button
                  type="button"
                  id="pdf-sticky-fullscreen-btn"
                  onClick={toggleFullScreen}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                    isFullScreen
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                  }`}
                  title={isFullScreen ? 'تصغير وخروج من ملء الشاشة' : 'توسيع لعرض كامل الشاشة (Full-screen mode)'}
                >
                  {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  <span className="hidden md:inline">{isFullScreen ? 'تصغير' : 'ملء الشاشة'}</span>
                </button>
              </div>
            )}

            {/* Continuous Vertical Pages Stack OR Single Page View */}
            {viewMode === 'continuous' ? (
              <div className="w-full flex flex-col items-center justify-start space-y-4">
                {Array.from({ length: totalPages }, (_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <React.Fragment key={`page-stream-${pNum}`}>
                      {renderSinglePageBlock(pNum)}
                      {pNum < totalPages && renderPageDivider(pNum, pNum + 1)}
                    </React.Fragment>
                  );
                })}

                {/* Infinite Scrolling Continuation Portal / Completion Banner */}
                {infiniteScrollEnabled ? (
                  <div
                    className="pdf-infinite-glow w-full mt-8 mb-10 p-6 rounded-2xl border-2 border-amber-500/50 shadow-2xl flex flex-col items-center text-center gap-4 select-none relative overflow-hidden transition-all duration-200"
                    style={getZoomContainerStyle()}
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 flex items-center justify-center font-bold text-xl shadow-lg shrink-0">
                        <InfinityIcon size={24} className="animate-spin-slow" />
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-amber-300">
                            التمرير اللانهائي نشط ومستمر • دورة المراجعة #{infiniteLoopCycle}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                            تتابع مستمر سلس
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          أكملت استعراض كافة صفحات الملف ({totalPages} من {totalPages} صفحة). يمكنك مواصلة التمرير بسلاسة للدورة القادمة دون انقطاع، أو العودة الفورية لأي صفحة مع حفظ التمييزات والملاحظات.
                        </p>
                      </div>
                    </div>

                    <div className="w-full flex flex-wrap items-center justify-center gap-2.5 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleInfiniteLoopCycle}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black border border-amber-400 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                        title="متابعة الشرح بالتمرير اللانهائي من بداية المستند"
                      >
                        <RotateCcw size={14} />
                        <span>متابعة الشرح بالتمرير اللانهائي السلس 🔁</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => scrollToPage(1)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <ArrowUp size={14} />
                        <span>الانتقال لصفحة 1</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-full mt-6 mb-8 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right select-none transition-all duration-200"
                    style={getZoomContainerStyle()}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-emerald-300">
                          نهاية المستند • تم استعراض كافة الصفحات بنجاح
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          أكملت مطالعة كافة صفحات ملف الـ PDF ({totalPages} من {totalPages} صفحة متتابعة)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => scrollToPage(1)}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
                      title="العودة إلى بداية المستند"
                    >
                      <ArrowUp size={14} />
                      <span>العودة للأعلى (صفحة 1)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-start relative min-h-[600px] select-auto">
                {/* Single-Page Mode Header Bar with Navigation Arrows & Mode Switch */}
                <div 
                  className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 px-4 py-2 mb-4 bg-slate-900/95 border-2 border-slate-800 rounded-2xl shadow-xl backdrop-blur-md select-none"
                  style={getZoomContainerStyle()}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-black text-amber-300">وضع الصفحة المفردة (Single-Page View)</span>
                    <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">• صفحة واحدة فقط معروضة</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Previous Page Navigation Arrow */}
                    <button
                      type="button"
                      id="pdf-single-page-top-prev-btn"
                      data-testid="pdf-single-page-top-prev"
                      disabled={currentPage <= 1}
                      onClick={() => scrollToPage(currentPage - 1)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-slate-800 disabled:hover:text-slate-200 active:scale-95 shadow-sm"
                      title="الصفحة السابقة (Previous Page Arrow)"
                    >
                      <ChevronRight size={16} />
                      <span>الصفحة السابقة</span>
                    </button>

                    <div className="px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs font-black text-amber-400">
                      صـ {currentPage} من {totalPages}
                    </div>

                    {/* Next Page Navigation Arrow */}
                    <button
                      type="button"
                      id="pdf-single-page-top-next-btn"
                      data-testid="pdf-single-page-top-next"
                      disabled={currentPage >= totalPages}
                      onClick={() => scrollToPage(currentPage + 1)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-slate-800 disabled:hover:text-slate-200 active:scale-95 shadow-sm"
                      title="الصفحة التالية (Next Page Arrow)"
                    >
                      <span>الصفحة التالية</span>
                      <ChevronLeft size={16} />
                    </button>

                    {/* Rotate Single Page 90° Increments */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
                      <button
                        type="button"
                        id="pdf-single-page-rotate-cw-btn"
                        data-testid="pdf-single-page-rotate-cw"
                        onClick={() => handleRotatePage(currentPage, 90)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-400 font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
                        title="تدوير الصفحة المفردة 90° باتجاه عقارب الساعة"
                      >
                        <RotateCw size={13} />
                        <span>تدوير 90°</span>
                        {pageRotations[currentPage] ? `(${pageRotations[currentPage]}°)` : ''}
                      </button>

                      {(pageRotations[currentPage] || 0) !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleResetPageRotation(currentPage)}
                          className="p-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-all cursor-pointer"
                          title="إعادة ضبط الزاوية إلى 0°"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>

                    {/* Toggle Back to Continuous View Button */}
                    <button
                      type="button"
                      id="pdf-single-page-switch-continuous-btn"
                      onClick={() => setViewMode('continuous')}
                      className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="العودة إلى وضع التمرير المستمر لكافة الصفحات"
                    >
                      <ScrollText size={13} />
                      <span className="hidden md:inline">تمرير مستمر</span>
                    </button>
                  </div>
                </div>

                {/* Main Single Page Area Flanked by Side Navigation Arrows */}
                <div className="w-full flex items-center justify-center gap-2 sm:gap-4 relative px-2">
                  {/* Flanking Side Navigation Arrow: Previous Page (Right in RTL) */}
                  <button
                    type="button"
                    id="pdf-single-page-side-prev-btn"
                    data-testid="pdf-single-page-side-prev"
                    disabled={currentPage <= 1}
                    onClick={() => scrollToPage(currentPage - 1)}
                    className="hidden xl:flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border-2 border-slate-700/80 hover:border-amber-400/60 shadow-2xl backdrop-blur-md transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed active:scale-95 group shrink-0 sticky top-1/2 -translate-y-1/2 z-10"
                    title={`الصفحة السابقة (صـ ${Math.max(1, currentPage - 1)})`}
                    aria-label="الانتقال إلى الصفحة السابقة"
                  >
                    <ChevronRight size={28} className="transition-transform group-hover:translate-x-1" />
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-300 mt-1">السابقة</span>
                  </button>

                  {/* Single Page Sheet with 300ms Vertical Slide Transition */}
                  <div className="flex-1 flex justify-center overflow-hidden relative min-h-[600px]">
                    <AnimatePresence mode="popLayout" custom={pageSlideDirection}>
                      <motion.div
                        key={`single-page-view-${currentPage}`}
                        custom={pageSlideDirection}
                        variants={{
                          initial: (dir: 'next' | 'prev') => ({
                            y: dir === 'next' ? '100%' : '-100%',
                            opacity: 1,
                          }),
                          animate: {
                            y: 0,
                            opacity: 1,
                            transition: {
                              duration: 0.3, // 300ms
                              ease: [0.25, 0.1, 0.25, 1.0], // smooth and natural ease-in-out curve
                            },
                          },
                          exit: (dir: 'next' | 'prev') => ({
                            y: dir === 'next' ? '-100%' : '100%',
                            opacity: 1,
                            transition: {
                              duration: 0.3, // 300ms
                              ease: [0.25, 0.1, 0.25, 1.0], // smooth and natural ease-in-out curve
                            },
                          }),
                        }}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="w-full flex justify-center"
                      >
                        {renderSinglePageBlock(currentPage)}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Flanking Side Navigation Arrow: Next Page (Left in RTL) */}
                  <button
                    type="button"
                    id="pdf-single-page-side-next-btn"
                    data-testid="pdf-single-page-side-next"
                    disabled={currentPage >= totalPages}
                    onClick={() => scrollToPage(currentPage + 1)}
                    className="hidden xl:flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border-2 border-slate-700/80 hover:border-amber-400/60 shadow-2xl backdrop-blur-md transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed active:scale-95 group shrink-0 sticky top-1/2 -translate-y-1/2 z-10"
                    title={`الصفحة التالية (صـ ${Math.min(totalPages, currentPage + 1)})`}
                    aria-label="الانتقال إلى الصفحة التالية"
                  >
                    <ChevronLeft size={28} className="transition-transform group-hover:-translate-x-1" />
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-300 mt-1">التالية</span>
                  </button>
                </div>
              </div>
            )}

            {/* Floating Quick Page Browsing & Navigation Dock */}
            <div className="sticky bottom-4 z-30 mt-6 px-4 py-2 bg-slate-900/95 border-2 border-slate-700/90 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-md flex items-center gap-3 select-none text-xs text-white">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => scrollToPage(currentPage - 1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 cursor-pointer"
                  title="الصفحة السابقة"
                >
                  <ChevronRight size={15} />
                </button>

                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                  <span className="text-amber-400 font-bold">صـ {currentPage}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-slate-300">{totalPages}</span>
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => scrollToPage(currentPage + 1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 cursor-pointer"
                  title="الصفحة التالية"
                >
                  <ChevronLeft size={15} />
                </button>
              </div>

              <div className="h-4 w-px bg-slate-700 hidden sm:block" />

              {/* Quick Jump Dropdown */}
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-300">
                <span>انتقال سريع:</span>
                <select
                  aria-label="انتقال سريع إلى صفحة"
                  value={currentPage}
                  onChange={(e) => scrollToPage(parseInt(e.target.value, 10))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono font-bold outline-none cursor-pointer"
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={`dock-p-${i + 1}`} value={i + 1}>
                      صفحة {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-4 w-px bg-slate-700 hidden sm:block" />

              {/* Dock Rotate Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="pdf-dock-rotate-cw-btn"
                  onClick={() => handleRotatePage(currentPage, 90)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 text-[11px]"
                  title={`تدوير صفحة ${currentPage} بمقدار 90° مع عقارب الساعة`}
                >
                  <RotateCw size={12} />
                  <span className="hidden lg:inline">تدوير 90°</span>
                  {pageRotations[currentPage] ? (
                    <span className="font-mono text-[10px] text-amber-400 bg-amber-500/20 px-1 rounded">
                      {pageRotations[currentPage]}°
                    </span>
                  ) : null}
                </button>
              </div>

              <div className="h-4 w-px bg-slate-700" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="pdf-dock-zoom-out-btn"
                  onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer active:scale-95 transition-all"
                  title="تصغير (أو قرص الشاشة للداخل)"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  id="pdf-dock-zoom-reset-btn"
                  onClick={() => setZoomLevel(100)}
                  className="font-mono text-[10px] text-slate-300 hover:text-amber-300 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 w-11 text-center font-bold transition-colors cursor-pointer"
                  title="إعادة التكبير إلى 100% افتراضي"
                >
                  {zoomLevel}%
                </button>
                <button
                  type="button"
                  id="pdf-dock-zoom-in-btn"
                  onClick={() => setZoomLevel((z) => Math.min(220, z + 10))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer active:scale-95 transition-all"
                  title="تكبير (أو قرص الشاشة للخارج Pinch-to-zoom)"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              {/* Scroll to top button */}
              <button
                type="button"
                onClick={() => scrollToPage(1)}
                className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer hidden md:flex items-center gap-1 text-[11px] font-bold"
                title="العودة لأول صفحة"
              >
                <ArrowUp size={13} />
                <span>للبداية</span>
              </button>

              {/* Expand / Full-screen Toggle in Dock */}
              <button
                type="button"
                id="pdf-dock-fullscreen-btn"
                onClick={toggleFullScreen}
                className={`p-1.5 rounded-lg border cursor-pointer flex items-center gap-1 text-[11px] font-bold active:scale-95 transition-all ${
                  isFullScreen
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                }`}
                title={isFullScreen ? 'إنهاء وضع ملء الشاشة' : 'توسيع لعرض كامل الشاشة (Full-screen mode)'}
              >
                {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span className="hidden sm:inline">{isFullScreen ? 'تصغير' : 'توسيع'}</span>
              </button>
            </div>
          </div>

            {/* =================================================================== */}
            {/* FLOATING ACTION TOOLBAR OVER SELECTED TEXT                           */}
            {/* =================================================================== */}
            <AnimatePresence>
              {floatingToolbar && mode === 'teacher' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                  style={{
                    position: 'fixed',
                    left: `${floatingToolbar.x}px`,
                    top: `${floatingToolbar.y}px`,
                    transform: 'translateX(-50%)',
                    zIndex: 60
                  }}
                  className="bg-slate-900 border-2 border-amber-400/80 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-2 backdrop-blur-md"
                >
                  <button
                    type="button"
                    onClick={() => handleHighlightSelectionWithColor(activeColor)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Highlighter size={14} />
                    <span>تمييز وإضافة تعليق توضيحي ✍️</span>
                  </button>

                  <div className="h-4 w-px bg-slate-700" />

                  {/* Quick Color Palette in Floating Bar */}
                  <div className="flex items-center gap-1">
                    {(Object.keys(COLOR_MAP) as Array<PdfAnnotation['color']>).map((colorKey) => {
                      const c = COLOR_MAP[colorKey];
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => handleHighlightSelectionWithColor(colorKey)}
                          className="w-5 h-5 rounded-full border border-white/40 hover:scale-125 transition-transform cursor-pointer"
                          style={{ backgroundColor: c.hex }}
                          title={`تمييز بلون: ${c.label}`}
                        />
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setFloatingToolbar(null)}
                    className="p-1 text-slate-400 hover:text-white rounded cursor-pointer mr-1"
                    title="إلغاء"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* =================================================================== */}
            {/* POPUP MODAL: ADD NOTE PROMPT AFTER HIGHLIGHTING                     */}
            {/* =================================================================== */}
            <AnimatePresence>
              {pendingSelection && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
                >
                  <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 text-right">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <Highlighter size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white">إضافة تعليق توضيحي مرتبط بهذا الجزء 📝</h3>
                          <p className="text-[11px] text-slate-400">
                            سيتم تمييز هذا الجزء وعرض ملاحظتك فورياً لجميع الطلاب في بوابة الطالب
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingSelection(null)}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Quoted Selected Snippet if available */}
                    {pendingSelection.snippet && (
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                          <span>الجملة / الفقرة المحددة:</span>
                        </span>
                        <p className="text-xs text-slate-200 font-sans italic leading-relaxed line-clamp-3">
                          «{pendingSelection.snippet}»
                        </p>
                      </div>
                    )}

                    {/* Color and Category Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">تصنيف وهدف التمييز:</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(COLOR_MAP) as Array<PdfAnnotation['color']>).map((key) => {
                          const c = COLOR_MAP[key];
                          const isSelected = activeColor === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setActiveColor(key)}
                              className={`p-2 rounded-xl text-[11px] font-bold border text-right flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-800 border-amber-400 text-white ring-1 ring-amber-400'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                              <span className="truncate">{c.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Teacher Note Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        التعليق والتوضيح الأكاديمي للطلاب *
                      </label>
                      <textarea
                        autoFocus
                        rows={3}
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        placeholder="اكتب هنا توجيهاً امتحانياً، تنبيهاً لقانون مهم، أو ملاحظة تدريبية تظهر للطالب في هذا الموضع تحديداً..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400 font-sans leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setPendingSelection(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        disabled={!draftNote.trim() || isSavingNote}
                        onClick={handleSaveAnnotation}
                        className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>حفظ ونشر الملاحظة للطلاب 💾</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          {/* ========================================================================= */}
          {/* 2. SIDEBAR: ANNOTATIONS LIST (Left side)                                  */}
          {/* ========================================================================= */}
          {isSidebarOpen ? (
            <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300">
              <div className="p-4 border-b border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bookmark size={16} className="text-amber-400" />
                    <h3 className="text-xs font-black text-white">
                      {mode === 'teacher' ? 'ملاحظات المعلم التوضيحية' : 'توجيهات وشروح المعلم'} ({annotations.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono font-bold">
                      {mode === 'teacher' ? 'مزامنة مع بوابة الطالب' : 'معتمد رسمي'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
                      title="طي لوحة الملاحظات لتوسيع المستند"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

              {/* Search in notes */}
              <div className="relative">
                <Search size={14} className="absolute right-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في نصوص وملاحظات المعلم..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilterColor('all')}
                  className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                    filterColor === 'all'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({annotations.length})
                </button>
                {(Object.keys(COLOR_MAP) as Array<PdfAnnotation['color']>).map((k) => {
                  const c = COLOR_MAP[k];
                  const count = annotations.filter((a) => a.color === k).length;
                  if (count === 0 && filterColor !== k) return null;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFilterColor(k)}
                      className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer ${
                        filterColor === k
                          ? 'bg-slate-750 text-white ring-1 ring-amber-400'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredAnnotations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <MessageSquare size={28} className="mx-auto text-slate-600" />
                  <p className="text-xs font-medium">لا توجد ملاحظات مطابقة.</p>
                  {mode === 'teacher' && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      حدد أي جملة في النص بالفأرة واضغط «تمييز» لنشر توجيه فوري للطلاب.
                    </p>
                  )}
                </div>
              ) : (
                filteredAnnotations.map((anno) => {
                  const c = COLOR_MAP[anno.color || 'amber'];
                  const isCurrentPage = anno.pageNumber === currentPage;
                  const isFocused = activeAnnotationId === anno.id;

                  return (
                    <div
                      key={anno.id}
                      onClick={() => {
                        setCurrentPage(anno.pageNumber);
                        setActiveAnnotationId(anno.id);
                        if (viewMode === 'continuous') {
                          const el = document.getElementById(`highlight-text-${anno.id}`) || document.getElementById(`pdf-page-${anno.pageNumber}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        } else {
                          setTimeout(() => {
                            const el = document.getElementById(`highlight-text-${anno.id}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 100);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer space-y-2 ${
                        isFocused
                          ? 'bg-slate-850 border-amber-400 shadow-lg ring-1 ring-amber-400/40'
                          : isCurrentPage
                          ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                          : 'bg-slate-950/60 border-slate-800/70 hover:border-slate-700 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                          <span className="font-bold text-slate-200">{c.label}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          صـ {anno.pageNumber}
                        </span>
                      </div>

                      {/* Quoted Text if exists */}
                      {anno.highlightText && (
                        <div className="text-[11px] text-slate-300 font-mono italic bg-slate-950/90 p-2 rounded-xl border border-slate-800/90 leading-relaxed line-clamp-2 border-r-2 border-r-amber-400">
                          «{anno.highlightText}»
                        </div>
                      )}

                      {/* Teacher's Note */}
                      <div className="text-xs text-amber-200 font-sans leading-relaxed line-clamp-3">
                        💬 {anno.note}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-800/50">
                        <div className="flex items-center gap-1.5">
                          <span>{anno.authorName || 'معلم المادة'}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakNote(anno.note);
                            }}
                            className="text-slate-400 hover:text-amber-300 p-0.5"
                            title="الاستماع للشرح صوتياً"
                          >
                            <Volume2 size={12} />
                          </button>
                        </div>
                        {mode === 'teacher' && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteAnnotation(anno.id, e)}
                            className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded cursor-pointer"
                            title="حذف الملاحظة"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer info */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>عدد الصفحات: {totalPages}</span>
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <CheckCircle2 size={12} />
                <span>معتمد للطلاب وبوابة التفوق</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-between w-11 bg-slate-900/95 border-t md:border-t-0 md:border-r border-slate-800 py-3 shrink-0 select-none">
            <button
              type="button"
              id="pdf-open-sidebar-rail-btn"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 hover:border-amber-500/50 shadow-md transition-all cursor-pointer flex flex-col items-center gap-1.5 group active:scale-95"
              title="إظهار لوحة ملاحظات المعلم الجانبية"
            >
              <Bookmark size={16} className="group-hover:scale-110 transition-transform text-amber-400" />
              <span className="text-[10px] font-black [writing-mode:vertical-rl] text-slate-300 group-hover:text-amber-300 mt-2 tracking-wide">
                الملاحظات ({annotations.length})
              </span>
            </button>
          </div>
        )}

          {/* ========================================================================= */}
          {/* CORNER 'EXPAND' BUTTON (زر 'توسيع' في زاوية الحاوية مع تأثير انتقال سلس)      */}
          {/* ========================================================================= */}
          <motion.button
            type="button"
            id="pdf-corner-expand-btn"
            onClick={toggleFullScreen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            className={`absolute top-4 start-4 lg:start-36 z-40 px-3.5 py-2 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold transition-all duration-300 cursor-pointer select-none ring-2 ${
              isFullScreen
                ? 'bg-amber-500 text-slate-950 border-amber-400 ring-amber-400/40 shadow-amber-500/30'
                : 'bg-slate-900/95 hover:bg-slate-850 text-slate-200 hover:text-white border-slate-700/90 ring-slate-800/80 shadow-black/70 hover:border-amber-400'
            }`}
            title={isFullScreen ? 'إنهاء وضع ملء الشاشة والعودة للنافذة القياسية (Esc)' : 'توسيع للقراءة بملء الشاشة مع انتقال سلس (F)'}
            aria-label="توسيع"
          >
            <div
              className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all ${
                isFullScreen ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {isFullScreen ? (
                <Minimize2 size={14} className="stroke-[2.5]" />
              ) : (
                <Maximize2 size={14} className="stroke-[2.5]" />
              )}
            </div>
            <div className="flex flex-col items-start leading-tight text-right">
              <span className="font-black text-xs">
                {isFullScreen ? 'إنهاء التوسيع' : 'توسيع'}
              </span>
              <span
                className={`text-[9px] font-medium ${
                  isFullScreen ? 'text-slate-900/80 font-bold' : 'text-slate-400'
                }`}
              >
                {isFullScreen ? 'النافذة القياسية' : 'ملء الشاشة للقراءة'}
              </span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-lg font-mono font-black ${
                isFullScreen
                  ? 'bg-slate-950/25 text-slate-950'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {isFullScreen ? 'Esc' : 'F'}
            </span>
          </motion.button>

          {/* ========================================================================= */}
          {/* FLOATING 'BACK TO TOP' BUTTON (عودة سريعة لبداية المستند - تظهر فقط عند التمرير) */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {showScrollToTop && (
              <motion.button
                type="button"
                id="pdf-back-to-top-btn"
                key="pdf-floating-back-to-top-button"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                onClick={handleScrollToTop}
                className="absolute bottom-6 start-6 lg:start-36 z-40 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-2xl shadow-amber-500/40 border border-amber-300 flex items-center gap-2.5 cursor-pointer transition-all active:scale-95 group select-none backdrop-blur-md ring-2 ring-amber-400/30"
                title="العودة السريعة لبداية المستند (صفحة 1)"
                aria-label="عودة للأعلى"
              >
                <div className="w-6 h-6 rounded-xl bg-slate-950/15 flex items-center justify-center group-hover:-translate-y-0.5 transition-transform">
                  <ArrowUp size={15} className="text-slate-950 stroke-[3]" />
                </div>
                <span className="font-black tracking-wide">عودة للأعلى</span>
                {currentPage > 1 && (
                  <span className="bg-slate-950/20 text-slate-950 px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold">
                    صـ {currentPage}
                  </span>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* PINCH-TO-ZOOM HUD & TOUCH GESTURE FEEDBACK OVERLAY                        */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {pinchFeedback.active && (
              <motion.div
                id="pdf-pinch-zoom-hud"
                initial={{ opacity: 0, scale: 0.85, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -20 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900/98 border-2 border-amber-400 text-white shadow-2xl shadow-black/90 backdrop-blur-md flex items-center gap-3.5 select-none pointer-events-none ring-4 ring-amber-400/20"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-400 flex items-center justify-center shrink-0">
                  <Smartphone size={20} className="animate-pulse" />
                </div>
                <div className="flex flex-col text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {pinchFeedback.source === 'pinch' ? 'إيماءة تكبير اللمس (Pinch-to-zoom)' : 'تكبير النقر المزدوج'}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-mono font-black text-xs shadow-sm">
                      {pinchFeedback.zoom}%
                    </span>
                  </div>
          {/* Visual slider bar */}
                  <div className="w-40 h-2 bg-slate-950 rounded-full mt-2 overflow-hidden border border-slate-700/80">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full transition-all duration-75"
                      style={{ width: `${Math.min(100, Math.max(0, ((pinchFeedback.zoom - 60) / (220 - 60)) * 100))}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* FLOATING IMAGE FULLSCREEN LIGHTBOX MODAL                                  */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {lightboxImageUrl && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLightboxImageUrl(null)}
                className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 select-none"
              >
                <div 
                  className="relative max-w-5xl max-h-[90vh] flex flex-col items-center bg-slate-900 border-2 border-slate-700 rounded-3xl overflow-hidden shadow-2xl p-3 w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full flex items-center justify-between px-3 py-2 border-b border-slate-800 text-slate-200">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={18} className="text-amber-400" />
                      <span className="font-bold text-sm text-white">
                        {lightboxImageUrl.title || 'عرض الصورة بالحجم الكامل'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={lightboxImageUrl.url}
                        download={lightboxImageUrl.title || 'annotated-image'}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                        title="تنزيل الصورة"
                      >
                        <Download size={16} />
                      </a>
                      <button
                        type="button"
                        onClick={() => setLightboxImageUrl(null)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition-colors cursor-pointer"
                        title="إغلاق (Esc)"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 w-full flex items-center justify-center p-2 overflow-auto max-h-[75vh]">
                    <img
                      src={lightboxImageUrl.url}
                      alt={lightboxImageUrl.title}
                      className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-800"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* DEVICE CAMERA CAPTURE MODAL (Live Viewfinder & Snapshot to Active Page)   */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {isCameraModalOpen && (
              <motion.div
                id="whiteboard-camera-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 select-none"
              >
                <div 
                  className="relative w-full max-w-2xl bg-slate-900 border-2 border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400">
                        <Camera size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                          التقاط بالكاميرا إلى الصفحة النشطة
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono">
                            صفحة {currentPage}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {capturedPhotoUrl 
                            ? 'معاينة اللقطة: يمكنك اعتمادها للإدراج أو إعادة الالتقاط' 
                            : 'وجّه الكاميرا نحو المستند أو المسألة واضغط على زر الالتقاط'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!capturedPhotoUrl && (
                        <button
                          type="button"
                          onClick={handleToggleCameraFacing}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="التبديل بين الكاميرا الخلفية والأمامية"
                        >
                          <SwitchCamera size={14} className="text-cyan-400" />
                          <span className="hidden sm:inline">
                            {cameraFacingMode === 'environment' ? 'كاميرا خلفية' : 'كاميرا أمامية'}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCloseCameraModal}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 transition-colors cursor-pointer"
                        title="إلغاء وإغلاق (Esc)"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Viewfinder / Preview Body */}
                  <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] sm:min-h-[420px] overflow-hidden">
                    {capturedPhotoUrl ? (
                      /* Snapshot Preview */
                      <div className="relative w-full h-full flex items-center justify-center p-3">
                        <img
                          src={capturedPhotoUrl}
                          alt="Captured preview"
                          className="max-h-[60vh] max-w-full rounded-2xl object-contain border-2 border-emerald-500 shadow-2xl"
                        />
                        <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-emerald-600/90 text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          <span>تم التقاط الصورة بنجاح</span>
                        </div>
                      </div>
                    ) : (
                      /* Live Camera View */
                      <div className="relative w-full h-full flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover max-h-[62vh] ${
                            cameraFacingMode === 'user' ? '-scale-x-100' : ''
                          }`}
                        />

                        {/* Viewfinder HUD Target Corners */}
                        <div className="absolute inset-8 sm:inset-12 pointer-events-none border-2 border-dashed border-cyan-400/50 rounded-2xl flex flex-col justify-between p-2">
                          <div className="flex justify-between">
                            <div className="w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                            <div className="w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                          </div>
                          <div className="flex justify-between">
                            <div className="w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
                            <div className="w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                          </div>
                        </div>

                        {/* Loading Spinner */}
                        {isCameraLoading && (
                          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white">
                            <RefreshCw size={28} className="animate-spin text-cyan-400" />
                            <span className="text-xs font-bold">جارٍ تشغيل الكاميرا...</span>
                          </div>
                        )}

                        {/* Error Overlay with Native Fallback Option */}
                        {cameraError && (
                          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white gap-3.5 z-20">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                              <AlertTriangle size={24} />
                            </div>
                            <p className="text-xs text-amber-200 font-bold max-w-md leading-relaxed">
                              {cameraError}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
                              <button
                                type="button"
                                onClick={() => startCameraStream(cameraFacingMode)}
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCw size={14} />
                                <span>إعادة المحاولة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg flex items-center gap-1.5 cursor-pointer"
                              >
                                <Camera size={14} />
                                <span>التقاط بواسطة تطبيق كاميرا الهاتف 📱</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer Controls */}
                  <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/95 flex flex-wrap items-center justify-between gap-3">
                    {capturedPhotoUrl ? (
                      /* Snapshot Action Controls */
                      <div className="w-full flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handleRetakeSnapshot}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <RotateCcw size={14} />
                          <span>إعادة الالتقاط 🔄</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCloseCameraModal}
                            className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            id="confirm-camera-insert-btn"
                            onClick={handleConfirmCapturedPhoto}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                          >
                            <Check size={16} />
                            <span>إدراج في الصفحة النشطة (صـ {currentPage}) ✓</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Live Camera Controls */
                      <div className="w-full flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="فتح كاميرا الجهاز أو ملفات الصور"
                        >
                          <Camera size={13} className="text-cyan-400" />
                          <span className="hidden sm:inline">كاميرا الجهاز المباشرة 📱</span>
                          <span className="sm:hidden">كاميرا الجهاز</span>
                        </button>

                        {/* Large Shutter Button */}
                        <button
                          type="button"
                          id="take-camera-snapshot-btn"
                          disabled={isCameraLoading || !!cameraError}
                          onClick={handleTakeSnapshot}
                          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 disabled:opacity-40 flex items-center gap-2.5 transition-all cursor-pointer active:scale-95"
                          title="التقاط الصورة الآن"
                        >
                          <div className="w-4 h-4 rounded-full border-2 border-slate-950 bg-white animate-pulse" />
                          <span>التقاط الصورة 📸</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCloseCameraModal}
                          className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                        >
                          إغلاق
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PdfAnnotatorViewerModal;
