import React from 'react';
import { StemItem } from '../../types/stemWhiteboard';

interface StemObjectRendererProps {
  item: StemItem;
  zoom?: number;
  isSelected?: boolean;
}

export const StemObjectRenderer: React.FC<StemObjectRendererProps> = ({
  item,
  zoom = 1,
  isSelected = false
}) => {
  const { type, width, height, color, fillColor, params } = item;
  const strokeColor = color || '#3b82f6';
  const bgFill = fillColor || 'transparent';

  const renderContent = () => {
    switch (type) {
      // ==========================================
      // 1. المجسمات ثلاثية الأبعاد (3D Shapes)
      // ==========================================
      case 'cube-3d': {
        const d = Math.min(width, height) * 0.25;
        const w = width - d;
        const h = height - d;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Back Faces (Dashed) */}
            <path d={`M 0 ${d} L ${d} 0 L ${width} 0`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            <path d={`M ${d} 0 L ${d} ${h}`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            <path d={`M ${d} ${h} L 0 ${height}`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            <path d={`M ${d} ${h} L ${width} ${h}`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />

            {/* Top Face */}
            <polygon points={`0,${d} ${d},0 ${width},0 ${w},${d}`} fill={bgFill || '#dbeafe'} fillOpacity="0.5" stroke={strokeColor} strokeWidth="2" />
            {/* Right Face */}
            <polygon points={`${w},${d} ${width},0 ${width},${h} ${w},${height}`} fill={bgFill || '#bfdbfe'} fillOpacity="0.7" stroke={strokeColor} strokeWidth="2" />
            {/* Front Face */}
            <polygon points={`0,${d} ${w},${d} ${w},${height} 0,${height}`} fill={bgFill || '#93c5fd'} fillOpacity="0.8" stroke={strokeColor} strokeWidth="2" />
            
            {/* Dimension text */}
            <text x={w / 2} y={height - 6} fill={strokeColor} fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              {params.dimensionA ? `a = ${params.dimensionA} ${params.unit || 'cm'}` : 'مكعب 3D'}
            </text>
          </svg>
        );
      }

      case 'cuboid-3d': {
        const dx = width * 0.22;
        const dy = height * 0.28;
        const fw = width - dx;
        const fh = height - dy;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Back Hidden lines */}
            <path d={`M 0 ${dy} L ${dx} 0 L ${width} 0`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            <path d={`M ${dx} 0 L ${dx} ${fh}`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            <path d={`M ${dx} ${fh} L 0 ${height}`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            <path d={`M ${dx} ${fh} L ${width} ${fh}`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />

            {/* Shaded Faces */}
            <polygon points={`0,${dy} ${dx},0 ${width},0 ${fw},${dy}`} fill={bgFill || '#e0f2fe'} fillOpacity="0.5" stroke={strokeColor} strokeWidth="2" />
            <polygon points={`${fw},${dy} ${width},0 ${width},${fh} ${fw},${height}`} fill={bgFill || '#bae6fd'} fillOpacity="0.7" stroke={strokeColor} strokeWidth="2" />
            <polygon points={`0,${dy} ${fw},${dy} ${fw},${height} 0,${height}`} fill={bgFill || '#7dd3fc'} fillOpacity="0.8" stroke={strokeColor} strokeWidth="2" />
            
            <text x={fw / 2} y={height - 8} fill={strokeColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              {params.dimensionA ? `L=${params.dimensionA}, W=${params.dimensionB || 4}, H=${params.dimensionC || 3}` : 'متوازي مستطيلات'}
            </text>
          </svg>
        );
      }

      case 'cylinder-3d': {
        const ry = height * 0.12;
        const rx = width / 2 - 2;
        const cx = width / 2;
        const topY = ry + 2;
        const botY = height - ry - 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Bottom hidden ellipse arc */}
            <path d={`M 2 ${botY} A ${rx} ${ry} 0 0 1 ${width - 2} ${botY}`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            {/* Cylinder Body */}
            <path d={`M 2 ${topY} L 2 ${botY} A ${rx} ${ry} 0 0 0 ${width - 2} ${botY} L ${width - 2} ${topY} Z`} fill={bgFill || '#a7f3d0'} fillOpacity="0.6" stroke={strokeColor} strokeWidth="2" />
            {/* Top Ellipse Face */}
            <ellipse cx={cx} cy={topY} rx={rx} ry={ry} fill={bgFill || '#6ee7b7'} fillOpacity="0.9" stroke={strokeColor} strokeWidth="2" />
            
            <text x={cx} y={height / 2 + 4} fill={strokeColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              {params.dimensionA ? `r=${params.dimensionA}, h=${params.dimensionB || 7}` : 'أسطوانة'}
            </text>
          </svg>
        );
      }

      case 'cone-3d': {
        const ry = height * 0.12;
        const rx = width / 2 - 2;
        const cx = width / 2;
        const botY = height - ry - 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Back Arc (Dashed) */}
            <path d={`M 2 ${botY} A ${rx} ${ry} 0 0 1 ${width - 2} ${botY}`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            {/* Cone Body */}
            <path d={`M ${cx} 4 L 2 ${botY} A ${rx} ${ry} 0 0 0 ${width - 2} ${botY} Z`} fill={bgFill || '#fef3c7'} fillOpacity="0.7" stroke={strokeColor} strokeWidth="2" />
            {/* Apex Dot */}
            <circle cx={cx} cy="4" r="2.5" fill={strokeColor} />
            <text x={cx} y={botY - 14} fill={strokeColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              {params.dimensionA ? `r=${params.dimensionA}, h=${params.dimensionB || 9}` : 'مخروط'}
            </text>
          </svg>
        );
      }

      case 'sphere-3d': {
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) / 2 - 4;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <radialGradient id={`sphereGrad_${item.id}`} cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="40%" stopColor={bgFill || '#818cf8'} stopOpacity="0.6" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.9" />
              </radialGradient>
            </defs>
            {/* 3D Shaded Sphere */}
            <circle cx={cx} cy={cy} r={r} fill={`url(#sphereGrad_${item.id})`} stroke={strokeColor} strokeWidth="2" />
            {/* Equatorial Ellipse (Dashed back, solid front) */}
            <path d={`M ${cx - r} ${cy} A ${r} ${r * 0.3} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
            <path d={`M ${cx - r} ${cy} A ${r} ${r * 0.3} 0 0 0 ${cx + r} ${cy}`} fill="none" stroke={strokeColor} strokeWidth="1.5" />
            
            <text x={cx} y={cy + 4} fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              {params.dimensionA ? `r = ${params.dimensionA} cm` : 'كرة'}
            </text>
          </svg>
        );
      }

      case 'pyramid-3d': {
        const cx = width / 2;
        const topY = 6;
        const botY = height - 12;
        const leftX = 10;
        const rightX = width - 10;
        const backX = width * 0.7;
        const backY = height * 0.65;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Hidden edges */}
            <line x1={backX} y1={backY} x2={leftX + 25} y2={height - 25} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            <line x1={backX} y1={backY} x2={rightX} y2={botY} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
            <line x1={backX} y1={backY} x2={cx} y2={topY} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />

            {/* Front faces */}
            <polygon points={`${cx},${topY} ${leftX},${botY} ${cx + 10},${height - 4}`} fill={bgFill || '#ede9fe'} fillOpacity="0.7" stroke={strokeColor} strokeWidth="2" />
            <polygon points={`${cx},${topY} ${cx + 10},${height - 4} ${rightX},${botY}`} fill={bgFill || '#c4b5fd'} fillOpacity="0.85" stroke={strokeColor} strokeWidth="2" />
            
            <text x={cx} y={height - 10} fill={strokeColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              هرم رباعي
            </text>
          </svg>
        );
      }

      case 'torus-3d': {
        const cx = width / 2;
        const cy = height / 2;
        const R = width * 0.38;
        const r = height * 0.18;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Outer Ring */}
            <ellipse cx={cx} cy={cy} rx={R + r} ry={R * 0.6 + r} fill={bgFill || '#fef08a'} fillOpacity="0.6" stroke={strokeColor} strokeWidth="2.5" />
            {/* Inner Hole */}
            <ellipse cx={cx} cy={cy} rx={R - r} ry={(R - r) * 0.6} fill="#0f172a" fillOpacity="0.2" stroke={strokeColor} strokeWidth="2" />
            <text x={cx} y={cy + 4} fill={strokeColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              طارة حلقية (Torus)
            </text>
          </svg>
        );
      }

      // ==========================================
      // 2. أدوات الفيزياء (Physics & Mechanics)
      // ==========================================
      case 'physics-mass': {
        const massVal = params.mass ?? 5;
        const massUnit = params.massUnit || 'kg';
        return (
          <div className="w-full h-full relative flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 via-blue-600/10 to-indigo-600/20 border-2 border-blue-400/80 shadow-lg backdrop-blur-sm group select-none">
            {/* Top anchor ring */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-blue-400 bg-slate-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            </div>

            {/* Mass block title & weight */}
            <div className="text-center font-bold">
              <span className="text-xs text-blue-300 block">كتلة فيزيائية</span>
              <span className="text-base text-white tracking-wide font-mono font-black drop-shadow">
                m = {massVal} {massUnit}
              </span>
            </div>

            {/* Bottom ground line & friction indicator */}
            <div className="absolute -bottom-1 left-2 right-2 h-0.5 bg-blue-400/50 flex justify-around">
              <div className="w-1 h-1.5 bg-blue-400/60 rotate-45 -translate-y-0.5" />
              <div className="w-1 h-1.5 bg-blue-400/60 rotate-45 -translate-y-0.5" />
              <div className="w-1 h-1.5 bg-blue-400/60 rotate-45 -translate-y-0.5" />
            </div>
          </div>
        );
      }

      case 'physics-cart': {
        const vel = params.velocity ?? 15;
        const velUnit = params.velocityUnit || 'm/s';
        return (
          <div className="w-full h-full relative flex flex-col justify-between p-1.5 rounded-xl bg-emerald-950/40 border-2 border-emerald-400/80 shadow-md backdrop-blur-sm select-none">
            {/* Speed vector arrow on top right */}
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-300 px-1">
              <span>v = {vel} {velUnit}</span>
              <svg className="w-5 h-3 text-emerald-400 inline" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 6h18m0 0l-5-4m5 4l-5 4" />
              </svg>
            </div>

            <div className="text-center text-xs font-bold text-emerald-200">
              عربة ديناميكية (m = {params.mass ?? 2} kg)
            </div>

            {/* Wheels */}
            <div className="flex justify-between px-3 -mb-3.5">
              <div className="w-5 h-5 rounded-full bg-slate-800 border-2 border-emerald-400 flex items-center justify-center shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="w-5 h-5 rounded-full bg-slate-800 border-2 border-emerald-400 flex items-center justify-center shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
            </div>
          </div>
        );
      }

      case 'physics-vector': {
        const fLabel = params.forceLabel || `F = ${params.force ?? 20} N`;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <marker id={`arrow_${item.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill={strokeColor} />
              </marker>
            </defs>
            <line x1="10" y1={height / 2} x2={width - 12} y2={height / 2} stroke={strokeColor} strokeWidth="3.5" markerEnd={`url(#arrow_${item.id})`} />
            <text x={width / 2} y={height / 2 - 8} fill={strokeColor} fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              {fLabel}
            </text>
          </svg>
        );
      }

      case 'physics-dimension': {
        const dVal = params.distance ?? 10;
        const dUnit = params.distanceUnit || 'm';
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* End Caps */}
            <line x1="6" y1="4" x2="6" y2={height - 4} stroke={strokeColor} strokeWidth="2.5" />
            <line x1={width - 6} y1="4" x2={width - 6} y2={height - 4} stroke={strokeColor} strokeWidth="2.5" />
            {/* Dimension Center Line */}
            <line x1="6" y1={height / 2} x2={width - 6} y2={height / 2} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="5 3" />
            {/* Center Pill with measurement */}
            <rect x={width / 2 - 35} y={height / 2 - 12} width="70" height="24" rx="6" fill="#0f172a" stroke={strokeColor} strokeWidth="1.5" />
            <text x={width / 2} y={height / 2 + 4} fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              d = {dVal} {dUnit}
            </text>
          </svg>
        );
      }

      // ==========================================
      // 3. الدوائر الكهربائية (Electric Circuits)
      // ==========================================
      case 'circuit-battery': {
        const vVal = params.voltage ?? 12;
        const midY = height / 2;
        const midX = width / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Connecting leads */}
            <line x1="0" y1={midY} x2={midX - 12} y2={midY} stroke={strokeColor} strokeWidth="2.5" />
            <line x1={midX + 12} y1={midY} x2={width} y2={midY} stroke={strokeColor} strokeWidth="2.5" />
            
            {/* Positive Plate (Long thin) */}
            <line x1={midX - 8} y1="8" x2={midX - 8} y2={height - 8} stroke={strokeColor} strokeWidth="3" />
            <text x={midX - 18} y="16" fill={strokeColor} fontSize="14" fontWeight="bold">+</text>

            {/* Negative Plate (Short thick) */}
            <line x1={midX + 8} y1={height * 0.25} x2={midX + 8} y2={height * 0.75} stroke={strokeColor} strokeWidth="5" />
            <text x={midX + 16} y="16" fill={strokeColor} fontSize="14" fontWeight="bold">-</text>

            {/* Voltage text */}
            <text x={midX} y={height - 4} fill={strokeColor} fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              E = {vVal} V
            </text>
          </svg>
        );
      }

      case 'circuit-resistor': {
        const rVal = params.resistance ?? 5;
        const midY = height / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Leads */}
            <line x1="0" y1={midY} x2="25" y2={midY} stroke={strokeColor} strokeWidth="2.5" />
            <line x1={width - 25} y1={midY} x2={width} y2={midY} stroke={strokeColor} strokeWidth="2.5" />
            
            {/* Resistor Box */}
            <rect x="25" y={midY - 14} width={width - 50} height="28" rx="4" fill={bgFill || '#fef3c7'} stroke={strokeColor} strokeWidth="2.5" />
            
            <text x={width / 2} y={midY + 4} fill={strokeColor} fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              R = {rVal} Ω
            </text>
          </svg>
        );
      }

      case 'circuit-switch': {
        const isClosed = params.isSwitchClosed ?? false;
        const midY = height / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Terminals */}
            <line x1="0" y1={midY} x2="30" y2={midY} stroke={strokeColor} strokeWidth="2.5" />
            <circle cx="30" cy={midY} r="4" fill="#0f172a" stroke={strokeColor} strokeWidth="2.5" />

            <circle cx={width - 30} cy={midY} r="4" fill="#0f172a" stroke={strokeColor} strokeWidth="2.5" />
            <line x1={width - 30} y1={midY} x2={width} y2={midY} stroke={strokeColor} strokeWidth="2.5" />

            {/* Lever */}
            {isClosed ? (
              <line x1="30" y1={midY} x2={width - 30} y2={midY} stroke={strokeColor} strokeWidth="3" />
            ) : (
              <line x1="30" y1={midY} x2={width - 35} y2={midY - 20} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
            )}

            <text x={width / 2} y={height - 4} fill={strokeColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              {isClosed ? 'مفتاح مغلق (ON)' : 'مفتاح مفتوح (K)'}
            </text>
          </svg>
        );
      }

      case 'circuit-lamp': {
        const isLit = params.isLampLit ?? true;
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) * 0.32;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Leads */}
            <line x1="0" y1={cy} x2={cx - r} y2={cy} stroke={strokeColor} strokeWidth="2.5" />
            <line x1={cx + r} y1={cy} x2={width} y2={cy} stroke={strokeColor} strokeWidth="2.5" />

            {/* Glow Aura if lit */}
            {isLit && (
              <circle cx={cx} cy={cy} r={r + 8} fill="#fef08a" fillOpacity="0.4" className="animate-pulse" />
            )}

            {/* Lamp Bulb Circle */}
            <circle cx={cx} cy={cy} r={r} fill={isLit ? '#fef08a' : '#1e293b'} stroke={strokeColor} strokeWidth="2.5" />
            
            {/* Filament Cross (X) */}
            <line x1={cx - r * 0.6} y1={cy - r * 0.6} x2={cx + r * 0.6} y2={cy + r * 0.6} stroke={strokeColor} strokeWidth="2.5" />
            <line x1={cx - r * 0.6} y1={cy + r * 0.6} x2={cx + r * 0.6} y2={cy - r * 0.6} stroke={strokeColor} strokeWidth="2.5" />

            <text x={cx} y={height - 4} fill={strokeColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              L = {params.power ?? 60} W
            </text>
          </svg>
        );
      }

      case 'circuit-ammeter': {
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) * 0.35;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            <line x1="0" y1={cy} x2={cx - r} y2={cy} stroke={strokeColor} strokeWidth="2.5" />
            <line x1={cx + r} y1={cy} x2={width} y2={cy} stroke={strokeColor} strokeWidth="2.5" />
            <circle cx={cx} cy={cy} r={r} fill={bgFill || '#e0f2fe'} stroke={strokeColor} strokeWidth="2.5" />
            <text x={cx} y={cy + 6} fill={strokeColor} fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">A</text>
            <text x={cx} y={height - 2} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              I = {params.current ?? 2.4} A
            </text>
          </svg>
        );
      }

      case 'circuit-voltmeter': {
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) * 0.35;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            <line x1="0" y1={cy} x2={cx - r} y2={cy} stroke={strokeColor} strokeWidth="2.5" />
            <line x1={cx + r} y1={cy} x2={width} y2={cy} stroke={strokeColor} strokeWidth="2.5" />
            <circle cx={cx} cy={cy} r={r} fill={bgFill || '#f3e8ff'} stroke={strokeColor} strokeWidth="2.5" />
            <text x={cx} y={cy + 6} fill={strokeColor} fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">V</text>
            <text x={cx} y={height - 2} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              U = {params.voltage ?? 12} V
            </text>
          </svg>
        );
      }

      // ==========================================
      // 4. البصريات والضوء (Optics & Light)
      // ==========================================
      case 'optics-concave-lens': {
        const cx = width / 2;
        const cy = height / 2;
        const curve = 18;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Optical Axis */}
            <line x1="0" y1={cy} x2={width} y2={cy} stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
            {/* Concave Lens Shape */}
            <path
              d={`M ${cx - 16} 10 Q ${cx - 16 + curve} ${cy} ${cx - 16} ${height - 10} L ${cx + 16} ${height - 10} Q ${cx + 16 - curve} ${cy} ${cx + 16} 10 Z`}
              fill={bgFill || '#eff6ff'}
              fillOpacity="0.75"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            {/* Focal points F1, F2 */}
            <circle cx={cx - 35} cy={cy} r="2.5" fill={strokeColor} />
            <text x={cx - 35} y={cy + 14} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle">F₁</text>
            <circle cx={cx + 35} cy={cy} r="2.5" fill={strokeColor} />
            <text x={cx + 35} y={cy + 14} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle">F₂</text>

            <text x={cx} y={height - 4} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              عدسة مقعرة (مفرقة)
            </text>
          </svg>
        );
      }

      case 'optics-convex-lens': {
        const cx = width / 2;
        const cy = height / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Optical Axis */}
            <line x1="0" y1={cy} x2={width} y2={cy} stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
            {/* Convex Lens Shape */}
            <path
              d={`M ${cx} 10 Q ${cx + 24} ${cy} ${cx} ${height - 10} Q ${cx - 24} ${cy} ${cx} 10 Z`}
              fill={bgFill || '#e0f2fe'}
              fillOpacity="0.75"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            {/* Focal points */}
            <circle cx={cx - 35} cy={cy} r="2.5" fill={strokeColor} />
            <text x={cx - 35} y={cy + 14} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle">F₁</text>
            <circle cx={cx + 35} cy={cy} r="2.5" fill={strokeColor} />
            <text x={cx + 35} y={cy + 14} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle">F₂</text>

            <text x={cx} y={height - 4} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              عدسة محدبة (مجمعة)
            </text>
          </svg>
        );
      }

      case 'optics-plane-mirror': {
        const x = width / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Mirror Surface line */}
            <line x1={x} y1="10" x2={x} y2={height - 10} stroke={strokeColor} strokeWidth="3.5" />
            {/* Hatch lines for the back */}
            {Array.from({ length: 10 }).map((_, i) => {
              const y = 20 + i * ((height - 40) / 9);
              return (
                <line key={i} x1={x} y1={y} x2={x + 10} y2={y + 8} stroke={strokeColor} strokeWidth="1.5" opacity="0.7" />
              );
            })}
            <text x={x - 12} y={height / 2} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle" transform={`rotate(-90 ${x - 12} ${height / 2})`} fontFamily="Cairo">
              مرآة مستوية
            </text>
          </svg>
        );
      }

      // ==========================================
      // 5. أدوات الكيمياء (Chemistry Tools)
      // ==========================================
      case 'chem-beaker': {
        const liqLevel = params.liquidVolume ?? 60;
        const liqColor = params.liquidColor || '#38bdf8';
        const fluidName = params.fluidName || 'CuSO₄';
        const botY = height - 15;
        const topY = 20;
        const liqY = botY - ((botY - topY) * liqLevel) / 100;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Beaker Liquid */}
            <path
              d={`M 14 ${liqY} L 14 ${botY - 6} Q 14 ${botY} 20 ${botY} L ${width - 20} ${botY} Q ${width - 14} ${botY} ${width - 14} ${botY - 6} L ${width - 14} ${liqY} Z`}
              fill={liqColor}
              fillOpacity="0.65"
            />
            {/* Beaker Glass Silhouette */}
            <path
              d={`M 6 15 L 14 20 L 14 ${botY - 6} Q 14 ${botY} 20 ${botY} L ${width - 20} ${botY} Q ${width - 14} ${botY} ${width - 14} ${botY - 6} L ${width - 14} 20 L ${width - 6} 15`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            {/* Graduation ticks */}
            <line x1="16" y1={botY - 20} x2="26" y2={botY - 20} stroke={strokeColor} strokeWidth="1.5" />
            <line x1="16" y1={botY - 45} x2="30" y2={botY - 45} stroke={strokeColor} strokeWidth="1.5" />
            <line x1="16" y1={botY - 70} x2="26" y2={botY - 70} stroke={strokeColor} strokeWidth="1.5" />

            <text x={width / 2} y={botY - 10} fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              {fluidName}
            </text>
          </svg>
        );
      }

      case 'chem-flask': {
        const liqColor = params.liquidColor || '#c084fc';
        const fluidName = params.fluidName || 'KMnO₄';
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Conical Flask Path */}
            <path
              d={`M ${width / 2 - 12} 10 L ${width / 2 + 12} 10 L ${width / 2 + 12} 40 L ${width - 14} ${height - 20} Q ${width - 10} ${height - 10} ${width - 20} ${height - 10} L 20 ${height - 10} Q 10 ${height - 10} 14 ${height - 20} L ${width / 2 - 12} 40 Z`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            {/* Flask Liquid */}
            <path
              d={`M 26 ${height - 40} L ${width - 26} ${height - 40} L ${width - 18} ${height - 16} L 18 ${height - 16} Z`}
              fill={liqColor}
              fillOpacity="0.75"
            />
            <text x={width / 2} y={height - 18} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              {fluidName}
            </text>
          </svg>
        );
      }

      case 'chem-test-tube': {
        const liqColor = params.liquidColor || '#34d399';
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Test Tube Rim & Body */}
            <path
              d={`M 14 10 L ${width - 14} 10 M 18 10 L 18 ${height - 25} A ${width / 2 - 18} ${width / 2 - 18} 0 0 0 ${width - 18} ${height - 25} L ${width - 18} 10`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            {/* Liquid */}
            <path
              d={`M 19 ${height * 0.45} L ${width - 19} ${height * 0.45} L ${width - 19} ${height - 25} A ${width / 2 - 19} ${width / 2 - 19} 0 0 1 19 ${height - 25} Z`}
              fill={liqColor}
              fillOpacity="0.7"
            />
          </svg>
        );
      }

      case 'chem-periodic-card': {
        const num = params.atomicNumber ?? 11;
        const sym = params.elementSymbol || 'Na';
        const nameAr = params.elementNameAr || 'صوديوم';
        const mass = params.atomicMass || 22.99;
        return (
          <div className="w-full h-full p-2.5 rounded-2xl bg-gradient-to-br from-rose-950/60 via-slate-900 to-rose-900/40 border-2 border-rose-500/80 shadow-xl flex flex-col justify-between select-none">
            <div className="flex justify-between items-start text-xs font-mono font-bold text-rose-300">
              <span>{num}</span>
              <span className="text-[10px] text-slate-400">{mass}</span>
            </div>
            <div className="text-center font-black text-3xl text-rose-100 tracking-wider">
              {sym}
            </div>
            <div className="text-center text-[11px] font-bold text-rose-200">
              {nameAr}
            </div>
          </div>
        );
      }

      case 'chem-benzene-ring': {
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) * 0.4;
        const pts: string[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 30) * (Math.PI / 180);
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Hexagon */}
            <polygon points={pts.join(' ')} fill="none" stroke={strokeColor} strokeWidth="2.5" />
            {/* Inner aromatic circle */}
            <circle cx={cx} cy={cy} r={r * 0.6} fill="none" stroke={strokeColor} strokeWidth="2" strokeDasharray="6 3" />
            <text x={cx} y={height - 4} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              C₆H₆ (بنزين)
            </text>
          </svg>
        );
      }

      // ==========================================
      // 6. الرياضيات والإحداثيات (Mathematics)
      // ==========================================
      case 'math-coordinate-plane': {
        const cx = width / 2;
        const cy = height / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Grid lines */}
            {[-3, -2, -1, 1, 2, 3].map(i => {
              const gx = cx + i * (width / 8);
              const gy = cy + i * (height / 8);
              return (
                <g key={i} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" opacity="0.6">
                  <line x1={gx} y1="10" x2={gx} y2={height - 10} />
                  <line x1="10" y1={gy} x2={width - 10} y2={gy} />
                </g>
              );
            })}
            {/* X and Y Axes */}
            <line x1="8" y1={cy} x2={width - 8} y2={cy} stroke={strokeColor} strokeWidth="2.5" />
            <line x1={cx} y1="8" x2={cx} y2={height - 8} stroke={strokeColor} strokeWidth="2.5" />
            
            {/* Arrows */}
            <polygon points={`${width - 8},${cy} ${width - 16},${cy - 4} ${width - 16},${cy + 4}`} fill={strokeColor} />
            <polygon points={`${cx},8 ${cx - 4},16 ${cx + 4},16`} fill={strokeColor} />

            <text x={width - 12} y={cy - 6} fill={strokeColor} fontSize="12" fontWeight="bold">X</text>
            <text x={cx + 8} y="14" fill={strokeColor} fontSize="12" fontWeight="bold">Y</text>
            <text x={cx - 10} y={cy + 14} fill="#64748b" fontSize="10" fontWeight="bold">O</text>
          </svg>
        );
      }

      case 'math-function-graph': {
        const expr = params.functionExpression || 'f(x) = x² - 4';
        const cx = width / 2;
        const cy = height * 0.55;
        // Generate parabola / curve points
        const curvePts: string[] = [];
        for (let px = 20; px <= width - 20; px += 4) {
          const xVal = (px - cx) / 25;
          const yVal = Math.pow(xVal, 2) - 3.5;
          const py = cy - yVal * 16;
          if (py >= 15 && py <= height - 15) {
            curvePts.push(`${px},${py}`);
          }
        }
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Background grid */}
            <rect x="10" y="10" width={width - 20} height={height - 20} rx="12" fill="#0f172a" fillOpacity="0.8" stroke="#334155" strokeWidth="1" />
            {/* Axes */}
            <line x1="20" y1={cy} x2={width - 20} y2={cy} stroke="#64748b" strokeWidth="1.5" />
            <line x1={cx} y1="20" x2={cx} y2={height - 20} stroke="#64748b" strokeWidth="1.5" />
            {/* Curve */}
            {curvePts.length > 1 && (
              <polyline points={curvePts.join(' ')} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
            )}
            {/* Critical Vertex Point */}
            <circle cx={cx} cy={cy + 3.5 * 16} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            <text x={cx} y="28" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              {expr}
            </text>
          </svg>
        );
      }

      case 'math-trig-unit-circle': {
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) * 0.38;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Axes */}
            <line x1="15" y1={cy} x2={width - 15} y2={cy} stroke="#475569" strokeWidth="1.5" />
            <line x1={cx} y1="15" x2={cx} y2={height - 15} stroke="#475569" strokeWidth="1.5" />
            {/* Circle */}
            <circle cx={cx} cy={cy} r={r} fill={bgFill || '#0f172a'} fillOpacity="0.8" stroke={strokeColor} strokeWidth="2.5" />
            {/* 30, 45, 60 degree radius rays */}
            {[30, 45, 60, 120, 135, 150].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x2 = cx + r * Math.cos(rad);
              const y2 = cy - r * Math.sin(rad);
              return (
                <g key={deg}>
                  <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
                  <circle cx={x2} cy={y2} r="3" fill="#38bdf8" />
                </g>
              );
            })}
            {/* Standard Angle Labels */}
            <text x={cx + r + 6} y={cy + 4} fill={strokeColor} fontSize="10" fontWeight="bold">0 / 2π</text>
            <text x={cx - 4} y={cy - r - 6} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle">π/2 (90°)</text>
            <text x={cx - r - 6} y={cy + 4} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="end">π (180°)</text>
            <text x={cx - 4} y={cy + r + 14} fill={strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle">3π/2</text>
          </svg>
        );
      }

      // ==========================================
      // 7. الأمواج والاهتزازات (Waves & Acoustics)
      // ==========================================
      case 'physics-wave-transverse': {
        const amp = params.amplitude ?? 35;
        const wl = params.wavelength ?? 80;
        const cy = height / 2;
        const pts: string[] = [];
        for (let x = 10; x <= width - 10; x += 3) {
          const y = cy - amp * Math.sin(((x - 10) / wl) * 2 * Math.PI);
          pts.push(`${x},${y}`);
        }
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Center Equilibrium Line */}
            <line x1="8" y1={cy} x2={width - 8} y2={cy} stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
            {/* Wave Curve */}
            <polyline points={pts.join(' ')} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
            {/* Amplitude Indicator */}
            <line x1={30} y1={cy} x2={30} y2={cy - amp} stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x={34} y={cy - amp / 2 + 3} fill="#f59e0b" fontSize="10" fontWeight="bold">A (السعة)</text>
            {/* Wavelength Indicator λ */}
            <line x1={10 + wl * 0.25} y1={cy - amp - 8} x2={10 + wl * 1.25} y2={cy - amp - 8} stroke="#10b981" strokeWidth="1.5" />
            <text x={10 + wl * 0.75} y={cy - amp - 12} fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">λ = {wl}m</text>
            {/* Labels */}
            <text x={width - 15} y={20} fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="end" fontFamily="Cairo">
              قمة / قاع (موجة مستعرضة)
            </text>
          </svg>
        );
      }

      case 'physics-wave-longitudinal': {
        const cy = height / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            <rect x="6" y="10" width={width - 12} height={height - 20} rx="12" fill="#0f172a" fillOpacity="0.7" stroke="#334155" strokeWidth="1" />
            {/* Draw particle lines showing compression & rarefaction */}
            {Array.from({ length: 36 }).map((_, i) => {
              const basePos = i / 35;
              // modulated density: sin wave shift
              const shift = Math.sin(basePos * 4 * Math.PI) * 12;
              const x = 16 + basePos * (width - 32) + shift;
              return (
                <line key={i} x1={x} y1={cy - 28} x2={x} y2={cy + 28} stroke={strokeColor} strokeWidth="2.5" opacity="0.85" strokeLinecap="round" />
              );
            })}
            <text x={width * 0.25} y={height - 8} fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              تضاغط (Compression)
            </text>
            <text x={width * 0.75} y={height - 8} fill="#a78bfa" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              تخلخل (Rarefaction)
            </text>
          </svg>
        );
      }

      // ==========================================
      // 8. الذرات والجزيئات والكيمياء المتقدمة (Atoms, Molecules, pH)
      // ==========================================
      case 'chem-atom-bohr': {
        const cx = width / 2;
        const cy = height / 2;
        const sym = params.elementSymbol || 'C';
        const protons = params.protons ?? 6;
        const neutrons = params.neutrons ?? 6;
        const shells = params.electronShells || [2, 4];
        const maxR = Math.min(width, height) * 0.44;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Nucleus */}
            <circle cx={cx} cy={cy} r="20" fill="#e11d48" stroke="#ffffff" strokeWidth="2" />
            <text x={cx} y={cy - 2} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
              {protons}p⁺ {neutrons}n⁰
            </text>
            <text x={cx} y={cy + 10} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
              ({sym})
            </text>

            {/* Electron Shells */}
            {shells.map((eCount, idx) => {
              const r = 36 + (idx + 1) * ((maxR - 36) / shells.length);
              return (
                <g key={idx}>
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.75" />
                  {/* Electrons on orbit */}
                  {Array.from({ length: eCount }).map((_, eIdx) => {
                    const angle = (eIdx / eCount) * 2 * Math.PI - Math.PI / 2;
                    const ex = cx + r * Math.cos(angle);
                    const ey = cy + r * Math.sin(angle);
                    return (
                      <circle key={eIdx} cx={ex} cy={ey} r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
                    );
                  })}
                  <text x={cx + r + 3} y={cy + 3} fill="#93c5fd" fontSize="9" fontWeight="bold">
                    {idx === 0 ? 'K=2' : idx === 1 ? `L=${eCount}` : `M=${eCount}`}
                  </text>
                </g>
              );
            })}
          </svg>
        );
      }

      case 'chem-molecule': {
        const cx = width / 2;
        const cy = height / 2;
        const form = params.moleculeFormula || 'H₂O';
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Water H2O / Molecule Visualizer */}
            {/* Central Oxygen Atom */}
            <line x1={cx} y1={cy} x2={cx - 45} y2={cy + 35} stroke="#cbd5e1" strokeWidth="4" />
            <line x1={cx} y1={cy} x2={cx + 45} y2={cy + 35} stroke="#cbd5e1" strokeWidth="4" />
            
            <circle cx={cx} cy={cy} r="24" fill="#ef4444" stroke="#ffffff" strokeWidth="2.5" />
            <text x={cx} y={cy + 5} fill="#ffffff" fontSize="13" fontWeight="black" textAnchor="middle">O</text>
            
            {/* Hydrogen 1 */}
            <circle cx={cx - 45} cy={cy + 35} r="16" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            <text x={cx - 45} y={cy + 40} fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">H</text>
            
            {/* Hydrogen 2 */}
            <circle cx={cx + 45} cy={cy + 35} r="16" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            <text x={cx + 45} y={cy + 40} fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">H</text>

            <text x={cx} y={height - 8} fill="#f1f5f9" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              {form} - زاوية الرابطة 104.5°
            </text>
          </svg>
        );
      }

      case 'chem-reaction-balancer': {
        const react = params.equationReactants || '2H₂ + O₂';
        const prod = params.equationProducts || '2H₂O';
        return (
          <div className="w-full h-full p-3 rounded-2xl bg-slate-900/90 border-2 border-amber-500/60 shadow-xl flex flex-col justify-between select-none">
            <div className="flex items-center justify-between text-xs text-amber-400 font-bold border-b border-slate-800 pb-1.5">
              <span>تفاعل كيميائي متوازن</span>
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px]">ΔH &lt; 0 طارد للحرارة</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-lg font-mono font-black text-white tracking-wider my-2">
              <span className="text-cyan-300">{react}</span>
              <span className="text-amber-400 text-xl">⟶</span>
              <span className="text-emerald-300">{prod}</span>
            </div>
            <div className="text-center text-[10px] text-slate-400 font-sans">
              قانون حفظ الكتلة: عدد ذرات المتفاعلات = عدد ذرات النواتج
            </div>
          </div>
        );
      }

      case 'chem-ph-meter': {
        const val = params.phValue ?? 7.0;
        // Color interpolation based on pH
        const phColors: Record<number, string> = {
          0: '#ef4444', 1: '#f87171', 2: '#fb923c', 3: '#f59e0b',
          4: '#fbbf24', 5: '#fef08a', 6: '#a3e635', 7: '#22c55e',
          8: '#2dd4bf', 9: '#38bdf8', 10: '#60a5fa', 11: '#818cf8',
          12: '#a855f7', 13: '#c084fc', 14: '#7e22ce'
        };
        const currentColor = phColors[Math.round(val)] || '#22c55e';
        const phDesc = val < 7 ? 'حمضي (Acidic)' : val === 7 ? 'متعادل (Neutral)' : 'قاعدي (Basic)';
        return (
          <div className="w-full h-full p-2.5 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-xl flex flex-col justify-between select-none">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>مقياس الـ pH الرقمي</span>
              <span className="font-mono px-2 py-0.5 rounded text-white font-bold" style={{ backgroundColor: currentColor }}>
                pH = {val.toFixed(1)}
              </span>
            </div>
            {/* Color spectrum gradient bar */}
            <div className="h-4 w-full rounded-full bg-gradient-to-r from-red-500 via-green-500 to-purple-600 relative my-1.5 shadow-inner">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-white rounded-md border-2 border-slate-900 shadow-lg"
                style={{ left: `calc(${(val / 14) * 100}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>0 حمض قوي</span>
              <span>7 متعادل</span>
              <span>14 قاعدة قوية</span>
            </div>
            <div className="text-center font-bold text-xs" style={{ color: currentColor }}>
              {phDesc}
            </div>
          </div>
        );
      }

      case 'chem-thermometer': {
        const temp = params.temperature ?? 37;
        const minTemp = -10;
        const maxTemp = 110;
        const clamped = Math.max(minTemp, Math.min(maxTemp, temp));
        const fillHeightPercent = ((clamped - minTemp) / (maxTemp - minTemp)) * 100;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Glass Tube */}
            <rect x={width / 2 - 8} y={15} width={16} height={height - 50} rx="8" fill="#1e293b" stroke={strokeColor} strokeWidth="2" />
            {/* Bulb */}
            <circle cx={width / 2} cy={height - 24} r="16" fill="#ef4444" stroke={strokeColor} strokeWidth="2" />
            {/* Mercury Column */}
            <rect
              x={width / 2 - 4}
              y={15 + (height - 50) * (1 - fillHeightPercent / 100)}
              width={8}
              height={(height - 50) * (fillHeightPercent / 100)}
              fill="#ef4444"
              rx="4"
            />
            {/* Ticks */}
            {[0, 25, 50, 75, 100].map((t) => {
              const y = 15 + (height - 50) * (1 - (t - minTemp) / (maxTemp - minTemp));
              return (
                <g key={t}>
                  <line x1={width / 2 + 10} y1={y} x2={width / 2 + 18} y2={y} stroke="#94a3b8" strokeWidth="1.5" />
                  <text x={width / 2 + 22} y={y + 3} fill="#94a3b8" fontSize="8" fontWeight="bold">
                    {t}°
                  </text>
                </g>
              );
            })}
            <text x={width / 2} y={height - 2} fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle">
              {temp}°C
            </text>
          </svg>
        );
      }

      case 'chem-burner': {
        const isLit = params.isBoiling !== false;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Stand & Base */}
            <rect x={15} y={height - 18} width={width - 30} height={12} rx="4" fill="#475569" stroke={strokeColor} strokeWidth="1.5" />
            {/* Chimney Pipe */}
            <rect x={width / 2 - 8} y={height - 70} width={16} height={52} fill="#64748b" stroke={strokeColor} strokeWidth="1.5" />
            {/* Air collar */}
            <rect x={width / 2 - 11} y={height - 35} width={22} height={8} fill="#334155" />
            {/* Flame */}
            {isLit && (
              <g>
                <path
                  d={`M ${width / 2} ${height - 105} Q ${width / 2 + 18} ${height - 85} ${width / 2} ${height - 70} Q ${width / 2 - 18} ${height - 85} ${width / 2} ${height - 105} Z`}
                  fill="#38bdf8"
                  fillOpacity="0.8"
                />
                <path
                  d={`M ${width / 2} ${height - 95} Q ${width / 2 + 9} ${height - 82} ${width / 2} ${height - 70} Q ${width / 2 - 9} ${height - 82} ${width / 2} ${height - 95} Z`}
                  fill="#facc15"
                  fillOpacity="0.9"
                />
              </g>
            )}
            <text x={width / 2} y={height - 3} fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              موقد بنسن
            </text>
          </svg>
        );
      }

      case 'chem-burette': {
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Burette Column */}
            <rect x={width / 2 - 7} y={15} width={14} height={height - 45} fill="#f1f5f9" fillOpacity="0.2" stroke={strokeColor} strokeWidth="1.5" />
            {/* Liquid */}
            <rect x={width / 2 - 6} y={40} width={12} height={height - 75} fill="#38bdf8" fillOpacity="0.6" />
            {/* Stopcock valve */}
            <circle cx={width / 2} cy={height - 25} r="6" fill="#f59e0b" />
            <line x1={width / 2 - 12} y1={height - 25} x2={width / 2 + 12} y2={height - 25} stroke="#f59e0b" strokeWidth="2.5" />
            {/* Tip */}
            <path d={`M ${width / 2 - 4} ${height - 20} L ${width / 2} ${height - 6} L ${width / 2 + 4} ${height - 20} Z`} fill="#cbd5e1" />
            {/* Graduations */}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1={width / 2 - 6} y1={25 + i * 12} x2={width / 2} y2={25 + i * 12} stroke="#94a3b8" strokeWidth="1" />
            ))}
            <text x={width / 2} y={height - 1} fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">
              سحاحة معايرة
            </text>
          </svg>
        );
      }

      // ==========================================
      // 9. نماذج الأحياء والعلوم الطبيعية (Biology & Anatomy)
      // ==========================================
      case 'bio-cell-animal': {
        const cx = width / 2;
        const cy = height / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Cell Membrane & Cytoplasm */}
            <ellipse cx={cx} cy={cy} rx={width * 0.44} ry={height * 0.42} fill="#fdf2f8" fillOpacity="0.8" stroke="#db2777" strokeWidth="3" />
            {/* Nucleus */}
            <circle cx={cx - 15} cy={cy - 10} r={Math.min(width, height) * 0.18} fill="#a855f7" fillOpacity="0.85" stroke="#7e22ce" strokeWidth="2" />
            <circle cx={cx - 15} cy={cy - 10} r="8" fill="#4c1d95" />
            {/* Mitochondria */}
            <ellipse cx={cx + 35} cy={cy + 20} rx="16" ry="9" fill="#f97316" stroke="#ea580c" strokeWidth="1.5" transform={`rotate(-25 ${cx + 35} ${cy + 20})`} />
            <ellipse cx={cx + 25} cy={cy - 30} rx="14" ry="8" fill="#f97316" stroke="#ea580c" strokeWidth="1.5" transform={`rotate(30 ${cx + 25} ${cy - 30})`} />
            {/* Labels */}
            <text x={cx - 15} y={cy - 12} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">النواة</text>
            <text x={cx + 35} y={cy + 22} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">ميتوكوندريا</text>
            <text x={width / 2} y={height - 6} fill="#db2777" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              الخلية الحيوانية (Animal Cell)
            </text>
          </svg>
        );
      }

      case 'bio-cell-plant': {
        const cx = width / 2;
        const cy = height / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Rigid Cell Wall (Hexagonal / Rectangular) */}
            <rect x="12" y="12" width={width - 24} height={height - 24} rx="18" fill="#f0fdf4" stroke="#15803d" strokeWidth="4" />
            <rect x="18" y="18" width={width - 36} height={height - 36} rx="14" fill="none" stroke="#22c55e" strokeWidth="2" />
            {/* Large Central Vacuole */}
            <ellipse cx={cx + 20} cy={cy} rx={width * 0.22} ry={height * 0.26} fill="#bae6fd" fillOpacity="0.8" stroke="#0284c7" strokeWidth="1.5" />
            {/* Chloroplasts */}
            <ellipse cx={cx - 35} cy={cy - 25} rx="13" ry="8" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" />
            <ellipse cx={cx - 35} cy={cy + 25} rx="13" ry="8" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" />
            {/* Nucleus pushed to the side */}
            <circle cx={cx - 20} cy={cy} r="16" fill="#a855f7" stroke="#6b21a8" strokeWidth="1.5" />
            {/* Labels */}
            <text x={cx + 20} y={cy + 3} fill="#0369a1" fontSize="9" fontWeight="bold" textAnchor="middle">فجوة عصارية</text>
            <text x={cx - 35} y={cy - 23} fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">بلاستيدة</text>
            <text x={width / 2} y={height - 4} fill="#15803d" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              الخلية النباتية (Plant Cell)
            </text>
          </svg>
        );
      }

      case 'bio-dna': {
        const cx = width / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Double Helix Strand */}
            {Array.from({ length: 9 }).map((_, i) => {
              const y = 20 + i * ((height - 50) / 8);
              const phase = (i / 8) * 2 * Math.PI;
              const x1 = cx - Math.sin(phase) * 35;
              const x2 = cx + Math.sin(phase) * 35;
              const baseColor = i % 2 === 0 ? '#ef4444' : '#3b82f6';
              const pairColor = i % 2 === 0 ? '#10b981' : '#f59e0b';
              return (
                <g key={i}>
                  {/* Nitrogenous base pairs A-T / G-C */}
                  <line x1={x1} y1={y} x2={cx} y2={y} stroke={baseColor} strokeWidth="3" />
                  <line x1={cx} y1={y} x2={x2} y2={y} stroke={pairColor} strokeWidth="3" />
                  {/* Sugar-phosphate backbone nodes */}
                  <circle cx={x1} cy={y} r="5" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
                  <circle cx={x2} cy={y} r="5" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
                </g>
              );
            })}
            <text x={width / 2} y={height - 4} fill="#a855f7" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              DNA (A-T / C-G)
            </text>
          </svg>
        );
      }

      case 'bio-digestive-system': {
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Silhouette outline */}
            <path d={`M ${width / 2 - 25} 15 Q ${width / 2} 5 ${width / 2 + 25} 15 Q ${width / 2 + 15} 35 ${width / 2 + 10} 60 L ${width / 2 + 10} 110 L ${width / 2 - 10} 110 L ${width / 2 - 10} 60 Z`} fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
            {/* Esophagus */}
            <line x1={width / 2} y1={40} x2={width / 2} y2={100} stroke="#f97316" strokeWidth="5" />
            {/* Liver */}
            <path d={`M ${width / 2 - 45} 105 Q ${width / 2 - 10} 95 ${width / 2 - 5} 115 Q ${width / 2 - 20} 140 ${width / 2 - 50} 125 Z`} fill="#b91c1c" stroke="#991b1b" strokeWidth="1.5" />
            {/* Stomach */}
            <path d={`M ${width / 2 - 5} 105 Q ${width / 2 + 35} 105 ${width / 2 + 35} 135 Q ${width / 2 + 25} 160 ${width / 2} 150 Q ${width / 2 - 10} 130 ${width / 2 - 5} 105 Z`} fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
            {/* Pancreas */}
            <rect x={width / 2 - 15} y={145} width={30} height={10} rx="4" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
            {/* Small & Large Intestine loops */}
            <rect x={width / 2 - 38} y={165} width={76} height={65} rx="12" fill="#fed7aa" stroke="#ea580c" strokeWidth="3" />
            <path d={`M ${width / 2 - 20} 185 Q ${width / 2} 175 ${width / 2 + 20} 185 Q ${width / 2} 210 ${width / 2 - 15} 210`} fill="none" stroke="#f97316" strokeWidth="4" />
            {/* Organ Labels */}
            <text x={width / 2 - 38} y={98} fill="#991b1b" fontSize="9" fontWeight="bold">الكبد</text>
            <text x={width / 2 + 38} y={120} fill="#b45309" fontSize="9" fontWeight="bold">المعدة</text>
            <text x={width / 2} y={200} fill="#c2410c" fontSize="9" fontWeight="bold" textAnchor="middle">الأمعاء</text>
            <text x={width / 2} y={height - 6} fill="#d97706" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              الجهاز الهضمي (Digestive System)
            </text>
          </svg>
        );
      }

      case 'bio-respiratory-system': {
        const cx = width / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Trachea (القصبة الهوائية) with rings */}
            <rect x={cx - 7} y={20} width={14} height={60} rx="4" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
            {[30, 42, 54, 66].map((y) => (
              <line key={y} x1={cx - 7} y1={y} x2={cx + 7} y2={y} stroke="#0284c7" strokeWidth="1.5" />
            ))}
            {/* Left & Right Bronchi */}
            <line x1={cx} y1={80} x2={cx - 35} y2={110} stroke="#0284c7" strokeWidth="3.5" />
            <line x1={cx} y1={80} x2={cx + 35} y2={110} stroke="#0284c7" strokeWidth="3.5" />
            {/* Right Lung */}
            <path d={`M ${cx - 20} 95 Q ${cx - 65} 90 ${cx - 70} 145 Q ${cx - 75} 200 ${cx - 25} 205 Q ${cx - 15} 170 ${cx - 20} 95 Z`} fill="#fda4af" stroke="#e11d48" strokeWidth="2.5" />
            {/* Left Lung */}
            <path d={`M ${cx + 20} 95 Q ${cx + 65} 90 ${cx + 70} 145 Q ${cx + 75} 200 ${cx + 25} 205 Q ${cx + 15} 170 ${cx + 20} 95 Z`} fill="#fda4af" stroke="#e11d48" strokeWidth="2.5" />
            {/* Diaphragm */}
            <path d={`M ${cx - 75} 220 Q ${cx} 200 ${cx + 75} 220`} fill="none" stroke="#be123c" strokeWidth="3" />
            {/* Labels */}
            <text x={cx} y={15} fill="#0369a1" fontSize="9" fontWeight="bold" textAnchor="middle">القصبة الهوائية</text>
            <text x={cx - 45} y={150} fill="#be123c" fontSize="9" fontWeight="bold" textAnchor="middle">رئة يمنى</text>
            <text x={cx + 45} y={150} fill="#be123c" fontSize="9" fontWeight="bold" textAnchor="middle">رئة يسرى</text>
            <text x={cx} y={232} fill="#be123c" fontSize="8" fontWeight="bold" textAnchor="middle">الحجاب الحاجز</text>
            <text x={cx} y={height - 6} fill="#0284c7" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              الجهاز التنفسي والرئتان
            </text>
          </svg>
        );
      }

      case 'bio-circulatory-system': {
        const cx = width / 2;
        const cy = height * 0.48;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Superior Vena Cava & Aorta arches */}
            <path d={`M ${cx - 20} 18 L ${cx - 20} 55`} stroke="#2563eb" strokeWidth="12" strokeLinecap="round" />
            <path d={`M ${cx + 10} 55 Q ${cx + 15} 12 ${cx + 35} 25 L ${cx + 35} 55`} fill="none" stroke="#dc2626" strokeWidth="14" strokeLinecap="round" />
            {/* Heart 4 Chambers Body */}
            {/* Right Atrium (Blue - deoxygenated) */}
            <path d={`M ${cx - 45} 55 Q ${cx - 5} 55 ${cx} 85 L ${cx - 45} 85 Z`} fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
            {/* Left Atrium (Red - oxygenated) */}
            <path d={`M ${cx} 85 Q ${cx + 5} 55 ${cx + 45} 55 L ${cx + 45} 85 Z`} fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
            {/* Right Ventricle (Blue) */}
            <path d={`M ${cx - 45} 85 L ${cx} 85 L ${cx} 165 Q ${cx - 35} 145 ${cx - 45} 85 Z`} fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" />
            {/* Left Ventricle (Red) */}
            <path d={`M ${cx} 85 L ${cx + 45} 85 Q ${cx + 35} 145 ${cx} 165 Z`} fill="#dc2626" stroke="#b91c1c" strokeWidth="2" />
            {/* Labels for 4 chambers */}
            <text x={cx - 25} y={75} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">أذين أيمن</text>
            <text x={cx + 25} y={75} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">أذين أيسر</text>
            <text x={cx - 24} y={120} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">بطين أيمن</text>
            <text x={cx + 24} y={120} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">بطين أيسر</text>
            <text x={cx} y={height - 6} fill="#dc2626" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              القلب البشري (4 حجرات ودورة دموية)
            </text>
          </svg>
        );
      }

      case 'bio-neuron': {
        const cx = 70;
        const cy = height / 2;
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Dendrites branches */}
            <path d={`M ${cx} ${cy} L 15 20 M ${cx} ${cy} L 25 50 M ${cx} ${cy} L 10 ${cy} M ${cx} ${cy} L 20 ${cy + 40} M ${cx} ${cy} L 30 ${height - 25}`} stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
            {/* Soma / Cell Body */}
            <circle cx={cx} cy={cy} r="22" fill="#c084fc" stroke="#7e22ce" strokeWidth="2.5" />
            <circle cx={cx} cy={cy} r="8" fill="#581c87" />
            {/* Axon line */}
            <line x1={cx + 22} y1={cy} x2={width - 45} y2={cy} stroke="#f59e0b" strokeWidth="4" />
            {/* Myelin Sheath Schwann cells */}
            {[0, 1, 2].map((idx) => {
              const sx = cx + 38 + idx * 42;
              return (
                <rect key={idx} x={sx} y={cy - 12} width={32} height={24} rx="8" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
              );
            })}
            {/* Axon Terminals / Synaptic Knobs */}
            <path d={`M ${width - 45} ${cy} L ${width - 15} ${cy - 25} M ${width - 45} ${cy} L ${width - 10} ${cy} M ${width - 45} ${cy} L ${width - 15} ${cy + 25}`} stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
            {/* Labels */}
            <text x={cx} y={cy - 26} fill="#a855f7" fontSize="9" fontWeight="bold" textAnchor="middle">جسم الخلية</text>
            <text x={cx + 100} y={cy + 26} fill="#0284c7" fontSize="8" fontWeight="bold" textAnchor="middle">غمد مايلين</text>
            <text x={width - 25} y={cy - 30} fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle">نهايات عصبية</text>
            <text x={width / 2} y={height - 4} fill="#8b5cf6" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              الخلية العصبية (Neuron) والسيال العصبي
            </text>
          </svg>
        );
      }

      case 'bio-genetics-punnett': {
        const father = params.alleleFather || ['B', 'b'];
        const mother = params.alleleMother || ['B', 'b'];
        return (
          <div className="w-full h-full p-2.5 rounded-2xl bg-slate-900/95 border-2 border-emerald-500/70 shadow-xl flex flex-col justify-between select-none">
            <div className="text-center font-bold text-xs text-emerald-400 border-b border-slate-800 pb-1">
              مربع بانيت الوراثي ({father.join('')} × {mother.join('')})
            </div>
            {/* 2x2 Grid with Parent Gametes */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono font-black text-sm my-auto">
              <div className="text-slate-500 text-xs flex items-center justify-center">♂ / ♀</div>
              <div className="bg-blue-500/20 text-blue-300 py-1 rounded border border-blue-500/30">{mother[0]}</div>
              <div className="bg-blue-500/20 text-blue-300 py-1 rounded border border-blue-500/30">{mother[1]}</div>

              <div className="bg-rose-500/20 text-rose-300 py-2 rounded border border-rose-500/30 flex items-center justify-center">{father[0]}</div>
              <div className="bg-emerald-500/20 text-emerald-300 py-2 rounded border border-emerald-500/40">{father[0] + mother[0]}</div>
              <div className="bg-emerald-500/20 text-emerald-300 py-2 rounded border border-emerald-500/40">{father[0] + mother[1]}</div>

              <div className="bg-rose-500/20 text-rose-300 py-2 rounded border border-rose-500/30 flex items-center justify-center">{father[1]}</div>
              <div className="bg-emerald-500/20 text-emerald-300 py-2 rounded border border-emerald-500/40">{mother[0] + father[1]}</div>
              <div className="bg-emerald-500/20 text-emerald-300 py-2 rounded border border-emerald-500/40">{father[1] + mother[1]}</div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-300 border-t border-slate-800 pt-1 font-sans">
              <span>طراز شكلي: 3 سائد : 1 متنحي</span>
              <span>طراز جيني: 1BB : 2Bb : 1bb</span>
            </div>
          </div>
        );
      }

      case 'bio-food-chain': {
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {/* Energy Pyramid Steps */}
            {/* Level 4: Apex Predator */}
            <polygon points={`${width / 2},20 ${width / 2 - 35},60 ${width / 2 + 35},60`} fill="#ef4444" fillOpacity="0.85" stroke="#ffffff" strokeWidth="1.5" />
            <text x={width / 2} y={48} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">مفترس (0.1%)</text>
            {/* Level 3: Secondary Consumer */}
            <polygon points={`${width / 2 - 35},60 ${width / 2 + 35},60 ${width / 2 + 65},105 ${width / 2 - 65},105`} fill="#f59e0b" fillOpacity="0.85" stroke="#ffffff" strokeWidth="1.5" />
            <text x={width / 2} y={88} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">مستهلك 2 (1%)</text>
            {/* Level 2: Primary Consumer */}
            <polygon points={`${width / 2 - 65},105 ${width / 2 + 65},105 ${width / 2 + 95},150 ${width / 2 - 95},150`} fill="#3b82f6" fillOpacity="0.85" stroke="#ffffff" strokeWidth="1.5" />
            <text x={width / 2} y={132} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">عواشب (10%)</text>
            {/* Level 1: Producers */}
            <polygon points={`${width / 2 - 95},150 ${width / 2 + 95},150 ${width / 2 + 120},195 ${width / 2 - 120},195`} fill="#10b981" fillOpacity="0.85" stroke="#ffffff" strokeWidth="1.5" />
            <text x={width / 2} y={178} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">منتجات نباتية (100%)</text>
            {/* Label */}
            <text x={width / 2} y={height - 4} fill="#84cc16" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Cairo">
              هرم نقل الطاقة الغذائية (قانون 10%)
            </text>
          </svg>
        );
      }

      default: {
        return (
          <div className="w-full h-full flex items-center justify-center p-2 rounded-xl border border-dashed border-slate-500 text-slate-300 font-bold text-xs">
            {item.label || type}
          </div>
        );
      }
    }
  };

  return (
    <div className="w-full h-full pointer-events-auto select-none relative">
      {renderContent()}

      {/* Optional Top-Right Live Formula Tag for 3D Polyhedra */}
      {item.showFormula !== false && item.params.volumeFormula && (
        <div className="absolute -top-7 right-0 bg-slate-900/90 border border-blue-500/40 text-blue-300 text-[10px] font-mono px-2 py-0.5 rounded-md shadow-md backdrop-blur-sm pointer-events-none whitespace-nowrap">
          {item.params.volumeFormula}
        </div>
      )}
    </div>
  );
};
