import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Ruler, 
  RotateCw, 
  RotateCcw, 
  X, 
  Move, 
  Check, 
  Pencil, 
  FlipVertical, 
  Maximize2, 
  Minimize2,
  Sparkles,
  Compass
} from 'lucide-react';
import { DrawStroke } from '../../types/whiteboard';

interface VirtualRulerProps {
  isOpen: boolean;
  onClose: () => void;
  zoom: number;
  panOffset: { x: number; y: number };
  currentColor: string;
  currentWidth: number;
  onDrawStroke: (stroke: DrawStroke) => void;
}

export const VirtualRuler: React.FC<VirtualRulerProps> = ({
  isOpen,
  onClose,
  zoom,
  panOffset,
  currentColor,
  currentWidth,
  onDrawStroke
}) => {
  // Screen position of the ruler (center-top or top-left)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 220, y: 220 });
  const [rotation, setRotation] = useState<number>(0); // Angle in degrees (0 = horizontal)
  const [lengthPx, setLengthPx] = useState<number>(480); // Length of the ruler in screen pixels (default ~12 cm at 40px/cm)
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [unit, setUnit] = useState<'cm' | 'inch' | 'px'>('cm');
  const [isDrawingFeedback, setIsDrawingFeedback] = useState<boolean>(false);
  const [isSnapAngle, setIsSnapAngle] = useState<boolean>(false);

  // Dragging & Interaction states
  const rulerRef = useRef<HTMLDivElement>(null);
  const dragModeRef = useRef<'move' | 'rotate' | 'resize-right' | 'resize-left' | null>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    posX: number;
    posY: number;
    startAngle: number;
    startRotation: number;
    startLength: number;
  }>({
    pointerX: 0,
    pointerY: 0,
    posX: 0,
    posY: 0,
    startAngle: 0,
    startRotation: 0,
    startLength: 0
  });

  // Scale calibration: 40 pixels = 1 cm
  const PX_PER_CM = 40;
  const PX_PER_INCH = 96;
  const lengthInCm = lengthPx / PX_PER_CM;
  const lengthInInch = lengthPx / PX_PER_INCH;

  // Handle pointer down for ruler body dragging
  const handleBodyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragModeRef.current = 'move';
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: position.x,
      posY: position.y,
      startAngle: 0,
      startRotation: rotation,
      startLength: lengthPx
    };
  };

  // Handle pointer down for rotation handle
  const handleRotatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragModeRef.current = 'rotate';

    // Calculate initial angle between ruler origin and pointer
    const dx = e.clientX - position.x;
    const dy = e.clientY - position.y;
    const initialPointerAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: position.x,
      posY: position.y,
      startAngle: initialPointerAngle,
      startRotation: rotation,
      startLength: lengthPx
    };
  };

  // Handle pointer down for length resize handle
  const handleResizeRightPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragModeRef.current = 'resize-right';
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: position.x,
      posY: position.y,
      startAngle: 0,
      startRotation: rotation,
      startLength: lengthPx
    };
  };

  // Universal pointer move handler
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragModeRef.current) return;
    e.stopPropagation();

    if (dragModeRef.current === 'move') {
      const deltaX = e.clientX - dragStartRef.current.pointerX;
      const deltaY = e.clientY - dragStartRef.current.pointerY;
      setPosition({
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY
      });
    } else if (dragModeRef.current === 'rotate') {
      const dx = e.clientX - position.x;
      const dy = e.clientY - position.y;
      const currentPointerAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const angleDelta = currentPointerAngle - dragStartRef.current.startAngle;
      let newRot = (dragStartRef.current.startRotation + angleDelta) % 360;
      if (newRot < 0) newRot += 360;

      // Snapping to common angles if snap is active or shift is pressed
      if (isSnapAngle || e.shiftKey) {
        const snapTargets = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 225, 240, 270, 300, 315, 330, 360];
        for (const target of snapTargets) {
          if (Math.abs(newRot - target) < 4) {
            newRot = target % 360;
            break;
          }
        }
      }

      setRotation(Math.round(newRot * 10) / 10);
    } else if (dragModeRef.current === 'resize-right') {
      // Calculate projected distance along the ruler's orientation angle
      const rad = (rotation * Math.PI) / 180;
      const dx = e.clientX - position.x;
      const dy = e.clientY - position.y;
      
      // Project (dx, dy) onto the direction vector (cos(rad), sin(rad))
      const projectedLength = dx * Math.cos(rad) + dy * Math.sin(rad);
      const clampedLength = Math.max(160, Math.min(1000, projectedLength));
      setLengthPx(Math.round(clampedLength));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragModeRef.current) {
      dragModeRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Quick Angle Snap Helpers
  const snapTo = (angle: number) => {
    setRotation(angle % 360);
  };

  const adjustAngle = (delta: number) => {
    setRotation(prev => {
      let next = (prev + delta) % 360;
      if (next < 0) next += 360;
      return Math.round(next * 10) / 10;
    });
  };

  // Draw a crisp straight line along the ruler's exact top edge directly onto canvas
  const handleDrawRulerLine = () => {
    const rad = (rotation * Math.PI) / 180;
    
    // Top edge coordinates in screen space:
    // Start point: position (x, y)
    const screenX1 = position.x;
    const screenY1 = position.y;

    // End point: position + length along the angle vector
    const screenX2 = position.x + lengthPx * Math.cos(rad);
    const screenY2 = position.y + lengthPx * Math.sin(rad);

    // Convert from screen space to canvas model coordinates
    const canvasX1 = (screenX1 - panOffset.x) / zoom;
    const canvasY1 = (screenY1 - panOffset.y) / zoom;
    const canvasX2 = (screenX2 - panOffset.x) / zoom;
    const canvasY2 = (screenY2 - panOffset.y) / zoom;

    const stroke: DrawStroke = {
      id: `stroke_ruler_${Date.now()}`,
      tool: 'line',
      points: [
        { x: canvasX1, y: canvasY1, pressure: 0.8 },
        { x: canvasX2, y: canvasY2, pressure: 0.8 }
      ],
      color: currentColor,
      width: currentWidth,
      opacity: 1,
      dashStyle: 'solid'
    };

    onDrawStroke(stroke);
    setIsDrawingFeedback(true);
    setTimeout(() => setIsDrawingFeedback(false), 900);
  };

  // Draw millimeter & centimeter tick marks
  const renderTicks = () => {
    const ticks = [];
    const numCm = Math.floor(lengthPx / PX_PER_CM);

    // Minor mm ticks (every 4px)
    for (let px = 0; px <= lengthPx; px += 4) {
      const isCm = px % PX_PER_CM === 0;
      const isHalfCm = px % (PX_PER_CM / 2) === 0 && !isCm;
      const cmVal = px / PX_PER_CM;

      let tickHeight = 7;
      let tickColor = 'bg-slate-400/70 dark:bg-slate-400/60';

      if (isCm) {
        tickHeight = 22;
        tickColor = 'bg-amber-500 dark:bg-amber-400 font-black';
      } else if (isHalfCm) {
        tickHeight = 14;
        tickColor = 'bg-slate-700 dark:bg-slate-200';
      }

      ticks.push(
        <div
          key={`tick-${px}`}
          className="absolute top-0 flex flex-col items-center pointer-events-none"
          style={{ left: `${px}px` }}
        >
          <div
            className={`w-[1.5px] ${tickColor}`}
            style={{ height: `${tickHeight}px` }}
          />
          {isCm && (
            <span className="text-[10px] font-mono font-black text-slate-800 dark:text-slate-100 select-none mt-0.5 transform -translate-x-1/2">
              {cmVal}
            </span>
          )}
        </div>
      );
    }
    return ticks;
  };

  // Render bottom scale ticks (inches or reverse cm)
  const renderBottomTicks = () => {
    const ticks = [];
    const numInches = Math.floor(lengthPx / PX_PER_INCH);

    for (let px = 0; px <= lengthPx; px += (PX_PER_INCH / 8)) {
      const isInch = Math.abs(px % PX_PER_INCH) < 1;
      const isHalfInch = Math.abs(px % (PX_PER_INCH / 2)) < 1 && !isInch;
      const inchVal = Math.round(px / PX_PER_INCH);

      let tickHeight = 6;
      let tickColor = 'bg-slate-400/60';

      if (isInch) {
        tickHeight = 18;
        tickColor = 'bg-cyan-500 font-bold';
      } else if (isHalfInch) {
        tickHeight = 12;
        tickColor = 'bg-slate-600 dark:bg-slate-300';
      }

      ticks.push(
        <div
          key={`btick-${px}`}
          className="absolute bottom-0 flex flex-col items-center pointer-events-none"
          style={{ left: `${px}px` }}
        >
          {isInch && px > 0 && px < lengthPx - 10 && (
            <span className="text-[9px] font-mono font-black text-cyan-600 dark:text-cyan-300 select-none mb-0.5 transform -translate-x-1/2">
              {inchVal}&quot;
            </span>
          )}
          <div
            className={`w-[1.5px] ${tickColor}`}
            style={{ height: `${tickHeight}px` }}
          />
        </div>
      );
    }
    return ticks;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-35 overflow-hidden" 
      dir="ltr"
    >
      {/* Floating Interactive Ruler Component */}
      <div
        ref={rulerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${lengthPx}px`,
          height: '84px',
          transformOrigin: '0 0',
          transform: `rotate(${rotation}deg) ${isFlipped ? 'scaleY(-1)' : ''}`,
          touchAction: 'none'
        }}
        className="pointer-events-auto select-none rounded-xl shadow-2xl transition-shadow group border border-amber-400/40 dark:border-amber-400/50"
      >
        {/* Realistic Acrylic Frosted Body */}
        <div 
          onPointerDown={handleBodyPointerDown}
          className="w-full h-full rounded-xl bg-white/75 dark:bg-slate-900/80 backdrop-blur-md relative overflow-hidden border border-white/60 dark:border-slate-700/60 cursor-grab active:cursor-grabbing flex flex-col justify-between"
          title="المسطرة الافتراضية الذكية: اسحب من أي مكان في جسم المسطرة للتحريك، أو استخدم المقابض للتدوير وتغيير الطول"
        >
          {/* Top Millimeter & Centimeter Ticks */}
          <div className="relative w-full h-8 pointer-events-none">
            {renderTicks()}
          </div>

          {/* Center Brand & Live Readout Bar */}
          <div className="flex items-center justify-between px-4 py-1 pointer-events-none text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-1.5 opacity-80">
              <Ruler size={13} className="text-amber-500 dark:text-amber-400" />
              <span className="text-[10px] font-black tracking-wider uppercase">
                {unit === 'cm' ? 'مِسطَرَةُ القِيَاسِ' : 'VIRTUAL RULER'}
              </span>
            </div>

            {/* Live Length and Angle Badge */}
            <div className="flex items-center gap-2 bg-slate-950/70 text-amber-300 px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-black border border-amber-500/30 shadow-xs">
              <span>{lengthInCm.toFixed(1)} سم</span>
              <span className="text-slate-500">|</span>
              <span>{rotation.toFixed(0)}°</span>
            </div>

            <div className="text-[9px] font-mono font-bold text-cyan-600 dark:text-cyan-300 opacity-80">
              {lengthInInch.toFixed(1)} inch
            </div>
          </div>

          {/* Bottom Scale Ticks (Inches) */}
          <div className="relative w-full h-7 pointer-events-none">
            {renderBottomTicks()}
          </div>

          {/* Guide Edge Glow on Top Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 shadow-xs" />
        </div>

        {/* Origin / Pivot Crosshair Point at (0, 0) */}
        <div 
          className="absolute -top-3.5 -left-3.5 w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 cursor-move z-20 pointer-events-auto"
          onPointerDown={handleBodyPointerDown}
          title="نقطة الصفر (0, 0) - اسحب لتثبيت بداية المسطرة على أي نقطة"
        >
          <span className="text-[10px] font-mono font-black">0</span>
        </div>

        {/* Right Length Resize Handle */}
        <div
          onPointerDown={handleResizeRightPointerDown}
          style={{ left: `${lengthPx - 14}px` }}
          className="absolute top-1/2 -translate-y-1/2 w-7 h-10 rounded-r-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center cursor-ew-resize shadow-lg border border-amber-300 z-20 pointer-events-auto"
          title="اسحب لتغيير طول المسطرة (تطويل / تقصير)"
        >
          <div className="flex flex-col gap-0.5 items-center">
            <span className="w-1 h-3 bg-slate-950/70 rounded-full" />
          </div>
        </div>

        {/* Outer Rotation Dial Handle at Tip */}
        <div
          onPointerDown={handleRotatePointerDown}
          style={{ left: `${lengthPx + 16}px` }}
          className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xl border-2 border-white dark:border-slate-900 z-20 pointer-events-auto group/rot transition-transform hover:scale-110"
          title="مقبض التدوير الحر: اسحب لتدوير المسطرة بأي زاوية بدقة (أمسك Shift للمحاذاة التلقائية)"
        >
          <RotateCw size={15} className="group-hover/rot:rotate-45 transition-transform" />
        </div>
      </div>

      {/* Floating Ruler Control Bar (Docked adjacent to ruler or at canvas corner) */}
      <div 
        className="absolute top-16 left-6 pointer-events-auto z-40 bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 text-white rounded-3xl p-3 shadow-2xl space-y-2.5 max-w-sm animate-in fade-in zoom-in-95"
        dir="rtl"
      >
        {/* Header with Title and Close */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <Ruler size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <span>المسطرة الافتراضية الذكية</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  {lengthInCm.toFixed(1)} سم
                </span>
              </h4>
              <p className="text-[10px] text-slate-400">قياس الأبعاد ورسم خطوط مستقيمة فائقة الدقة</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="إغلاق المسطرة"
          >
            <X size={16} />
          </button>
        </div>

        {/* Primary Action: Draw Straight Line Along Ruler Edge */}
        <button
          type="button"
          onClick={handleDrawRulerLine}
          className={`w-full py-2 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
            isDrawingFeedback 
              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 scale-102' 
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
          }`}
          title="رسم خط مستقيم فوري على اللوح بطول وزاوية المسطرة الحالية وبنفس لون وسماكة القلم المختار"
        >
          {isDrawingFeedback ? (
            <>
              <Check size={16} />
              <span>تم رسم خط المسطرة على اللوح بنجاح ✨</span>
            </>
          ) : (
            <>
              <Pencil size={15} />
              <span>ارسم خطاً مستقيماً على طول المسطرة</span>
            </>
          )}
        </button>

        {/* Angle Tuning & Quick Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>زاوية الميل:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adjustAngle(-5)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-mono cursor-pointer"
                title="-5 درجات"
              >
                -5°
              </button>
              <button
                type="button"
                onClick={() => adjustAngle(-1)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-mono cursor-pointer"
                title="-1 درجة"
              >
                -1°
              </button>
              <span className="font-mono text-amber-300 font-black bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {rotation.toFixed(0)}°
              </span>
              <button
                type="button"
                onClick={() => adjustAngle(+1)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-mono cursor-pointer"
                title="+1 درجة"
              >
                +1°
              </button>
              <button
                type="button"
                onClick={() => adjustAngle(+5)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-mono cursor-pointer"
                title="+5 درجات"
              >
                +5°
              </button>
            </div>
          </div>

          {/* Quick Angle Buttons Grid */}
          <div className="grid grid-cols-6 gap-1">
            {[
              { label: '0° (أفقي)', angle: 0 },
              { label: '30°', angle: 30 },
              { label: '45°', angle: 45 },
              { label: '60°', angle: 60 },
              { label: '90° (رأسي)', angle: 90 },
              { label: '180°', angle: 180 }
            ].map(item => (
              <button
                key={item.angle}
                type="button"
                onClick={() => snapTo(item.angle)}
                className={`py-1 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  Math.round(rotation) === item.angle 
                    ? 'bg-amber-400 text-slate-950 font-black' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={`ضبط الزاوية على ${item.label}`}
              >
                {item.angle}°
              </button>
            ))}
          </div>
        </div>

        {/* Additional Utility Controls */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className={`px-2 py-1 rounded-xl border flex items-center gap-1 cursor-pointer transition-all ${
                isFlipped 
                  ? 'bg-indigo-600 text-white border-indigo-400' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="قلب حافة التدريج للأعلى أو للأسفل"
            >
              <FlipVertical size={12} />
              <span>قلب الحافة</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSnapAngle(!isSnapAngle)}
              className={`px-2 py-1 rounded-xl border flex items-center gap-1 cursor-pointer transition-all ${
                isSnapAngle 
                  ? 'bg-teal-600 text-white border-teal-400 font-bold' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="محاذاة الزوايا تلقائياً لمضاعفات 15°"
            >
              <Sparkles size={12} />
              <span>محاذاة الزوايا</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPosition({ x: 260, y: 240 })}
            className="text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            title="إعادة المسطرة إلى منتصف مساحة الشاشة"
          >
            توسيط ↺
          </button>
        </div>
      </div>
    </div>
  );
};
