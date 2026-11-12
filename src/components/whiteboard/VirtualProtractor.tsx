import React, { useState, useRef } from 'react';
import { 
  Compass, 
  RotateCw, 
  X, 
  Check, 
  Pencil, 
  Sparkles, 
  Maximize2,
  Circle,
  HelpCircle
} from 'lucide-react';
import { DrawStroke, TextItem } from '../../types/whiteboard';

interface VirtualProtractorProps {
  isOpen: boolean;
  onClose: () => void;
  zoom: number;
  panOffset: { x: number; y: number };
  currentColor: string;
  currentWidth: number;
  onDrawStrokes: (strokes: DrawStroke[], textItem?: TextItem) => void;
}

export const VirtualProtractor: React.FC<VirtualProtractorProps> = ({
  isOpen,
  onClose,
  zoom,
  panOffset,
  currentColor,
  currentWidth,
  onDrawStrokes
}) => {
  // Screen center coordinates of the protractor origin (the vertex)
  const [center, setCenter] = useState<{ x: number; y: number }>({ x: 380, y: 340 });
  const [radius, setRadius] = useState<number>(200); // Radius in screen pixels (default 200px)
  const [baseRotation, setBaseRotation] = useState<number>(0); // Baseline angle in degrees (0 = horizontal to right)
  const [measuredAngle, setMeasuredAngle] = useState<number>(60); // Angle relative to baseline (0 to 180 or 360)
  const [mode, setMode] = useState<'180' | '360'>('180');
  const [isSnapAngle, setIsSnapAngle] = useState<boolean>(false);
  const [isDrawingFeedback, setIsDrawingFeedback] = useState<boolean>(false);

  // Interaction Drag State Ref
  const dragModeRef = useRef<'move' | 'rotate-base' | 'drag-needle' | 'resize-radius' | null>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
    startAngle: number;
    startBaseRotation: number;
    startRadius: number;
  }>({
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0,
    startAngle: 0,
    startBaseRotation: 0,
    startRadius: 0
  });

  // Pointer Down for Moving Protractor Origin
  const handleCenterPointerDown = (e: React.PointerEvent<any>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragModeRef.current = 'move';
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: center.x,
      startY: center.y,
      startAngle: 0,
      startBaseRotation: baseRotation,
      startRadius: radius
    };
  };

  // Pointer Down for Baseline Rotation Handle
  const handleBaseRotatePointerDown = (e: React.PointerEvent<any>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragModeRef.current = 'rotate-base';

    const dx = e.clientX - center.x;
    const dy = e.clientY - center.y;
    const initialAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: center.x,
      startY: center.y,
      startAngle: initialAngle,
      startBaseRotation: baseRotation,
      startRadius: radius
    };
  };

  // Pointer Down for Measuring Angle Needle
  const handleNeedlePointerDown = (e: React.PointerEvent<any>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragModeRef.current = 'drag-needle';
  };

  // Universal Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragModeRef.current) return;
    e.stopPropagation();

    if (dragModeRef.current === 'move') {
      const deltaX = e.clientX - dragStartRef.current.pointerX;
      const deltaY = e.clientY - dragStartRef.current.pointerY;
      setCenter({
        x: dragStartRef.current.startX + deltaX,
        y: dragStartRef.current.startY + deltaY
      });
    } else if (dragModeRef.current === 'rotate-base') {
      const dx = e.clientX - center.x;
      const dy = e.clientY - center.y;
      const currentPointerAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const deltaAngle = currentPointerAngle - dragStartRef.current.startAngle;
      let newBaseRot = (dragStartRef.current.startBaseRotation + deltaAngle) % 360;
      if (newBaseRot < 0) newBaseRot += 360;

      if (isSnapAngle || e.shiftKey) {
        const snapTargets = [0, 15, 30, 45, 60, 75, 90, 120, 135, 150, 180, 210, 225, 240, 270, 315, 360];
        for (const target of snapTargets) {
          if (Math.abs(newBaseRot - target) < 4) {
            newBaseRot = target % 360;
            break;
          }
        }
      }

      setBaseRotation(Math.round(newBaseRot * 10) / 10);
    } else if (dragModeRef.current === 'drag-needle') {
      // Calculate angle from center to pointer
      const dx = e.clientX - center.x;
      const dy = e.clientY - center.y;
      
      // Angle in screen space in degrees
      let screenAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (screenAngle < 0) screenAngle += 360;

      // Calculate relative angle from baseline
      let relAngle = (screenAngle - baseRotation) % 360;
      // Convert counter-clockwise sweep so 0 to 180 goes in upper half
      relAngle = (360 - relAngle) % 360;

      if (mode === '180') {
        // Clamp to 0..180
        if (relAngle > 180 && relAngle < 270) relAngle = 180;
        else if (relAngle >= 270) relAngle = 0;
      }

      if (isSnapAngle || e.shiftKey) {
        const snapTargets = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 225, 270, 315, 360];
        for (const target of snapTargets) {
          if (Math.abs(relAngle - target) < 3.5) {
            relAngle = target;
            break;
          }
        }
      }

      setMeasuredAngle(Math.round(relAngle * 10) / 10);
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

  // Angle classification helper
  const getAngleClassification = (deg: number) => {
    const rounded = Math.round(deg);
    if (rounded === 0) return { label: 'زاوية صفرية', color: 'text-slate-400', desc: '0°' };
    if (rounded < 90) return { label: 'زاوية حادة (Acute)', color: 'text-emerald-400', desc: 'أقل من 90°' };
    if (rounded === 90) return { label: 'زاوية قائمة (Right)', color: 'text-amber-300', desc: '90° تماماً' };
    if (rounded < 180) return { label: 'زاوية منفرجة (Obtuse)', color: 'text-sky-400', desc: 'بين 90° و 180°' };
    if (rounded === 180) return { label: 'زاوية مستقيمة (Straight)', color: 'text-indigo-300', desc: '180° تماماً' };
    return { label: 'زاوية منعكسة (Reflex)', color: 'text-rose-400', desc: 'أكبر من 180°' };
  };

  const angleClassification = getAngleClassification(measuredAngle);
  const supplementaryAngle = Math.max(0, 180 - measuredAngle);
  const radians = ((measuredAngle * Math.PI) / 180).toFixed(2);
  const piFraction = (measuredAngle / 180).toFixed(2);

  // Draw Measured Angle onto Canvas (Vertex + 2 Rays + Arc + Label)
  const handleDrawAngleToCanvas = () => {
    // 1. Convert center vertex to canvas coordinates
    const canvasCenterX = (center.x - panOffset.x) / zoom;
    const canvasCenterY = (center.y - panOffset.y) / zoom;

    const rayLength = radius * 1.05;

    // Baseline ray angle in radians (screen space)
    const baseRad = (baseRotation * Math.PI) / 180;
    const screenRay1X = center.x + rayLength * Math.cos(baseRad);
    const screenRay1Y = center.y + rayLength * Math.sin(baseRad);

    const canvasRay1X = (screenRay1X - panOffset.x) / zoom;
    const canvasRay1Y = (screenRay1Y - panOffset.y) / zoom;

    // Measured angle ray angle in radians (screen space: counter-clockwise from baseline)
    const angleRad = ((baseRotation - measuredAngle) * Math.PI) / 180;
    const screenRay2X = center.x + rayLength * Math.cos(angleRad);
    const screenRay2Y = center.y + rayLength * Math.sin(angleRad);

    const canvasRay2X = (screenRay2X - panOffset.x) / zoom;
    const canvasRay2Y = (screenRay2Y - panOffset.y) / zoom;

    // Generate Arc points between ray 1 and ray 2
    const arcRadius = radius * 0.4;
    const arcPoints = [];
    const stepCount = Math.max(8, Math.round(measuredAngle / 5));
    for (let i = 0; i <= stepCount; i++) {
      const stepAngleDeg = baseRotation - (measuredAngle * (i / stepCount));
      const stepRad = (stepAngleDeg * Math.PI) / 180;
      const screenArcX = center.x + arcRadius * Math.cos(stepRad);
      const screenArcY = center.y + arcRadius * Math.sin(stepRad);
      arcPoints.push({
        x: (screenArcX - panOffset.x) / zoom,
        y: (screenArcY - panOffset.y) / zoom,
        pressure: 0.7
      });
    }

    // 1. Ray 1 (Baseline)
    const strokeRay1: DrawStroke = {
      id: `stroke_ray1_${Date.now()}`,
      tool: 'line',
      points: [
        { x: canvasCenterX, y: canvasCenterY, pressure: 0.8 },
        { x: canvasRay1X, y: canvasRay1Y, pressure: 0.8 }
      ],
      color: currentColor,
      width: currentWidth,
      opacity: 1,
      dashStyle: 'solid'
    };

    // 2. Ray 2 (Measured Angle)
    const strokeRay2: DrawStroke = {
      id: `stroke_ray2_${Date.now() + 1}`,
      tool: 'line',
      points: [
        { x: canvasCenterX, y: canvasCenterY, pressure: 0.8 },
        { x: canvasRay2X, y: canvasRay2Y, pressure: 0.8 }
      ],
      color: currentColor,
      width: currentWidth,
      opacity: 1,
      dashStyle: 'solid'
    };

    // 3. Angle Arc Stroke
    const strokeArc: DrawStroke = {
      id: `stroke_arc_${Date.now() + 2}`,
      tool: 'pen',
      points: arcPoints,
      color: '#f59e0b', // Amber highlight for the angle arc
      width: Math.max(2, currentWidth - 1),
      opacity: 0.9,
      dashStyle: 'solid'
    };

    // 4. Text Item with Angle Degree Label
    const midAngleDeg = baseRotation - (measuredAngle / 2);
    const midRad = (midAngleDeg * Math.PI) / 180;
    const labelDistance = arcRadius + 28;
    const screenLabelX = center.x + labelDistance * Math.cos(midRad);
    const screenLabelY = center.y + labelDistance * Math.sin(midRad);

    const canvasLabelX = (screenLabelX - panOffset.x) / zoom;
    const canvasLabelY = (screenLabelY - panOffset.y) / zoom;

    const angleTextItem: TextItem = {
      id: `text_angle_${Date.now()}`,
      x: canvasLabelX - 25,
      y: canvasLabelY - 14,
      text: `${measuredAngle}°`,
      fontSize: 16,
      color: '#f59e0b',
      width: 60,
      height: 30
    };

    onDrawStrokes([strokeRay1, strokeRay2, strokeArc], angleTextItem);
    setIsDrawingFeedback(true);
    setTimeout(() => setIsDrawingFeedback(false), 900);
  };

  // Render Graduation Degree Ticks on Protractor Arc
  const renderDegreeTicks = () => {
    const ticks = [];
    const maxDeg = mode === '180' ? 180 : 360;

    for (let deg = 0; deg <= maxDeg; deg += 1) {
      const isMajor = deg % 10 === 0;
      const isMedium = deg % 5 === 0 && !isMajor;

      if (!isMajor && !isMedium && deg % 2 !== 0) continue; // Skip odd fine ticks for rendering efficiency

      // Angle in radians relative to protractor top-half (0° is right, 180° is left)
      const rad = ((180 - deg) * Math.PI) / 180;
      
      const tickLength = isMajor ? 18 : isMedium ? 11 : 6;
      const outerR = radius - 3;
      const innerR = outerR - tickLength;

      const x1 = radius + outerR * Math.cos(rad);
      const y1 = radius - outerR * Math.sin(rad);
      const x2 = radius + innerR * Math.cos(rad);
      const y2 = radius - innerR * Math.sin(rad);

      const strokeColor = isMajor 
        ? '#f59e0b' 
        : isMedium 
        ? 'rgba(255, 255, 255, 0.85)' 
        : 'rgba(255, 255, 255, 0.4)';

      ticks.push(
        <line
          key={`tick-${deg}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth={isMajor ? 1.75 : 1}
        />
      );

      // Numerals on Major 10° ticks
      if (isMajor && deg <= 180) {
        const textR_outer = radius - 30;
        const tx_outer = radius + textR_outer * Math.cos(rad);
        const ty_outer = radius - textR_outer * Math.sin(rad);

        const textR_inner = radius - 44;
        const tx_inner = radius + textR_inner * Math.cos(rad);
        const ty_inner = radius - textR_inner * Math.sin(rad);

        ticks.push(
          <g key={`num-${deg}`}>
            {/* Outer scale (0 on right -> 180 on left) */}
            <text
              x={tx_outer}
              y={ty_outer}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fbbf24"
              fontSize={mode === '180' ? 9.5 : 8}
              fontWeight="900"
              fontFamily="monospace"
              transform={`rotate(${deg - 90}, ${tx_outer}, ${ty_outer})`}
            >
              {deg}
            </text>

            {/* Inner reverse scale (180 on right -> 0 on left) */}
            {mode === '180' && (
              <text
                x={tx_inner}
                y={ty_inner}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#94a3b8"
                fontSize={8}
                fontWeight="700"
                fontFamily="monospace"
                transform={`rotate(${deg - 90}, ${tx_inner}, ${ty_inner})`}
              >
                {180 - deg}
              </text>
            )}
          </g>
        );
      }
    }
    return ticks;
  };

  if (!isOpen) return null;

  // Calculate Needle Endpoint on Screen
  const needleRad = ((180 - measuredAngle) * Math.PI) / 180;
  const needleTipX = radius + (radius - 2) * Math.cos(needleRad);
  const needleTipY = radius - (radius - 2) * Math.sin(needleRad);

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-35 overflow-hidden" 
      dir="ltr"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Interactive Protractor SVG Overlay */}
      <div
        style={{
          position: 'absolute',
          left: `${center.x - radius}px`,
          top: `${center.y - radius}px`,
          width: `${radius * 2}px`,
          height: mode === '180' ? `${radius + 20}px` : `${radius * 2}px`,
          transformOrigin: `${radius}px ${radius}px`,
          transform: `rotate(${baseRotation}deg)`,
          touchAction: 'none'
        }}
        className="pointer-events-auto select-none rounded-t-full shadow-2xl transition-shadow group"
      >
        <svg
          width={radius * 2}
          height={mode === '180' ? radius + 20 : radius * 2}
          viewBox={`0 0 ${radius * 2} ${mode === '180' ? radius + 20 : radius * 2}`}
          className="overflow-visible"
        >
          {/* Defs & Filters for Frosted Acrylic Glow */}
          <defs>
            <radialGradient id="protractorGlass" cx="50%" cy="100%" r="90%">
              <stop offset="0%" stopColor="rgba(15, 23, 42, 0.9)" />
              <stop offset="70%" stopColor="rgba(30, 41, 59, 0.82)" />
              <stop offset="100%" stopColor="rgba(51, 65, 85, 0.88)" />
            </radialGradient>
            <linearGradient id="needleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="protractorShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(0,0,0,0.5)" />
            </filter>
          </defs>

          {/* Semicircular / Circular Protractor Body */}
          {mode === '180' ? (
            <path
              d={`M 10,${radius} A ${radius - 10},${radius - 10} 0 0,1 ${radius * 2 - 10},${radius} L ${radius * 2 - 10},${radius + 12} L 10,${radius + 12} Z`}
              fill="url(#protractorGlass)"
              stroke="rgba(245, 158, 11, 0.6)"
              strokeWidth="2"
              filter="url(#protractorShadow)"
              className="backdrop-blur-md cursor-grab active:cursor-grabbing"
              onPointerDown={handleCenterPointerDown}
            />
          ) : (
            <circle
              cx={radius}
              cy={radius}
              r={radius - 10}
              fill="url(#protractorGlass)"
              stroke="rgba(245, 158, 11, 0.6)"
              strokeWidth="2"
              filter="url(#protractorShadow)"
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={handleCenterPointerDown}
            />
          )}

          {/* Measured Angle Sector (Translucent Amber/Red Sweep) */}
          {measuredAngle > 0 && (
            <path
              d={`M ${radius},${radius} L ${radius * 2 - 10},${radius} A ${radius - 10},${radius - 10} 0 ${measuredAngle > 180 ? 1 : 0},0 ${needleTipX},${needleTipY} Z`}
              fill="rgba(245, 158, 11, 0.22)"
              stroke="rgba(245, 158, 11, 0.5)"
              strokeWidth="1"
              pointerEvents="none"
            />
          )}

          {/* Baseline Diameter Line */}
          <line
            x1="10"
            y1={radius}
            x2={radius * 2 - 10}
            y2={radius}
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeDasharray="none"
          />

          {/* Perpendicular (90°) Altitude Line */}
          <line
            x1={radius}
            y1={radius}
            x2={radius}
            y2="14"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />

          {/* Graduation Degree Ticks */}
          {renderDegreeTicks()}

          {/* Angle Indicator Needle / Ray (From Center to Perimeter) */}
          <line
            x1={radius}
            y1={radius}
            x2={needleTipX}
            y2={needleTipY}
            stroke="url(#needleGradient)"
            strokeWidth="3"
            pointerEvents="none"
          />

          {/* Center Origin Crosshair (The Angle Vertex) */}
          <circle
            cx={radius}
            cy={radius}
            r="16"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="2.5"
            className="cursor-move pointer-events-auto shadow-md"
            onPointerDown={handleCenterPointerDown}
          />
          <circle
            cx={radius}
            cy={radius}
            r="4"
            fill="#0f172a"
            pointerEvents="none"
          />

          {/* Draggable Measuring Needle Thumb on Perimeter */}
          <g
            transform={`translate(${needleTipX}, ${needleTipY})`}
            className="cursor-pointer pointer-events-auto"
            onPointerDown={handleNeedlePointerDown}
          >
            <circle
              cx="0"
              cy="0"
              r="14"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="2.5"
              className="hover:scale-115 transition-transform"
            />
            <circle cx="0" cy="0" r="5" fill="#ffffff" />
          </g>

          {/* Baseline Rotate Handle at Right Edge */}
          <g
            transform={`translate(${radius * 2 - 12}, ${radius})`}
            className="cursor-pointer pointer-events-auto"
            onPointerDown={handleBaseRotatePointerDown}
            title="مقبض تدوير خط الأساس: اسحب لمحاذاة المنقلة مع أي خط مائل أو ضلع مثلث"
          >
            <circle
              cx="0"
              cy="0"
              r="11"
              fill="#6366f1"
              stroke="#ffffff"
              strokeWidth="2"
              className="hover:scale-115 transition-transform"
            />
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {/* Floating Protractor Control Dashboard */}
      <div 
        className="absolute top-16 right-6 pointer-events-auto z-40 bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 text-white rounded-3xl p-3.5 shadow-2xl space-y-3 max-w-sm animate-in fade-in zoom-in-95"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-xs">
              <Compass size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <span>المنقلة الهندسية الافتراضية</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  {measuredAngle}°
                </span>
              </h4>
              <p className="text-[10px] text-slate-400">قياس الزوايا ورسم أضلاع ومثلثات فائقة الدقة</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="إغلاق المنقلة"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Measurement Big Display */}
        <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">الزاوية المقاسة:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                {measuredAngle.toFixed(1)}°
              </span>
              <span className="text-xs text-slate-500 font-mono">درجة</span>
            </div>
          </div>

          {/* Classification & Math Details */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900 text-[11px]">
            <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">نوع الزاوية:</div>
              <div className={`font-black ${angleClassification.color}`}>
                {angleClassification.label}
              </div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">الزاوية المكملة:</div>
              <div className="font-mono font-bold text-slate-200">
                {supplementaryAngle.toFixed(1)}°
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
            <span>الراديان: <span className="font-mono text-slate-200">{radians} rad</span></span>
            <span>بدلالة π: <span className="font-mono text-slate-200">{piFraction} π</span></span>
          </div>
        </div>

        {/* Primary Action: Draw Measured Angle Onto Canvas */}
        <button
          type="button"
          onClick={handleDrawAngleToCanvas}
          className={`w-full py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
            isDrawingFeedback 
              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 scale-102' 
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
          }`}
          title="رسم الزاوية مع ضلعيها وقوس الزاوية وقيمة الدرجة مباشرة على اللوح"
        >
          {isDrawingFeedback ? (
            <>
              <Check size={16} />
              <span>تم رسم الزاوية والقوس والدرجة بنجاح ✨</span>
            </>
          ) : (
            <>
              <Pencil size={15} />
              <span>ارسم الزاوية المقاسة على اللوح</span>
            </>
          )}
        </button>

        {/* Quick Angle Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>زوايا شهيرة جاهزة:</span>
            <span className="text-[10px] text-slate-400">انقر للضبط الفوري</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: '30°', angle: 30 },
              { label: '45°', angle: 45 },
              { label: '60°', angle: 60 },
              { label: '90°', angle: 90 },
              { label: '120°', angle: 120 },
              { label: '135°', angle: 135 },
              { label: '150°', angle: 150 },
              { label: '180°', angle: 180 }
            ].map(item => (
              <button
                key={item.angle}
                type="button"
                onClick={() => setMeasuredAngle(item.angle)}
                className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  Math.round(measuredAngle) === item.angle 
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode & Calibration Tools */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
          <div className="flex items-center gap-1.5">
            {/* Mode Switch (180 vs 360) */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('180')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                  mode === '180' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
                }`}
              >
                نصف دائرة 180°
              </button>
              <button
                type="button"
                onClick={() => setMode('360')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                  mode === '360' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
                }`}
              >
                دائرة 360°
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSnapAngle(!isSnapAngle)}
              className={`px-2 py-1 rounded-xl border flex items-center gap-1 cursor-pointer transition-all ${
                isSnapAngle 
                  ? 'bg-teal-600 text-white border-teal-400 font-bold' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="محاذاة الزوايا لمضاعفات 15°"
            >
              <Sparkles size={11} />
              <span className="text-[10px]">محاذاة 15°</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setCenter({ x: 380, y: 340 });
              setBaseRotation(0);
            }}
            className="text-slate-400 hover:text-amber-300 transition-colors cursor-pointer text-[10px]"
            title="إعادة المنقلة إلى الوضع الافتراضي"
          >
            توسيط ↺
          </button>
        </div>
      </div>
    </div>
  );
};
