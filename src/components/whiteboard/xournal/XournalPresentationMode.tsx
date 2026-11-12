import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DocumentPage, 
  PageBackgroundStyle, 
  CanvasStroke, 
  StrokePoint,
  TextAnnotation 
} from './types';
import { drawPageBackground, drawStrokeOnContext, drawTextOnContext, drawPageFooter } from './pdfExport';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2, 
  Minimize2, 
  PlusCircle, 
  LayoutGrid, 
  PenTool, 
  Highlighter, 
  Eraser, 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  HelpCircle,
  Eye,
  Crosshair,
  Radio,
  FileText,
  Palette
} from 'lucide-react';

interface LaserPoint {
  x: number;
  y: number;
  time: number;
  opacity: number;
}

export type PresentationTool = 'laser' | 'pen' | 'highlighter' | 'eraser' | 'cursor';

interface XournalPresentationModeProps {
  pages: DocumentPage[];
  initialPageIndex: number;
  documentTitle: string;
  teacherName?: string;
  onClose: () => void;
  onPageUpdate: (updatedPage: DocumentPage) => void;
  onInsertBlankPage: (targetIndex: number, style: PageBackgroundStyle) => void;
}

export const XournalPresentationMode: React.FC<XournalPresentationModeProps> = ({
  pages,
  initialPageIndex,
  documentTitle,
  teacherName = 'أ. زكي أبو علان',
  onClose,
  onPageUpdate,
  onInsertBlankPage
}) => {
  // Navigation State
  const [currentIndex, setCurrentIndex] = useState(initialPageIndex);
  const safeIndex = Math.max(0, Math.min(currentIndex, pages.length - 1));
  const currentPage = pages[safeIndex];

  // Tool & Annotation State
  const [activeTool, setActiveTool] = useState<PresentationTool>('laser');
  const [penColor, setPenColor] = useState('#ef4444'); // Default ruby red for teaching
  const [laserColor, setLaserColor] = useState<'red' | 'green' | 'blue' | 'gold'>('red');
  const [showColorPalette, setShowColorPalette] = useState(false);

  // Blackout / Whiteout State (Focus on teacher)
  const [blankScreenMode, setBlankScreenMode] = useState<'none' | 'black' | 'white'>('none');

  // Slide Drawer Overview State
  const [showGridOverview, setShowGridOverview] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Auto-hide HUD state
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [isHudPinned, setIsHudPinned] = useState(false);
  const hudTimeoutRef = useRef<number | null>(null);

  // Lecture Stopwatch State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  // Laser Pointer State
  const laserTrailRef = useRef<LaserPoint[]>([]);
  const laserPosRef = useRef<{ x: number; y: number; visible: boolean; ripple: boolean }>({
    x: 0,
    y: 0,
    visible: false,
    ripple: false
  });
  const laserCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const isPointerDownRef = useRef(false);
  const activeStrokeRef = useRef<CanvasStroke | null>(null);

  // Container sizing
  const viewportRef = useRef<HTMLDivElement>(null);
  const [stageScale, setStageScale] = useState(1);

  // Compute scale so the slide fits within the viewport perfectly
  const updateStageScale = useCallback(() => {
    if (!viewportRef.current || !currentPage) return;
    const vp = viewportRef.current;
    const availableWidth = vp.clientWidth - 40;
    const availableHeight = vp.clientHeight - 40;

    const scaleW = availableWidth / currentPage.width;
    const scaleH = availableHeight / currentPage.height;
    const fitScale = Math.min(scaleW, scaleH);
    setStageScale(Math.max(0.2, fitScale));
  }, [currentPage]);

  useEffect(() => {
    updateStageScale();
    window.addEventListener('resize', updateStageScale);
    return () => window.removeEventListener('resize', updateStageScale);
  }, [updateStageScale]);

  // Stopwatch interval
  useEffect(() => {
    if (!isTimerRunning) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Activity detection to auto-hide HUD
  const handleUserActivity = useCallback(() => {
    setIsHudVisible(true);
    if (hudTimeoutRef.current) {
      window.clearTimeout(hudTimeoutRef.current);
    }
    if (!isHudPinned) {
      hudTimeoutRef.current = window.setTimeout(() => {
        setIsHudVisible(false);
      }, 3500);
    }
  }, [isHudPinned]);

  useEffect(() => {
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      if (hudTimeoutRef.current) window.clearTimeout(hudTimeoutRef.current);
    };
  }, [handleUserActivity]);

  // -------------------------------------------------------------
  // LASER COLOR PALETTE & RIPPLE
  // -------------------------------------------------------------
  const getLaserGlowColor = () => {
    switch (laserColor) {
      case 'green':
        return {
          core: '#ffffff',
          main: '#10b981',
          aura: 'rgba(16, 185, 129, 0.4)',
          shadow: '0 0 16px 5px rgba(16, 185, 129, 0.9), 0 0 32px 10px rgba(16, 185, 129, 0.4)'
        };
      case 'blue':
        return {
          core: '#ffffff',
          main: '#38bdf8',
          aura: 'rgba(56, 189, 248, 0.4)',
          shadow: '0 0 16px 5px rgba(56, 189, 248, 0.9), 0 0 32px 10px rgba(56, 189, 248, 0.4)'
        };
      case 'gold':
        return {
          core: '#ffffff',
          main: '#fbbf24',
          aura: 'rgba(251, 191, 36, 0.4)',
          shadow: '0 0 16px 5px rgba(251, 191, 36, 0.9), 0 0 32px 10px rgba(251, 191, 36, 0.4)'
        };
      case 'red':
      default:
        return {
          core: '#ffffff',
          main: '#ef4444',
          aura: 'rgba(239, 68, 68, 0.4)',
          shadow: '0 0 16px 5px rgba(239, 68, 68, 0.9), 0 0 32px 10px rgba(239, 68, 68, 0.4)'
        };
    }
  };

  // -------------------------------------------------------------
  // LASER TRAIL ANIMATION LOOP (Fading Comet Effect)
  // -------------------------------------------------------------
  useEffect(() => {
    let animId: number;
    const canvas = laserCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLaserLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();
      const trail = laserTrailRef.current;
      const glow = getLaserGlowColor();

      // Age and prune trail points (fading over 600ms)
      for (let i = trail.length - 1; i >= 0; i--) {
        const pt = trail[i];
        const age = now - pt.time;
        if (age > 600) {
          trail.splice(i, 1);
        } else {
          pt.opacity = 1 - age / 600;
        }
      }

      // Draw fading comet trail lines
      if (trail.length >= 2) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < trail.length; i++) {
          const p1 = trail[i - 1];
          const p2 = trail[i];
          const alpha = (p1.opacity + p2.opacity) / 2;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);

          // Outer soft glow
          ctx.strokeStyle = glow.aura;
          ctx.lineWidth = 14 * alpha;
          ctx.stroke();

          // Main vibrant laser core
          ctx.strokeStyle = glow.main;
          ctx.lineWidth = 6 * alpha;
          ctx.stroke();

          // Bright center
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 * alpha;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw expanding click ripple if active
      if (laserPosRef.current.ripple) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(laserPosRef.current.x, laserPosRef.current.y, 24, 0, Math.PI * 2);
        ctx.strokeStyle = glow.main;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(renderLaserLoop);
    };

    animId = requestAnimationFrame(renderLaserLoop);
    return () => cancelAnimationFrame(animId);
  }, [laserColor]);

  // -------------------------------------------------------------
  // ANNOTATION CANVAS REDRAW
  // -------------------------------------------------------------
  const redrawAnnotationCanvas = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    if (!canvas || !currentPage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. If blank scratchpad, draw background grid/ruled/dots
    if (currentPage.type === 'blank') {
      drawPageBackground(ctx, currentPage.width, currentPage.height, currentPage.backgroundStyle);
    }

    // 2. Draw existing strokes on page
    for (const stroke of currentPage.strokes) {
      drawStrokeOnContext(ctx, stroke);
    }

    // 3. Draw in-progress stroke if live drawing
    if (activeStrokeRef.current) {
      drawStrokeOnContext(ctx, activeStrokeRef.current);
    }

    // 4. Draw existing text annotations
    for (const text of currentPage.textAnnotations) {
      drawTextOnContext(ctx, text);
    }

    // 5. Official Academy margin / footer
    drawPageFooter(ctx, currentPage.width, currentPage.height, currentIndex + 1);
  }, [currentPage, currentIndex]);

  useEffect(() => {
    redrawAnnotationCanvas();
  }, [redrawAnnotationCanvas]);

  // -------------------------------------------------------------
  // SLIDE NAVIGATION HELPERS
  // -------------------------------------------------------------
  const goToNextSlide = useCallback(() => {
    if (currentIndex < pages.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setBlankScreenMode('none');
    }
  }, [currentIndex, pages.length]);

  const goToPrevSlide = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setBlankScreenMode('none');
    }
  }, [currentIndex]);

  const goToSlide = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentIndex(index);
      setShowGridOverview(false);
      setBlankScreenMode('none');
    }
  };

  // Insert a new blank page right after current slide and jump to it
  const handleInsertQuickBlankSlide = (style: PageBackgroundStyle = 'ruled') => {
    onInsertBlankPage(safeIndex, style);
    setCurrentIndex(safeIndex + 1);
    setShowAddMenu(false);
    setBlankScreenMode('none');
  };

  // Toggle browser Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // -------------------------------------------------------------
  // POINTER EVENT HANDLERS (Laser + Live Drawing)
  // -------------------------------------------------------------
  const getCanvasCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / stageScale;
    const y = (e.clientY - rect.top) / stageScale;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (blankScreenMode !== 'none') {
      setBlankScreenMode('none');
      return;
    }

    isPointerDownRef.current = true;
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'laser') {
      laserPosRef.current = { x, y, visible: true, ripple: true };
      setTimeout(() => {
        laserPosRef.current.ripple = false;
      }, 300);
      laserTrailRef.current.push({ x, y, time: performance.now(), opacity: 1 });
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      const stroke: CanvasStroke = {
        id: `pres_stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tool: activeTool,
        color: activeTool === 'highlighter' ? '#fde047' : penColor,
        width: activeTool === 'highlighter' ? 22 : 3.5,
        opacity: activeTool === 'highlighter' ? 0.45 : 1,
        points: [{ x, y, time: performance.now() }]
      };
      activeStrokeRef.current = stroke;
      redrawAnnotationCanvas();
    } else if (activeTool === 'eraser') {
      handleEraserAction(x, y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { x, y } = getCanvasCoords(e);

    // Update laser position whether pressed or hovering
    laserPosRef.current = { ...laserPosRef.current, x, y, visible: true };

    if (activeTool === 'laser') {
      laserTrailRef.current.push({ x, y, time: performance.now(), opacity: 1 });
      if (laserTrailRef.current.length > 30) {
        laserTrailRef.current.shift();
      }
      return;
    }

    if (!isPointerDownRef.current) return;

    if (activeStrokeRef.current) {
      activeStrokeRef.current.points.push({ x, y, time: performance.now() });
      redrawAnnotationCanvas();
    } else if (activeTool === 'eraser') {
      handleEraserAction(x, y);
    }
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;

    if (activeStrokeRef.current && currentPage) {
      // Commit stroke to page
      const updatedPage = {
        ...currentPage,
        strokes: [...currentPage.strokes, activeStrokeRef.current]
      };
      activeStrokeRef.current = null;
      onPageUpdate(updatedPage);
      redrawAnnotationCanvas();
    }
  };

  const handleEraserAction = (x: number, y: number) => {
    if (!currentPage) return;
    const threshold = 18;
    const remainingStrokes = currentPage.strokes.filter((stroke) => {
      return !stroke.points.some((pt) => {
        const dx = pt.x - x;
        const dy = pt.y - y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
      });
    });

    if (remainingStrokes.length !== currentPage.strokes.length) {
      onPageUpdate({ ...currentPage, strokes: remainingStrokes });
      redrawAnnotationCanvas();
    }
  };

  // Clear all annotations made on current slide
  const handleClearSlideAnnotations = () => {
    if (!currentPage) return;
    if (confirm('هل تريد مسح الرسومات والملاحظات المضافة على هذه الشريحة؟')) {
      onPageUpdate({ ...currentPage, strokes: [], textAnnotations: [] });
      redrawAnnotationCanvas();
    }
  };

  // -------------------------------------------------------------
  // KEYBOARD NAVIGATION & SHORTCUTS
  // -------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Blackout / Whiteout toggles
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setBlankScreenMode((prev) => (prev === 'black' ? 'none' : 'black'));
        return;
      }
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setBlankScreenMode((prev) => (prev === 'white' ? 'none' : 'white'));
        return;
      }

      if (blankScreenMode !== 'none') {
        setBlankScreenMode('none');
        return;
      }

      // Next Slide keys
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
        goToNextSlide();
      }
      // Previous Slide keys
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault();
        goToPrevSlide();
      }
      // First / Last Slide
      else if (e.key === 'Home') {
        e.preventDefault();
        goToSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToSlide(pages.length - 1);
      }
      // Exit Presentation Mode
      else if (e.key === 'Escape') {
        e.preventDefault();
        if (showGridOverview) {
          setShowGridOverview(false);
        } else if (showShortcutsHelp) {
          setShowShortcutsHelp(false);
        } else {
          onClose();
        }
      }
      // Tool shortcuts
      else if (e.key === 'l' || e.key === 'L') {
        setActiveTool('laser');
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool('pen');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('highlighter');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleInsertQuickBlankSlide('ruled');
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setShowGridOverview((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.key === '?') {
        setShowShortcutsHelp((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    blankScreenMode,
    goToNextSlide,
    goToPrevSlide,
    onClose,
    pages.length,
    safeIndex,
    showGridOverview,
    showShortcutsHelp
  ]);

  if (!currentPage) return null;

  const laserGlow = getLaserGlowColor();

  return (
    <div 
      className="fixed inset-0 w-screen h-screen z-[200] bg-slate-950 flex flex-col items-center justify-center select-none overflow-hidden font-sans"
      dir="ltr"
    >
      {/* 1. BLACKOUT / WHITEOUT OVERLAY (When teacher wants complete focus) */}
      {blankScreenMode !== 'none' && (
        <div 
          onClick={() => setBlankScreenMode('none')}
          className={`absolute inset-0 z-40 flex flex-col items-center justify-center cursor-pointer transition-colors duration-300 ${
            blankScreenMode === 'black' ? 'bg-black text-slate-500' : 'bg-white text-slate-400'
          }`}
        >
          <div className="text-center p-8 pointer-events-none select-none">
            <Radio size={48} className="mx-auto mb-3 animate-pulse opacity-40" />
            <h2 className="text-xl font-bold tracking-wider">
              {blankScreenMode === 'black' ? 'شاشة التعتيم النشطة (انتباه المعلم)' : 'لوحة بيضاء خالية'}
            </h2>
            <p className="text-sm mt-1 opacity-70">
              اضغط أي مكان أو اضغط المسطرة / أي زر للعودة للشرائح فوراً
            </p>
          </div>
        </div>
      )}

      {/* 2. TOP SUBTLE BRAND & TITLE BAR (Fades out with HUD) */}
      <div 
        className={`absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-slate-950/80 to-transparent flex items-center justify-between px-6 z-30 transition-opacity duration-300 pointer-events-none ${
          isHudVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/60 shadow-lg text-xs font-bold text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>عرض الشرائح التفاعلي</span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-400 font-mono truncate max-w-xs">{documentTitle}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/60 text-xs font-bold text-slate-300">
            <span>المعلم:</span>
            <span className="text-blue-400">{teacherName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Lecture Timer */}
          <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/60 text-xs font-mono text-emerald-400 shadow-lg">
            <Timer size={14} className="text-emerald-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="hover:text-white transition-colors cursor-pointer"
              title={isTimerRunning ? 'إيقاف مؤقت' : 'استئناف'}
            >
              {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              type="button"
              onClick={() => setElapsedSeconds(0)}
              className="hover:text-white transition-colors cursor-pointer"
              title="إعادة تصفير العداد"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Shortcuts Help */}
          <button
            type="button"
            onClick={() => setShowShortcutsHelp(true)}
            className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors shadow-lg cursor-pointer"
            title="دليل الاختصارات (?) "
          >
            <HelpCircle size={15} />
          </button>

          {/* Exit Presentation */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-full text-xs font-bold shadow-lg transition-all cursor-pointer border border-rose-500/50"
            title="إنهاء العرض (Esc)"
          >
            <X size={14} />
            <span>إنهاء العرض</span>
          </button>
        </div>
      </div>

      {/* 3. SLIDE VIEWPORT (CENTRAL SCALED SLIDE CONTAINER) */}
      <div 
        ref={viewportRef}
        className="w-full h-full flex items-center justify-center p-4 relative"
      >
        <div 
          className="relative shadow-2xl rounded-sm transition-transform duration-150 ease-out select-none"
          style={{
            width: currentPage.width,
            height: currentPage.height,
            transform: `scale(${stageScale})`,
            transformOrigin: 'center center',
            backgroundColor: '#ffffff'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Layer A: PDF Page High-Res Image (if PDF page) */}
          {currentPage.type === 'pdf' && currentPage.pdfDataUrl && (
            <img 
              src={currentPage.pdfDataUrl} 
              alt={`Slide PDF Page ${currentPage.pdfPageIndex}`}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />
          )}

          {/* Layer B: Annotations (Strokes + Text + Background if blank) */}
          <canvas
            ref={annotationCanvasRef}
            width={currentPage.width}
            height={currentPage.height}
            className={`absolute inset-0 w-full h-full touch-none ${
              activeTool === 'laser' 
                ? 'cursor-none' 
                : activeTool === 'pen' 
                ? 'cursor-crosshair' 
                : activeTool === 'highlighter' 
                ? 'cursor-crosshair' 
                : activeTool === 'eraser' 
                ? 'cursor-pointer' 
                : 'cursor-default'
            }`}
          />

          {/* Layer C: Dedicated Laser Pointer Canvas (Fading light trails) */}
          <canvas
            ref={laserCanvasRef}
            width={currentPage.width}
            height={currentPage.height}
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          />

          {/* Layer D: Glowing Laser Dot element (Follows cursor smoothly) */}
          {activeTool === 'laser' && (
            <div 
              className="absolute pointer-events-none z-30 transition-transform duration-75 ease-out"
              style={{
                left: laserPosRef.current.x - 12,
                top: laserPosRef.current.y - 12,
                width: 24,
                height: 24
              }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center animate-pulse"
                style={{
                  boxShadow: laserGlow.shadow,
                  backgroundColor: laserGlow.aura
                }}
              >
                <div 
                  className="w-3.5 h-3.5 rounded-full border border-white"
                  style={{ backgroundColor: laserGlow.main }}
                >
                  <div className="w-1.5 h-1.5 mx-auto my-0.5 rounded-full bg-white shadow-xs" />
                </div>
              </div>
            </div>
          )}

          {/* Official Page Footer / Margin (مهمشة باسم أكاديمية التفوق أون لاين وواتساب) */}
          <div 
            className="absolute bottom-0 inset-x-0 bg-white/95 border-t border-slate-200 pointer-events-none select-none z-20 flex items-center justify-between px-3 md:px-5"
            style={{
              height: 26,
              fontSize: 10
            }}
            dir="rtl"
          >
            <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
              <span className="text-[#0D365A] font-black">🎓 أكاديمية التفوق أون لاين</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-medium text-[9px] hidden sm:inline">اللوح التفاعلي</span>
            </div>

            <div className="flex items-center gap-2 font-bold text-slate-700 shrink-0" dir="ltr">
              <span className="text-emerald-700 font-black flex items-center gap-1">
                <span className="text-emerald-600">واتساب:</span>
                <span className="font-mono text-emerald-800 font-bold">+972 50-932-9568</span>
              </span>
              <span className="text-slate-400 font-mono text-[9px]">
                [صـ {currentIndex + 1} من {pages.length}]
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LEFT / RIGHT HOVER NAVIGATION CHEVRONS */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={goToPrevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-14 h-24 rounded-2xl bg-slate-900/40 hover:bg-slate-900/85 backdrop-blur-md text-white/60 hover:text-white flex items-center justify-center transition-all duration-200 z-30 border border-slate-700/40 shadow-xl cursor-pointer group"
          title="الشريحة السابقة (Arrow Left / PageUp)"
        >
          <ChevronLeft size={36} className="group-hover:-translate-x-1 transition-transform" />
        </button>
      )}

      {currentIndex < pages.length - 1 && (
        <button
          type="button"
          onClick={goToNextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-14 h-24 rounded-2xl bg-slate-900/40 hover:bg-slate-900/85 backdrop-blur-md text-white/60 hover:text-white flex items-center justify-center transition-all duration-200 z-30 border border-slate-700/40 shadow-xl cursor-pointer group"
          title="الشريحة التالية (Arrow Right / Space / PageDown)"
        >
          <ChevronRight size={36} className="group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* 5. FLOATING PRESENTATION CONTROLLER HUD (BOTTOM) */}
      <div 
        className={`absolute bottom-5 z-40 transition-all duration-300 ease-out flex flex-col items-center gap-2 ${
          isHudVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
        }`}
      >
        {/* Color Palette Popover for Pen */}
        {showColorPalette && (
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ffffff', '#000000'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setPenColor(c);
                  setActiveTool('pen');
                  setShowColorPalette(false);
                }}
                className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                  penColor === c ? 'scale-115 border-white ring-2 ring-blue-500' : 'border-slate-600 hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        {/* Quick Add Blank Slide Popover */}
        {showAddMenu && (
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex flex-col gap-1.5 w-60 text-right animate-in fade-in slide-in-from-bottom-2 duration-150" dir="rtl">
            <div className="text-[11px] font-bold text-slate-400 mb-1 px-1">
              إدراج صفحة بيضاء فورية للشرح بعد هذه الشريحة:
            </div>
            <button
              type="button"
              onClick={() => handleInsertQuickBlankSlide('ruled')}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white hover:bg-slate-800 transition-colors text-right cursor-pointer"
            >
              <div className="w-5 h-5 rounded bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-400">
                📝
              </div>
              <span>مسودة مسطرة (دفتر ملاحظات)</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertQuickBlankSlide('grid')}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white hover:bg-slate-800 transition-colors text-right cursor-pointer"
            >
              <div className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                📐
              </div>
              <span>شبكة مربعات بيانية (رياضيات وهندسة)</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertQuickBlankSlide('plain')}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white hover:bg-slate-800 transition-colors text-right cursor-pointer"
            >
              <div className="w-5 h-5 rounded bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
                📄
              </div>
              <span>لوحة بيضاء نقية (Plain Whiteboard)</span>
            </button>
          </div>
        )}

        {/* Main Floating Glass HUD Toolbar */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 text-white rounded-2xl p-2 px-3 shadow-2xl flex items-center gap-2 max-w-full overflow-x-auto">
          {/* 1. Slide Navigation Controls */}
          <div className="flex items-center gap-1 border-r border-slate-700/60 pr-2">
            <button
              type="button"
              onClick={goToPrevSlide}
              disabled={currentIndex === 0}
              className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="الشريحة السابقة (Left Arrow)"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Slide Index Badge & Type */}
            <div 
              onClick={() => setShowGridOverview(true)}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/90 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-100 cursor-pointer transition-colors border border-slate-700/40"
              title="عرض كافة الشرائح (G)"
            >
              <span className="font-mono text-emerald-400">{safeIndex + 1}</span>
              <span className="text-slate-500">/</span>
              <span className="font-mono">{pages.length}</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/70 text-slate-300">
                {currentPage.type === 'pdf' ? '📄 مستند PDF' : '✏️ مسودة بيضاء'}
              </span>
            </div>

            <button
              type="button"
              onClick={goToNextSlide}
              disabled={currentIndex === pages.length - 1}
              className="p-2 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="الشريحة التالية (Right Arrow / Space)"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 2. Tools: Virtual Laser Pointer, Pen, Highlighter, Eraser */}
          <div className="flex items-center gap-1 border-r border-slate-700/60 pr-2">
            {/* Laser Pointer Toggle */}
            <button
              type="button"
              onClick={() => setActiveTool('laser')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'laser'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 border border-rose-400 ring-2 ring-rose-500/50'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="مؤشر ليزر افتراضي مشع (L)"
            >
              <div 
                className="w-3 h-3 rounded-full animate-pulse border border-white"
                style={{ backgroundColor: laserGlow.main }}
              />
              <span>مؤشر ليزر</span>
            </button>

            {/* Laser Color Quick Switch (when laser active) */}
            {activeTool === 'laser' && (
              <div className="flex items-center gap-1 bg-slate-800/80 px-1.5 py-1 rounded-lg border border-slate-700">
                {(['red', 'green', 'blue', 'gold'] as const).map((lc) => (
                  <button
                    key={lc}
                    type="button"
                    onClick={() => setLaserColor(lc)}
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      laserColor === lc ? 'scale-125 ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor:
                        lc === 'red' ? '#ef4444' : lc === 'green' ? '#10b981' : lc === 'blue' ? '#38bdf8' : '#fbbf24'
                    }}
                    title={`لون الليزر: ${lc}`}
                  />
                ))}
              </div>
            )}

            {/* Quick Pen */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveTool('pen')}
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTool === 'pen'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
                title="قلم الشرح المباشر (P)"
              >
                <PenTool size={16} />
                <div 
                  className="w-2.5 h-2.5 rounded-full border border-white"
                  style={{ backgroundColor: penColor }}
                />
              </button>
            </div>

            {/* Pen Color Toggle */}
            <button
              type="button"
              onClick={() => setShowColorPalette(!showColorPalette)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="اختيار لون قلم الشرح"
            >
              <Palette size={14} />
            </button>

            {/* Quick Highlighter */}
            <button
              type="button"
              onClick={() => setActiveTool('highlighter')}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'highlighter'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/40 border border-amber-300 font-extrabold'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="قلم التمييز الفوسفوري (H)"
            >
              <Highlighter size={16} />
            </button>

            {/* Quick Eraser */}
            <button
              type="button"
              onClick={() => setActiveTool('eraser')}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTool === 'eraser'
                  ? 'bg-slate-100 text-slate-900 shadow-md border border-white font-extrabold'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="ممحاة (E)"
            >
              <Eraser size={16} />
            </button>

            {/* Clear this slide annotations */}
            {currentPage.strokes.length > 0 && (
              <button
                type="button"
                onClick={handleClearSlideAnnotations}
                className="px-2 py-1 text-[10px] text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 rounded-lg transition-colors cursor-pointer border border-rose-700/50"
                title="مسح الرسومات المضافة على هذه الشريحة"
              >
                مسح الرسومات
              </button>
            )}
          </div>

          {/* 3. Teaching Actions: Quick Blank Slide, Blackout, Grid, Fullscreen */}
          <div className="flex items-center gap-1">
            {/* Quick Blank Slide Button */}
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/40 border border-emerald-400/40 transition-all cursor-pointer"
              title="إدراج صفحة بيضاء فورية للشرح (N)"
            >
              <PlusCircle size={15} />
              <span>+ مسودة بيضاء</span>
            </button>

            {/* Blackout Toggle */}
            <button
              type="button"
              onClick={() => setBlankScreenMode((prev) => (prev === 'black' ? 'none' : 'black'))}
              className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                blankScreenMode === 'black' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="تعتيم الشاشة للتركيز على شرح المعلم (B)"
            >
              <span className="font-mono text-xs font-black">B</span>
            </button>

            {/* Slide Grid Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowGridOverview(!showGridOverview)}
              className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                showGridOverview ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="نظرة عامة على الشرائح (G)"
            >
              <LayoutGrid size={16} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title={isFullscreen ? 'إلغاء ملء الشاشة (F11)' : 'ملء الشاشة (F11)'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* 6. SLIDE GRID OVERVIEW DRAWER (Quick Slide Jumper) */}
      {showGridOverview && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                <LayoutGrid size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">نظرة عامة على شرائح الشرح ({pages.length} شريحة)</h3>
                <p className="text-xs text-slate-400">انقر على أي شريحة للانتقال إليها فوراً أثناء العرض</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleInsertQuickBlankSlide('ruled')}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <PlusCircle size={15} />
                <span>إدراج مسودة بيضاء جديدة</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGridOverview(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="إغلاق (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Grid Cards */}
          <div className="flex-1 overflow-y-auto mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-2">
            {pages.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => goToSlide(idx)}
                className={`group flex flex-col rounded-2xl overflow-hidden border-2 transition-all cursor-pointer relative bg-slate-900 ${
                  idx === safeIndex 
                    ? 'border-blue-500 ring-4 ring-blue-500/30 scale-102 shadow-xl shadow-blue-500/20' 
                    : 'border-slate-800 hover:border-slate-600 hover:scale-101'
                }`}
              >
                {/* Thumbnail Preview Area */}
                <div className="aspect-[3/4] bg-white relative overflow-hidden flex items-center justify-center">
                  {p.type === 'pdf' && p.pdfDataUrl ? (
                    <img 
                      src={p.pdfDataUrl} 
                      alt={`Thumb ${idx + 1}`}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#f8fafc] flex flex-col items-center justify-center p-3 text-center">
                      <span className="text-2xl mb-1">
                        {p.backgroundStyle === 'grid' ? '📐' : p.backgroundStyle === 'ruled' ? '📝' : '📄'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {p.backgroundStyle === 'grid' ? 'شبكة مربعات' : p.backgroundStyle === 'ruled' ? 'مسودة مسطرة' : 'صفحة بيضاء'}
                      </span>
                      {p.strokes.length > 0 && (
                        <span className="mt-1 text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                          {p.strokes.length} رسم
                        </span>
                      )}
                    </div>
                  )}

                  {/* Active Indicator Badge */}
                  {idx === safeIndex && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold shadow-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>الحالية</span>
                    </div>
                  )}
                </div>

                {/* Footer details */}
                <div className="p-2.5 bg-slate-900 flex items-center justify-between text-xs border-t border-slate-800">
                  <span className="font-mono font-bold text-white">#{idx + 1}</span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {p.type === 'pdf' ? 'مستند PDF' : 'مسودة بيضاء'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. KEYBOARD SHORTCUTS GUIDE MODAL */}
      {showShortcutsHelp && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <Sparkles size={18} />
                <span>اختصارات لوحة المفاتيح لوضع عرض الشرائح</span>
              </div>
              <button 
                onClick={() => setShowShortcutsHelp(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">التنقل للشريحة التالية</span>
                <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-amber-300 font-bold">Space / Right / PageDown</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">التنقل للشريحة السابقة</span>
                <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-amber-300 font-bold">Left / PageUp</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">تفعيل مؤشر الليزر الافتراضي</span>
                <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-rose-400 font-bold">L</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">قلم الشرح المباشر / التمييز</span>
                <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-blue-400 font-bold">P / H</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">إدراج صفحة بيضاء فورية</span>
                <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-emerald-400 font-bold">N</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">تعتيم الشاشة (تركيز الطلاب)</span>
                <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-white font-bold">B</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">مستعرض كافة الشرائح</span>
                <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-white font-bold">G</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">إنهاء وضع العرض</span>
                <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-rose-300 font-bold">Esc</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowShortcutsHelp(false)}
              className="w-full mt-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              فهمت، متابعة العرض
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
