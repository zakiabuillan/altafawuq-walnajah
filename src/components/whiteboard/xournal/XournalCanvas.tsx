import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  DocumentPage, 
  XournalTool, 
  PenThickness, 
  EraserType, 
  CanvasStroke, 
  StrokePoint, 
  TextAnnotation,
  PageBackgroundStyle 
} from './types';
import { drawPageBackground, drawStrokeOnContext, drawTextOnContext, drawPageFooter } from './pdfExport';
import { recognizeDrawnShape } from './shapeRecognizer';

interface XournalCanvasProps {
  page: DocumentPage;
  pageIndex: number;
  zoom: number;
  activeTool: XournalTool;
  thickness: PenThickness;
  customWidth?: number;
  color: string;
  eraserType: EraserType;
  highlighterMultiply: boolean;
  selectedShapeType: 'line' | 'arrow' | 'rect' | 'ellipse' | 'coord-axes';
  stylusPressureEnabled: boolean;
  palmRejectionEnabled: boolean;
  compactPadding?: boolean;
  onPageUpdate: (updatedPage: DocumentPage) => void;
  onPointerStatusChange?: (status: { x: number; y: number; pressure: number; pointerType: string }) => void;
  onActivatePage?: (pageIndex: number) => void;
}

export const XournalCanvas: React.FC<XournalCanvasProps> = ({
  page,
  pageIndex,
  zoom,
  activeTool,
  thickness,
  customWidth,
  color,
  eraserType,
  highlighterMultiply,
  selectedShapeType,
  stylusPressureEnabled,
  palmRejectionEnabled,
  compactPadding = false,
  onPageUpdate,
  onPointerStatusChange,
  onActivatePage
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeRef = useRef<CanvasStroke | null>(null);
  const isPointerDownRef = useRef(false);

  // Laser Pointer Transient State (fading comet trail + glowing red dot)
  const laserCanvasRef = useRef<HTMLCanvasElement>(null);
  const laserTrailRef = useRef<{ x: number; y: number; time: number; opacity: number }[]>([]);
  const laserPosRef = useRef<{ x: number; y: number; visible: boolean; isDown: boolean; rippleTime?: number }>({
    x: 0,
    y: 0,
    visible: false,
    isDown: false,
    rippleTime: 0
  });

  // Active inline text editing state
  const [editingText, setEditingText] = useState<{
    id?: string;
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Thickness to pixel mapping
  const getStrokeBaseWidth = useCallback((tool: XournalTool, thick: PenThickness, custW?: number): number => {
    if (thick === 'custom' && custW && custW > 0) {
      if (tool === 'highlighter') return Math.max(8, custW * 3.5);
      if (tool === 'eraser') return Math.max(6, custW * 2.5);
      return custW;
    }
    if (tool === 'highlighter') {
      switch (thick) {
        case 'very-fine': return 8;
        case 'fine': return 12;
        case 'medium': return 18;
        case 'bold': return 26;
        case 'marker': return 36;
        case 'heavy': return 48;
        default: return custW ? custW * 3.5 : 18;
      }
    }
    if (tool === 'eraser') {
      switch (thick) {
        case 'very-fine': return 6;
        case 'fine': return 10;
        case 'medium': return 18;
        case 'bold': return 30;
        case 'marker': return 48;
        case 'heavy': return 64;
        default: return custW ? custW * 2.5 : 18;
      }
    }
    switch (thick) {
      case 'very-fine': return 0.8;
      case 'fine': return 1.4;
      case 'medium': return 2.5;
      case 'bold': return 4.5;
      case 'marker': return 8.5;
      case 'heavy': return 14.0;
      default: return custW || 2.5;
    }
  }, []);

  // Save current state to this specific page's undo stack before starting a change
  const pushUndoState = useCallback(() => {
    onActivatePage?.(pageIndex);
    const currentState: PageHistoryState = {
      strokes: JSON.parse(JSON.stringify(page.strokes)),
      textAnnotations: JSON.parse(JSON.stringify(page.textAnnotations))
    };
    if (!page.undoStack) page.undoStack = [];
    page.undoStack.push(currentState);
    // Keep max 50 per-page undo states for fine-grained per-page precision
    if (page.undoStack.length > 50) {
      page.undoStack.shift();
    }
    page.redoStack = []; // Clear redo stack on new action for this page
  }, [page, onActivatePage, pageIndex]);

  // Main canvas redraw loop
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Page Background (if blank page)
    if (page.type === 'blank') {
      drawPageBackground(ctx, page.width, page.height, page.backgroundStyle);
    }

    // 2. Draw Committed Strokes
    for (const stroke of page.strokes) {
      drawStrokeOnContext(ctx, stroke);
    }

    // 3. Draw In-Progress Stroke
    if (activeStrokeRef.current) {
      drawStrokeOnContext(ctx, activeStrokeRef.current);
    }

    // 4. Draw Text Annotations
    for (const text of page.textAnnotations) {
      if (editingText && editingText.id === text.id) continue; // Don't draw while editing
      drawTextOnContext(ctx, text);
    }

    // 5. Official Academy margin / footer at the bottom of the page
    drawPageFooter(ctx, page.width, page.height, pageIndex + 1);
  }, [page, editingText, pageIndex]);

  // Redraw when page or editing text changes
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Laser Pointer Animation Loop (Transient fading comet trail + glowing red laser dot)
  useEffect(() => {
    let animId: number;
    const canvas = laserCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLaser = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();
      const trail = laserTrailRef.current;

      // 1. Age and prune trail points (fading over 650ms)
      for (let i = trail.length - 1; i >= 0; i--) {
        const pt = trail[i];
        const age = now - pt.time;
        if (age > 650) {
          trail.splice(i, 1);
        } else {
          pt.opacity = 1 - age / 650;
        }
      }

      // 2. Draw fading comet trail lines
      if (trail.length >= 2) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < trail.length; i++) {
          const p1 = trail[i - 1];
          const p2 = trail[i];
          const alpha = (p1.opacity + p2.opacity) / 2;

          // Outer soft red aura
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 * alpha})`;
          ctx.lineWidth = 14 * alpha;
          ctx.stroke();

          // Vibrant laser beam
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.95 * alpha})`;
          ctx.lineWidth = 6 * alpha;
          ctx.stroke();

          // Intense hot white core
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
          ctx.lineWidth = 2 * alpha;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Draw active laser pointer glowing dot if visible
      if (laserPosRef.current.visible && activeTool === 'laser') {
        const { x, y, isDown, rippleTime } = laserPosRef.current;
        ctx.save();

        // Expanding click ripple if recently pressed
        if (rippleTime && now - rippleTime < 450) {
          const rippleAge = (now - rippleTime) / 450;
          const radius = 8 + rippleAge * 30;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.85 * (1 - rippleAge)})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Outermost soft glowing halo
        const haloRadius = isDown ? 24 : 18;
        const gradient = ctx.createRadialGradient(x, y, 2, x, y, haloRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.2, 'rgba(239, 68, 68, 0.95)');
        gradient.addColorStop(0.55, 'rgba(239, 68, 68, 0.45)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // Sharp bright red laser bead
        ctx.beginPath();
        ctx.arc(x, y, isDown ? 5.5 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        // White-hot center dot
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
      }

      animId = requestAnimationFrame(renderLaser);
    };

    animId = requestAnimationFrame(renderLaser);
    return () => cancelAnimationFrame(animId);
  }, [activeTool]);

  // Convert client pointer event coordinates to unscaled document canvas space
  const getCanvasCoordinates = useCallback((e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = page.width / rect.width;
    const scaleY = page.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, [page.width, page.height]);

  // Stroke Eraser Helper: checks if point (x, y) hits any existing stroke and removes it
  const executeStrokeEraser = useCallback((x: number, y: number, radius: number = 15) => {
    const originalCount = page.strokes.length;
    const remainingStrokes = page.strokes.filter((stroke) => {
      // Check distance to points
      for (const pt of stroke.points) {
        if (Math.hypot(pt.x - x, pt.y - y) <= radius + stroke.width / 2) {
          return false; // Hit! Delete stroke
        }
      }
      return true;
    });

    if (remainingStrokes.length !== originalCount) {
      page.strokes = remainingStrokes;
      redrawCanvas();
      onPageUpdate({ ...page });
    }
  }, [page, redrawCanvas, onPageUpdate]);

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Hardware Palm Rejection: If palm rejection is enabled and pointer is touch while pen is supported
    if (palmRejectionEnabled && e.pointerType === 'touch') {
      return;
    }

    // Capture pointer
    e.currentTarget.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    onActivatePage?.(pageIndex);

    const { x, y } = getCanvasCoordinates(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    // Report pointer status
    onPointerStatusChange?.({ x: Math.round(x), y: Math.round(y), pressure, pointerType: e.pointerType });

    // Handle Laser pointer click
    if (activeTool === 'laser') {
      laserPosRef.current = { x, y, visible: true, isDown: true, rippleTime: performance.now() };
      laserTrailRef.current.push({ x, y, time: performance.now(), opacity: 1 });
      return;
    }

    // Handle Text tool click: place or edit text
    if (activeTool === 'text') {
      // Check if clicked on an existing text annotation
      const clickedText = page.textAnnotations.find(
        (t) => x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + (t.height || 40)
      );
      if (clickedText) {
        setEditingText({
          id: clickedText.id,
          x: clickedText.x,
          y: clickedText.y,
          text: clickedText.text
        });
      } else {
        // Create new text box at location
        setEditingText({
          x: Math.round(x),
          y: Math.round(y),
          text: ''
        });
      }
      return;
    }

    // Handle Stroke Eraser immediate contact
    if (activeTool === 'eraser' && eraserType === 'stroke') {
      pushUndoState();
      executeStrokeEraser(x, y, 16);
      return;
    }

    // Push undo state before any drawing begins
    pushUndoState();

    const baseWidth = getStrokeBaseWidth(activeTool, thickness, customWidth);
    // Apply Stylus Pressure modulation if enabled and supported
    const effectiveWidth = stylusPressureEnabled && e.pressure > 0
      ? baseWidth * (0.4 + pressure * 1.2)
      : baseWidth;

    const isGeometryShape = activeTool === 'line' || activeTool === 'arrow' || activeTool === 'rect' || activeTool === 'ellipse' || activeTool === 'coord-axes' || activeTool === 'ruler';

    activeStrokeRef.current = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: activeTool === 'highlighter' 
        ? 'highlighter' 
        : (activeTool === 'eraser' && eraserType === 'whiteout') 
        ? 'eraser-whiteout' 
        : isGeometryShape 
        ? (activeTool === 'ruler' ? 'line' : activeTool)
        : 'pen',
      color: activeTool === 'highlighter' 
        ? color 
        : (activeTool === 'eraser' && eraserType === 'whiteout') 
        ? '#FFFFFF' 
        : color,
      width: effectiveWidth,
      opacity: activeTool === 'highlighter' ? (highlighterMultiply ? 0.35 : 0.6) : 1.0,
      points: [{ x, y, pressure, time: Date.now() }],
      blendMode: activeTool === 'highlighter' && highlighterMultiply ? 'multiply' : 'normal',
      isShape: isGeometryShape || activeTool === 'shape-recognizer',
      shapeType: isGeometryShape ? (activeTool === 'ruler' ? 'line' : activeTool as any) : undefined
    };

    redrawCanvas();
  };

  // Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    onPointerStatusChange?.({ x: Math.round(x), y: Math.round(y), pressure, pointerType: e.pointerType });

    // Handle Laser pointer movement (both hovering and dragging)
    if (activeTool === 'laser') {
      laserPosRef.current = { 
        x, 
        y, 
        visible: true, 
        isDown: isPointerDownRef.current,
        rippleTime: laserPosRef.current.rippleTime 
      };
      laserTrailRef.current.push({ x, y, time: performance.now(), opacity: 1 });
      return;
    }

    if (!isPointerDownRef.current) return;

    // Stroke Eraser dragging
    if (activeTool === 'eraser' && eraserType === 'stroke') {
      executeStrokeEraser(x, y, 16);
      return;
    }

    if (!activeStrokeRef.current) return;

    const stroke = activeStrokeRef.current;

    // If drawing a strict shape, update endpoint
    if (stroke.isShape && stroke.shapeType) {
      if (stroke.points.length === 1) {
        stroke.points.push({ x, y, pressure, time: Date.now() });
      } else {
        stroke.points[1] = { x, y, pressure, time: Date.now() };
      }
    } else {
      // Freehand drawing (Pen, Highlighter, Shape Recognizer tracking)
      stroke.points.push({ x, y, pressure, time: Date.now() });
    }

    redrawCanvas();
  };

  // Pointer Up Handler
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'laser') {
      isPointerDownRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
      if (laserPosRef.current) {
        laserPosRef.current.isDown = false;
      }
      return;
    }

    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore pointer release errors
    }

    if (!activeStrokeRef.current) return;

    let finalStroke = activeStrokeRef.current;
    activeStrokeRef.current = null;

    // Shape Recognizer Automatic Geometry Snapping!
    if (activeTool === 'shape-recognizer' && finalStroke.points.length >= 5) {
      const recognized = recognizeDrawnShape(finalStroke.points);
      if (recognized) {
        finalStroke = {
          ...finalStroke,
          isShape: true,
          shapeType: recognized.type,
          points: recognized.points
        };
      }
    }

    // Commit stroke to page
    page.strokes.push(finalStroke);
    redrawCanvas();
    onPageUpdate({ ...page });
  };

  // Pointer Enter / Leave handlers for Laser Pointer cursor visibility
  const handlePointerEnter = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'laser') {
      const { x, y } = getCanvasCoordinates(e);
      laserPosRef.current = { x, y, visible: true, isDown: isPointerDownRef.current, rippleTime: 0 };
    }
  };

  const handlePointerLeave = () => {
    if (laserPosRef.current) {
      laserPosRef.current.visible = false;
      laserPosRef.current.isDown = false;
    }
  };

  // Commit text editing
  const handleSaveTextAnnotation = () => {
    if (!editingText) return;
    const trimmed = editingText.text.trim();

    if (!trimmed) {
      // If empty and existing, remove it
      if (editingText.id) {
        pushUndoState();
        page.textAnnotations = page.textAnnotations.filter((t) => t.id !== editingText.id);
        onPageUpdate({ ...page });
      }
      setEditingText(null);
      return;
    }

    pushUndoState();

    if (editingText.id) {
      // Update existing
      page.textAnnotations = page.textAnnotations.map((t) =>
        t.id === editingText.id ? { ...t, text: trimmed } : t
      );
    } else {
      // Add new
      const newAnnotation: TextAnnotation = {
        id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        x: editingText.x,
        y: editingText.y,
        width: Math.max(200, trimmed.length * 10),
        height: 60,
        text: trimmed,
        color,
        fontSize: thickness === 'very-fine' ? 11 : thickness === 'fine' ? 13 : thickness === 'medium' ? 16 : thickness === 'bold' ? 22 : thickness === 'heavy' ? 32 : (customWidth ? Math.round(customWidth * 4.5) : 16),
        fontFamily: 'Cairo, sans-serif'
      };
      page.textAnnotations.push(newAnnotation);
    }

    setEditingText(null);
    redrawCanvas();
    onPageUpdate({ ...page });
  };

  return (
    <div 
      ref={containerRef}
      className={`relative flex items-center justify-center min-h-full transition-all ${compactPadding ? 'p-1.5 md:p-2.5' : 'p-4 md:p-6'}`}
    >
      {/* Document Page Canvas Container with Authentic Shadow and Paper Styling */}
      <div 
        className="relative bg-white shadow-2xl border border-slate-300 rounded-sm transition-transform duration-75 select-none"
        style={{
          width: page.width * zoom,
          height: page.height * zoom
        }}
      >
        {/* If PDF page, render PDF background image under the canvas overlay */}
        {page.type === 'pdf' && page.pdfDataUrl && (
          <img 
            src={page.pdfDataUrl} 
            alt={`PDF Page ${page.pdfPageIndex}`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        )}
        {page.type === 'pdf' && !page.pdfDataUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-500 text-xs p-4 text-center select-none pointer-events-none">
            <span className="font-bold text-slate-700 mb-1">صفحة مستند PDF رقم {page.pdfPageIndex || 1}</span>
            <span className="text-[11px] text-slate-400">يمكنك الرسم والكتابة، أو استيراد ملف PDF من شريط الأدوات</span>
          </div>
        )}

        {/* Vector Annotation Overlay Canvas */}
        <canvas
          ref={canvasRef}
          width={page.width}
          height={page.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          className={`absolute inset-0 w-full h-full touch-none ${
            activeTool === 'laser' ? 'cursor-none' : 'cursor-crosshair'
          }`}
        />

        {/* Transient Glowing Laser Pointer & Comet Trail Layer */}
        <canvas
          ref={laserCanvasRef}
          width={page.width}
          height={page.height}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />

        {/* Inline Text Box Editor Overlay */}
        {editingText && (
          <div 
            className="absolute z-30 p-2 bg-white/95 rounded border-2 border-blue-600 shadow-xl"
            style={{
              left: editingText.x * zoom,
              top: editingText.y * zoom
            }}
          >
            <textarea
              autoFocus
              value={editingText.text}
              onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSaveTextAnnotation();
                } else if (e.key === 'Escape') {
                  setEditingText(null);
                }
              }}
              placeholder="اكتب النص هنا (Ctrl+Enter للحفظ)..."
              rows={3}
              className="w-64 p-2 text-sm text-slate-900 border border-slate-300 rounded outline-none font-sans resize-y"
              dir="auto"
            />
            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-bold">
              <span>Enter+Ctrl للحفظ • Esc للإلغاء</span>
              <button
                type="button"
                onClick={handleSaveTextAnnotation}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer"
              >
                حفظ النص
              </button>
            </div>
          </div>
        )}

        {/* Official Page Footer / Margin Bar (مهمشة باسم أكاديمية التفوق أون لاين وواتساب) */}
        <div 
          className="absolute bottom-0 inset-x-0 bg-white/95 border-t border-slate-200 pointer-events-none select-none z-20 flex items-center justify-between px-3 md:px-4 shadow-2xs"
          style={{
            height: Math.max(22, 26 * zoom),
            fontSize: Math.max(8.5, 10.5 * zoom)
          }}
          dir="rtl"
        >
          <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
            <span className="text-[#0D365A] font-black tracking-tight">🎓 أكاديمية التفوق أون لاين</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-medium text-[9px] hidden sm:inline">اللوح التفاعلي</span>
          </div>

          <div className="flex items-center gap-2 font-bold text-slate-700 shrink-0" dir="ltr">
            <span className="text-emerald-700 font-black flex items-center gap-1">
              <span className="text-emerald-600">واتساب:</span>
              <span className="font-mono text-emerald-800 font-bold">+972 50-932-9568</span>
            </span>
            <span className="text-slate-400 font-mono text-[9px] hidden md:inline">
              [صفحة {pageIndex + 1}]
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
