import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, Pause, RotateCw, Sparkles, Move, Maximize2, Minimize2, 
  Pencil, Eraser, MousePointer2, Box, Brain, Calculator, Video, 
  Undo2, Redo2, Download, Trash2, Check, RefreshCw, Palette, 
  Share2, Volume2, VolumeX, Eye, Compass, Layers, Zap, X
} from 'lucide-react';

interface SmartClassroomBoardViewProps {
  onClose?: () => void;
  onLaunchFullWhiteboard?: () => void;
  isStandalone?: boolean;
}

export const SmartClassroomBoardView: React.FC<SmartClassroomBoardViewProps> = ({
  onClose,
  onLaunchFullWhiteboard,
  isStandalone = false
}) => {
  // Board Mode & Tools
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter' | 'eraser' | 'laser' | 'pointer' | '3d' | 'mindmap'>('pen');
  const [penColor, setPenColor] = useState<string>('#00E5FF'); // Neon Cyan
  const [penWidth, setPenWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Video Widget state
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);
  const [videoProgress, setVideoProgress] = useState<number>(38);

  // 3D Geometry Widget state
  const [shapeRotation, setShapeRotation] = useState<{ x: number; y: number }>({ x: 25, y: 35 });
  const [isDraggingShape, setIsDraggingShape] = useState<boolean>(false);
  const [shapeDragStart, setShapeDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selected3DShape, setSelected3DShape] = useState<'icosahedron' | 'cube' | 'torus' | 'molecule'>('icosahedron');

  // Mind map active node
  const [activeMindmapNode, setActiveMindmapNode] = useState<string>('quantum');

  // Drawing Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);

  // Laser Pointer Coordinates
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);

  // Multi-touch ripple indicators
  const [touchRipples, setTouchRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Time & Date display
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3D Shape Auto-rotation
  useEffect(() => {
    if (isDraggingShape) return;
    const interval = setInterval(() => {
      setShapeRotation(prev => ({
        x: (prev.x + 0.6) % 360,
        y: (prev.y + 0.9) % 360
      }));
    }, 40);
    return () => clearInterval(interval);
  }, [isDraggingShape]);

  // Video Progress Simulator
  useEffect(() => {
    if (!isVideoPlaying) return;
    const interval = setInterval(() => {
      setVideoProgress(p => (p >= 100 ? 0 : p + 0.5));
    }, 300);
    return () => clearInterval(interval);
  }, [isVideoPlaying]);

  // Setup Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match display size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        // Save current contents
        const imgData = ctx.getImageData(0, 0, canvas.width || 1, canvas.height || 1);
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (imgData && imgData.width > 1) {
          ctx.putImageData(imgData, 0, 0);
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Drawing Handlers with Smart Stylus & Tablet Technology
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    // Add visual touch ripple
    const rippleId = Date.now() + Math.random();
    setTouchRipples(prev => [...prev.slice(-4), { id: rippleId, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => {
      setTouchRipples(prev => prev.filter(r => r.id !== rippleId));
    }, 600);

    if (activeTool === 'laser') {
      setLaserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      return;
    }

    if (activeTool === 'pointer') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);

    const dynamicWidth = e.pointerType === 'pen' ? penWidth * (0.4 + pressure * 1.3) : penWidth;

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 32;
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor + '55'; // translucent
      ctx.lineWidth = penWidth * 2.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = dynamicWidth;
      // Add subtle glow
      ctx.shadowColor = penColor;
      ctx.shadowBlur = 6;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw immediate dot on tap/click for dots and single marks
    if (activeTool === 'eraser') {
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, dynamicWidth / 2), 0, Math.PI * 2);
      ctx.fillStyle = activeTool === 'highlighter' ? penColor + '55' : penColor;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (activeTool === 'laser') {
      setLaserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      return;
    }

    if (!isDrawing) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.pointerType === 'pen' && activeTool !== 'eraser' && activeTool !== 'highlighter') {
      ctx.lineWidth = penWidth * (0.4 + pressure * 1.3);
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    setIsDrawing(false);
    if (activeTool === 'laser') {
      setLaserPos(null);
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      boardContainerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 3D Model drag handlers
  const handleShapeMouseDown = (e: React.MouseEvent) => {
    setIsDraggingShape(true);
    setShapeDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleShapeMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingShape) return;
    const dx = e.clientX - shapeDragStart.x;
    const dy = e.clientY - shapeDragStart.y;
    setShapeRotation(prev => ({
      x: prev.x - dy * 0.6,
      y: prev.y + dx * 0.6
    }));
    setShapeDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleShapeMouseUp = () => {
    setIsDraggingShape(false);
  };

  // Predefined vibrant neon palette
  const presetColors = [
    { label: 'سماوي نيون', hex: '#00E5FF' },
    { label: 'أبيض ناصع', hex: '#FFFFFF' },
    { label: 'أزرق ملكي', hex: '#3B82F6' },
    { label: 'أخضر زمردي', hex: '#10B981' },
    { label: 'أصفر شمسي', hex: '#FACC15' },
    { label: 'وردي نيون', hex: '#EC4899' },
    { label: 'برتقالي متوهج', hex: '#F97316' }
  ];

  return (
    <div 
      ref={boardContainerRef}
      className="relative w-full min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-2 sm:p-5 lg:p-8 select-none overflow-x-hidden font-sans"
      dir="rtl"
    >
      {/* ========================================================================= */}
      {/* 1. Classroom Architectural Backdrop & Ambient Lighting                   */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Acoustic wood slatted wall texture illusion */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 8px, #0f172a 8px, #0f172a 20px)`
          }}
        />

        {/* Ceiling Downlight Cones focusing on the board */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[350px] bg-gradient-to-b from-blue-500/15 via-blue-500/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-0 right-1/4 translate-x-1/2 w-[500px] h-[350px] bg-gradient-to-b from-cyan-400/15 via-cyan-400/5 to-transparent blur-3xl rounded-full" />
        
        {/* Soft Ambient Wall Halo Behind Smartboard */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[85%] bg-gradient-to-r from-blue-600/10 via-cyan-500/15 to-indigo-600/10 blur-[90px] rounded-3xl" />

        {/* Modern Studio Parquet Floor Reflection at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#03060c] via-[#070d1a]/80 to-transparent border-t border-cyan-500/10" />
      </div>

      {/* ========================================================================= */}
      {/* 2. Top Navigation & Action Controls Strip                                 */}
      {/* ========================================================================= */}
      <div className="relative z-20 w-full max-w-7xl flex flex-wrap items-center justify-between gap-3 mb-3 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/40">
            <Sparkles size={20} className="text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>اللوح الذكي التفاعلي المتطور</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  4K ULTRA HD
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              أكاديمية التفوق أون لاين • الجيل الأحدث من شاشات الفصول الذكية التفاعلية (Smart Interactive Whiteboard)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onLaunchFullWhiteboard && (
            <button
              onClick={onLaunchFullWhiteboard}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95"
              title="فتح اللوح الكامل بمساحات عمل متعددة واستيراد ملفات PDF"
            >
              <Palette size={14} />
              <span>فتح اللوح المكتبي الكامل (Canvas)</span>
            </button>
          )}

          <button
            onClick={handleToggleFullscreen}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition-all cursor-pointer shadow-sm"
            title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/60 rounded-xl transition-all cursor-pointer shadow-sm"
              title="إغلاق"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. The 4K Smart Interactive Whiteboard Frame (Ultra-Realistic Hardware)    */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-7xl aspect-[16/9.5] sm:aspect-[16/9.2] max-h-[82vh] rounded-[26px] p-2 sm:p-2.5 bg-gradient-to-b from-[#1c2230] via-[#10141f] to-[#0a0d14] shadow-[0_25px_80px_-15px_rgba(0,180,255,0.25),0_0_0_1px_rgba(255,255,255,0.1)] border-2 border-slate-700/80 flex flex-col group/board transition-all duration-300">
        
        {/* Subtle Outer Hardware Frame Highlight & Bezel Shading */}
        <div className="absolute inset-0 rounded-[24px] pointer-events-none border border-white/10" />

        {/* Discreet Hardware Top Sensor Notch */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-0.5 bg-slate-950/90 rounded-full border border-slate-800 text-[9px] text-slate-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>4K IR MULTI-TOUCH 40 PTS • SENSOR ACTIVE</span>
        </div>

        {/* ======================================================================= */}
        {/* 4. Active Touchscreen Display Surface (Futuristic 4K UI)                 */}
        {/* ======================================================================= */}
        <div className="relative flex-1 w-full h-full rounded-[18px] bg-gradient-to-br from-[#071329] via-[#0B1E3F] to-[#050C1B] overflow-hidden flex flex-col border border-cyan-500/20 shadow-inner">
          
          {/* Subtle Isometric 4K Grid Texture Overlay */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(0,229,255,0.15) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(0,229,255,0.15) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />

          {/* Glowing Cyber Accent Curves in Background */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-400/20 blur-[100px] rounded-full pointer-events-none" />

          {/* --------------------------------------------------------------------- */}
          {/* 4.1 On-Screen Header Strip (Futuristic Whiteboard OS)                 */}
          {/* --------------------------------------------------------------------- */}
          <div className="relative z-20 px-3 sm:px-5 py-2.5 bg-slate-950/60 backdrop-blur-md border-b border-cyan-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-ping" />
                <span className="font-black text-white text-xs tracking-wider">
                  أكاديمية التفوق • الفصل الدراسي الذكي
                </span>
              </div>
              <span className="hidden sm:inline-block text-[10px] bg-blue-900/60 text-blue-200 border border-blue-700/60 px-2 py-0.5 rounded-md font-mono">
                درس الفيزياء والرياضيات المتقدمة
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-lg">
                <span className="text-slate-400">الوقت:</span>
                <span className="font-bold">{currentTime || '10:00:00'}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-1 rounded-lg font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>الاتصال: مباشر 4K</span>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* 4.2 Main Interactive Content Area                                     */}
          {/* --------------------------------------------------------------------- */}
          <div className="relative flex-1 w-full h-full p-3 sm:p-5 grid grid-cols-12 gap-3 overflow-hidden">
            
            {/* Interactive Drawing Canvas Layer (Mounted over the background with Smart Stylus Support) */}
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{ touchAction: 'none' }}
              className={`absolute inset-0 z-10 w-full h-full block ${
                activeTool === 'laser' 
                  ? 'cursor-none' 
                  : activeTool === 'eraser' 
                  ? 'cursor-crosshair' 
                  : activeTool === 'pointer'
                  ? 'pointer-events-none cursor-default'
                  : 'cursor-crosshair'
              }`}
            />

            {/* Simulated Laser Dot */}
            {laserPos && (
              <div 
                className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                style={{ left: laserPos.x, top: laserPos.y }}
              >
                <div className="w-6 h-6 rounded-full bg-red-500/30 animate-ping absolute -top-1 -left-1" />
                <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_15px_#ff0000] border-2 border-white" />
              </div>
            )}

            {/* Visual Touch Ripples */}
            {touchRipples.map(ripple => (
              <div
                key={ripple.id}
                className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-cyan-400/80 bg-cyan-400/20 animate-ping"
                style={{ left: ripple.x, top: ripple.y }}
              />
            ))}

            {/* =================================================================== */}
            {/* Left Column (Cols 1-4): 3D Geometry + Educational Video Widget     */}
            {/* =================================================================== */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 z-0 pointer-events-auto">
              
              {/* Interactive 3D Geometric Solids Card */}
              <div 
                onMouseDown={handleShapeMouseDown}
                onMouseMove={handleShapeMouseMove}
                onMouseUp={handleShapeMouseUp}
                className="bg-slate-900/70 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-3 sm:p-3.5 shadow-xl transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-black">
                    <Box size={14} className="text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
                    <span>المجسمات الهندسية 3D (تفاعلي)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                    <span>اسحب للتدوير 🔄</span>
                  </div>
                </div>

                {/* 3D Wireframe Canvas Projection */}
                <div className="h-40 sm:h-44 w-full flex items-center justify-center relative perspective-[800px]">
                  <div 
                    className="relative w-28 h-28 flex items-center justify-center transition-transform duration-75 preserve-3d"
                    style={{
                      transform: `rotateX(${shapeRotation.x}deg) rotateY(${shapeRotation.y}deg)`
                    }}
                  >
                    {/* Glowing Wireframe Polyhedron Structure */}
                    <div className="absolute inset-0 border-2 border-cyan-400/90 rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.4)]" />
                    <div className="absolute inset-0 border-2 border-blue-400/70 rounded-2xl rotate-45" />
                    <div className="absolute inset-0 border-2 border-purple-400/60 rounded-2xl rotate-12" />
                    
                    {/* Inner Core Pulsing Sphere */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 shadow-[0_0_30px_#00E5FF] animate-pulse flex items-center justify-center text-[9px] font-bold text-slate-950 font-mono">
                      V=8
                    </div>

                    {/* Outer Vertex Nodes */}
                    <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#00E5FF]" />
                    <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#00E5FF]" />
                    <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                  </div>

                  {/* Mathematical Info Floating Tags */}
                  <div className="absolute bottom-1 right-2 text-[10px] font-mono text-cyan-200/90 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                    Euler: V - E + F = 2
                  </div>
                  <div className="absolute top-1 left-2 text-[10px] font-mono text-blue-300 bg-slate-950/80 px-2 py-0.5 rounded border border-blue-500/30">
                    Volume = 4/3 πr³
                  </div>
                </div>

                {/* Shape Selector Switch */}
                <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-slate-800 text-[10px] font-bold text-center">
                  {[
                    { id: 'icosahedron', label: 'عشروني' },
                    { id: 'cube', label: 'مكعب' },
                    { id: 'torus', label: 'حلقي' },
                    { id: 'molecule', label: 'جزيء' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelected3DShape(s.id as any)}
                      className={`py-1 rounded-md transition-all cursor-pointer ${
                        selected3DShape === s.id
                          ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                          : 'text-slate-400 hover:text-white bg-slate-800/40'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Educational Video Widget */}
              <div className="bg-slate-900/70 backdrop-blur-md border border-blue-500/30 hover:border-blue-400/60 rounded-2xl p-3 sm:p-3.5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5 text-blue-300 font-black">
                    <Video size={14} className="text-blue-400" />
                    <span>فيديو تعليمي: محاكاة الجاذبية الكونية</span>
                  </div>
                  <span className="text-[9px] bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                    4K LIVE SIM
                  </span>
                </div>

                {/* Simulated High-Tech Video Screen */}
                <div className="h-28 sm:h-32 w-full rounded-xl bg-gradient-to-br from-indigo-950 via-slate-950 to-blue-950 relative overflow-hidden border border-blue-500/20 flex items-center justify-center group/video">
                  {/* Orbit Animation */}
                  <div className="w-24 h-24 rounded-full border border-blue-400/30 animate-spin" style={{ animationDuration: '8s' }}>
                    <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#00E5FF] absolute -top-1.5 left-1/2 -translate-x-1/2" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-400 shadow-[0_0_20px_#f59e0b] absolute" />

                  {/* Play / Pause Center Overlay Button */}
                  <button
                    onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                    className="w-10 h-10 rounded-full bg-cyan-500/80 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-all shadow-lg shadow-cyan-500/40 cursor-pointer active:scale-90 z-10"
                  >
                    {isVideoPlaying ? <Pause size={16} className="fill-slate-950" /> : <Play size={16} className="fill-slate-950 mr-0.5" />}
                  </button>

                  {/* Bottom Video Controls Bar */}
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-950 to-transparent flex items-center justify-between gap-2 text-[10px]">
                    <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full rounded-full transition-all" style={{ width: `${videoProgress}%` }} />
                    </div>
                    <button 
                      onClick={() => setIsVideoMuted(!isVideoMuted)}
                      className="text-slate-300 hover:text-white p-0.5 cursor-pointer"
                    >
                      {isVideoMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* =================================================================== */}
            {/* Center Column (Cols 5-9): Equations, Scientific Graphs & Formulas */}
            {/* =================================================================== */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-3 z-0 pointer-events-auto">
              
              {/* Colored Scientific Formulas & Calculations Card */}
              <div className="bg-slate-900/70 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-black text-cyan-300 flex items-center gap-1.5">
                      <Calculator size={14} />
                      <span>معادلات فيزيائية ورياضية متقدمة</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                      الوحدة الثالثة: الكم والنسبية
                    </span>
                  </div>

                  {/* High-Fidelity Equations with Colorful Neon Styling */}
                  <div className="space-y-2.5 font-mono text-xs sm:text-sm">
                    {/* Schrödinger Equation */}
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-cyan-500/20 text-right">
                      <div className="text-[10px] text-slate-400 font-sans mb-1">معادلة شرودنغر الموجية (Schrödinger Equation):</div>
                      <div className="text-cyan-300 font-bold tracking-wider">
                        <span className="text-amber-400">iℏ</span> ∂Ψ/∂t = <span className="text-purple-400">[-ℏ²/2m ∇² + V(r)]</span> Ψ
                      </div>
                    </div>

                    {/* Einstein Mass-Energy-Momentum Relation */}
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-blue-500/20 text-right">
                      <div className="text-[10px] text-slate-400 font-sans mb-1">علاقة آينشتاين للطاقة والزخم (Relativity):</div>
                      <div className="text-blue-300 font-bold tracking-wider">
                        <span className="text-emerald-400">E²</span> = <span className="text-cyan-300">(pc)²</span> + <span className="text-rose-400">(m₀c²)²</span>
                      </div>
                    </div>

                    {/* Maxwell's Equation / Calculus Integral */}
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-purple-500/20 flex items-center justify-between text-[11px] sm:text-xs">
                      <div>
                        <span className="text-slate-400 font-sans block text-[10px]">تكامل فورييه التوافقي:</span>
                        <span className="text-purple-300 font-bold">F(ω) = ∫ f(t) e^(−iωt) dt</span>
                      </div>
                      <div className="text-left font-sans">
                        <span className="text-emerald-400 font-bold block text-xs">✓ محقق 100%</span>
                        <span className="text-[9px] text-slate-400">نموذج مثالي</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Oscillating Harmonic Wave Graph */}
                <div className="mt-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>مخطط الموجات الكهرومغناطيسية (Waveform Harmonic):</span>
                    <span className="text-cyan-400 font-mono font-bold">f = 432.8 MHz</span>
                  </div>
                  
                  {/* SVG Animated Wave Graph */}
                  <div className="h-16 w-full rounded-xl bg-slate-950/90 border border-cyan-500/20 p-1 flex items-center relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 400 60" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#00E5FF" />
                          <stop offset="50%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M 0 30 Q 50 5 100 30 T 200 30 T 300 30 T 400 30" 
                        fill="none" 
                        stroke="url(#waveGrad)" 
                        strokeWidth="2.5" 
                      />
                      <path 
                        d="M 0 30 Q 50 55 100 30 T 200 30 T 300 30 T 400 30" 
                        fill="none" 
                        stroke="rgba(0, 229, 255, 0.3)" 
                        strokeWidth="1.5" 
                        strokeDasharray="4 4"
                      />
                    </svg>

                    {/* Live Peak Indicator Pin */}
                    <div className="absolute left-[35%] top-[12px] -translate-x-1/2 flex flex-col items-center">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00E5FF] animate-ping" />
                      <span className="text-[8px] font-mono text-cyan-300 font-bold bg-slate-900 px-1 rounded border border-cyan-500/40">λ = 692 nm</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* =================================================================== */}
            {/* Right Column (Cols 10-12): Mind Map + Interactive STEM Tools        */}
            {/* =================================================================== */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 z-0 pointer-events-auto">
              
              {/* Interactive Mind Map Widget */}
              <div className="bg-slate-900/70 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-3 sm:p-3.5 shadow-xl flex-1 flex flex-col">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-black">
                    <Brain size={14} className="text-cyan-400" />
                    <span>خريطة المفاهيم التفاعلية</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded font-bold">
                    انقر للعقد 🧠
                  </span>
                </div>

                {/* Mind Map Tree Nodes */}
                <div className="flex-1 flex flex-col justify-between py-1 relative">
                  
                  {/* Root Node */}
                  <div 
                    onClick={() => setActiveMindmapNode('quantum')}
                    className={`p-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer border ${
                      activeMindmapNode === 'quantum'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30 border-cyan-300'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/50'
                    }`}
                  >
                    الفيزياء الحديثة والبجروت ⚛️
                  </div>

                  {/* Branch Connectors (Visual Lines) */}
                  <div className="flex justify-around my-1">
                    <div className="w-0.5 h-4 bg-cyan-500/50" />
                    <div className="w-0.5 h-4 bg-blue-500/50" />
                    <div className="w-0.5 h-4 bg-purple-500/50" />
                  </div>

                  {/* Sub Nodes */}
                  <div className="space-y-1.5 text-[11px]">
                    {[
                      { id: 'relativity', label: 'النسبية الخاصة والعامة 🌌', desc: 'تمدد الزمن وانكماش الطول والجاذبية' },
                      { id: 'particles', label: 'الازدواجية الموجية والجسيمية 🌊', desc: 'تأثير كومبتون والظاهرة الكهروضوئية' },
                      { id: 'nuclear', label: 'الفيزياء النووية والطاقة ⚡', desc: 'الانشطار والاندماج والكتلة الناقصة' }
                    ].map(node => (
                      <div
                        key={node.id}
                        onClick={() => setActiveMindmapNode(node.id)}
                        className={`p-2 rounded-xl transition-all cursor-pointer border ${
                          activeMindmapNode === node.id
                            ? 'bg-cyan-950/80 text-cyan-200 border-cyan-400 shadow-sm'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{node.label}</span>
                          {activeMindmapNode === node.id && <Check size={12} className="text-cyan-400" />}
                        </div>
                        {activeMindmapNode === node.id && (
                          <div className="text-[10px] text-slate-300 mt-1 font-medium leading-relaxed bg-slate-900/60 p-1.5 rounded-lg border border-cyan-500/20">
                            {node.desc}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Quick Academy Badge & Teacher Notes Card */}
              <div className="bg-gradient-to-br from-blue-950/80 to-slate-900/80 border border-blue-500/30 rounded-2xl p-3 text-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap size={14} className="text-amber-400" />
                  <span className="font-bold text-white">توجيه ذكي للأستاذ والطلاب:</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                  يمكن للمعلم استخدام القلم الذكي للرسم والشرح الحي، وتدوير المجسمات ثلاثية الأبعاد والتفاعل مع الخريطة الذهنية لحظياً.
                </p>
              </div>

            </div>

          </div>

          {/* --------------------------------------------------------------------- */}
          {/* 4.3 Floating High-Tech Side Toolbar (الأدوات الذكية والأقلام)           */}
          {/* --------------------------------------------------------------------- */}
          <div className="smart-whiteboard-toolbar absolute top-1/2 -translate-y-1/2 right-3 z-30 flex flex-col items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-cyan-500/40 shadow-2xl shadow-cyan-950/80">
            
            {/* Pen Tool */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => setActiveTool('pen')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer relative ${
                  activeTool === 'pen'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/50 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="قلم الكتابة والرسم الذكي (Pen): رسم وشرح يدوي تفاعلي سلس"
                aria-label="القلم الذكي للرسم والكتابة (Pen)"
                data-tooltip="القلم الذكي (Pen)"
              >
                <Pencil size={16} />
                {activeTool === 'pen' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white absolute top-1 right-1" />
                )}
              </button>
              <div 
                role="tooltip"
                className="smart-toolbar-tooltip pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold shadow-xl border border-cyan-500/50 flex flex-col items-start gap-0.5 backdrop-blur-md"
              >
                <span className="text-cyan-300">القلم الذكي (Pen)</span>
                <span className="text-[9px] text-slate-400 font-normal">رسم وشرح يدوي تفاعلي سلس</span>
              </div>
            </div>

            {/* Highlighter */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => setActiveTool('highlighter')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTool === 'highlighter'
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/50 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="قلم التمييز الشفاف (Highlighter)"
                aria-label="قلم التمييز (Highlighter)"
                data-tooltip="قلم التمييز (Highlighter)"
              >
                <Sparkles size={16} />
              </button>
              <div 
                role="tooltip"
                className="smart-toolbar-tooltip pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold shadow-xl border border-amber-500/50 flex flex-col items-start gap-0.5 backdrop-blur-md"
              >
                <span className="text-amber-300">قلم التمييز (Highlighter)</span>
                <span className="text-[9px] text-slate-400 font-normal">تظليل شفاف فوق الشروحات</span>
              </div>
            </div>

            {/* Eraser */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => setActiveTool('eraser')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTool === 'eraser'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/50 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="الممحاة الذكية (Eraser): مسح الرسومات والخطوط لتصحيح الشرح"
                aria-label="الممحاة الذكية (Eraser)"
                data-tooltip="الممحاة الذكية (Eraser)"
              >
                <Eraser size={16} />
              </button>
              <div 
                role="tooltip"
                className="smart-toolbar-tooltip pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold shadow-xl border border-rose-500/50 flex flex-col items-start gap-0.5 backdrop-blur-md"
              >
                <span className="text-rose-300">الممحاة الذكية (Eraser)</span>
                <span className="text-[9px] text-slate-400 font-normal">مسح الرسومات والخطوط لتصحيح الشرح</span>
              </div>
            </div>

            {/* Laser Pointer */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => setActiveTool('laser')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTool === 'laser'
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/50 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="مؤشر الليزر التفاعلي"
                aria-label="مؤشر الليزر التفاعلي (Laser)"
                data-tooltip="مؤشر الليزر (Laser)"
              >
                <MousePointer2 size={16} />
              </button>
              <div 
                role="tooltip"
                className="smart-toolbar-tooltip pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold shadow-xl border border-red-500/50 flex flex-col items-start gap-0.5 backdrop-blur-md"
              >
                <span className="text-red-400">مؤشر الليزر (Laser)</span>
                <span className="text-[9px] text-slate-400 font-normal">إشارة ضوئية مؤقتة للشرح</span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-6 h-px bg-slate-800 my-0.5" />

            {/* Color Palette Buttons */}
            {presetColors.slice(0, 4).map(c => (
              <button
                key={c.hex}
                onClick={() => {
                  setPenColor(c.hex);
                  setActiveTool('pen');
                }}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${
                  penColor === c.hex ? 'scale-125 border-white ring-2 ring-cyan-400/50' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}

            {/* Divider */}
            <div className="w-6 h-px bg-slate-800 my-0.5" />

            {/* Clear Board Canvas */}
            <button
              onClick={handleClearCanvas}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="مسح رسومات القلم"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* 4.4 Bottom Floating Status & Quick Tools Bar                          */}
          {/* --------------------------------------------------------------------- */}
          <div className="relative z-20 px-4 py-2 bg-slate-950/70 backdrop-blur-md border-t border-cyan-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">الأداة الفعالة:</span>
              <span className="text-xs font-black text-cyan-300">
                {activeTool === 'pen' ? 'القلم الذكي التفاعلي ✍️' : activeTool === 'highlighter' ? 'قلم التظليل الملون 🌟' : activeTool === 'eraser' ? 'الممحاة الافتراضية 🧹' : 'مؤشر الليزر 🔴'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">لون الحبر:</span>
              <div className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: penColor }} />
              
              <div className="hidden sm:flex items-center gap-1.5 mr-3">
                <span className="text-[10px] text-slate-400">سُمك القلم:</span>
                {[2, 3, 5].map(w => (
                  <button
                    key={w}
                    onClick={() => setPenWidth(w)}
                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                      penWidth === w ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-cyan-400/80 font-mono hidden md:block">
              Interactive Display Engine • 60 FPS • Multi-Touch
            </div>
          </div>

        </div>

        {/* ======================================================================= */}
        {/* 5. Physical Bottom Pen Tray (Magnetic Stylus Storage Shelf)              */}
        {/* ======================================================================= */}
        <div className="h-4 sm:h-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-b-xl border-t border-slate-700/60 flex items-center justify-center gap-4 px-6 relative">
          {/* Magnetically Docked Stylus Pens */}
          <div className="flex items-center gap-3">
            {[
              { color: '#00E5FF', label: 'القلم الذكي (سماوي)' },
              { color: '#3B82F6', label: 'القلم الذكي (أزرق)' },
              { color: '#FFFFFF', label: 'القلم الذكي (أبيض)' },
              { color: '#10B981', label: 'القلم الذكي (زمردي)' }
            ].map((pen, i) => (
              <div 
                key={i} 
                onClick={() => {
                  setPenColor(pen.color);
                  setActiveTool('pen');
                }}
                className="w-14 sm:w-16 h-2 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-xs flex items-center justify-end px-1"
                style={{ 
                  backgroundColor: '#1e293b', 
                  border: `1.5px solid ${pen.color}88`,
                  boxShadow: penColor === pen.color ? `0 0 8px ${pen.color}` : 'none'
                }}
                title={pen.label}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pen.color }} />
              </div>
            ))}
          </div>

          {/* Central Academy Metal Logo Plate */}
          <div className="absolute left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-500 font-mono tracking-widest uppercase">
            ALTAFAWUQ 4K SMARTBOARD
          </div>
        </div>

      </div>

    </div>
  );
};
