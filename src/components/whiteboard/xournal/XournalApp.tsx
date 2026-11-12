import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DocumentPage, 
  XournalTool, 
  PenThickness, 
  EraserType, 
  PageBackgroundStyle, 
  XournalPageLayoutMode,
  XournalProject 
} from './types';
import { createDefaultDocument } from './sampleDocument';
import { XournalMenuBar } from './XournalMenuBar';
import { XournalPrimaryToolbar } from './XournalPrimaryToolbar';
import { XournalSecondaryToolbar } from './XournalSecondaryToolbar';
import { XournalSidebar } from './XournalSidebar';
import { XournalCanvas } from './XournalCanvas';
import { exportDocumentToAnnotatedPdf, downloadPdfBytes } from './pdfExport';
import { loadPdfMetadataAndThumbnails, loadSelectedPdfPages, parsePageRange } from '../../../lib/pdfWhiteboardUtils';
import { XournalPresentationMode } from './XournalPresentationMode';
import { Loader2, FileDown, CheckCircle2, AlertCircle, FileText, FolderOpen, Sparkles, UploadCloud, X, Plus, ArrowDown, Columns, Layers, PenLine, Maximize2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pin, PinOff, Eye, EyeOff, Undo2, Redo2, History } from 'lucide-react';

interface XournalAppProps {
  initialTitle?: string;
  onClose?: () => void;
  teacherName?: string;
}

export const XournalApp: React.FC<XournalAppProps> = ({
  initialTitle = 'Calculus_Physics_Worksheet.pdf',
  onClose,
  teacherName = 'أ. زكي أبو علان'
}) => {
  // Document State (UNIFIED DOCUMENT MODEL)
  const [documentTitle, setDocumentTitle] = useState(initialTitle);
  const [pages, setPages] = useState<DocumentPage[]>(() => createDefaultDocument());
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [originalPdfBuffer, setOriginalPdfBuffer] = useState<ArrayBuffer | undefined>(undefined);

  // View States
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [pageLayoutMode, setPageLayoutMode] = useState<XournalPageLayoutMode>('single');

  // Auto-hide bars mode (maximize whiteboard canvas area, reveal on hover)
  const [isAutoHideBars, setIsAutoHideBars] = useState<boolean>(true);
  const [isTopHovered, setIsTopHovered] = useState<boolean>(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);
  const [isBottomHovered, setIsBottomHovered] = useState<boolean>(false);

  const topTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bottomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTopEnter = useCallback(() => {
    if (topTimeoutRef.current) clearTimeout(topTimeoutRef.current);
    setIsTopHovered(true);
  }, []);

  const handleTopLeave = useCallback(() => {
    if (topTimeoutRef.current) clearTimeout(topTimeoutRef.current);
    topTimeoutRef.current = setTimeout(() => {
      setIsTopHovered(false);
    }, 350);
  }, []);

  const handleSidebarEnter = useCallback(() => {
    if (sidebarTimeoutRef.current) clearTimeout(sidebarTimeoutRef.current);
    setIsSidebarHovered(true);
  }, []);

  const handleSidebarLeave = useCallback(() => {
    if (sidebarTimeoutRef.current) clearTimeout(sidebarTimeoutRef.current);
    sidebarTimeoutRef.current = setTimeout(() => {
      setIsSidebarHovered(false);
    }, 350);
  }, []);

  const handleBottomEnter = useCallback(() => {
    if (bottomTimeoutRef.current) clearTimeout(bottomTimeoutRef.current);
    setIsBottomHovered(true);
  }, []);

  const handleBottomLeave = useCallback(() => {
    if (bottomTimeoutRef.current) clearTimeout(bottomTimeoutRef.current);
    bottomTimeoutRef.current = setTimeout(() => {
      setIsBottomHovered(false);
    }, 350);
  }, []);

  useEffect(() => {
    return () => {
      if (topTimeoutRef.current) clearTimeout(topTimeoutRef.current);
      if (sidebarTimeoutRef.current) clearTimeout(sidebarTimeoutRef.current);
      if (bottomTimeoutRef.current) clearTimeout(bottomTimeoutRef.current);
    };
  }, []);

  // Active Tool & Style States (Xournal++ Faithful)
  const [activeTool, setActiveTool] = useState<XournalTool>('pen');
  const [thickness, setThickness] = useState<PenThickness>('medium');
  const [customWidth, setCustomWidth] = useState<number>(2.5);
  const [color, setColor] = useState('#000000');
  const [eraserType, setEraserType] = useState<EraserType>('stroke');
  const [highlighterMultiply, setHighlighterMultiply] = useState(true);
  const [selectedShapeType, setSelectedShapeType] = useState<'line' | 'arrow' | 'rect' | 'ellipse' | 'coord-axes'>('line');

  // Stylus & Hardware Settings
  const [stylusPressureEnabled, setStylusPressureEnabled] = useState(true);
  const [palmRejectionEnabled, setPalmRejectionEnabled] = useState(true);

  // Status Bar live info
  const [pointerStatus, setPointerStatus] = useState<{ x: number; y: number; pressure: number; pointerType: string }>({
    x: 0,
    y: 0,
    pressure: 0,
    pointerType: 'mouse'
  });

  // Export / Loading notification
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // File input ref for PDF upload & Journal (.xoj)
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const journalInputRef = useRef<HTMLInputElement>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);

  // Autosave & Recovery
  const AUTOSAVE_STORAGE_KEY = 'xournal_session_autosave_v1';
  const [hasAutosavedBackup, setHasAutosavedBackup] = useState(false);

  // PDF Page Selection Dialog state for multi-page documents
  const [pendingPdfData, setPendingPdfData] = useState<{
    file: File;
    buffer: ArrayBuffer;
    metadata: any;
    totalPages: number;
  } | null>(null);
  const [selectedPageRangeOption, setSelectedPageRangeOption] = useState<'all' | 'first6' | 'first12' | 'custom'>('all');
  const [customRangeText, setCustomRangeText] = useState('');

  // Drag and drop visual feedback
  const [isDragOver, setIsDragOver] = useState(false);

  // Check for existing autosaved backup on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          setHasAutosavedBackup(true);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Debounced autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const hasContent = pages.some(p => p.strokes.length > 0 || p.textAnnotations.length > 0 || p.type === 'pdf');
        if (hasContent) {
          const backupData = {
            title: documentTitle,
            updatedAt: new Date().toISOString(),
            pages
          };
          localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(backupData));
          setHasAutosavedBackup(true);
        }
      } catch (e) {
        console.warn('Autosave quota reached or failed:', e);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [pages, documentTitle]);

  const handleRestoreAutosavedSession = () => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (!saved) {
        alert('لا توجد مسودة تلقائية محفوظة.');
        return;
      }
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
        alert('المسودة المحفوظة غير صالحة.');
        return;
      }

      setPages(parsed.pages);
      setCurrentPageIndex(0);
      setActiveInteractionPageIndex(0);
      if (parsed.title) setDocumentTitle(parsed.title);
      setExportNotice(`تم استرداد مسودة الجلسة السابقة بنجاح (${parsed.pages.length} صفحة) 🔄`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to restore autosaved session:', err);
      alert('حدث خطأ أثناء استرداد المسودة.');
    }
  };

  // Active interaction page index (for targeted per-page Undo/Redo & multi-page layouts)
  const [activeInteractionPageIndex, setActiveInteractionPageIndex] = useState<number>(0);

  // Recalculate Page Navigation bounds safely
  const safePageIndex = Math.max(0, Math.min(currentPageIndex, pages.length - 1));
  const safeActivePageIndex = Math.max(0, Math.min(activeInteractionPageIndex, pages.length - 1));

  // Current selected page in document navigation
  const currentPage = pages[safePageIndex] || pages[0];
  // Target page for Undo/Redo (the page the user last clicked or drew on)
  const activeInteractionPage = pages[safeActivePageIndex] || currentPage;

  // Active page undo/redo statistics for UI badges and menus
  const activePageUndoCount = activeInteractionPage?.undoStack ? activeInteractionPage.undoStack.length : 0;
  const activePageRedoCount = activeInteractionPage?.redoStack ? activeInteractionPage.redoStack.length : 0;
  const activePageLabel = `صفحة ${safeActivePageIndex + 1}`;

  // Synchronized page selection
  const handleSelectPage = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, pages.length - 1));
    setCurrentPageIndex(clamped);
    setActiveInteractionPageIndex(clamped);
  }, [pages.length]);

  // Update page data at specific index (supports side-by-side & continuous dual editing)
  const handlePageUpdateAtIndex = useCallback((targetIndex: number, updatedPage: DocumentPage) => {
    setPages((prevPages) =>
      prevPages.map((p, idx) => (idx === targetIndex ? updatedPage : p))
    );
  }, []);

  // Update active page data
  const handlePageUpdate = useCallback((updatedPage: DocumentPage) => {
    handlePageUpdateAtIndex(safePageIndex, updatedPage);
  }, [handlePageUpdateAtIndex, safePageIndex]);

  // Isolated per-page Undo: operates strictly on targetIndex (or the active interaction page)
  const handleUndo = useCallback((targetIndex?: number) => {
    const pageIdx = typeof targetIndex === 'number' ? targetIndex : safeActivePageIndex;
    const targetPage = pages[pageIdx];
    if (!targetPage || !targetPage.undoStack || targetPage.undoStack.length === 0) return;

    const updatedUndoStack = [...targetPage.undoStack];
    const previousState = updatedUndoStack.pop()!;

    const updatedRedoStack = [
      ...(targetPage.redoStack || []),
      {
        strokes: JSON.parse(JSON.stringify(targetPage.strokes)),
        textAnnotations: JSON.parse(JSON.stringify(targetPage.textAnnotations))
      }
    ];

    const updatedPage: DocumentPage = {
      ...targetPage,
      undoStack: updatedUndoStack,
      redoStack: updatedRedoStack,
      strokes: previousState.strokes,
      textAnnotations: previousState.textAnnotations
    };

    handlePageUpdateAtIndex(pageIdx, updatedPage);
  }, [pages, safeActivePageIndex, handlePageUpdateAtIndex]);

  // Isolated per-page Redo: operates strictly on targetIndex (or the active interaction page)
  const handleRedo = useCallback((targetIndex?: number) => {
    const pageIdx = typeof targetIndex === 'number' ? targetIndex : safeActivePageIndex;
    const targetPage = pages[pageIdx];
    if (!targetPage || !targetPage.redoStack || targetPage.redoStack.length === 0) return;

    const updatedRedoStack = [...targetPage.redoStack];
    const nextState = updatedRedoStack.pop()!;

    const updatedUndoStack = [
      ...(targetPage.undoStack || []),
      {
        strokes: JSON.parse(JSON.stringify(targetPage.strokes)),
        textAnnotations: JSON.parse(JSON.stringify(targetPage.textAnnotations))
      }
    ];

    const updatedPage: DocumentPage = {
      ...targetPage,
      undoStack: updatedUndoStack,
      redoStack: updatedRedoStack,
      strokes: nextState.strokes,
      textAnnotations: nextState.textAnnotations
    };

    handlePageUpdateAtIndex(pageIdx, updatedPage);
  }, [pages, safeActivePageIndex, handlePageUpdateAtIndex]);

  const handleClearCurrentPage = useCallback((targetIndex?: number) => {
    const pageIdx = typeof targetIndex === 'number' ? targetIndex : safeActivePageIndex;
    const targetPage = pages[pageIdx];
    if (!targetPage) return;

    const updatedUndoStack = [
      ...(targetPage.undoStack || []),
      {
        strokes: JSON.parse(JSON.stringify(targetPage.strokes)),
        textAnnotations: JSON.parse(JSON.stringify(targetPage.textAnnotations))
      }
    ];

    const updatedPage: DocumentPage = {
      ...targetPage,
      undoStack: updatedUndoStack,
      redoStack: [],
      strokes: [],
      textAnnotations: []
    };

    handlePageUpdateAtIndex(pageIdx, updatedPage);
  }, [pages, safeActivePageIndex, handlePageUpdateAtIndex]);

  // -------------------------------------------------------------
  // DYNAMIC PAGE INSERTION SYSTEM: BESIDE / BELOW WITH MATCHED SIZE
  // -------------------------------------------------------------
  // Dynamic zoom calculation to fit both side-by-side pages cleanly inside the available viewport
  const calculateFitDualPagesZoom = useCallback((page1Width?: number, page2Width?: number): number => {
    const p1W = page1Width || (pages[safePageIndex] ? pages[safePageIndex].width : 794);
    const p2W = page2Width || (pages[safePageIndex + 1] ? pages[safePageIndex + 1].width : p1W);
    const totalPagesWidth = p1W + p2W;

    // Viewport container width measurement
    let containerWidth = 0;
    if (canvasViewportRef.current && canvasViewportRef.current.clientWidth > 0) {
      containerWidth = canvasViewportRef.current.clientWidth;
    } else if (typeof window !== 'undefined') {
      const sidebarWidth = (!isAutoHideBars && showSidebar) ? 240 : 0;
      containerWidth = Math.max(480, window.innerWidth - sidebarWidth);
    } else {
      containerWidth = 1200;
    }

    // Overhead: container padding (32px) + gap between pages (24px) + borders & cards padding (~24px) + safety buffer (16px) = ~96px
    const usableWidth = Math.max(300, containerWidth - 96);

    // Compute raw zoom to fit the width of both pages
    const rawZoom = usableWidth / totalPagesWidth;

    // Clamp zoom to comfortable, readable limits [0.35, 1.25]
    // Round to 2 decimal places (e.g. 0.72)
    const targetZoom = Math.max(0.35, Math.min(1.25, Math.floor(rawZoom * 100) / 100));
    return targetZoom;
  }, [pages, safePageIndex, showSidebar, isAutoHideBars]);

  // 1. Insert blank white page beside current page (Side-by-Side Dual View with Auto Zoom Fitting)
  const handleInsertBlankPageBeside = (targetIndex: number = safePageIndex, style: PageBackgroundStyle = 'plain') => {
    const refPage = pages[targetIndex] || pages[0];
    const newPage: DocumentPage = {
      id: `blank_side_page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'blank',
      width: refPage ? refPage.width : 794,
      height: refPage ? refPage.height : 1123,
      backgroundStyle: style,
      strokes: [],
      textAnnotations: [],
      undoStack: [],
      redoStack: []
    };

    const newPages = [...pages];
    newPages.splice(targetIndex + 1, 0, newPage);
    setPages(newPages);
    setCurrentPageIndex(targetIndex);
    
    // Switch to side-by-side mode immediately so companion page and original PDF page are displayed together!
    setPageLayoutMode('side-by-side');

    // Auto-adjust zoom dynamically so both pages fit comfortably side-by-side on screen without clipping or wrapping
    const optimalZoom = calculateFitDualPagesZoom(refPage?.width, newPage.width);
    setZoom(optimalZoom);

    const zoomPercent = Math.round(optimalZoom * 100);
    setExportNotice(`📑 تم إدراج صفحة بيضاء متطابقة الحجم بجانب الصفحة ${targetIndex + 1} (${refPage?.type === 'pdf' ? 'مستند PDF' : 'الأصلية'}) وتفعيل العرض جنباً إلى جنب مع ضبط الـ Zoom تلقائياً (${zoomPercent}%) لتناسب عرض الصفحتين داخل الشاشة بوضوح`);
    setTimeout(() => setExportNotice(null), 5000);
  };

  // 2. Insert blank white page below current page (Matching size, keeping current view mode)
  const handleInsertBlankPageBelow = (targetIndex: number = safePageIndex, style: PageBackgroundStyle = 'plain') => {
    const refPage = pages[targetIndex] || pages[0];
    const newPage: DocumentPage = {
      id: `blank_below_page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'blank',
      width: refPage ? refPage.width : 794,
      height: refPage ? refPage.height : 1123,
      backgroundStyle: style,
      strokes: [],
      textAnnotations: [],
      undoStack: [],
      redoStack: []
    };

    const newPages = [...pages];
    newPages.splice(targetIndex + 1, 0, newPage);
    setPages(newPages);
    setCurrentPageIndex(targetIndex + 1);

    if (style === 'ruled') {
      setExportNotice(`تمت إضافة صفحة ملاحظات سريعة مسطرة (ruled) متطابقة المقاس (${refPage ? refPage.width : 794}×${refPage ? refPage.height : 1123}px) تحت الصفحة ${targetIndex + 1} مباشرة مع الحفاظ على طريقة العرض 📝`);
    } else {
      setExportNotice(`تم إدراج صفحة بيضاء فارغة متطابقة الحجم (${refPage ? refPage.width : 794}×${refPage ? refPage.height : 1123}px) تحت الصفحة ${targetIndex + 1} ⬇️`);
    }
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleInsertPageAfter = (targetIndex: number = safePageIndex, style: PageBackgroundStyle = 'ruled') => {
    const refPage = pages[targetIndex] || pages[0];
    const newPage: DocumentPage = {
      id: `blank_page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'blank',
      width: refPage ? refPage.width : 794,
      height: refPage ? refPage.height : 1123,
      backgroundStyle: style,
      strokes: [],
      textAnnotations: [],
      undoStack: [],
      redoStack: []
    };

    const newPages = [...pages];
    newPages.splice(targetIndex + 1, 0, newPage);
    setPages(newPages);
    setCurrentPageIndex(targetIndex + 1);

    setExportNotice(`تم إدراج صفحة بيضاء (${style === 'ruled' ? 'مسطرة' : style === 'grid' ? 'شبكة مربعات' : 'بيضاء'}) بعد الصفحة ${targetIndex + 1}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleInsertPageBefore = (targetIndex: number = safePageIndex, style: PageBackgroundStyle = 'ruled') => {
    const refPage = pages[targetIndex] || pages[0];
    const newPage: DocumentPage = {
      id: `blank_page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'blank',
      width: refPage ? refPage.width : 794,
      height: refPage ? refPage.height : 1123,
      backgroundStyle: style,
      strokes: [],
      textAnnotations: [],
      undoStack: [],
      redoStack: []
    };

    const newPages = [...pages];
    newPages.splice(targetIndex, 0, newPage);
    setPages(newPages);
    setCurrentPageIndex(targetIndex);

    setExportNotice(`تم إدراج صفحة بيضاء قبل الصفحة ${targetIndex + 1}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleDuplicatePage = (targetIndex: number = safePageIndex) => {
    const pageToDup = pages[targetIndex];
    if (!pageToDup) return;

    const duplicated: DocumentPage = JSON.parse(JSON.stringify(pageToDup));
    duplicated.id = `dup_page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    duplicated.undoStack = [];
    duplicated.redoStack = [];

    const newPages = [...pages];
    newPages.splice(targetIndex + 1, 0, duplicated);
    setPages(newPages);
    setCurrentPageIndex(targetIndex + 1);
  };

  const handleDeletePage = (targetIndex: number = safePageIndex) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, idx) => idx !== targetIndex);
    setPages(newPages);
    const newIdx = Math.min(safePageIndex, newPages.length - 1);
    setCurrentPageIndex(newIdx);
    setActiveInteractionPageIndex(Math.min(safeActivePageIndex, newPages.length - 1));
  };

  const handleMovePage = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length) return;
    const newPages = [...pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);
    setPages(newPages);
    setCurrentPageIndex(toIndex);
    setActiveInteractionPageIndex(toIndex);
  };

  const handleChangePageBackground = (targetIndex: number, style: PageBackgroundStyle) => {
    const target = pages[targetIndex];
    if (!target) return;
    if (target.type === 'blank') {
      target.backgroundStyle = style;
      setPages([...pages]);
    }
  };

  // -------------------------------------------------------------
  // OPEN PDF & JOURNAL RESTORATION SYSTEM
  // -------------------------------------------------------------
  const importPdfPages = async (
    pdfDoc: any, 
    pageNumbers: number[], 
    fileName: string, 
    buffer?: ArrayBuffer
  ) => {
    setIsExporting(true);
    setExportNotice(`جاري قراءة واستخراج ${pageNumbers.length} صفحة من ملف PDF...`);

    try {
      if (buffer) {
        setOriginalPdfBuffer(buffer.slice(0));
      }

      const renderedPages = await loadSelectedPdfPages(
        pdfDoc,
        pageNumbers,
        (completed, total) => {
          setExportNotice(`جاري تجهيز ومعالجة صفحة ${completed} من أصل ${total}...`);
        },
        2.2
      );

      const newDocumentPages: DocumentPage[] = renderedPages.map((rp, idx) => ({
        id: `pdf_p_${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'pdf',
        pdfPageIndex: rp.pageNumber,
        width: rp.width,
        height: rp.height,
        pdfDataUrl: rp.dataUrl,
        strokes: [],
        textAnnotations: [],
        undoStack: [],
        redoStack: []
      }));

      setPages(newDocumentPages);
      setCurrentPageIndex(0);
      setDocumentTitle(fileName);
      setExportNotice(`🎉 تم فتح واسترداد مستند PDF بنجاح (${newDocumentPages.length} صفحة). يمكنك الرسم والكتابة وإدراج صفحات بيضاء بأي موضع.`);
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to load PDF pages:', err);
      setExportNotice(`تعذر استخراج صفحات PDF: ${err?.message || 'يرجى مراجعة صلاحية الملف'}`);
      setTimeout(() => setExportNotice(null), 5000);
    } finally {
      setIsExporting(false);
      setPendingPdfData(null);
    }
  };

  const processPdfFile = async (file: File) => {
    setIsExporting(true);
    setExportNotice('جاري تحليل وفحص ملف PDF واستخراج بنيته...');

    try {
      const buffer = await file.arrayBuffer();
      const safeBuffer = buffer.slice(0);

      const metadata = await loadPdfMetadataAndThumbnails(safeBuffer);
      const totalPages = metadata.numPages;

      if (totalPages <= 8) {
        // Small documents: load all pages automatically
        const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
        await importPdfPages(metadata.pdfDoc, allPages, file.name, safeBuffer);
      } else {
        // Larger books or worksheets: prompt teacher with page selection modal
        setIsExporting(false);
        setPendingPdfData({
          file,
          buffer: safeBuffer,
          metadata,
          totalPages
        });
        setSelectedPageRangeOption('all');
        setCustomRangeText(`1-${Math.min(10, totalPages)}`);
      }
    } catch (err: any) {
      console.error('Failed to read PDF:', err);
      setExportNotice(`تعذر قراءة ملف PDF: ${err?.message || 'تأكد من سلامة الملف'}`);
      setTimeout(() => setExportNotice(null), 5000);
      setIsExporting(false);
    }
  };

  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processPdfFile(file);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const handleConfirmPendingPdf = async () => {
    if (!pendingPdfData) return;

    const total = pendingPdfData.totalPages;
    let chosenPages: number[] = [];

    if (selectedPageRangeOption === 'all') {
      chosenPages = Array.from({ length: total }, (_, i) => i + 1);
    } else if (selectedPageRangeOption === 'first6') {
      chosenPages = Array.from({ length: Math.min(6, total) }, (_, i) => i + 1);
    } else if (selectedPageRangeOption === 'first12') {
      chosenPages = Array.from({ length: Math.min(12, total) }, (_, i) => i + 1);
    } else if (selectedPageRangeOption === 'custom') {
      chosenPages = parsePageRange(customRangeText, total);
      if (chosenPages.length === 0) {
        alert('يرجى تحديد أرقام صفحات صحيحة (مثال: 1-5 أو 1, 3, 5).');
        return;
      }
    }

    await importPdfPages(
      pendingPdfData.metadata.pdfDoc,
      chosenPages,
      pendingPdfData.file.name,
      pendingPdfData.buffer
    );
  };

  const processJournalFile = async (file: File) => {
    setIsExporting(true);
    setExportNotice('جاري استرداد وقراءة ملف التدوين (.xoj / .json)...');

    try {
      const text = await file.text();
      const project: XournalProject = JSON.parse(text);

      if (!project || !Array.isArray(project.pages) || project.pages.length === 0) {
        throw new Error('ملف التدوين غير متوافق أو لا يحتوي على صفحات.');
      }

      setPages(project.pages);
      setCurrentPageIndex(0);
      setDocumentTitle(project.title || file.name);
      
      setExportNotice(`🎉 تم استرداد ملف التدوين بنجاح (${project.pages.length} صفحة مع كافة الرسومات والملاحظات).`);
      setTimeout(() => setExportNotice(null), 4500);
    } catch (err: any) {
      console.error('Failed to load journal file:', err);
      setExportNotice(`تعذر استرداد ملف التدوين: ${err?.message || 'تأكد من صيغة الملف (.xoj أو .json)'}`);
      setTimeout(() => setExportNotice(null), 4500);
    } finally {
      setIsExporting(false);
    }
  };

  const handleJournalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processJournalFile(file);
    if (journalInputRef.current) journalInputRef.current.value = '';
  };

  // Drag and drop file support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) {
      await processPdfFile(file);
    } else if (name.endsWith('.xoj') || name.endsWith('.xopp') || name.endsWith('.json')) {
      await processJournalFile(file);
    } else {
      setExportNotice('يرجى إفلات ملف PDF أو ملف تدوين Xournal (.xoj / .json)');
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  // -------------------------------------------------------------
  // EXPORT TO ANNOTATED PDF (pdf-lib Engine)
  // -------------------------------------------------------------
  const handleExportAnnotatedPdf = async () => {
    setIsExporting(true);
    setExportNotice('جاري تصدير المستند المدمج مع الرسومات والصفحات البيضاء إلى PDF بدقة عالية بواسطة pdf-lib...');

    try {
      const pdfBytes = await exportDocumentToAnnotatedPdf(
        pages,
        originalPdfBuffer,
        documentTitle.replace(/\.pdf$/i, '')
      );

      const downloadName = (documentTitle.replace(/\.pdf$/i, '') || 'Xournal_Document') + '_annotated.pdf';
      downloadPdfBytes(pdfBytes, downloadName);

      const pdfCount = pages.filter(p => p.type === 'pdf').length;
      const blankCount = pages.filter(p => p.type === 'blank').length;
      setExportNotice(`تم تصدير مستند PDF بنجاح (${pages.length} صفحة: ${pdfCount} PDF أصلية + ${blankCount} صفحات بيضاء مُدرجة) 📕`);
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      setExportNotice(`حدث خطأ أثناء تصدير PDF: ${err?.message || 'يرجى المحاولة مرة أخرى'}`);
      setTimeout(() => setExportNotice(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------------------------------------------
  // SAVE & LOAD JOURNAL (.xoj / JSON)
  // -------------------------------------------------------------
  const handleSaveJournal = () => {
    const project: XournalProject = {
      title: documentTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pdfFileName: documentTitle,
      pages
    };

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle.replace(/\.pdf$/i, '')}.xoj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleNewDocument = () => {
    if (confirm('هل تريد إنشاء مستند جديد وتفريغ اللوح الحالي؟')) {
      setPages(createDefaultDocument());
      setCurrentPageIndex(0);
      setActiveInteractionPageIndex(0);
      setOriginalPdfBuffer(undefined);
      setDocumentTitle('Untitled_Journal.pdf');
    }
  };

  // -------------------------------------------------------------
  // ZOOM & FIT HELPERS
  // -------------------------------------------------------------
  const handleFitWidth = () => {
    if (pageLayoutMode === 'side-by-side') {
      const dualZoom = calculateFitDualPagesZoom();
      setZoom(dualZoom);
    } else {
      const containerWidth = canvasViewportRef.current?.clientWidth || (window.innerWidth - ((!isAutoHideBars && showSidebar) ? 240 : 0));
      const pageW = currentPage?.width || 794;
      const singleZoom = Math.max(0.4, Math.min(2.0, Math.floor(((containerWidth - 64) / pageW) * 100) / 100));
      setZoom(singleZoom);
    }
  };

  const handleFitPage = () => {
    setZoom(0.85);
  };

  const handleZoom100 = () => {
    setZoom(1.0);
  };

  const handleSetPageLayoutMode = (mode: XournalPageLayoutMode) => {
    setPageLayoutMode(mode);
    if (mode === 'side-by-side') {
      const dualZoom = calculateFitDualPagesZoom();
      setZoom(dualZoom);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // -------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // -------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in textarea or input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 's') {
          e.preventDefault();
          handleSaveJournal();
        } else if (e.key === 'e') {
          e.preventDefault();
          handleExportAnnotatedPdf();
        } else if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          if (e.shiftKey) {
            journalInputRef.current?.click();
          } else {
            pdfInputRef.current?.click();
          }
        } else if (e.key === 'n') {
          e.preventDefault();
          handleNewDocument();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleInsertPageAfter(safePageIndex, 'ruled');
        }
      } else {
        if (e.key === 'p' || e.key === 'P') setActiveTool('pen');
        else if (e.key === 'e' || e.key === 'E') setActiveTool('eraser');
        else if (e.key === 'h' || e.key === 'H') setActiveTool('highlighter');
        else if (e.key === 't' || e.key === 'T') setActiveTool('text');
        else if (e.key === 'l' || e.key === 'L') setActiveTool('laser');
        else if (e.key === 'w' || e.key === 'W') handleFitWidth();
        else if (e.key === 'f' || e.key === 'F') handleFitPage();
        else if (e.key === '1') handleZoom100();
        else if (e.key === 'PageDown' || (e.altKey && e.key === 'ArrowRight') || (e.key === 'ArrowRight' && activeTool !== 'text')) {
          if (safePageIndex < pages.length - 1) handleSelectPage(safePageIndex + 1);
        } else if (e.key === 'PageUp' || (e.altKey && e.key === 'ArrowLeft') || (e.key === 'ArrowLeft' && activeTool !== 'text')) {
          if (safePageIndex > 0) handleSelectPage(safePageIndex - 1);
        } else if (e.key === 'Home') {
          handleSelectPage(0);
        } else if (e.key === 'End') {
          handleSelectPage(pages.length - 1);
        } else if (e.key === 'F5') {
          e.preventDefault();
          setIsPresentationMode((prev) => !prev);
        } else if (e.key === 'F8') {
          e.preventDefault();
          setIsAutoHideBars((prev) => !prev);
        } else if (e.key === 'F9') {
          e.preventDefault();
          setShowSidebar((prev) => !prev);
        } else if (e.key === 'F11') {
          e.preventDefault();
          handleToggleFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, safePageIndex, pages.length]);

  // Quick Action Toolbar element (page navigation, companion page insertion, layout mode)
  const quickActionBar = (
    <div className="w-full bg-[#efefef] border-b border-[#c8c8c8] px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-xs z-10 shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick Presentation Page Navigation Buttons */}
        <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-[#c4c4c4] shadow-2xs">
          <button
            type="button"
            disabled={safePageIndex <= 0}
            onClick={() => handleSelectPage(safePageIndex - 1)}
            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none border border-slate-200"
            title="الانتقال إلى الصفحة السابقة (PageUp / ←)"
          >
            <ChevronLeft size={14} className="text-blue-600 stroke-[2.5]" />
            <span>السابقة</span>
          </button>

          <span className="text-[11px] font-mono font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded">
            {safePageIndex + 1} / {pages.length}
          </span>

          <button
            type="button"
            disabled={safePageIndex >= pages.length - 1}
            onClick={() => handleSelectPage(safePageIndex + 1)}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none shadow-2xs"
            title="الانتقال إلى الصفحة التالية (PageDown / →)"
          >
            <span>التالية</span>
            <ChevronRight size={14} className="text-white stroke-[2.5]" />
          </button>
        </div>

        <span className="font-bold text-slate-700 flex items-center gap-1.5">
          <FileText size={14} className="text-blue-600" />
          <span>الصفحة الحالية ({safePageIndex + 1}):</span>
          <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-300 font-bold">
            {currentPage?.width} × {currentPage?.height} px {currentPage?.type === 'pdf' ? '(PDF مسترد)' : '(صفحة بيضاء)'}
          </span>
        </span>

        {/* Isolated Undo / Redo for active interaction page */}
        <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-[#c4c4c4]">
          <button
            type="button"
            onClick={() => handleUndo()}
            disabled={activePageUndoCount === 0}
            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-800 rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-slate-200"
            title={`تراجع خاص بـ ${activePageLabel} (Ctrl+Z)`}
          >
            <Undo2 size={12} className="text-blue-600" />
            <span>تراجع ({activePageLabel})</span>
            {activePageUndoCount > 0 && (
              <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono">
                {activePageUndoCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleRedo()}
            disabled={activePageRedoCount === 0}
            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-800 rounded font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-slate-200"
            title={`إعادة خاصة بـ ${activePageLabel} (Ctrl+Y)`}
          >
            <Redo2 size={12} className="text-emerald-600" />
            <span>إعادة</span>
            {activePageRedoCount > 0 && (
              <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono">
                {activePageRedoCount}
              </span>
            )}
          </button>
        </div>

        {/* Buttons: Add Blank Page Beside / Below with matched dimensions */}
        <div className="flex items-center gap-1.5 bg-white p-0.5 rounded border border-[#c4c4c4]">
          <button
            type="button"
            id="xournal-viewport-insert-beside-btn"
            data-testid="xournal-viewport-insert-beside"
            onClick={() => handleInsertBlankPageBeside(safePageIndex, 'plain')}
            className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="إدراج صفحة بيضاء فارغة متطابقة الحجم بجانب الصفحة المستردة مع ضبط الـ Zoom وتفعيل العرض جنباً إلى جنب تلقائياً"
          >
            <Plus size={13} strokeWidth={3} />
            <span>+ صفحة بيضاء بجانبها (جنباً لجنب)</span>
          </button>

          <button
            type="button"
            id="xournal-viewport-insert-below-btn"
            data-testid="xournal-viewport-insert-below"
            onClick={() => handleInsertBlankPageBelow(safePageIndex, 'plain')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300 active:scale-95"
            title="إدراج صفحة بيضاء فارغة متطابقة الحجم تحت الصفحة الحالية مباشرة (Insert Below)"
          >
            <ArrowDown size={13} className="text-blue-600" />
            <span>+ صفحة بيضاء تحتها</span>
          </button>
        </div>
      </div>

      {/* View options & Quick Notes Ruled Page Container */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Layout Mode Selector (Single / Side-by-Side / Continuous) */}
        <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-[#c4c4c4]">
          <span className="text-[10px] text-slate-500 font-bold px-1.5">طريقة العرض:</span>
          <button
            type="button"
            onClick={() => handleSetPageLayoutMode('single')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              pageLayoutMode === 'single'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="عرض صفحة واحدة فقط"
          >
            صفحة مفردة
          </button>

          <button
            type="button"
            id="xournal-view-side-by-side-btn"
            onClick={() => handleSetPageLayoutMode('side-by-side')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              pageLayoutMode === 'side-by-side'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="عرض صفحتين جنباً إلى جنب مع ضبط نسبة الـ Zoom تلقائياً لتناسب عرض الصفحتين داخل الشاشة"
          >
            <Columns size={12} />
            <span>جنباً إلى جنب 📑</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetPageLayoutMode('continuous')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              pageLayoutMode === 'continuous'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="تمرير رأسي مستمر لكافة الصفحات"
          >
            تتابع مستمر
          </button>
        </div>

        {/* زر إضافة صفحة ملاحظات سريعة */}
        <button
          type="button"
          id="xournal-viewport-quick-notes-ruled-btn"
          data-testid="xournal-viewport-quick-notes-ruled"
          onClick={() => handleInsertBlankPageBelow(safePageIndex, 'ruled')}
          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 border border-amber-600"
          title="إدراج صفحة ملاحظات مسطرة (دفتر سطور) تحت الصفحة الحالية مباشرة"
        >
          <PenLine size={12} />
          <span>+ صفحة مسطرة</span>
        </button>

        {/* Fit to width button */}
        <button
          type="button"
          onClick={handleFitWidth}
          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded border border-[#c4c4c4] transition-all cursor-pointer flex items-center gap-1"
          title="ملاءمة العرض تلقائياً مع الشاشة (W)"
        >
          <Maximize2 size={12} />
          <span>ملاءمة العرض</span>
        </button>
      </div>
    </div>
  );

  // Status Bar Element (faithful Xournal++ info bar)
  const statusBarElement = (
    <div className="h-6 bg-[#dfdfdf] border-t border-[#c0c0c0] px-3 flex items-center justify-between text-[11px] text-slate-700 font-sans select-none shrink-0 shadow-inner">
      <div className="flex items-center gap-3">
        <span className="font-bold text-slate-900 truncate max-w-xs" title={documentTitle}>
          📄 {documentTitle}
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-[10px] text-slate-600 font-bold">
          {teacherName}
        </span>
        <span className="text-slate-400">|</span>
        <span className="font-mono font-bold text-blue-900">
          Page {safePageIndex + 1} of {pages.length}
          {currentPage?.type === 'blank' ? ' (Blank Scratchpad)' : ' (PDF)'}
        </span>
        <span className="text-slate-400">|</span>
        <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-[10px]">
          <History size={11} className="text-blue-700" />
          <span className="font-bold text-slate-800">سجل {activePageLabel}:</span>
          <span className="text-blue-800 font-bold">{activePageUndoCount} تراجع</span>
          <span className="text-slate-300">/</span>
          <span className="text-emerald-800 font-bold">{activePageRedoCount} إعادة</span>
        </span>
      </div>

      <div className="flex items-center gap-4 text-[10px] font-mono text-slate-600">
        <span className="flex items-center gap-1">
          <span>Pointer:</span>
          <strong className="text-slate-900 capitalize">{pointerStatus.pointerType}</strong>
          {pointerStatus.pointerType === 'pen' && (
            <span className="text-emerald-700 font-bold">
              (Pressure: {Math.round(pointerStatus.pressure * 100)}%)
            </span>
          )}
        </span>

        <span className="text-slate-400">|</span>

        <span className="flex items-center gap-1">
          <span>سمك الخط:</span>
          <strong className="text-amber-800 font-bold">
            {thickness === 'custom' ? `${customWidth}px` : `${thickness} (${customWidth}px)`}
          </strong>
        </span>

        <span className="text-slate-400">|</span>

        <span>
          X: {pointerStatus.x}px, Y: {pointerStatus.y}px
        </span>

        <span className="text-slate-400">|</span>

        <span>
          Tool: <strong className="text-blue-800 uppercase">{activeTool}</strong>
        </span>

        <span className="text-slate-400">|</span>

        <span>
          Zoom: <strong>{Math.round(zoom * 100)}%</strong>
        </span>
      </div>
    </div>
  );

  // Top Toolbars Combined Element
  const topBarsElement = (
    <div className="flex flex-col bg-white">
      {/* 1. XOURNAL++ CLASSIC MENU BAR */}
      <XournalMenuBar
        onNewDocument={handleNewDocument}
        onOpenPdf={() => pdfInputRef.current?.click()}
        onOpenJournal={() => journalInputRef.current?.click()}
        onRestoreSession={handleRestoreAutosavedSession}
        hasAutosavedSession={hasAutosavedBackup}
        onSaveJournal={handleSaveJournal}
        onExportPdf={handleExportAnnotatedPdf}
        onPrint={() => window.print()}
        onStartPresentation={() => setIsPresentationMode(true)}
        onUndo={() => handleUndo()}
        onRedo={() => handleRedo()}
        canUndo={activePageUndoCount > 0}
        canRedo={activePageRedoCount > 0}
        undoCount={activePageUndoCount}
        redoCount={activePageRedoCount}
        activePageLabel={activePageLabel}
        onClearPage={handleClearCurrentPage}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        onZoom100={handleZoom100}
        onZoomIn={() => setZoom((z) => Math.min(2.5, z + 0.1))}
        onZoomOut={() => setZoom((z) => Math.max(0.5, z - 0.1))}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        currentPageIndex={safePageIndex}
        totalPages={pages.length}
        onGoToPage={handleSelectPage}
        onInsertPageAfter={(style) => handleInsertPageAfter(safePageIndex, style)}
        onInsertPageBefore={(style) => handleInsertPageBefore(safePageIndex, style)}
        onInsertPageBeside={(style) => handleInsertBlankPageBeside(safePageIndex, style)}
        onInsertPageBelow={(style) => handleInsertBlankPageBelow(safePageIndex, style)}
        pageLayoutMode={pageLayoutMode}
        onSetPageLayoutMode={handleSetPageLayoutMode}
        onDuplicatePage={() => handleDuplicatePage(safePageIndex)}
        onDeleteCurrentPage={() => handleDeletePage(safePageIndex)}
        onChangePageBackground={(style) => handleChangePageBackground(safePageIndex, style)}
        currentPageBackground={currentPage?.type === 'blank' ? currentPage.backgroundStyle : undefined}
        isCurrentPageBlank={currentPage?.type === 'blank'}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        stylusPressureEnabled={stylusPressureEnabled}
        onToggleStylusPressure={() => setStylusPressureEnabled(!stylusPressureEnabled)}
        palmRejectionEnabled={palmRejectionEnabled}
        onTogglePalmRejection={() => setPalmRejectionEnabled(!palmRejectionEnabled)}
        onClose={onClose}
      />

      {/* 2. PRIMARY TOOLBAR */}
      <XournalPrimaryToolbar
        onNewDocument={handleNewDocument}
        onOpenPdf={() => pdfInputRef.current?.click()}
        onOpenJournal={() => journalInputRef.current?.click()}
        onRestoreSession={handleRestoreAutosavedSession}
        hasAutosavedSession={hasAutosavedBackup}
        onSaveJournal={handleSaveJournal}
        onExportPdf={handleExportAnnotatedPdf}
        onPrint={() => window.print()}
        onStartPresentation={() => setIsPresentationMode(true)}
        onUndo={() => handleUndo()}
        onRedo={() => handleRedo()}
        canUndo={activePageUndoCount > 0}
        canRedo={activePageRedoCount > 0}
        undoCount={activePageUndoCount}
        redoCount={activePageRedoCount}
        activePageLabel={activePageLabel}
        currentPageIndex={safePageIndex}
        totalPages={pages.length}
        onGoToPage={handleSelectPage}
        zoom={zoom}
        onZoomChange={setZoom}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        onZoom100={handleZoom100}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onInsertPageAfter={(style) => handleInsertPageAfter(safePageIndex, style)}
        onInsertPageBefore={(style) => handleInsertPageBefore(safePageIndex, style)}
        onInsertPageBeside={(style) => handleInsertBlankPageBeside(safePageIndex, style)}
        onInsertPageBelow={(style) => handleInsertBlankPageBelow(safePageIndex, style)}
        pageLayoutMode={pageLayoutMode}
        onSetPageLayoutMode={handleSetPageLayoutMode}
        isCurrentPageBlank={currentPage?.type === 'blank'}
        isAutoHideBars={isAutoHideBars}
        onToggleAutoHideBars={() => setIsAutoHideBars((prev) => !prev)}
      />

      {/* 3. SECONDARY TOOLBAR */}
      <XournalSecondaryToolbar
        activeTool={activeTool}
        thickness={thickness}
        onSelectThickness={setThickness}
        customWidth={customWidth}
        onSelectCustomWidth={setCustomWidth}
        color={color}
        onSelectColor={setColor}
        eraserType={eraserType}
        onSelectEraserType={setEraserType}
        highlighterMultiply={highlighterMultiply}
        onToggleHighlighterMultiply={() => setHighlighterMultiply(!highlighterMultiply)}
        selectedShapeType={selectedShapeType}
        onSelectShapeType={(st) => {
          setSelectedShapeType(st);
          setActiveTool(st as any);
        }}
      />

      {/* Quick Action Bar attached inside top drawer when in auto-hide mode */}
      {isAutoHideBars && quickActionBar}
    </div>
  );

  return (
    <div 
      className="fixed inset-0 w-screen h-screen bg-[#c8c8c8] flex flex-col overflow-hidden select-none font-sans text-slate-800 relative"
      dir="ltr"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Inputs */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfFileSelect}
      />
      <input
        ref={journalInputRef}
        type="file"
        accept=".xoj,.xopp,.json,application/json"
        className="hidden"
        onChange={handleJournalFileSelect}
      />

      {/* Drag & Drop Visual Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 z-[300] bg-blue-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white border-4 border-dashed border-cyan-400 p-8 text-center animate-in fade-in duration-150">
          <UploadCloud size={64} className="text-cyan-300 animate-bounce mb-4" />
          <h2 className="text-2xl font-black mb-2">أفلت الملف هنا للفتح والاسترداد</h2>
          <p className="text-sm text-cyan-100 max-w-md font-bold">
            يدعم ملفات الكتب ومستندات PDF (.pdf) وكذلك ملفات تدوين ومشاريع Xournal المحفوظة (.xoj / .json)
          </p>
        </div>
      )}

      {/* MODE A: STATIC DOCKED TOP BARS (when isAutoHideBars is false) */}
      {!isAutoHideBars && topBarsElement}

      {/* MODE B: AUTO-HIDE BARS OVERLAYS (when isAutoHideBars is true) */}
      {isAutoHideBars && (
        <>
          {/* Top Hover Trigger Strip */}
          <div 
            className="fixed top-0 left-0 right-0 h-4 z-40 bg-transparent"
            onMouseEnter={handleTopEnter}
          />

          {/* Floating Subtle Top Pill (when top bar hidden) */}
          {!isTopHovered && (
            <button
              type="button"
              onClick={() => setIsTopHovered(true)}
              onMouseEnter={handleTopEnter}
              className="fixed top-0 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 hover:bg-slate-950 text-white text-[11px] font-bold px-4 py-1 rounded-b-xl shadow-lg border border-t-0 border-slate-700/80 flex items-center gap-2 cursor-pointer transition-all hover:py-1.5"
              title="إظهار أشرطة الأدوات (مرر الماوس لأعلى الشاشة) - F8 للتثبيت"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>أدوات اللوح ▾ (مرر للأعلى)</span>
              <ChevronDown size={13} className="text-emerald-400" />
            </button>
          )}

          {/* Top Bars Slide-in Drawer Container */}
          <div
            onMouseEnter={handleTopEnter}
            onMouseLeave={handleTopLeave}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out shadow-2xl flex flex-col bg-white border-b border-slate-300 ${
              isTopHovered ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
            }`}
          >
            {topBarsElement}
            <div className="bg-slate-100 border-t border-slate-200 px-4 py-1 flex items-center justify-between text-[11px] text-slate-600 font-bold select-none">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>اللوح في وضع الشاشة الكاملة الموسعة — ستختفي الأشرطة تلقائياً لتوفير أقصى مساحة للكتابة</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAutoHideBars(false)}
                  className="px-2.5 py-0.5 bg-white hover:bg-slate-50 text-slate-800 rounded border border-slate-300 flex items-center gap-1 cursor-pointer transition-all text-[11px] shadow-2xs font-bold"
                  title="تثبيت الأشرطة في الشاشة بشكل دائم"
                >
                  <Pin size={12} className="text-amber-600" />
                  <span>تثبيت الأشرطة 📌</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTopHovered(false)}
                  className="px-2.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded flex items-center gap-1 cursor-pointer font-bold"
                  title="إخفاء الأدوات الآن"
                >
                  <span>إخفاء الأدوات</span>
                  <ChevronUp size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Left Edge Hover Trigger for Side Pages */}
          <div 
            className="fixed top-0 bottom-0 left-0 w-4 z-40 bg-transparent"
            onMouseEnter={handleSidebarEnter}
          />

          {/* Floating Left Tab (Pages Drawer Button) */}
          {!isSidebarHovered && (
            <button
              type="button"
              onClick={() => setIsSidebarHovered(true)}
              onMouseEnter={handleSidebarEnter}
              className="fixed top-28 left-0 z-40 bg-slate-900/90 hover:bg-slate-950 text-white text-[11px] font-bold px-2 py-3 rounded-r-xl shadow-xl border border-l-0 border-slate-700 flex flex-col items-center gap-1.5 cursor-pointer transition-all hover:px-2.5"
              title="إظهار قائمة الصفحات الجانبية (مرر الماوس لأقصى اليسار)"
            >
              <Layers size={15} className="text-emerald-400" />
              <span className="[writing-mode:vertical-rl] text-[10px] tracking-widest font-mono text-slate-200">
                صفحة {safePageIndex + 1}/{pages.length}
              </span>
              <ChevronRight size={13} className="text-emerald-400" />
            </button>
          )}

          {/* Left Side Pages Drawer */}
          <div
            onMouseEnter={handleSidebarEnter}
            onMouseLeave={handleSidebarLeave}
            className={`fixed top-0 bottom-0 left-0 z-50 w-64 max-w-[85vw] h-full shadow-2xl transition-all duration-300 ease-out flex flex-col bg-[#e6e6e6] border-r border-[#c4c4c4] ${
              isSidebarHovered ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
            }`}
          >
            <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between text-xs font-bold shrink-0">
              <span className="flex items-center gap-1.5">
                <Layers size={14} className="text-emerald-400" />
                <span>الصفحات والمستند ({pages.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarHovered(false)}
                className="text-slate-300 hover:text-white p-1 rounded cursor-pointer hover:bg-slate-700"
                title="إغلاق القائمة الجانبية"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <XournalSidebar
                pages={pages}
                currentPageIndex={safePageIndex}
                onSelectPage={handleSelectPage}
                onInsertPageAfter={(idx, style) => handleInsertPageAfter(idx, style)}
                onInsertPageBefore={(idx, style) => handleInsertPageBefore(idx, style)}
                onInsertPageBeside={(idx, style) => handleInsertBlankPageBeside(idx, style)}
                onInsertPageBelow={(idx, style) => handleInsertBlankPageBelow(idx, style)}
                onDuplicatePage={(idx) => handleDuplicatePage(idx)}
                onDeletePage={(idx) => handleDeletePage(idx)}
                onMovePage={handleMovePage}
                onChangePageBackground={handleChangePageBackground}
              />
            </div>
          </div>

          {/* Bottom Hover Trigger */}
          <div 
            className="fixed bottom-0 left-0 right-0 h-4 z-40 bg-transparent"
            onMouseEnter={handleBottomEnter}
          />

          {/* Bottom Slide-in Status Bar Drawer */}
          <div
            onMouseEnter={handleBottomEnter}
            onMouseLeave={handleBottomLeave}
            className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-200 ease-out shadow-2xl ${
              isBottomHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
            }`}
          >
            {statusBarElement}
          </div>

          {/* Floating Mini-HUD (Bottom-Right corner for rapid control with zero obstruction) */}
          {!isTopHovered && !isSidebarHovered && (
            <div className="fixed bottom-3 right-4 z-40 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-2xl text-white select-none">
              {/* Active Tool Badge with color dot / Laser Indicator */}
              <button
                type="button"
                onClick={() => setIsTopHovered(true)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTool === 'laser'
                    ? 'bg-red-950/80 border border-red-500/60 hover:bg-red-900/90 shadow-sm shadow-red-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-700/90'
                }`}
                title="انقر لفتح شريط الأدوات الكامل (أو مرر الماوس لأعلى الشاشة)"
              >
                {activeTool === 'laser' ? (
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                  </span>
                ) : (
                  <span 
                    className="w-3 h-3 rounded-full border border-white/50 shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className={`text-[11px] uppercase font-mono font-bold ${
                  activeTool === 'laser' ? 'text-red-400 font-black' : 'text-emerald-300'
                }`}>
                  {activeTool === 'laser' ? 'LASER (مؤشر الليزر)' : activeTool}
                </span>
              </button>

              <span className="text-slate-600">|</span>

              {/* Quick Page Prev / Current / Next */}
              <button
                type="button"
                disabled={safePageIndex <= 0}
                onClick={() => handleSelectPage(safePageIndex - 1)}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="الصفحة السابقة"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-[11px] font-mono font-black text-cyan-300 px-1">
                {safePageIndex + 1} / {pages.length}
              </span>

              <button
                type="button"
                disabled={safePageIndex >= pages.length - 1}
                onClick={() => handleSelectPage(safePageIndex + 1)}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="الصفحة التالية"
              >
                <ChevronRight size={16} />
              </button>

              <span className="text-slate-600">|</span>

              {/* Quick Undo / Redo for active interaction page */}
              <button
                type="button"
                onClick={() => handleUndo()}
                disabled={activePageUndoCount === 0}
                className="flex items-center gap-1 px-1.5 py-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all rounded hover:bg-slate-800"
                title={`تراجع خاص بـ ${activePageLabel} (${activePageUndoCount})`}
              >
                <Undo2 size={13} />
                {activePageUndoCount > 0 && (
                  <span className="bg-blue-600 text-[9px] font-mono font-bold px-1 rounded-full text-white">
                    {activePageUndoCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleRedo()}
                disabled={activePageRedoCount === 0}
                className="flex items-center gap-1 px-1.5 py-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all rounded hover:bg-slate-800"
                title={`إعادة خاصة بـ ${activePageLabel} (${activePageRedoCount})`}
              >
                <Redo2 size={13} />
                {activePageRedoCount > 0 && (
                  <span className="bg-emerald-600 text-[9px] font-mono font-bold px-1 rounded-full text-white">
                    {activePageRedoCount}
                  </span>
                )}
              </button>

              <span className="text-slate-600">|</span>

              {/* Quick Add Blank Page Beside */}
              <button
                type="button"
                onClick={() => handleInsertBlankPageBeside(safePageIndex, 'plain')}
                className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                title="إدراج صفحة بيضاء بجانب الصفحة الحالية فوراً"
              >
                <Plus size={12} strokeWidth={3} />
                <span>+ صفحة بجانبها</span>
              </button>

              {/* Pin / Dock Toggle */}
              <button
                type="button"
                onClick={() => setIsAutoHideBars(false)}
                className="p-1 text-amber-400 hover:text-amber-300 cursor-pointer transition-all"
                title="تثبيت الأشرطة في الشاشة (F8)"
              >
                <Pin size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Notification Banner */}
      {exportNotice && (
        <div className="bg-blue-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-md z-40 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-300" />
            <span>{exportNotice}</span>
          </div>
          <button 
            onClick={() => setExportNotice(null)}
            className="text-blue-200 hover:text-white font-mono text-sm px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. WORKSPACE: SIDEBAR + CANVAS VIEWPORT */}
      <div className="flex-1 flex overflow-hidden relative w-full h-full">
        {/* Collapsible Left Sidebar (Only visible in pinned mode when showSidebar is true) */}
        {!isAutoHideBars && showSidebar && (
          <XournalSidebar
            pages={pages}
            currentPageIndex={safePageIndex}
            onSelectPage={handleSelectPage}
            onInsertPageAfter={(idx, style) => handleInsertPageAfter(idx, style)}
            onInsertPageBefore={(idx, style) => handleInsertPageBefore(idx, style)}
            onInsertPageBeside={(idx, style) => handleInsertBlankPageBeside(idx, style)}
            onInsertPageBelow={(idx, style) => handleInsertBlankPageBelow(idx, style)}
            onDuplicatePage={(idx) => handleDuplicatePage(idx)}
            onDeletePage={(idx) => handleDeletePage(idx)}
            onMovePage={handleMovePage}
            onChangePageBackground={handleChangePageBackground}
          />
        )}

        {/* Central Scrollable Canvas Viewport (100% full screen area in auto-hide mode) */}
        <div ref={canvasViewportRef} className="flex-1 overflow-auto bg-[#828282] flex flex-col items-center w-full h-full">
          {/* Quick Action Toolbar for Companion Page Insertion & Layout Mode (docked sticky only in pinned mode) */}
          {!isAutoHideBars && quickActionBar}

          {/* Canvas Rendering according to Layout Mode */}
          <div className="p-4 w-full flex flex-col items-center">
            {pageLayoutMode === 'side-by-side' ? (
              <div className="w-full flex flex-col items-center gap-4">
                {/* Active Layout Mode Indicator Banner with Auto-fit Dual Zoom Button */}
                <div className="w-full max-w-5xl bg-gradient-to-r from-blue-900/60 via-slate-900/85 to-emerald-900/60 border border-slate-700/80 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-white shadow-md flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-[11px] sm:text-xs">نمط العرض الحالي: جنباً إلى جنب (Side-by-Side)</span>
                    <span className="text-emerald-300 font-mono text-[11px] bg-slate-950/70 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                      Zoom: {Math.round(zoom * 100)}%
                    </span>
                    <span className="text-slate-300 text-[10px] hidden md:inline">— تظهر صفحة الـ PDF ومسودة الحل البيضاء معاً متطابقتين بالعرض بدقة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const fitZoom = calculateFitDualPagesZoom();
                        setZoom(fitZoom);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs border border-emerald-400/40 active:scale-95"
                      title="إعادة ضبط وتعديل نسبة الـ Zoom تلقائياً لتناسب عرض الصفحتين معاً داخل إطار العرض الحالي بوضوح"
                    >
                      <Maximize2 size={12} />
                      <span>ملاءمة عرض الصفحتين ({Math.round(calculateFitDualPagesZoom() * 100)}%)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPageLayoutMode('single')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-200 transition-colors cursor-pointer"
                    >
                      عرض صفحة واحدة
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-center gap-3 md:gap-5 flex-nowrap overflow-x-auto max-w-full pb-4">
                  {/* Left Page (Restored or current page) */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="mb-2 px-3 py-1 bg-slate-900/95 text-white rounded-md text-xs font-bold flex items-center justify-between gap-3 shadow-md w-full border border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${safeActivePageIndex === safePageIndex ? 'bg-blue-400 ring-2 ring-blue-300' : 'bg-slate-400'}`} />
                        <span>صفحة {safePageIndex + 1}: {currentPage.type === 'pdf' ? 'مستند PDF مسترد' : 'صفحة المستند'}</span>
                        <span className="font-mono text-[10px] text-slate-300 font-bold">({currentPage.width}×{currentPage.height}px)</span>
                      </div>
                      {/* Per-page isolated Undo/Redo */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUndo(safePageIndex)}
                          disabled={!currentPage.undoStack || currentPage.undoStack.length === 0}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition-all border border-slate-700 active:scale-95"
                          title="تراجع خاص بهذه الصفحة فقط"
                        >
                          <Undo2 size={11} />
                          <span>تراجع</span>
                          {currentPage.undoStack && currentPage.undoStack.length > 0 && (
                            <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold">
                              {currentPage.undoStack.length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRedo(safePageIndex)}
                          disabled={!currentPage.redoStack || currentPage.redoStack.length === 0}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition-all border border-slate-700 active:scale-95"
                          title="إعادة خاصة بهذه الصفحة فقط"
                        >
                          <Redo2 size={11} />
                          <span>إعادة</span>
                          {currentPage.redoStack && currentPage.redoStack.length > 0 && (
                            <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold">
                              {currentPage.redoStack.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                    <XournalCanvas
                      key={currentPage.id}
                      page={currentPage}
                      pageIndex={safePageIndex}
                      zoom={zoom}
                      activeTool={activeTool}
                      thickness={thickness}
                      customWidth={customWidth}
                      color={color}
                      eraserType={eraserType}
                      highlighterMultiply={highlighterMultiply}
                      selectedShapeType={selectedShapeType}
                      stylusPressureEnabled={stylusPressureEnabled}
                      palmRejectionEnabled={palmRejectionEnabled}
                      compactPadding={true}
                      onActivatePage={setActiveInteractionPageIndex}
                      onPageUpdate={(p) => handlePageUpdateAtIndex(safePageIndex, p)}
                      onPointerStatusChange={setPointerStatus}
                    />
                  </div>

                  {/* Right Page (Companion Blank Page or Adjacent Page) */}
                  {pages[safePageIndex + 1] ? (
                    <div className="flex flex-col items-center shrink-0">
                      <div className="mb-2 px-3 py-1 bg-emerald-950/95 text-white rounded-md text-xs font-bold flex items-center justify-between gap-3 shadow-md border border-emerald-500/50 w-full">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${safeActivePageIndex === safePageIndex + 1 ? 'bg-emerald-400 ring-2 ring-emerald-300' : 'bg-slate-400'}`} />
                          <span>صفحة {safePageIndex + 2}: {pages[safePageIndex + 1].type === 'blank' ? 'مسودة بيضاء متطابقة' : 'الصفحة المجاورة'}</span>
                          <span className="font-mono text-[10px] text-emerald-300 font-bold">({pages[safePageIndex + 1].width}×{pages[safePageIndex + 1].height}px)</span>
                        </div>
                        {/* Per-page isolated Undo/Redo */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUndo(safePageIndex + 1)}
                            disabled={!pages[safePageIndex + 1].undoStack || pages[safePageIndex + 1].undoStack.length === 0}
                            className="px-2 py-0.5 rounded bg-emerald-900 hover:bg-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer transition-all border border-emerald-600/50 active:scale-95"
                            title="تراجع خاص بهذه الصفحة فقط"
                          >
                            <Undo2 size={11} />
                            <span>تراجع</span>
                            {pages[safePageIndex + 1].undoStack && pages[safePageIndex + 1].undoStack.length > 0 && (
                              <span className="bg-blue-500 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold">
                                {pages[safePageIndex + 1].undoStack.length}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRedo(safePageIndex + 1)}
                            disabled={!pages[safePageIndex + 1].redoStack || pages[safePageIndex + 1].redoStack.length === 0}
                            className="px-2 py-0.5 rounded bg-emerald-900 hover:bg-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer transition-all border border-emerald-600/50 active:scale-95"
                            title="إعادة خاصة بهذه الصفحة فقط"
                          >
                            <Redo2 size={11} />
                            <span>إعادة</span>
                            {pages[safePageIndex + 1].redoStack && pages[safePageIndex + 1].redoStack.length > 0 && (
                              <span className="bg-emerald-500 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold">
                                {pages[safePageIndex + 1].redoStack.length}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                      <XournalCanvas
                        key={pages[safePageIndex + 1].id}
                        page={pages[safePageIndex + 1]}
                        pageIndex={safePageIndex + 1}
                        zoom={zoom}
                        activeTool={activeTool}
                        thickness={thickness}
                        customWidth={customWidth}
                        color={color}
                        eraserType={eraserType}
                        highlighterMultiply={highlighterMultiply}
                        selectedShapeType={selectedShapeType}
                        stylusPressureEnabled={stylusPressureEnabled}
                        palmRejectionEnabled={palmRejectionEnabled}
                        compactPadding={true}
                        onActivatePage={setActiveInteractionPageIndex}
                        onPageUpdate={(p) => handlePageUpdateAtIndex(safePageIndex + 1, p)}
                        onPointerStatusChange={setPointerStatus}
                      />
                    </div>
                  ) : (
                    <div 
                      style={{ width: currentPage.width * zoom, height: currentPage.height * zoom }}
                      className="border-2 border-dashed border-slate-400 rounded-lg bg-slate-200/60 flex flex-col items-center justify-center p-6 text-center text-slate-700 shadow-inner shrink-0"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-3 shadow-xs">
                        <Plus size={24} />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mb-1">إضافة صفحة بيضاء فارغة بجانب هذه الصفحة</h4>
                      <p className="text-xs text-slate-600 max-w-xs mb-4 leading-relaxed">
                        قم بإدراج مسودة بيضاء فارغة متطابقة الحجم ({currentPage.width}×{currentPage.height}px) لتسجيل الحلول والملاحظات جنباً إلى جنب مع ورقة العمل.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleInsertBlankPageBeside(safePageIndex, 'plain')}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-bold text-xs rounded-md shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus size={14} strokeWidth={3} />
                        <span>إدراج صفحة بيضاء مطابقة المقاس الآن 📑</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : pageLayoutMode === 'continuous' ? (
              <div className="w-full flex flex-col items-center space-y-6">
                {pages.map((p, idx) => (
                  <div key={p.id} className="flex flex-col items-center">
                    <div className="mb-1 text-[11px] font-mono text-slate-200 font-bold bg-slate-900/90 px-3 py-1 rounded shadow-sm flex items-center justify-between gap-4 w-full max-w-[800px] border border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${safeActivePageIndex === idx ? 'bg-blue-400 ring-2 ring-blue-300' : 'bg-slate-400'}`} />
                        <span>صفحة {idx + 1} من {pages.length} ({p.type === 'pdf' ? 'مستند PDF مسترد' : 'صفحة بيضاء'} • {p.width}×{p.height}px)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUndo(idx)}
                          disabled={!p.undoStack || p.undoStack.length === 0}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition-all border border-slate-700 active:scale-95"
                          title={`تراجع خاص بصفحة ${idx + 1} فقط`}
                        >
                          <Undo2 size={11} />
                          <span>تراجع</span>
                          {p.undoStack && p.undoStack.length > 0 && (
                            <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold">
                              {p.undoStack.length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRedo(idx)}
                          disabled={!p.redoStack || p.redoStack.length === 0}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition-all border border-slate-700 active:scale-95"
                          title={`إعادة خاصة بصفحة ${idx + 1} فقط`}
                        >
                          <Redo2 size={11} />
                          <span>إعادة</span>
                          {p.redoStack && p.redoStack.length > 0 && (
                            <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold">
                              {p.redoStack.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                    <XournalCanvas
                      page={p}
                      pageIndex={idx}
                      zoom={zoom}
                      activeTool={activeTool}
                      thickness={thickness}
                      customWidth={customWidth}
                      color={color}
                      eraserType={eraserType}
                      highlighterMultiply={highlighterMultiply}
                      selectedShapeType={selectedShapeType}
                      stylusPressureEnabled={stylusPressureEnabled}
                      palmRejectionEnabled={palmRejectionEnabled}
                      onActivatePage={setActiveInteractionPageIndex}
                      onPageUpdate={(up) => handlePageUpdateAtIndex(idx, up)}
                      onPointerStatusChange={setPointerStatus}
                    />
                  </div>
                ))}
              </div>
            ) : (
              currentPage && (
                <XournalCanvas
                  key={currentPage.id}
                  page={currentPage}
                  pageIndex={safePageIndex}
                  zoom={zoom}
                  activeTool={activeTool}
                  thickness={thickness}
                  customWidth={customWidth}
                  color={color}
                  eraserType={eraserType}
                  highlighterMultiply={highlighterMultiply}
                  selectedShapeType={selectedShapeType}
                  stylusPressureEnabled={stylusPressureEnabled}
                  palmRejectionEnabled={palmRejectionEnabled}
                  onActivatePage={setActiveInteractionPageIndex}
                  onPageUpdate={handlePageUpdate}
                  onPointerStatusChange={setPointerStatus}
                />
              )
            )}
          </div>
        </div>
      </div>

      {/* 5. XOURNAL++ STATUS BAR (BOTTOM - Only docked when isAutoHideBars is false) */}
      {!isAutoHideBars && statusBarElement}

      {/* Exporting Overlay Spinner */}
      {isExporting && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[250] text-white">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 max-w-sm text-center">
            <Loader2 size={36} className="text-blue-500 animate-spin" />
            <h3 className="text-sm font-black text-white">جارِ إعداد ومعالجة مستند PDF...</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-bold">
              يتم الآن دمج وتجميع كافة الصفحات الأصلية مع الصفحات البيضاء المُدرجة ديناميكياً بدقة المتجهات الكاملة.
            </p>
          </div>
        </div>
      )}

      {/* 6. INTERACTIVE SLIDESHOW PRESENTATION MODE WITH VIRTUAL LASER POINTER */}
      {isPresentationMode && (
        <XournalPresentationMode
          pages={pages}
          initialPageIndex={safePageIndex}
          documentTitle={documentTitle}
          teacherName={teacherName}
          onClose={() => setIsPresentationMode(false)}
          onPageUpdate={handlePageUpdate}
          onInsertBlankPage={handleInsertPageAfter}
        />
      )}
      {/* 7. PDF PAGE RANGE SELECTION DIALOG */}
      {pendingPdfData && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-[260] p-4 text-slate-800" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                  PDF
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">تحديد صفحات مستند PDF</h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                    {pendingPdfData.file.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingPdfData(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs font-sans">
              <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl flex items-center justify-between font-bold">
                <span>إجمالي صفحات المستند:</span>
                <span className="font-mono text-sm bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
                  {pendingPdfData.totalPages} صفحة
                </span>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">اختر نطاق الصفحات للاستيراد في لوح Xournal:</label>

                {/* Option 1: All Pages */}
                <label 
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedPageRangeOption === 'all' 
                      ? 'border-blue-600 bg-blue-50/70 font-bold text-blue-900 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="pdf_range"
                      checked={selectedPageRangeOption === 'all'}
                      onChange={() => setSelectedPageRangeOption('all')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>جميع الصفحات ({pendingPdfData.totalPages} صفحة)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">المستند كاملاً</span>
                </label>

                {/* Option 2: First 6 pages */}
                {pendingPdfData.totalPages > 6 && (
                  <label 
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedPageRangeOption === 'first6' 
                        ? 'border-blue-600 bg-blue-50/70 font-bold text-blue-900 shadow-xs' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="pdf_range"
                        checked={selectedPageRangeOption === 'first6'}
                        onChange={() => setSelectedPageRangeOption('first6')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>أول 6 صفحات فقط (صـ 1 إلى 6)</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold">تحميل سريع ⚡</span>
                  </label>
                )}

                {/* Option 3: First 12 pages */}
                {pendingPdfData.totalPages > 12 && (
                  <label 
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedPageRangeOption === 'first12' 
                        ? 'border-blue-600 bg-blue-50/70 font-bold text-blue-900 shadow-xs' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="pdf_range"
                        checked={selectedPageRangeOption === 'first12'}
                        onChange={() => setSelectedPageRangeOption('first12')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>أول 12 صفحة (صـ 1 إلى 12)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal">درس نموذجي</span>
                  </label>
                )}

                {/* Option 4: Custom Range */}
                <label 
                  className={`block p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedPageRangeOption === 'custom' 
                      ? 'border-blue-600 bg-blue-50/70 font-bold text-blue-900 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <input
                      type="radio"
                      name="pdf_range"
                      checked={selectedPageRangeOption === 'custom'}
                      onChange={() => setSelectedPageRangeOption('custom')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>تحديد صفحات مخصصة</span>
                  </div>
                  {selectedPageRangeOption === 'custom' && (
                    <div className="mr-6 space-y-1">
                      <input
                        type="text"
                        value={customRangeText}
                        onChange={(e) => setCustomRangeText(e.target.value)}
                        placeholder="مثال: 1-5 أو 1, 3, 7-10"
                        className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-slate-500 font-normal">
                        اكتب أرقام الصفحات مفصولة بفواصل أو شرطة (مثال: 1-4, 7, 9)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingPdfData(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmPendingPdf}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>استيراد وعرض الصفحات</span>
                <CheckCircle2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
