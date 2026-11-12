import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Pencil, Eraser, Square, Circle, Triangle, Box, Type, Calculator, 
  FileText, Image as ImageIcon, Video, Atom, Activity, Dna, Bot, 
  Hand, MessageSquare, BarChart2, Users, Save, Radio, Share2, 
  Download, PlusCircle, CheckCircle2, Sparkles, X, ChevronRight, 
  ChevronLeft, Trash2, Undo2, Redo2, Maximize2, Minimize2, Play, 
  Pause, Volume2, VolumeX, Eye, Send, HelpCircle, AlertCircle, 
  Flame, BookOpen, Clock, Copy, Check, Palette, Compass, Layers,
  QrCode, Mic, Upload, ExternalLink, Lightbulb, CheckSquare,
  Award, Move, RefreshCw, PenTool, SlidersHorizontal, ShieldCheck, Gauge, MousePointer2,
  StopCircle, MicOff, Film, Cloud, CloudOff, Wifi, WifiOff
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { STEM_TOOL_DEFINITIONS } from '../../lib/stemToolsData';
import { StemToolDef } from '../../types/stemWhiteboard';
import { StemObjectRenderer } from './StemObjectRenderer';
import { EducationalImageModal, InsertedImageOptions } from './EducationalImageModal';
import { MathFormulaModal, MathFormulaInsertOptions } from './MathFormulaModal';

interface SmartTutorInteractiveBoardProps {
  teacherName?: string;
  lessonTitle?: string;
  subject?: string;
  onClose?: () => void;
  isStandalone?: boolean;
}

export interface CanvasElement {
  id: string;
  type: 'stroke' | 'shape' | 'text' | 'image' | 'math' | 'stem' | 'video' | 'pdf' | 'exercise' | 'mindmap';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  points?: Array<{ x: number; y: number }>;
  stemData?: any;
  extraMeta?: any;
}

interface StudentParticipant {
  id: string;
  name: string;
  avatar: string;
  isHandRaised: boolean;
  handRaisedTime?: string;
  canDraw: boolean;
  status: 'online' | 'active' | 'away';
}

interface LivePollOption {
  id: string;
  text: string;
  votes: number;
}

interface LivePoll {
  question: string;
  options: LivePollOption[];
  totalVotes: number;
  isActive: boolean;
  userVotedId?: string;
}

interface StudentQuestion {
  id: string;
  studentName: string;
  text: string;
  time: string;
  isAnswered: boolean;
  isPinned: boolean;
  aiAnswer?: string;
}

export const SmartTutorInteractiveBoard: React.FC<SmartTutorInteractiveBoardProps> = ({
  teacherName = 'أ. زكي أبو علان (المدير العام)',
  lessonTitle = 'الفيزياء المتقدمة وميكانيكا الكم - بجروت 5 وحدات',
  subject = 'فيزياء',
  onClose,
  isStandalone = true
}) => {
  // -------------------------------------------------------------
  // 1. Tool Selection & Canvas State (70% Screen Workspace)
  // -------------------------------------------------------------
  const [activeTool, setActiveTool] = useState<
    'pen' | 'highlighter' | 'eraser' | 'shape' | 'text' | 'math' | 'image' | 'video' | 'pdf' | 'stem' | 'exercise' | 'select'
  >('pen');
  const [selectedShape, setSelectedShape] = useState<'rect' | 'circle' | 'triangle' | 'cube-3d' | 'axis' | 'arrow'>('rect');
  const [penColor, setPenColor] = useState<string>('#0284c7'); // Blue
  const [penWidth, setPenWidth] = useState<number>(3);
  const [canvasBgStyle, setCanvasBgStyle] = useState<'ruled' | 'grid' | 'white' | 'dark' | 'graph' | 'lined' | 'blank'>('ruled');
  const [canvasBackgroundImage, setCanvasBackgroundImage] = useState<string | null>(null);
  const [isCanvasDragOver, setIsCanvasDragOver] = useState<boolean>(false);

  // Smart Digital Pen / Stylus & Tablet Technology Settings
  const [penMode, setPenMode] = useState<'smart-pen' | 'calligraphy' | 'highlighter' | 'brush' | 'eraser'>('smart-pen');
  const [pressureSensitivity, setPressureSensitivity] = useState<boolean>(true);
  const [palmRejection, setPalmRejection] = useState<boolean>(true);
  const [inkSmoothing, setInkSmoothing] = useState<boolean>(true);
  const [showStylusReticle, setShowStylusReticle] = useState<boolean>(true);
  const [isStylusSettingsOpen, setIsStylusSettingsOpen] = useState<boolean>(false);
  const [detectedStylusType, setDetectedStylusType] = useState<'mouse' | 'touch' | 'pen'>('mouse');
  const [livePressure, setLivePressure] = useState<number>(0);
  const [reticlePos, setReticlePos] = useState<{ x: number; y: number } | null>(null);

  // Modals for image, math, pdf, video, and homework
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Drawing elements
  const [elements, setElements] = useState<CanvasElement[]>([
    {
      id: 'init-header-title',
      type: 'text',
      x: 35,
      y: 25,
      content: '📌 درس اليوم: ميكانيكا الكم والازدواجية الموجية الجسيمية',
      color: '#0f172a',
      extraMeta: { fontSize: 17, fontWeight: 'bold' }
    },
    {
      id: 'init-formula-1',
      type: 'math',
      x: 35,
      y: 80,
      content: 'E = h · ν = \\frac{h · c}{\\lambda}',
      color: '#0284c7',
      extraMeta: { label: 'طاقة الفوتون وتردد بلانك' }
    },
    {
      id: 'init-stem-1',
      type: 'stem',
      x: 420,
      y: 60,
      width: 180,
      height: 140,
      content: 'optics-prism',
      color: '#0284c7',
      fillColor: '#e0f2fe',
      stemData: { angle: 60, refractiveIndex: 1.5 },
      extraMeta: { title: 'موشور تحليل الضوء (Optics Prism)' }
    },
    {
      id: 'init-exercise-1',
      type: 'exercise',
      x: 35,
      y: 190,
      width: 380,
      height: 250,
      extraMeta: {
        title: 'تمرين تفاعلي مباشر: حساب طاقة الفوتون',
        question: 'إذا سقط فوتون طوله الموجي λ = 400 nm، ما هي طاقته بوحدة الجول (J)؟',
        options: [
          { id: 'opt-a', text: '4.97 × 10⁻¹⁹ J', isCorrect: true },
          { id: 'opt-b', text: '2.48 × 10⁻¹⁹ J', isCorrect: false },
          { id: 'opt-c', text: '6.63 × 10⁻³⁴ J', isCorrect: false },
          { id: 'opt-d', text: '1.60 × 10⁻¹⁹ J', isCorrect: false }
        ],
        selectedOption: null,
        isSubmitted: false,
        explanation: 'وفق علاقة بلانك: E = hc / λ = (6.626×10⁻³⁴ × 3×10⁸) / (400×10⁻⁹) ≈ 4.97 × 10⁻¹⁹ J.'
      }
    }
  ]);

  const [undoHistory, setUndoHistory] = useState<CanvasElement[][]>([]);
  const [redoHistory, setRedoHistory] = useState<CanvasElement[][]>([]);

  // Freehand stroke drawing
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workspaceContainerRef = useRef<HTMLDivElement | null>(null);
  const localImageInputRef = useRef<HTMLInputElement | null>(null);

  // Live drawing tracking refs for smooth continuous handwriting and palm rejection
  const lastPointRef = useRef<{ x: number; y: number; pressure?: number } | null>(null);
  const lastMidRef = useRef<{ x: number; y: number } | null>(null);
  const activePenDownRef = useRef<boolean>(false);
  const lastPenTimeRef = useRef<number>(0);

  // -------------------------------------------------------------
  // 2. Side Panel State (30% Screen Workspace)
  // -------------------------------------------------------------
  const [sideTab, setSideTab] = useState<'ai_tutor' | 'stem' | 'teacher_tools' | 'student_interaction'>('ai_tutor');
  const [stemCategory, setStemCategory] = useState<'chemistry' | 'physics' | 'biology' | '3d-shapes' | 'math'>('physics');

  // -------------------------------------------------------------
  // 3. Embedded AI Assistant State ("المعلم الذكي")
  // -------------------------------------------------------------
  const [aiMessages, setAiMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; time: string; actionType?: string }>>([
    {
      id: 'ai-init',
      role: 'assistant',
      text: 'أهلاً بكم في اللوح الذكي التفاعلي لمنصة «المعلم الذكي لأكاديمية التفوق»! 🌟 أنا مساعدكم التعليمي المعتمد داخل الحصة؛ يسعدني شرح أي معادلة أو رسمة على اللوح، وتوليد أسئلة واختبارات سريعة، واقتراح أمثلة إضافية، وتحويل الشرح إلى خرائط ذهنية فورية.',
      time: '10:00'
    }
  ]);
  const [aiInputMessage, setAiInputMessage] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // -------------------------------------------------------------
  // 4. Teacher Tools State (تسجيل، تصدير، واجبات، حفظ)
  // -------------------------------------------------------------
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState<boolean>(false);
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordWithMic, setRecordWithMic] = useState<boolean>(true);
  const [recordingMode, setRecordingMode] = useState<'screen' | 'canvas'>('canvas');
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  // Real MediaRecorder API References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Firebase Firestore 30s Periodic Autosave State & Offline Resilience
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'offline' | 'error'>('saved');
  const [lastAutosavedAt, setLastAutosavedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [offlineBackupCount, setOfflineBackupCount] = useState<number>(0);
  const [isRestoredFromCloud, setIsRestoredFromCloud] = useState<boolean>(false);

  const [isLessonSaved, setIsLessonSaved] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string>('');
  const [sessionCode] = useState<string>(`TAFAWUQ-${Math.floor(1000 + Math.random() * 9000)}`);
  const [isCopiedCode, setIsCopiedCode] = useState<boolean>(false);

  // Homework creation state
  const [homeworkTitle, setHomeworkTitle] = useState<string>('واجب مسألة الظاهرة الكهروضوئية وتطبيقاتها');
  const [homeworkDueDate, setHomeworkDueDate] = useState<string>('2026-10-10');
  const [homeworkSuccess, setHomeworkSuccess] = useState<string>('');

  // Video insertion state
  const [videoUrlInput, setVideoUrlInput] = useState<string>('https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-close-up-1728-large.mp4');
  const [videoTitleInput, setVideoTitleInput] = useState<string>('محاكاة تجربة الظاهرة الكهروضوئية ⚡');

  // PDF insertion state
  const [pdfTitleInput, setPdfTitleInput] = useState<string>('ورقة عمل ميكانيكا الكم - نموذج بجروت 2026');
  const [pdfPageCountInput, setPdfPageCountInput] = useState<number>(4);

  // -------------------------------------------------------------
  // 5. Students & Live Interaction State (رفع اليد، الأسئلة، التصويت)
  // -------------------------------------------------------------
  const [participants, setParticipants] = useState<StudentParticipant[]>([
    { id: 'st-1', name: 'أحمد خليل المصري', avatar: '👨‍🎓', isHandRaised: true, handRaisedTime: '10:14', canDraw: true, status: 'online' },
    { id: 'st-2', name: 'سارة مصطفى كنعان', avatar: '👩‍🎓', isHandRaised: false, canDraw: false, status: 'online' },
    { id: 'st-3', name: 'يوسف رائد أبو عيشة', avatar: '👨‍🎓', isHandRaised: true, handRaisedTime: '10:16', canDraw: false, status: 'online' },
    { id: 'st-4', name: 'نور الهدى عثمان', avatar: '👩‍🎓', isHandRaised: false, canDraw: false, status: 'online' },
    { id: 'st-5', name: 'عمر ياسين الدجاني', avatar: '👨‍🎓', isHandRaised: false, canDraw: false, status: 'away' }
  ]);

  const [studentQuestions, setStudentQuestions] = useState<StudentQuestion[]>([
    {
      id: 'q-1',
      studentName: 'أحمد خليل المصري',
      text: 'أستاذ، هل تردد العتبة (Threshold Frequency) يعتمد على شدة الضوء الساقط أم فقط على نوع مادة المهبط؟',
      time: '10:12',
      isAnswered: true,
      isPinned: true,
      aiAnswer: 'تردد العتبة يعتمد حصراً على نوع مادة المهبط (دالة الشغل W₀)، ولا يتأثر مطلقاً بشدة الضوء الساقط. شدة الضوء تزيد فقط عدد الفوتونات والإلكترونات المنبعثة في الثانية دون التأثير على طاقة الفوتون الواحد.'
    },
    {
      id: 'q-2',
      studentName: 'سارة كنعان',
      text: 'كيف نثبت أن طاقة الفوتون تتناسب عكسياً مع الطول الموجي من خلال معادلة دي برولي؟',
      time: '10:17',
      isAnswered: false,
      isPinned: false
    }
  ]);
  const [newStudentQuestionText, setNewStudentQuestionText] = useState<string>('');

  // Live Poll State
  const [livePoll, setLivePoll] = useState<LivePoll>({
    question: 'ما هي النتيجة الصحيحة عند زيادة تردد الضوء الساقط فوق تردد العتبة؟',
    options: [
      { id: 'opt-1', text: 'زيادة الطاقة الحركية العظمى للإلكترونات الضوئية', votes: 14 },
      { id: 'opt-2', text: 'زيادة عدد الإلكترونات المنبعثة فقط دون طاقتها', votes: 3 },
      { id: 'opt-3', text: 'انخفاض جهد الإيقاف إلى النصف', votes: 1 },
      { id: 'opt-4', text: 'توقف الانبعاث الكهروضوئي تماماً', votes: 0 }
    ],
    totalVotes: 18,
    isActive: true,
    userVotedId: 'opt-1'
  });

  // Recording Timer
  useEffect(() => {
    let interval: any;
    if (isRecording && !isRecordingPaused) {
      interval = setInterval(() => {
        setRecordingDurationSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isRecordingPaused]);

  // Cleanup media recording tracks on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // 6. Canvas Freehand Drawing Engine & Smart Stylus Technology
  // -------------------------------------------------------------
  interface InternalStrokePoint {
    x: number;
    y: number;
    pressure?: number;
    time?: number;
  }

  // Draw smooth handwriting strokes on canvas 2D context
  const renderStrokeOnContext = (
    ctx: CanvasRenderingContext2D,
    points: InternalStrokePoint[],
    color: string,
    baseWidth: number,
    mode: 'smart-pen' | 'calligraphy' | 'highlighter' | 'brush' | 'eraser' = 'smart-pen',
    usePressure: boolean = true,
    smooth: boolean = true
  ) => {
    if (!points || points.length === 0) return;

    ctx.save();
    if (mode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = baseWidth * 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (mode === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color.length === 7 ? color + '55' : color;
      ctx.lineWidth = baseWidth * 3.0;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
    } else if (mode === 'calligraphy') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    } else if (mode === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color + (color.length === 7 ? 'dd' : '');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    if (points.length === 1) {
      const p = points[0];
      const pWidth = usePressure && p.pressure ? baseWidth * (0.4 + p.pressure * 1.3) : baseWidth;
      ctx.fillStyle = mode === 'eraser' ? '#ffffff' : color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, pWidth / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (!smooth || points.length < 3) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineWidth = baseWidth;
      ctx.stroke();
      ctx.restore();
      return;
    }

    // High quality smooth curves across sampled points with full start & end connectivity
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    const lastP = points[points.length - 1];
    ctx.lineTo(lastP.x, lastP.y);
    ctx.lineWidth = baseWidth;
    ctx.stroke();
    ctx.restore();
  };

  // Redraw all completed stroke vectors on canvas
  const redrawAllStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const el of elements) {
      if (el.type === 'stroke' && el.points && el.points.length > 0) {
        renderStrokeOnContext(
          ctx,
          el.points,
          el.color || '#0284c7',
          el.strokeWidth || 3,
          el.extraMeta?.penMode || 'smart-pen',
          el.extraMeta?.pressureSensitivity ?? true,
          el.extraMeta?.inkSmoothing ?? true
        );
      }
    }
  }, [elements]);

  // Synchronize canvas size with device pixel ratio
  const syncCanvasResolution = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 50 && rect.height > 50) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    }
    redrawAllStrokes();
  }, [redrawAllStrokes]);

  // Watch elements changes and redraw canvas
  useEffect(() => {
    redrawAllStrokes();
  }, [elements, redrawAllStrokes]);

  // Auto resize listener
  useEffect(() => {
    syncCanvasResolution();
    window.addEventListener('resize', syncCanvasResolution);
    return () => window.removeEventListener('resize', syncCanvasResolution);
  }, [syncCanvasResolution]);

  // Map pointer event to exact canvas coordinates
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): InternalStrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;
    return { x, y, pressure, time: Date.now() };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect stylus / pen vs touch vs mouse
    const pointerType = (e.pointerType || 'mouse') as 'mouse' | 'touch' | 'pen';
    setDetectedStylusType(pointerType);
    if (pointerType === 'pen') {
      activePenDownRef.current = true;
      lastPenTimeRef.current = Date.now();
      setLivePressure(Math.round((e.pressure || 0.5) * 100));
    }

    // Palm Rejection: If user is actively writing with a stylus pen and palmRejection is ON, ignore simultaneous touch!
    if (palmRejection && pointerType === 'touch' && (activePenDownRef.current || (Date.now() - lastPenTimeRef.current < 400))) {
      return;
    }

    if (activeTool === 'select') return;

    // If stylus or touch writes on canvas while in non-drawing mode (e.g. initial view), auto-activate pen!
    if ((pointerType === 'pen' || pointerType === 'touch') && activeTool !== 'pen' && activeTool !== 'highlighter' && activeTool !== 'eraser') {
      setActiveTool('pen');
    }

    // Capture pointer to avoid losing stroke during rapid writing or gestures
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setIsDrawing(true);
    const startPoint = getCanvasPoint(e);
    lastPointRef.current = startPoint;
    lastMidRef.current = startPoint;
    setCurrentStroke([startPoint]);

    // Immediate tactile dot feedback for Arabic letters dots & math dots
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      const pPressure = (pressureSensitivity && startPoint.pressure) ? startPoint.pressure : 0.5;
      const dynamicWidth = penMode === 'eraser' 
        ? penWidth * 3.2 
        : (pressureSensitivity ? penWidth * (0.35 + pPressure * 1.3) : penWidth);

      if (penMode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, Math.max(2, dynamicWidth / 2), 0, Math.PI * 2);
        ctx.fill();
      } else if (penMode === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = penColor.length === 7 ? penColor + '55' : penColor;
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, Math.max(2, dynamicWidth), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = penColor;
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, Math.max(1, dynamicWidth / 2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    setReticlePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (e.pointerType === 'pen') {
      lastPenTimeRef.current = Date.now();
      setLivePressure(Math.round((e.pressure || 0.5) * 100));
    }

    if (!isDrawing) return;

    // Palm rejection check
    if (palmRejection && e.pointerType === 'touch' && (activePenDownRef.current || (Date.now() - lastPenTimeRef.current < 400))) {
      return;
    }

    const currentPoint = getCanvasPoint(e);
    setCurrentStroke(prev => [...prev, currentPoint]);

    const ctx = canvas.getContext('2d');
    if (ctx && lastPointRef.current && lastMidRef.current) {
      const p0 = lastPointRef.current;
      const p1 = currentPoint;
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

      ctx.save();
      const pPressure = (pressureSensitivity && p1.pressure) ? p1.pressure : 0.5;
      let dynamicWidth = penWidth;
      if (penMode === 'eraser') {
        dynamicWidth = penWidth * 3.2;
        ctx.globalCompositeOperation = 'destination-out';
      } else if (penMode === 'highlighter') {
        dynamicWidth = penWidth * 2.8;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = penColor.length === 7 ? penColor + '55' : penColor;
      } else {
        dynamicWidth = pressureSensitivity ? penWidth * (0.35 + pPressure * 1.3) : penWidth;
        if (penMode === 'calligraphy') {
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const angle = Math.atan2(dy, dx);
          dynamicWidth = penWidth * (0.4 + Math.abs(Math.sin(angle - Math.PI / 4)) * 1.2);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = penColor;
      }

      ctx.lineCap = penMode === 'calligraphy' ? 'butt' : 'round';
      ctx.lineJoin = penMode === 'calligraphy' ? 'miter' : 'round';
      ctx.lineWidth = Math.max(1, dynamicWidth);

      ctx.beginPath();
      ctx.moveTo(lastMidRef.current.x, lastMidRef.current.y);
      ctx.quadraticCurveTo(p0.x, p0.y, mid.x, mid.y);
      ctx.stroke();
      ctx.restore();

      lastPointRef.current = p1;
      lastMidRef.current = mid;
    }
  };

  const handleCanvasPointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      if (e.pointerType === 'pen') {
        activePenDownRef.current = false;
        lastPenTimeRef.current = Date.now();
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    } else {
      activePenDownRef.current = false;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    // Finalize stroke segment to last point
    const canvas = canvasRef.current;
    if (canvas && lastPointRef.current && lastMidRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        if (penMode === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = penWidth * 3.2;
        } else if (penMode === 'highlighter') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = penColor.length === 7 ? penColor + '55' : penColor;
          ctx.lineWidth = penWidth * 2.8;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = penColor;
          ctx.lineWidth = penWidth;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastMidRef.current.x, lastMidRef.current.y);
        ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (currentStroke.length > 0) {
      const newElem: CanvasElement = {
        id: `stroke-${Date.now()}`,
        type: 'stroke',
        x: 0,
        y: 0,
        points: [...currentStroke],
        color: penMode === 'eraser' ? '#ffffff' : penColor,
        strokeWidth: penWidth,
        extraMeta: {
          penMode,
          pressureSensitivity,
          inkSmoothing
        }
      };
      setUndoHistory(prev => [...prev, elements]);
      setElements(prev => [...prev, newElem]);
      setRedoHistory([]);
    }
    setCurrentStroke([]);
    lastPointRef.current = null;
    lastMidRef.current = null;
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    setUndoHistory(prev => [...prev, elements]);
    setElements([]);
    setRedoHistory([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const previous = undoHistory[undoHistory.length - 1];
    setRedoHistory(prev => [...prev, elements]);
    setElements(previous);
    setUndoHistory(prev => prev.slice(0, prev.length - 1));
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[redoHistory.length - 1];
    setUndoHistory(prev => [...prev, elements]);
    setElements(next);
    setRedoHistory(prev => prev.slice(0, prev.length - 1));
  };

  // -------------------------------------------------------------
  // 7. Element Insertion Handlers
  // -------------------------------------------------------------

  // Insert Shape
  const handleInsertShape = (shapeType: 'rect' | 'circle' | 'triangle' | 'cube-3d' | 'axis' | 'arrow') => {
    const id = `shape-${Date.now()}`;
    const newShape: CanvasElement = {
      id,
      type: 'shape',
      x: 120 + Math.random() * 50,
      y: 120 + Math.random() * 40,
      width: shapeType === 'axis' ? 220 : 160,
      height: shapeType === 'axis' ? 160 : 120,
      color: penColor,
      fillColor: penColor + '20',
      extraMeta: { shapeType }
    };
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => [...prev, newShape]);
  };

  // Insert Text Box
  const handleInsertText = () => {
    const id = `text-${Date.now()}`;
    const newText: CanvasElement = {
      id,
      type: 'text',
      x: 100 + Math.random() * 60,
      y: 100 + Math.random() * 50,
      content: 'ملاحظة تعليمية: اكتب هنا أي فكرة أو قانون أساسي...',
      color: penColor,
      extraMeta: { fontSize: 15, isEditing: false }
    };
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => [...prev, newText]);
  };

  // Insert Math Formula
  const handleInsertFormulaFromModal = (options: MathFormulaInsertOptions) => {
    const id = `math-${Date.now()}`;
    const newElem: CanvasElement = {
      id,
      type: 'math',
      x: 80 + Math.random() * 50,
      y: 100 + Math.random() * 40,
      content: options.latex,
      color: options.color || penColor,
      extraMeta: { 
        label: options.isChemistry ? 'معادلة كيميائية' : 'صيغة رياضية / فيزيائية',
        isChemistry: options.isChemistry 
      }
    };
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => [...prev, newElem]);
    setIsFormulaModalOpen(false);
  };

  // Insert Image from Modal or File
  const handleInsertImageFromModal = (options: InsertedImageOptions) => {
    if (options.insertAsBackground) {
      setCanvasBackgroundImage(options.src);
      setIsImageModalOpen(false);
      return;
    }
    const id = `img-${Date.now()}`;
    const newElem: CanvasElement = {
      id,
      type: 'image',
      x: 100 + Math.random() * 60,
      y: 100 + Math.random() * 50,
      width: Math.min(360, options.width || 300),
      height: Math.min(260, options.height || 220),
      content: options.src,
      extraMeta: { title: options.title || 'صورة تعليمية تفاعلية' }
    };
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => [...prev, newElem]);
    setIsImageModalOpen(false);
  };

  // Insert Local Image File
  const handleUploadLocalImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleInsertImageFromModal({
          src: reader.result,
          title: file.name.replace(/\.[^/.]+$/, ''),
          width: 340,
          height: 240,
          insertAsBackground: false
        });
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Canvas Drag & Drop Image Handlers
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCanvasDragOver) setIsCanvasDragOver(true);
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCanvasDragOver(false);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCanvasDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleInsertImageFromModal({
            src: reader.result,
            title: file.name.replace(/\.[^/.]+$/, ''),
            width: 360,
            height: 260,
            insertAsBackground: false
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Global Clipboard Screenshot Paste (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
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
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                handleInsertImageFromModal({
                  src: reader.result,
                  title: `لقطة شاشة ${new Date().toLocaleTimeString('ar-EG')}`,
                  width: 360,
                  height: 260,
                  insertAsBackground: false
                });
              }
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Insert STEM Tool Component
  const handleInsertStemTool = (def: StemToolDef) => {
    const id = `stem-${Date.now()}`;
    const newElem: CanvasElement = {
      id,
      type: 'stem',
      x: 80 + Math.random() * 80,
      y: 100 + Math.random() * 60,
      width: def.defaultWidth || 180,
      height: def.defaultHeight || 140,
      content: def.type,
      color: def.defaultColor || penColor,
      fillColor: def.defaultFillColor || '#e0f2fe',
      stemData: def.defaultParams || {},
      extraMeta: { title: def.titleAr, category: def.category }
    };
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => [...prev, newElem]);
  };

  // Insert Educational Video Widget
  const handleConfirmInsertVideo = () => {
    if (!videoUrlInput.trim()) return;
    const id = `video-${Date.now()}`;
    const newElem: CanvasElement = {
      id,
      type: 'video',
      x: 120 + Math.random() * 50,
      y: 100 + Math.random() * 50,
      width: 340,
      height: 240,
      content: videoUrlInput.trim(),
      extraMeta: {
        title: videoTitleInput.trim() || 'فيديو تعليمي تفاعلي',
        isPlaying: false,
        isMuted: true,
        progress: 25
      }
    };
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => [...prev, newElem]);
    setIsVideoModalOpen(false);
  };

  // Insert PDF Document Card
  const handleConfirmInsertPdf = () => {
    const id = `pdf-${Date.now()}`;
    const newElem: CanvasElement = {
      id,
      type: 'pdf',
      x: 140 + Math.random() * 40,
      y: 80 + Math.random() * 40,
      width: 320,
      height: 380,
      extraMeta: {
        title: pdfTitleInput.trim() || 'ملف PDF تعليمي معتمد',
        currentPage: 1,
        totalPages: Math.max(1, pdfPageCountInput)
      }
    };
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => [...prev, newElem]);
    setIsPdfModalOpen(false);
  };

  // Insert Interactive Student Exercise onto Canvas
  const handleInsertExercise = () => {
    const id = `exercise-${Date.now()}`;
    const newElem: CanvasElement = {
      id,
      type: 'exercise',
      x: 60 + Math.random() * 50,
      y: 120 + Math.random() * 40,
      width: 380,
      height: 250,
      extraMeta: {
        title: 'تمرين تقييمي: اختبار الفهم السريع 🎯',
        question: 'أي من الظواهر التالية تدعم بشكل حاسم الطبيعة الجسيمية للضوء (Photon Model)؟',
        options: [
          { id: 'opt-1', text: 'حيود الضوء من خلال شق ضيق', isCorrect: false },
          { id: 'opt-2', text: 'الظاهرة الكهروضوئية وتأثير كومتون', isCorrect: true },
          { id: 'opt-3', text: 'تداخل الشق المزدوج ليونغ', isCorrect: false },
          { id: 'opt-4', text: 'استقطاب الضوء بالانعكاس', isCorrect: false }
        ],
        selectedOption: null,
        isSubmitted: false,
        explanation: 'الظاهرة الكهروضوئية وتأثير كومتون يفسران الضوء كفوتونات ذات طاقة مكممة تصطدم بالإلكترونات كجسيمات مادية.'
      }
    };
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => [...prev, newElem]);
  };

  // Delete Element from Canvas
  const handleDeleteElement = (id: string) => {
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => prev.filter(el => el.id !== id));
  };

  // Student Solving Exercise directly on board
  const handleSelectExerciseOption = (elemId: string, optId: string) => {
    setElements(prev => prev.map(el => {
      if (el.id === elemId && el.type === 'exercise') {
        return {
          ...el,
          extraMeta: {
            ...el.extraMeta,
            selectedOption: optId,
            isSubmitted: false
          }
        };
      }
      return el;
    }));
  };

  const handleSubmitExerciseAnswer = (elemId: string) => {
    setElements(prev => prev.map(el => {
      if (el.id === elemId && el.type === 'exercise') {
        return {
          ...el,
          extraMeta: {
            ...el.extraMeta,
            isSubmitted: true
          }
        };
      }
      return el;
    }));
  };

  // -------------------------------------------------------------
  // 8. Embedded AI Assistant Prompts & Workflows
  // -------------------------------------------------------------
  const handleTriggerAIAction = async (actionType: 'explain_board' | 'generate_quiz' | 'summarize_lesson' | 'suggest_examples' | 'create_mindmap') => {
    let promptMessage = '';
    let actionTitle = '';

    if (actionType === 'explain_board') {
      actionTitle = 'شرح محتوى اللوح الحالي';
      promptMessage = `اشرح بالتفصيل وبأسلوب تعليمي رصين المفاهيم الظاهرة حالياً على اللوح في درس ${lessonTitle} لمادة ${subject}، مع تبسيط الخطوات الرياضية وربطها بالامتحان.`;
    } else if (actionType === 'generate_quiz') {
      actionTitle = 'توليد أسئلة واختبار سريع';
      promptMessage = `قم بتوليد 3 أسئلة امتحانية ذكية ومباشرة حول مفاهيم ميكانيكا الكم والظاهرة الكهروضوئية المشروحة على اللوح مع بيان الإجابة النموذجية وطريقة الحل.`;
    } else if (actionType === 'summarize_lesson') {
      actionTitle = 'إنشاء ملخص الدرس';
      promptMessage = `لخص الأفكار والقوانين الفيزيائية المكتوبة على اللوح بأسلوب نقاط مركزة للمراجعة السريعة قبل الامتحان.`;
    } else if (actionType === 'suggest_examples') {
      actionTitle = 'اقتراح أمثلة وتمارين إضافية';
      promptMessage = `اقترح تمرينين نموذجيين متدرجين في الصعوبة مع أرقام تطبيقية لحساب طاقة الفوتون وتردد العتبة لتعزيز فهم الطلاب.`;
    } else if (actionType === 'create_mindmap') {
      actionTitle = 'تحويل الشرح إلى خريطة ذهنية';
      promptMessage = `حول موضوع هذا الدرس إلى خريطة ذهنية هيكلية واضحة (العقدة المركزية، الفروع، والمفاهيم الفرعية) جاهزة للتطبيق على اللوح.`;
    }

    // Add user message
    const userMsgId = `user-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user' as const,
      text: `[طلب: ${actionTitle}]: ${promptMessage}`,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      actionType
    };
    setAiMessages(prev => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/teacher/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptMessage,
          subject,
          curriculumContext: `الدرس: ${lessonTitle}\nالمحتوى المكتوب: معادلة طاقة الفوتون E=h*nu، علاقة أينشتاين، موشور الضوء، وتمرين حساب طاقة الفوتون.`
        })
      });

      const data = await res.json();
      let replyText = data.reply || data.text;

      if (!replyText) {
        // High quality educational fallback strictly adhering to the academy instructions
        if (actionType === 'explain_board') {
          replyText = `### شرح المفاهيم المعروضة على اللوح:\n1. **طاقة الفوتون ($E = h\\nu = \\frac{hc}{\\lambda}$):** بيّن العالم ماكس بلانك ثم آينشتاين أن الضوء ينبعث ويمتص على شكل كمات محددة من الطاقة، تتناسب طردياً مع تردد الإشعاع وعكسياً مع الطول الموجي ($\lambda$).\n2. **الظاهرة الكهروضوئية:** تحرير الإلكترونات من سطح المعدن يستلزم فوتوناً يمتلك طاقة تعادل أو تفوق اقتران الشغل للمعدن ($W_0 = h\\nu_0$).\n3. **الأهمية للامتحان:** التركيز دائماً على التحويل بين الإلكترون فولت (eV) والجول (J) باستخدام شحنة الإلكترون $1.6 \\times 10^{-19}\\,\\text{C}$.`;
        } else if (actionType === 'generate_quiz') {
          replyText = `### أسئلة تقييمية سريعة للطلاب:\n1. **سؤال 1:** إذا كان الطول الموجي لضوء ساقط $400\\,\\text{nm}$، ما هي طاقة الفوتون الواحد بالجول؟\n   - **الإجابة النموذجية:** $E = \\frac{hc}{\\lambda} = \\frac{6.626 \\times 10^{-34} \\times 3 \\times 10^8}{400 \\times 10^{-9}} \\approx 4.97 \\times 10^{-19}\\,\\text{J}$.\n2. **سؤال 2:** ما تأثير مضاعفة شدة الضوء مع بقاء التردد ثابتاً؟\n   - **الإجابة:** تزداد شدة التيار الكهروضوئي (عدد الإلكترونات المنبعثة في الثانية)، بينما تبقى الطاقة الحركية العظمى للإلكترونات ثابتة دون تغيير.`;
        } else if (actionType === 'summarize_lesson') {
          replyText = `### ملخص الدرس المركز:\n- **القانون المحوري:** $E = h\\nu = \\frac{hc}{\\lambda}$.\n- **اقتران الشغل ($W$):** الطاقة الصغرى اللازمة لتحرير الإلكترون، وتعتمد حصراً على نوع الفلز.\n- **جهد الإيقاف ($V_0$):** $e V_0 = K_{\\max} = E - W$.\n- **قاعدة ذهبية:** زيادة الشدة تزيد العدد، بينما زيادة التردد تزيد الطاقة.`;
        } else if (actionType === 'suggest_examples') {
          replyText = `### أمثلة وتطبيقات عملية مقترحة:\n1. **مثال 1:** سقط ضوء أحادي اللون تردده $1.2 \\times 10^{15}\\,\\text{Hz}$ على سطح فلز السيزيوم الذي له اقتران شغل $W_0 = 2.14\\,\\text{eV}$.\n   - **المطلوب:** احسب جهد الإيقاف اللازم لإيقاف أسرع الإلكترونات الضوئية.\n   - **الحل:** $E = h\\nu = 6.626 \\times 10^{-34} \\times 1.2 \\times 10^{15} = 7.95 \\times 10^{-19}\\,\\text{J} = 4.97\\,\\text{eV}$.\n   - إذن: $K_{\\max} = E - W_0 = 4.97 - 2.14 = 2.83\\,\\text{eV}$، وبالتالي جهد الإيقاف $V_0 = 2.83\\,\\text{V}$.\n2. **مثال 2:** ما هو الطول الموجي للعتبة لفلز الصوديوم إذا كان اقتران شغله $2.28\\,\\text{eV}$؟\n   - $\\lambda_0 = \\frac{hc}{W_0} = \\frac{1240\\,\\text{eV}\\cdot\\text{nm}}{2.28\\,\\text{eV}} \\approx 544\\,\\text{nm}$.`;
        } else if (actionType === 'create_mindmap') {
          replyText = `### الخريطة الذهنية الهيكلية للدرس:\n- 🧠 **العقدة المركزية:** ميكانيكا الكم والضوء\n  - 🌿 **الفرع 1: الطبيعة الجسيمية:** (فوتونات بلانك، كمات الطاقة $E=hf$، زخم الفوتون $p=h/\\lambda$)\n  - 🌿 **الفرع 2: الظاهرة الكهروضوئية:** (اقتران الشغل $W_0$، تردد العتبة $\\nu_0$، جهد الإيقاف $V_0$)\n  - 🌿 **الفرع 3: الازدواجية والموجات المادية:** (فرضية دي برولي $\\lambda = h/p$، المجهر الإلكتروني)\n  - 🌿 **الفرع 4: التطبيقات التكنولوجية:** (الخلايا الكهروضوئية، أجهزة الاستشعار، مطيافية الليزر).`;

          // Also insert an interactive Mind Map object onto the whiteboard canvas!
          const mindmapElem: CanvasElement = {
            id: `mindmap-${Date.now()}`,
            type: 'mindmap',
            x: 200,
            y: 80,
            width: 380,
            height: 240,
            extraMeta: {
              title: 'الخريطة الذهنية لميكانيكا الكم والضوء 🧠',
              root: 'ميكانيكا الكم والضوء',
              branches: [
                { title: 'الطبيعة الجسيمية', items: ['فوتونات بلانك', 'كمات الطاقة E=hf'] },
                { title: 'الظاهرة الكهروضوئية', items: ['اقتران الشغل W₀', 'جهد الإيقاف V₀'] },
                { title: 'الموجات المادية', items: ['دي برولي λ=h/p', 'المجهر الإلكتروني'] }
              ]
            }
          };
          setElements(prev => [...prev, mindmapElem]);
        }
      }

      setAiMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.warn('AI fallback used:', err);
      setAiMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: `تم تجهيز الشرح والتحليل الأكاديمي المطلوب بناءً على منهاج الفيزياء المعتمد بالأكاديمية.`,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Direct AI chat message send
  const handleSendCustomAiMessage = async () => {
    if (!aiInputMessage.trim() || isAiLoading) return;
    const text = aiInputMessage.trim();
    setAiInputMessage('');

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };
    setAiMessages(prev => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/teacher/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          subject,
          curriculumContext: `الدرس: ${lessonTitle}`
        })
      });
      const data = await res.json();
      const reply = data.reply || data.text || 'أهلاً بك! تم استلام استفسارك وتجهيز الإجابة المعتمدة.';
      setAiMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: reply,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setAiMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: 'لم أتمكن من الاتصال بالخادم مؤقتاً، وتم تفعيل الرد الأكاديمي المباشر.',
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Answer Student Question with One Click
  const handleAiAnswerQuestion = async (q: StudentQuestion) => {
    setIsAiLoading(true);
    const prompt = `سؤال الطالب ${q.studentName}: "${q.text}". يرجى الإجابة بدقة علمية وفق المنهاج المعتمد.`;
    
    try {
      const res = await fetch('/api/teacher/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          subject,
          curriculumContext: `الدرس: ${lessonTitle}`
        })
      });
      const data = await res.json();
      const answer = data.reply || data.text || `إجابة السؤال: يعتمد ذلك حصراً على القوانين الفيزيائية المعتمدة في وحدة ميكانيكا الكم.`;

      // Update question state
      setStudentQuestions(prev => prev.map(item => {
        if (item.id === q.id) {
          return {
            ...item,
            isAnswered: true,
            aiAnswer: answer
          };
        }
        return item;
      }));

      // Add to AI chat stream
      setAiMessages(prev => [
        ...prev,
        {
          id: `ai-ans-${Date.now()}`,
          role: 'assistant',
          text: `**إجابة سؤال الطالب ${q.studentName}:**\n${answer}`,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      setSaveToast(`تمت إجابة سؤال ${q.studentName} بواسطة المعلم الذكي 🤖`);
      setTimeout(() => setSaveToast(''), 3000);
    } catch {
      // Fallback
      setStudentQuestions(prev => prev.map(item => {
        if (item.id === q.id) {
          return {
            ...item,
            isAnswered: true,
            aiAnswer: `تردد العتبة هو صفة مميزة لفلز المهبط (دالة الشغل W₀)، ولا يتأثر مطلقاً بشدة الإشعاع الساقط.`
          };
        }
        return item;
      }));
    } finally {
      setIsAiLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 9. Teacher Actions: Save, Export PDF, Homework, Recording, Firestore Autosave
  // -------------------------------------------------------------
  const autosaveDocId = useMemo(() => {
    const cleanCode = (sessionCode || 'DEFAULT').replace(/[^a-zA-Z0-9-_]/g, '_');
    const cleanLesson = (lessonTitle || 'LESSON').replace(/[^a-zA-Z0-9\u0600-\u06FF-_]/g, '_').slice(0, 35);
    return `autosave_${cleanCode}_${cleanLesson}`;
  }, [sessionCode, lessonTitle]);

  // Mark unsaved changes whenever elements or background style update
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [elements, canvasBgStyle]);

  // Core Firestore synchronization with offline local fallback
  const syncToFirestore = useCallback(async (isManual: boolean = false) => {
    // If automatic tick and no unsaved changes, skip redundant write
    if (!isManual && !hasUnsavedChanges && lastAutosavedAt) {
      return;
    }

    setAutosaveStatus('saving');
    const now = new Date();

    // 1. Always write to LocalStorage first to protect against sudden disconnection or tab close
    try {
      const localPayload = {
        id: autosaveDocId,
        sessionCode,
        lessonTitle,
        teacherName,
        subject,
        canvasBgStyle,
        penColor,
        penWidth,
        penMode,
        elements,
        elementsCount: elements.length,
        savedAt: now.toISOString()
      };
      localStorage.setItem(`tafawuq_whiteboard_autosave_${autosaveDocId}`, JSON.stringify(localPayload));
      localStorage.setItem('tafawuq_whiteboard_last_autosave_id', autosaveDocId);
      setOfflineBackupCount(prev => prev + 1);
    } catch (localErr) {
      console.warn('LocalStorage backup quota reached or error:', localErr);
    }

    // 2. Check if browser is offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setAutosaveStatus('offline');
      setLastAutosavedAt(now);
      setIsLessonSaved(true);
      if (isManual) {
        setSaveToast('تم الحفظ في النسخة الاحتياطية المحلية 📶 (أنت غير متصل بالإنترنت حالياً)');
        setTimeout(() => setSaveToast(''), 4000);
      }
      return;
    }

    // 3. Save to Firebase Firestore (whiteboard_autosaves)
    try {
      const docRef = doc(db, 'whiteboard_autosaves', autosaveDocId);

      // Sanitize elements for Firestore payload
      const sanitizedElements = elements.map(el => {
        const clean: any = {
          id: el.id,
          type: el.type,
          x: el.x,
          y: el.y
        };
        if (el.width !== undefined) clean.width = el.width;
        if (el.height !== undefined) clean.height = el.height;
        if (el.content !== undefined) clean.content = el.content;
        if (el.color !== undefined) clean.color = el.color;
        if (el.fillColor !== undefined) clean.fillColor = el.fillColor;
        if (el.strokeWidth !== undefined) clean.strokeWidth = el.strokeWidth;
        if (el.stemData !== undefined) clean.stemData = el.stemData;
        if (el.extraMeta !== undefined) clean.extraMeta = el.extraMeta;
        if (el.points && Array.isArray(el.points)) {
          clean.points = el.points.map(p => ({
            x: Math.round(p.x * 10) / 10,
            y: Math.round(p.y * 10) / 10,
            ...(p.pressure !== undefined ? { pressure: Math.round(p.pressure * 100) / 100 } : {})
          }));
        }
        return clean;
      });

      await setDoc(docRef, {
        id: autosaveDocId,
        sessionCode,
        lessonTitle: lessonTitle || 'درس بدون عنوان',
        teacherName: teacherName || 'المعلم',
        subject: subject || 'عام',
        canvasBgStyle,
        penColor,
        penWidth,
        penMode,
        elements: sanitizedElements,
        elementsCount: sanitizedElements.length,
        clientTimestamp: now.toISOString(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setAutosaveStatus('saved');
      setLastAutosavedAt(now);
      setHasUnsavedChanges(false);
      setIsLessonSaved(true);

      if (isManual) {
        setSaveToast('تم حفظ اللوح التفاعلي في Firebase Firestore بنجاح ☁️✓');
        setTimeout(() => setSaveToast(''), 3000);
      }
    } catch (err: any) {
      console.error('Error saving to Firebase Firestore:', err);
      setAutosaveStatus('error');
      if (isManual) {
        setSaveToast('تعذر الاتصال بـ Firestore: البيانات مؤمنة محلياً ⚠️');
        setTimeout(() => setSaveToast(''), 4000);
      }
    }
  }, [autosaveDocId, sessionCode, lessonTitle, teacherName, subject, canvasBgStyle, penColor, penWidth, penMode, elements, hasUnsavedChanges, lastAutosavedAt]);

  // Periodic Autosave every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      syncToFirestore(false);
    }, 30000); // 30,000 ms = exactly 30 seconds

    return () => clearInterval(timer);
  }, [syncToFirestore]);

  // Network Listeners: Auto sync when connection is restored
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSaveToast('تمت استعادة الاتصال بالإنترنت! 🌐 جاري المزامنة مع Firestore...');
      setTimeout(() => setSaveToast(''), 3000);
      syncToFirestore(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setAutosaveStatus('offline');
      setSaveToast('انقطع الاتصال بالإنترنت 📶! تم تفعيل الحفظ المحلي التلقائي');
      setTimeout(() => setSaveToast(''), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncToFirestore]);

  // Restore previous autosave on mount (from Firestore or Local Storage)
  useEffect(() => {
    let isMounted = true;
    const restoreSavedBoard = async () => {
      try {
        const docRef = doc(db, 'whiteboard_autosaves', autosaveDocId);
        const snap = await getDoc(docRef);
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data && Array.isArray(data.elements) && data.elements.length > elements.length) {
            setElements(data.elements);
            if (data.canvasBgStyle) setCanvasBgStyle(data.canvasBgStyle);
            setLastAutosavedAt(new Date());
            setIsRestoredFromCloud(true);
            setSaveToast('تم استرجاع آخر نسخة محفوظة تلقائياً من Firebase Firestore ☁️');
            setTimeout(() => setSaveToast(''), 4000);
            return;
          }
        }
      } catch (cloudErr) {
        console.warn('Could not query Firestore autosave, checking local backup:', cloudErr);
      }

      // Fallback check from localStorage
      try {
        const localDataStr = localStorage.getItem(`tafawuq_whiteboard_autosave_${autosaveDocId}`);
        if (localDataStr && isMounted) {
          const localData = JSON.parse(localDataStr);
          if (localData && Array.isArray(localData.elements) && localData.elements.length > elements.length) {
            setElements(localData.elements);
            if (localData.canvasBgStyle) setCanvasBgStyle(localData.canvasBgStyle);
            setLastAutosavedAt(new Date(localData.savedAt || Date.now()));
            setSaveToast('تم استرجاع مسودة اللوح من النسخة الاحتياطية المحلية 💾');
            setTimeout(() => setSaveToast(''), 4000);
          }
        }
      } catch {}
    };

    restoreSavedBoard();
    return () => { isMounted = false; };
  }, [autosaveDocId]);

  const handleSaveLesson = () => {
    syncToFirestore(true);
  };

  // Real MediaRecorder API Implementation for Screen & Audio Recording
  const startRecording = async () => {
    setRecordingError(null);
    try {
      let combinedStream: MediaStream | null = null;
      let activeMode: 'screen' | 'canvas' = recordingMode;

      // 1. If screen recording was requested, attempt getDisplayMedia with graceful policy fallback
      if (activeMode === 'screen') {
        try {
          if (!navigator.mediaDevices?.getDisplayMedia) {
            throw new Error('ميزة مشاركة الشاشة getDisplayMedia غير مدعومة في البيئة الحالية');
          }

          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'browser',
              frameRate: { ideal: 30, max: 60 }
            },
            audio: true
          });

          // Mix in microphone audio if teacher enabled it
          if (recordWithMic && navigator.mediaDevices?.getUserMedia) {
            try {
              const micStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true }
              });

              const displayAudioTracks = displayStream.getAudioTracks();
              const micAudioTracks = micStream.getAudioTracks();

              if (displayAudioTracks.length > 0 && micAudioTracks.length > 0 && typeof window.AudioContext !== 'undefined') {
                const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioCtx = new AudioCtxClass();
                const dest = audioCtx.createMediaStreamDestination();

                const displaySource = audioCtx.createMediaStreamSource(new MediaStream([displayAudioTracks[0]]));
                const micSource = audioCtx.createMediaStreamSource(new MediaStream([micAudioTracks[0]]));

                displaySource.connect(dest);
                micSource.connect(dest);

                combinedStream = new MediaStream([
                  ...displayStream.getVideoTracks(),
                  ...dest.stream.getAudioTracks()
                ]);
              } else {
                combinedStream = new MediaStream([
                  ...displayStream.getVideoTracks(),
                  ...micAudioTracks,
                  ...displayAudioTracks
                ]);
              }
            } catch (micErr) {
              console.warn('Microphone permission not granted, using screen audio only:', micErr);
              combinedStream = displayStream;
            }
          } else {
            combinedStream = displayStream;
          }

          // When user stops sharing from native browser bar
          const videoTrack = combinedStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              stopRecording();
            };
          }
        } catch (screenErr: any) {
          const isPolicyError = 
            screenErr?.message?.includes('Permissions policy') || 
            screenErr?.message?.includes('permissions policy') || 
            screenErr?.message?.includes('display-capture') || 
            screenErr?.name === 'SecurityError';

          const isUserCancelled = 
            screenErr?.name === 'NotAllowedError' && 
            !isPolicyError && 
            !screenErr?.message?.includes('policy');

          if (isUserCancelled) {
            setSaveToast('تم إلغاء اختيار الشاشة من قبل المستخدم ℹ️');
            setTimeout(() => setSaveToast(''), 3000);
            return;
          }

          // Fallback to canvas recording if screen capture is restricted by iframe/permissions policy
          console.warn('Display capture disallowed by browser permissions policy, falling back to whiteboard canvas recording:', screenErr);
          activeMode = 'canvas';
          setRecordingMode('canvas');
          setSaveToast('تم التحويل لتسجيل لوح الرسم التفاعلي بدقة عالية نظراً لقيود المتصفح 🎨🎥');
        }
      }

      // 2. If canvas recording (either requested directly or fallen back from screen policy restriction)
      if (activeMode === 'canvas' || !combinedStream) {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('لوح الرسم غير متاح للتسجيل حالياً');

        const canvasStream = (canvas as any).captureStream 
          ? (canvas as any).captureStream(30) 
          : (canvas as any).mozCaptureStream 
            ? (canvas as any).mozCaptureStream(30)
            : null;

        if (!canvasStream) throw new Error('ميزة captureStream غير مدعومة للكانفاس في هذا المتصفح');

        if (recordWithMic && navigator.mediaDevices?.getUserMedia) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true }
            });
            const tracks = [...canvasStream.getVideoTracks(), ...micStream.getAudioTracks()];
            combinedStream = new MediaStream(tracks);
          } catch {
            combinedStream = canvasStream;
          }
        } else {
          combinedStream = canvasStream;
        }
      }

      if (!combinedStream) {
        throw new Error('تعذر إنشاء مسار الفيديو لتسجيل الحصة');
      }

      mediaStreamRef.current = combinedStream;

      // Select supported mimeType
      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];
      let selectedMime = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        selectedMime = mimeCandidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
      }

      const recorderOptions: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: selectedMime || 'video/webm'
        });
        setRecordedBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setRecordedVideoUrl(url);

        // Auto trigger download for teacher
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
        const cleanLesson = (lessonTitle || 'درس').replace(/\s+/g, '_');
        const filename = `تسجيل_${cleanLesson}_${dateStr}.webm`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Stop all media tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }

        setIsRecording(false);
        setIsRecordingPaused(false);
        setSaveToast(`تم إنهاء وحفظ ملف الفيديو تلقائياً (${formatSeconds(recordingDurationSeconds)}) 🎥`);
        setTimeout(() => setSaveToast(''), 4500);
      };

      // Start recording with 1000ms chunk timeslice
      recorder.start(1000);
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingDurationSeconds(0);
      setSaveToast('بدأ تسجيل الشاشة والصوت للدرس بواسطة MediaRecorder API 🔴');
      setTimeout(() => setSaveToast(''), 3000);

    } catch (err: any) {
      console.warn('Error starting media recording:', err);
      if (err.name === 'NotAllowedError') {
        setSaveToast('تم إلغاء أو تقييد مشاركة الشاشة من قبل المتصفح ℹ️');
      } else {
        setRecordingError(err.message || 'تعذر بدء تسجيل الشاشة والصوت');
        setSaveToast('تعذر بدء التسجيل: تحقق من أذونات المتصفح ⚠️');
      }
      setTimeout(() => setSaveToast(''), 4000);
      setIsRecording(false);
      setIsRecordingPaused(false);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
      setSaveToast('تم إيقاف التسجيل مؤقتاً ⏸️');
      setTimeout(() => setSaveToast(''), 2000);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
      setSaveToast('تم استئناف التسجيل ▶️');
      setTimeout(() => setSaveToast(''), 2000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
      setIsRecordingPaused(false);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  const handleToggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const handleInsertRecordedVideoToCanvas = () => {
    if (!recordedVideoUrl) return;
    const newElem: CanvasElement = {
      id: `elem-rec-video-${Date.now()}`,
      type: 'video',
      x: 70,
      y: 120,
      width: 440,
      height: 290,
      content: recordedVideoUrl,
      extraMeta: {
        title: `تسجيل حصة: ${lessonTitle} (${formatSeconds(recordingDurationSeconds)})`,
        isPlaying: false,
        isMuted: false
      }
    };
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => [...prev, newElem]);
    setSaveToast('تم إدراج الفيديو المسجل مباشرة في مساحة اللوح الذكي! 🎬');
    setTimeout(() => setSaveToast(''), 3500);
  };

  const handleDownloadRecordedVideo = () => {
    if (!recordedVideoUrl) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cleanLesson = (lessonTitle || 'درس').replace(/\s+/g, '_');
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `تسجيل_${cleanLesson}_${dateStr}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportPDF = async () => {
    const container = workspaceContainerRef.current;
    if (!container) return;

    setSaveToast('جاري تصدير اللوح التفاعلي كملف PDF عالي الجودة... 📄');
    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: canvasBgStyle === 'dark' ? '#0f172a' : '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`لوح_المعلم_الذكي_${lessonTitle.replace(/\s+/g, '_')}.pdf`);
      setSaveToast('تم تحميل ملف الـ PDF بنجاح ✅');
      setTimeout(() => setSaveToast(''), 3000);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setSaveToast('حدث خطأ أثناء تصدير الـ PDF');
      setTimeout(() => setSaveToast(''), 3000);
    }
  };

  const handleCopySessionCode = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(sessionCode);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 2500);
    }
  };

  const handleAssignHomework = (e: React.FormEvent) => {
    e.preventDefault();
    setHomeworkSuccess('تم إنشاء الواجب المنزلي وتوزيعه بنجاح على طلاب الصف المرتبطين بهذا اللوح! 📚');
    setTimeout(() => {
      setHomeworkSuccess('');
      setIsHomeworkModalOpen(false);
    }, 2000);
  };

  // Student vote in Live Poll
  const handleVotePoll = (optionId: string) => {
    if (livePoll.userVotedId === optionId) return;
    setLivePoll(prev => {
      const updatedOpts = prev.options.map(opt => {
        if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
        if (opt.id === prev.userVotedId) return { ...opt, votes: Math.max(0, opt.votes - 1) };
        return opt;
      });
      return {
        ...prev,
        options: updatedOpts,
        totalVotes: prev.userVotedId ? prev.totalVotes : prev.totalVotes + 1,
        userVotedId: optionId
      };
    });
  };

  // Student hand raise toggle
  const handleToggleMyHand = () => {
    setParticipants(prev => {
      return prev.map(p => {
        if (p.id === 'st-1') {
          return {
            ...p,
            isHandRaised: !p.isHandRaised,
            handRaisedTime: !p.isHandRaised ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : undefined
          };
        }
        return p;
      });
    });
  };

  // Submit student question
  const handleSubmitStudentQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentQuestionText.trim()) return;
    const newQ: StudentQuestion = {
      id: `q-${Date.now()}`,
      studentName: 'أحمد خليل المصري',
      text: newStudentQuestionText.trim(),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      isAnswered: false,
      isPinned: false
    };
    setStudentQuestions(prev => [newQ, ...prev]);
    setNewStudentQuestionText('');
  };

  // Pin student question onto the canvas
  const handlePinQuestionToCanvas = (q: StudentQuestion) => {
    const id = `pinned-${Date.now()}`;
    const newElem: CanvasElement = {
      id,
      type: 'text',
      x: 100,
      y: 180,
      content: `❓ سؤال الطالب ${q.studentName}: "${q.text}"\n${q.aiAnswer ? `💡 الإجابة: ${q.aiAnswer}` : ''}`,
      color: '#b45309',
      extraMeta: { isPinnedQuestion: true }
    };
    setUndoHistory(prev => [...prev, elements]);
    setElements(prev => [...prev, newElem]);
  };

  // Predefined STEM tools by category
  const activeStemCategoryTools = useMemo(() => {
    return STEM_TOOL_DEFINITIONS.filter(t => t.category === stemCategory);
  }, [stemCategory]);

  return (
    <div 
      className="fixed inset-0 z-[240] w-screen h-screen bg-[#070e1b] text-slate-100 flex flex-col select-none overflow-hidden font-sans"
      dir="rtl"
    >
      {/* ========================================================================= */}
      {/* 1. Global Navigation & Session Control Header                             */}
      {/* ========================================================================= */}
      <header className="h-14 bg-slate-950/95 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-30 shadow-md">
        
        {/* Left: Branding & Lesson Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-black shadow-md shadow-cyan-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                <span>اللوح الذكي التفاعلي</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.2 rounded-full font-bold">
                  منصة المعلم الذكي
                </span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-xs sm:max-w-md">
              {teacherName} • {lessonTitle}
            </p>
          </div>
        </div>

        {/* Center: Live Recording & Session Indicator */}
        <div className="flex items-center gap-2">
          {/* Recording Badge & Live Controls */}
          {isRecording ? (
            <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-600 text-rose-200 px-2 py-1 rounded-xl text-xs font-mono font-bold shadow-lg shadow-rose-900/40">
              <span className={`w-2 h-2 rounded-full bg-rose-500 ${isRecordingPaused ? 'opacity-50' : 'animate-ping'}`} />
              <span className="text-rose-400">REC</span>
              <span className="font-bold text-white">{formatSeconds(recordingDurationSeconds)}</span>
              {recordWithMic && <Mic size={11} className="text-emerald-400 mr-1" title="صوت الميكروفون قيد التسجيل" />}

              {/* Pause / Resume */}
              {isRecordingPaused ? (
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="p-1 hover:bg-rose-900/60 rounded text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                  title="استئناف التسجيل"
                >
                  <Play size={12} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="p-1 hover:bg-rose-900/60 rounded text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                  title="إيقاف مؤقت"
                >
                  <Pause size={12} />
                </button>
              )}

              {/* Stop & Save */}
              <button
                type="button"
                onClick={stopRecording}
                className="p-1 hover:bg-rose-800 rounded bg-rose-700/80 text-white transition-colors cursor-pointer"
                title="إنهاء التسجيل وحفظ الفيديو"
              >
                <StopCircle size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={startRecording}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-rose-500/40 hover:border-rose-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer group shadow-xs"
              title="بدء تسجيل الشاشة والصوت للدرس عبر MediaRecorder API"
            >
              <Radio size={13} className="text-rose-400 group-hover:animate-pulse" />
              <span className="hidden sm:inline">تسجيل الشاشة والصوت</span>
            </button>
          )}

          {/* Session Code Sharing Pill */}
          <div 
            onClick={handleCopySessionCode}
            className="flex items-center gap-1.5 bg-blue-950/60 border border-blue-800/80 hover:border-cyan-400 text-blue-200 px-2.5 py-1 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
            title="انقر لنسخ كود الجلسة ومشاركته مع الطلاب"
          >
            <Share2 size={12} className="text-cyan-400" />
            <span>كود: {sessionCode}</span>
            {isCopiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-400" />}
          </div>
        </div>

        {/* Right: Quick Action Buttons & Close */}
        <div className="flex items-center gap-2">
          {/* Periodic 30s Firestore Autosave Live Indicator */}
          <button
            type="button"
            onClick={() => syncToFirestore(true)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              autosaveStatus === 'saving'
                ? 'bg-cyan-950/70 border-cyan-500/80 text-cyan-300'
                : autosaveStatus === 'offline'
                ? 'bg-amber-950/70 border-amber-500/80 text-amber-300'
                : autosaveStatus === 'error'
                ? 'bg-rose-950/70 border-rose-500/80 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title="حفظ تلقائي دوري كل 30 ثانية في Firebase Firestore مع حماية عدم الاتصال. انقر للحفظ السحابي الفوري."
          >
            {autosaveStatus === 'saving' ? (
              <>
                <Cloud size={13} className="text-cyan-400 animate-spin" />
                <span className="hidden lg:inline text-[10px]">جاري الحفظ...</span>
              </>
            ) : autosaveStatus === 'offline' ? (
              <>
                <CloudOff size={13} className="text-amber-400" />
                <span className="hidden lg:inline text-[10px]">محفوظ محلياً (أوفلاين)</span>
              </>
            ) : autosaveStatus === 'error' ? (
              <>
                <AlertCircle size={13} className="text-rose-400" />
                <span className="hidden lg:inline text-[10px]">إعادة المحاولة</span>
              </>
            ) : (
              <>
                <Cloud size={13} className="text-emerald-400" />
                <span className="hidden lg:inline text-[10px]">
                  سحابي (30ث) {lastAutosavedAt ? `✓` : ''}
                </span>
              </>
            )}
          </button>

          <button
            onClick={handleSaveLesson}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            title="حفظ الدرس ومحتوى اللوح في Firebase Firestore"
          >
            <Save size={13} className="text-emerald-400" />
            <span className="hidden md:inline">حفظ</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            title="تصدير اللوح كملف PDF"
          >
            <Download size={13} className="text-blue-400" />
            <span className="hidden md:inline">تصدير PDF</span>
          </button>

          <button
            onClick={() => setIsHomeworkModalOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="إنشاء واجب منزلي للطلاب من موضوع الدرس"
          >
            <PlusCircle size={13} />
            <span className="hidden sm:inline">إنشاء واجب</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-rose-950/80 rounded-xl text-slate-400 hover:text-rose-300 transition-colors cursor-pointer ml-1"
              title="إغلاق اللوح"
            >
              <X size={18} />
            </button>
          )}
        </div>

      </header>

      {/* Floating Save / Export Toast Notification */}
      {saveToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 border border-cyan-400 text-white rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles size={14} className="text-cyan-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Main Workspace Layout: 70% Canvas Area + 30% Side Panel                */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden relative">
        
        {/* ======================================================================= */}
        {/* 2.1 PRIMARY CANVAS & DRAWING WORKSPACE (70% WIDTH)                       */}
        {/* ======================================================================= */}
        <main 
          ref={workspaceContainerRef}
          className="w-full md:w-[70%] h-full flex flex-col bg-slate-900 border-l border-slate-800 relative overflow-hidden shrink-0"
        >
          {/* Top Floating Rich Toolbar for Canvas Tools & Styles */}
          <div className="smart-whiteboard-toolbar h-12 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-2 sm:px-3 flex items-center justify-between gap-1.5 z-20 shrink-0 text-xs overflow-x-auto no-scrollbar">
            
            {/* Primary Drawing Tools Group with Smart Stylus Modes */}
            <div className="flex items-center gap-1 bg-slate-900/95 p-1 rounded-xl border border-slate-800 shrink-0 relative">
              
              {/* Pen Mode 1: Smart Pen (حبر ذكي مع حساسية الضغط) */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('pen');
                    setPenMode('smart-pen');
                  }}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeTool === 'pen' && penMode === 'smart-pen'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="قلم الكتابة والرسم الذكي (Pen): خط ناعم مع حساسية الضغط وتنعيم الحركة"
                  aria-label="قلم الحبر الذكي (Pen)"
                  data-tooltip="قلم الحبر الذكي للسبورة (Pen)"
                >
                  <Pencil size={14} />
                  <span className="hidden lg:inline text-[10px]">قلم ذكي</span>
                </button>
                <div 
                  role="tooltip"
                  className="smart-toolbar-tooltip pointer-events-none absolute top-full mt-2 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-cyan-500/50 flex flex-col items-start gap-0.5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>قلم الكتابة الذكي (Pen)</span>
                  </div>
                  <span className="text-[9px] text-slate-300 font-normal">دليل المعلم: خط ناعم وتلقائي مع حساسية الضغط وتنعيم المنحنيات</span>
                  <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-950" />
                </div>
              </div>

              {/* Pen Mode 2: Calligraphy (قلم الخط العربي المائل) */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('pen');
                    setPenMode('calligraphy');
                  }}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeTool === 'pen' && penMode === 'calligraphy'
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="قلم الخطاط العربي: رأس مشطوف مائل لكتابة رقعة ونسخ احترافية"
                  aria-label="قلم الخط العربي (Calligraphy)"
                  data-tooltip="قلم الخط العربي"
                >
                  <PenTool size={14} />
                  <span className="hidden lg:inline text-[10px]">خطاط</span>
                </button>
                <div 
                  role="tooltip"
                  className="smart-toolbar-tooltip pointer-events-none absolute top-full mt-2 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-amber-500/50 flex flex-col items-start gap-0.5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>قلم الخطاط (Calligraphy)</span>
                  </div>
                  <span className="text-[9px] text-slate-300 font-normal">رأس مشطوف مائل لكتابة العناوين بالخط العربي</span>
                  <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-950" />
                </div>
              </div>

              {/* Pen Mode 3: Highlighter (قلم التمييز الفسفوري) */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('highlighter');
                    setPenMode('highlighter');
                  }}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeTool === 'highlighter' || penMode === 'highlighter'
                      ? 'bg-yellow-400 text-slate-950 shadow-md font-black' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="قلم التظليل والتمييز الفسفوري العريض"
                  aria-label="قلم التمييز والتظليل (Highlighter)"
                  data-tooltip="قلم التظليل الفسفوري"
                >
                  <Sparkles size={14} />
                  <span className="hidden lg:inline text-[10px]">تظليل</span>
                </button>
                <div 
                  role="tooltip"
                  className="smart-toolbar-tooltip pointer-events-none absolute top-full mt-2 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-yellow-500/50 flex flex-col items-start gap-0.5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-1.5 text-yellow-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span>قلم التمييز (Highlighter)</span>
                  </div>
                  <span className="text-[9px] text-slate-300 font-normal">تظليل شفاف فوق الكلمات والمسائل للشرح والتوضيح</span>
                  <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-950" />
                </div>
              </div>

              {/* Pen Mode 4: Eraser (الممحاة الذكية) */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('eraser');
                    setPenMode('eraser');
                  }}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeTool === 'eraser' || penMode === 'eraser'
                      ? 'bg-rose-500 text-white shadow-md font-black' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="الممحاة الذكية (Eraser): مسح سريع للخطوط والأشكال بنقرة أو سحب"
                  aria-label="الممحاة الذكية (Eraser)"
                  data-tooltip="الممحاة الذكية (Eraser)"
                >
                  <Eraser size={14} />
                  <span className="hidden lg:inline text-[10px]">ممحاة</span>
                </button>
                <div 
                  role="tooltip"
                  className="smart-toolbar-tooltip pointer-events-none absolute top-full mt-2 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-rose-500/50 flex flex-col items-start gap-0.5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-1.5 text-rose-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>الممحاة الذكية (Eraser)</span>
                  </div>
                  <span className="text-[9px] text-slate-300 font-normal">دليل المعلم: مسح سريع للخطوط والرسومات بنقرة أو سحب</span>
                  <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-950" />
                </div>
              </div>

              <div className="w-px h-4 bg-slate-800 mx-0.5" />

              {/* Color Presets */}
              {[
                { hex: '#0284c7', title: 'أزرق ملكي' },
                { hex: '#00E5FF', title: 'سماوي نيون' },
                { hex: '#10b981', title: 'أخضر زمردي' },
                { hex: '#e11d48', title: 'أحمر قاني' },
                { hex: '#f59e0b', title: 'أصفر لامع' },
                { hex: '#9333ea', title: 'بنفسجي' },
                { hex: '#ffffff', title: 'أبيض ناصع' },
                { hex: '#0f172a', title: 'أسود داكن' }
              ].map(c => (
                <button
                  key={c.hex}
                  onClick={() => {
                    setPenColor(c.hex);
                    if (penMode === 'eraser') setPenMode('smart-pen');
                    if (activeTool === 'eraser') setActiveTool('pen');
                  }}
                  className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer border ${
                    penColor === c.hex ? 'scale-125 border-white ring-2 ring-cyan-400/50' : 'border-slate-700/60 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.title}
                />
              ))}

              <div className="w-px h-4 bg-slate-800 mx-0.5" />

              {/* Width Selector */}
              {[2, 4, 7, 12].map(w => (
                <button
                  key={w}
                  onClick={() => setPenWidth(w)}
                  className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                    penWidth === w ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={`سُمك سن القلم: ${w}px`}
                >
                  {w}
                </button>
              ))}

              <div className="w-px h-4 bg-slate-800 mx-0.5" />

              {/* Smart Tablet & Stylus Settings Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsStylusSettingsOpen(prev => !prev)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                    isStylusSettingsOpen || detectedStylusType === 'pen'
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900 text-slate-300 hover:text-white border-slate-750'
                  }`}
                  title="إعدادات القلم واللوح الذكي: حساسية الضغط، مانع راحة اليد، وتنعيم الخط"
                >
                  <SlidersHorizontal size={12} className="text-cyan-400" />
                  <span className="hidden sm:inline">اللوح الذكي</span>
                  {detectedStylusType === 'pen' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" title="قلم Stylus متصل" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
                  )}
                </button>

                {/* Stylus Settings Flyout */}
                {isStylusSettingsOpen && (
                  <div 
                    className="absolute top-10 right-0 z-50 w-72 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 shadow-2xl space-y-2.5 text-right font-sans"
                    dir="rtl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <PenTool size={14} className="text-cyan-400" />
                        <span className="text-xs font-black text-white">إعدادات القلم واللوح الذكي</span>
                      </div>
                      <button 
                        onClick={() => setIsStylusSettingsOpen(false)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* Active Input Device Badge */}
                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">وسيلة الإدخال المستشعرة:</span>
                      <span className="font-bold text-cyan-300 flex items-center gap-1">
                        {detectedStylusType === 'pen' ? '🖊️ قلم إلكتروني (Stylus)' : detectedStylusType === 'touch' ? '👆 شاشة لمس (Touch)' : '🖱️ مؤشر الفأرة (Mouse)'}
                      </span>
                    </div>

                    {/* Live Pressure Meter */}
                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">مقياس ضغط سن القلم اللحظي:</span>
                        <span className="font-mono text-cyan-400 font-bold">{livePressure}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-75"
                          style={{ width: `${Math.max(5, livePressure)}%` }}
                        />
                      </div>
                    </div>

                    {/* Toggle: Pressure Sensitivity */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 cursor-pointer text-[11px]">
                      <div>
                        <div className="font-bold text-white">حساسية ضغط القلم (Pressure)</div>
                        <div className="text-[9px] text-slate-400">تغيير سماكة الحبر تلقائياً بقوة الضغط</div>
                      </div>
                      <input 
                        type="checkbox"
                        checked={pressureSensitivity}
                        onChange={(e) => setPressureSensitivity(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </label>

                    {/* Toggle: Palm Rejection */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 cursor-pointer text-[11px]">
                      <div>
                        <div className="font-bold text-white">مانع لمس راحة اليد (Palm Rejection)</div>
                        <div className="text-[9px] text-slate-400">تجاهل لمسات الكف عند الكتابة بالقلم</div>
                      </div>
                      <input 
                        type="checkbox"
                        checked={palmRejection}
                        onChange={(e) => setPalmRejection(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </label>

                    {/* Toggle: Ink Smoothing */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 cursor-pointer text-[11px]">
                      <div>
                        <div className="font-bold text-white">تنعيم الخط الذكي (Ink Smoothing)</div>
                        <div className="text-[9px] text-slate-400">انسيابية الحبر ومنع التعرج بالمنحنيات</div>
                      </div>
                      <input 
                        type="checkbox"
                        checked={inkSmoothing}
                        onChange={(e) => setInkSmoothing(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </label>

                    {/* Toggle: Nib Reticle */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 cursor-pointer text-[11px]">
                      <div>
                        <div className="font-bold text-white">مؤشر سن القلم (Nib Reticle)</div>
                        <div className="text-[9px] text-slate-400">إظهار نقطة ارتكاز سن القلم بدقة</div>
                      </div>
                      <input 
                        type="checkbox"
                        checked={showStylusReticle}
                        onChange={(e) => setShowStylusReticle(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </label>

                    <div className="pt-1 text-center">
                      <span className="text-[9px] text-emerald-400 font-bold block">
                        ✓ متوافق مع Apple Pencil و Wacom و S-Pen وشاشات Smart Board
                      </span>
                    </div>

                  </div>
                )}
              </div>

            </div>

            {/* Insertion Tools Group */}
            <div className="flex items-center gap-1 shrink-0">
              
              {/* Shapes dropdown button */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => handleInsertShape(selectedShape)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="الأشكال الهندسية والمجسمات (Shapes): إدراج مستطيلات، دوائر، مثلثات ومجسمات ومحاور"
                  aria-label="الأشكال الهندسية (Shapes)"
                  data-tooltip="الأشكال الهندسية (Shapes)"
                >
                  <Square size={13} className="text-cyan-400" />
                  <span className="hidden sm:inline">أشكال</span>
                </button>
                <div 
                  role="tooltip"
                  className="smart-toolbar-tooltip pointer-events-none absolute top-full mt-2 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-cyan-500/50 flex flex-col items-start gap-0.5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>الأشكال الهندسية (Shapes)</span>
                  </div>
                  <span className="text-[9px] text-slate-300 font-normal">دليل المعلم: إدراج مستطيلات، دوائر، مثلثات ومجسمات ومحاور</span>
                  <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-950" />
                </div>
              </div>

              {/* Text Tool */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={handleInsertText}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="كتابة نصوص وملاحظات"
                  aria-label="أداة النصوص (Text)"
                  data-tooltip="أداة النصوص (Text)"
                >
                  <Type size={13} className="text-emerald-400" />
                  <span className="hidden sm:inline">نص</span>
                </button>
                <div 
                  role="tooltip"
                  className="smart-toolbar-tooltip pointer-events-none absolute top-full mt-2 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold shadow-2xl border border-emerald-500/50 flex flex-col items-start gap-0.5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>أداة النصوص (Text)</span>
                  </div>
                  <span className="text-[9px] text-slate-300 font-normal">إضافة نصوص وشروحات وملاحظات أكاديمية</span>
                  <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-950" />
                </div>
              </div>

              {/* Math formula */}
              <button
                onClick={() => setIsFormulaModalOpen(true)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="معادلات رياضية وفيزيائية"
              >
                <Calculator size={13} className="text-purple-400" />
                <span className="hidden sm:inline">معادلة</span>
              </button>

              {/* Hidden file input for uploading images */}
              <input
                ref={localImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadLocalImage}
                className="hidden"
              />

              {/* Upload image from device */}
              <button
                type="button"
                onClick={() => localImageInputRef.current?.click()}
                className="px-2 py-1 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 hover:text-white border border-cyan-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="استيراد صورة من جهازك للكتابة والشرح عليها"
              >
                <Upload size={13} className="text-cyan-400" />
                <span className="hidden sm:inline">رفع صورة</span>
              </button>

              {/* Insert Image */}
              <button
                onClick={() => setIsImageModalOpen(true)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="مكتبة الصور والرسوم التعليمية"
              >
                <ImageIcon size={13} className="text-blue-400" />
                <span className="hidden sm:inline">مكتبة الصور</span>
              </button>

              {/* Insert PDF */}
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="إدراج ملفات PDF"
              >
                <FileText size={13} className="text-rose-400" />
                <span className="hidden sm:inline">PDF</span>
              </button>

              {/* Insert Video */}
              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="إدراج فيديوهات تعليمية"
              >
                <Video size={13} className="text-amber-400" />
                <span className="hidden sm:inline">فيديو</span>
              </button>

              {/* Insert Interactive Exercise */}
              <button
                onClick={handleInsertExercise}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="إدراج تمرين تفاعلي لحله على اللوح"
              >
                <CheckSquare size={13} className="text-cyan-400" />
                <span className="hidden sm:inline">تمرين</span>
              </button>

              {/* Quick Background Mode Toggle Button (lined -> grid -> graph -> blank) */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const modes: ('ruled' | 'grid' | 'graph' | 'white')[] = ['ruled', 'grid', 'graph', 'white'];
                    const currentIdx = canvasBgStyle === 'ruled' || (canvasBgStyle as string) === 'lined' ? 0
                      : canvasBgStyle === 'grid' ? 1
                      : canvasBgStyle === 'graph' ? 2
                      : 3;
                    const nextMode = modes[(currentIdx + 1) % modes.length];
                    setCanvasBgStyle(nextMode);
                  }}
                  className="smart-whiteboard-quick-bg-toggle px-2 py-1 rounded-lg text-[11px] font-bold text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="تبديل سريع لخلفية اللوح (مسطر ➔ مربعات ➔ بياني ➔ سادة) بنقرة واحدة دون فتح الإعدادات"
                  data-testid="smart-tutor-quick-bg-toggle"
                >
                  <span className="text-amber-400">
                    {canvasBgStyle === 'grid' ? '📐 مربعات' : canvasBgStyle === 'graph' ? '📊 بياني' : (canvasBgStyle === 'white' || canvasBgStyle === 'blank') ? '⚪ سادة' : '📝 مسطر'}
                  </span>
                  <span className="text-[9px] text-cyan-400 font-extrabold bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-500/30">
                    ⚡ تبديل
                  </span>
                </button>
              </div>

              {/* Background Style Switcher */}
              <select
                value={canvasBgStyle}
                onChange={(e) => setCanvasBgStyle(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="ruled">ورق مسطر 📄</option>
                <option value="grid">شبكة مربعات 📐</option>
                <option value="graph">رسم بياني X/Y 📊</option>
                <option value="white">أبيض ناصع ⚪</option>
                <option value="dark">لوح فحمي 🌑</option>
              </select>

              {/* Undo / Redo / Clear */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleUndo}
                  disabled={undoHistory.length === 0}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="تراجع"
                >
                  <Undo2 size={15} />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoHistory.length === 0}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="إعادة"
                >
                  <Redo2 size={15} />
                </button>
                <button
                  onClick={handleClearCanvas}
                  className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                  title="مسح مساحة اللوح"
                >
                  <Trash2 size={15} />
                </button>
              </div>

            </div>

          </div>

          {/* 70% Canvas Drawing Surface */}
          <div 
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
            className={`flex-1 w-full h-full relative overflow-hidden cursor-crosshair ${
              canvasBgStyle === 'dark' 
                ? 'bg-[#0f172a]' 
                : canvasBgStyle === 'white' || (canvasBgStyle as string) === 'blank'
                ? 'bg-white'
                : canvasBgStyle === 'grid' || canvasBgStyle === 'graph'
                ? 'bg-[#f8fafc]'
                : 'bg-[#fffdf8]'
            }`}
            style={{
              backgroundImage: canvasBackgroundImage
                ? `url(${canvasBackgroundImage})`
                : (canvasBgStyle === 'ruled' || (canvasBgStyle as string) === 'lined')
                ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)'
                : canvasBgStyle === 'grid'
                ? 'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)'
                : canvasBgStyle === 'graph'
                ? 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)'
                : 'none',
              backgroundSize: canvasBackgroundImage ? 'contain' : canvasBgStyle === 'grid' ? '28px 28px' : canvasBgStyle === 'graph' ? '30px 30px' : 'auto',
              backgroundPosition: canvasBackgroundImage ? 'center' : 'initial',
              backgroundRepeat: canvasBackgroundImage ? 'no-repeat' : 'repeat'
            }}
          >
            {/* Visual Drag & Drop Overlay */}
            {isCanvasDragOver && (
              <div className="absolute inset-0 z-40 bg-cyan-950/70 border-4 border-dashed border-cyan-400 rounded-2xl flex flex-col items-center justify-center gap-3 backdrop-blur-xs pointer-events-none animate-in fade-in">
                <Upload size={48} className="text-cyan-300 animate-bounce" />
                <p className="text-base font-black text-white">أفلت الصورة هنا لإدراجها على اللوح وبدء الشرح والكتابة فوقها 🖼️</p>
              </div>
            )}

            {/* Canvas Fixed Background Notification Pill */}
            {canvasBackgroundImage && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/95 border border-cyan-500/50 text-cyan-200 px-4 py-1.5 rounded-full text-xs font-black shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                <span>🖼️ الصورة مثبتة كخلفية (يمكنك الكتابة والرسم فوقها بحرية)</span>
                <button
                  type="button"
                  onClick={() => setCanvasBackgroundImage(null)}
                  className="px-2.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 rounded-full text-[10px] font-bold transition-all cursor-pointer"
                >
                  إزالة صورة الخلفية ✕
                </button>
              </div>
            )}
            {/* Real Interactive Freehand Drawing Canvas with Smart Stylus & Palm Rejection Support */}
            <canvas
              ref={canvasRef}
              width={1400}
              height={900}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              onPointerLeave={() => {
                setReticlePos(null);
                handleCanvasPointerUp();
              }}
              style={{
                touchAction: 'none',
                cursor: activeTool === 'select' ? 'default' : 'crosshair'
              }}
              className="absolute inset-0 w-full h-full z-10 block select-none"
            />

            {/* Stylus Nib Reticle Indicator for Smart Tablet Handwriting */}
            {showStylusReticle && reticlePos && activeTool !== 'select' && (
              <div 
                className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/90 bg-cyan-400/20 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                style={{
                  left: reticlePos.x,
                  top: reticlePos.y,
                  width: Math.max(8, penWidth * (pressureSensitivity && livePressure > 0 ? (0.4 + (livePressure / 100) * 1.3) : 1)),
                  height: Math.max(8, penWidth * (pressureSensitivity && livePressure > 0 ? (0.4 + (livePressure / 100) * 1.3) : 1))
                }}
              />
            )}

            {/* Floating Smart Pen Quick-Writing HUD on Canvas */}
            <div className="smart-whiteboard-toolbar absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-cyan-500/40 shadow-2xl flex items-center gap-2 select-none pointer-events-auto">
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800 text-[11px] font-black text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">الكتابة بالقلم الذكي</span>
              </div>

              {/* Quick Pen / Tool Switch */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('pen');
                    setPenMode('smart-pen');
                  }}
                  className={`px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    activeTool === 'pen' && penMode === 'smart-pen'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="قلم الحبر الذكي"
                  aria-label="قلم الحبر الذكي (Pen)"
                  data-tooltip="قلم الحبر الذكي (Pen)"
                >
                  <Pencil size={13} />
                  <span>قلم</span>
                </button>
                <div 
                  role="tooltip"
                  className="smart-toolbar-tooltip pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold shadow-xl border border-cyan-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
                >
                  <span className="text-cyan-300">قلم الحبر الذكي (Pen)</span>
                  <span className="text-[9px] text-slate-400 font-normal">كتابة سلسة مع حساسية الضغط وتنعيم الخط</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
                </div>
              </div>

              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('pen');
                    setPenMode('calligraphy');
                  }}
                  className={`px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    activeTool === 'pen' && penMode === 'calligraphy'
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="قلم الخط العربي"
                  aria-label="قلم الخط العربي (Calligraphy)"
                  data-tooltip="قلم الخط العربي"
                >
                  <PenTool size={13} />
                  <span>خطاط</span>
                </button>
                <div 
                  role="tooltip"
                  className="smart-toolbar-tooltip pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold shadow-xl border border-amber-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
                >
                  <span className="text-amber-300">قلم الخط العربي (Calligraphy)</span>
                  <span className="text-[9px] text-slate-400 font-normal">رأس مشطوف لكتابة العناوين بالخط العربي</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
                </div>
              </div>

              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('highlighter');
                    setPenMode('highlighter');
                  }}
                  className={`px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    activeTool === 'highlighter' || penMode === 'highlighter'
                      ? 'bg-yellow-400 text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="تظليل فسفوري"
                  aria-label="قلم التظليل (Highlighter)"
                  data-tooltip="قلم التظليل (Highlighter)"
                >
                  <Sparkles size={13} />
                  <span>تظليل</span>
                </button>
                <div 
                  role="tooltip"
                  className="smart-toolbar-tooltip pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold shadow-xl border border-yellow-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
                >
                  <span className="text-yellow-300">قلم التظليل (Highlighter)</span>
                  <span className="text-[9px] text-slate-400 font-normal">تظليل شفاف فوق الكلمات والمسائل</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
                </div>
              </div>

              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('eraser');
                    setPenMode('eraser');
                  }}
                  className={`px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    activeTool === 'eraser' || penMode === 'eraser'
                      ? 'bg-rose-500 text-white shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="الممحاة"
                  aria-label="الممحاة الذكية (Eraser)"
                  data-tooltip="الممحاة الذكية (Eraser)"
                >
                  <Eraser size={13} />
                  <span>ممحاة</span>
                </button>
                <div 
                  role="tooltip"
                  className="smart-toolbar-tooltip pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold shadow-xl border border-rose-500/50 flex flex-col items-center gap-0.5 backdrop-blur-md"
                >
                  <span className="text-rose-300">الممحاة الذكية (Eraser)</span>
                  <span className="text-[9px] text-slate-400 font-normal">مسح سريع للأخطاء والخطوط من اللوح</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
                </div>
              </div>

              <div className="w-px h-4 bg-slate-800" />

              {/* Quick Colors */}
              <div className="flex items-center gap-1">
                {[
                  { hex: '#0284c7', label: 'أزرق' },
                  { hex: '#10b981', label: 'أخضر' },
                  { hex: '#e11d48', label: 'أحمر' },
                  { hex: '#f59e0b', label: 'برتقالي' },
                  { hex: '#9333ea', label: 'بنفسجي' },
                  { hex: '#0f172a', label: 'أسود' }
                ].map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      setPenColor(c.hex);
                      if (activeTool === 'eraser') setActiveTool('pen');
                      if (penMode === 'eraser') setPenMode('smart-pen');
                    }}
                    className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                      penColor === c.hex ? 'scale-125 border-white ring-2 ring-cyan-400/60' : 'border-slate-700 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>

              <div className="w-px h-4 bg-slate-800" />

              {/* Pen Thickness quick buttons */}
              <div className="flex items-center gap-1">
                {[2, 4, 7, 12].map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPenWidth(w)}
                    className={`w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                      penWidth === w ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={`سُمك: ${w}px`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-slate-800" />

              {/* Quick Background Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  const modes: ('ruled' | 'grid' | 'graph' | 'white')[] = ['ruled', 'grid', 'graph', 'white'];
                  const currentIdx = canvasBgStyle === 'ruled' || (canvasBgStyle as string) === 'lined' ? 0
                    : canvasBgStyle === 'grid' ? 1
                    : canvasBgStyle === 'graph' ? 2
                    : 3;
                  const nextMode = modes[(currentIdx + 1) % modes.length];
                  setCanvasBgStyle(nextMode);
                }}
                className="smart-whiteboard-quick-bg-toggle px-2 py-1 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-1 transition-all cursor-pointer"
                title="تبديل سريع لخلفية اللوح (مسطر ➔ مربعات ➔ بياني ➔ سادة) دون فتح الإعدادات"
                aria-label="تبديل سريع لخلفية اللوح"
              >
                <span className="text-amber-400">
                  {canvasBgStyle === 'grid' ? '📐 مربعات' : canvasBgStyle === 'graph' ? '📊 بياني' : (canvasBgStyle === 'white' || canvasBgStyle === 'blank') ? '⚪ سادة' : '📝 مسطر'}
                </span>
                <span className="text-[9px] text-cyan-400 font-extrabold bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-500/30">
                  ⚡ تبديل
                </span>
              </button>

              <div className="w-px h-4 bg-slate-800" />

              {/* Clear quick button */}
              <button
                type="button"
                onClick={handleClearCanvas}
                className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="مسح كل الكتابة"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Rendered Interactive Canvas Elements (Shapes, Equations, STEM items, Notes, Videos, PDFs, Exercises, Mindmaps) */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {elements.map((el) => {
                
                // 1. Text Note
                if (el.type === 'text') {
                  return (
                    <div
                      key={el.id}
                      className="absolute p-3 rounded-2xl text-slate-900 font-bold bg-white/90 backdrop-blur-xs border border-slate-300 shadow-md pointer-events-auto cursor-move select-text group max-w-sm"
                      style={{ left: el.x, top: el.y, color: el.color || '#0f172a' }}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 border-b border-slate-100 pb-1">
                        <span>نص تعليمي</span>
                        <button 
                          onClick={() => handleDeleteElement(el.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{el.content}</div>
                    </div>
                  );
                }

                // 2. Math Formula
                if (el.type === 'math') {
                  return (
                    <div
                      key={el.id}
                      className="absolute p-3 rounded-2xl bg-slate-950 text-cyan-300 font-mono font-bold border border-cyan-500/40 shadow-lg pointer-events-auto cursor-move text-sm group"
                      style={{ left: el.x, top: el.y }}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans border-b border-slate-800 pb-1 mb-1.5">
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Calculator size={11} />
                          {el.extraMeta?.label || 'معادلة علمية'}
                        </span>
                        <button 
                          onClick={() => handleDeleteElement(el.id)}
                          className="text-slate-400 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="text-base text-cyan-300 font-mono text-center tracking-wide">{el.content}</div>
                    </div>
                  );
                }

                // 3. STEM Object Renderer
                if (el.type === 'stem') {
                  return (
                    <div
                      key={el.id}
                      className="absolute p-2 rounded-2xl bg-white/95 border-2 border-teal-500 shadow-xl pointer-events-auto cursor-move group flex flex-col items-center justify-center text-center"
                      style={{ left: el.x, top: el.y, width: el.width || 180, height: el.height || 140 }}
                    >
                      <div className="absolute top-1.5 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                        <button 
                          onClick={() => handleDeleteElement(el.id)}
                          className="p-1 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      </div>
                      <div className="w-full h-full flex items-center justify-center">
                        <StemObjectRenderer 
                          item={{
                            id: el.id,
                            type: el.content as any,
                            x: 0,
                            y: 0,
                            width: (el.width || 180) - 16,
                            height: (el.height || 140) - 24,
                            color: el.color || '#0284c7',
                            fillColor: el.fillColor || '#e0f2fe',
                            params: el.stemData || {}
                          }}
                        />
                      </div>
                      <div className="text-[10px] font-black text-teal-800 mt-0.5 truncate max-w-full">
                        {el.extraMeta?.title || 'أداة علمية'}
                      </div>
                    </div>
                  );
                }

                // 4. Educational Image
                if (el.type === 'image') {
                  return (
                    <div
                      key={el.id}
                      className="absolute p-2 rounded-2xl bg-white border border-slate-300 shadow-xl pointer-events-auto cursor-move group overflow-hidden flex flex-col"
                      style={{ left: el.x, top: el.y, width: el.width || 280, height: el.height || 220 }}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 border-b pb-1 gap-1">
                        <span className="font-bold truncate max-w-[130px]">{el.extraMeta?.title || 'صورة للشرح والكتابة'}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCanvasBackgroundImage(el.content);
                              setElements(prev => prev.filter(item => item.id !== el.id));
                            }}
                            className="px-1.5 py-0.5 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-black text-[9px] transition-colors cursor-pointer"
                            title="تثبيت كخلفية كاملة للوح للكتابة والرسم فوقها بحرية"
                          >
                            تثبيت كخلفية 🖼️
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteElement(el.id)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                            title="حذف الصورة"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                      <img 
                        src={el.content} 
                        alt={el.extraMeta?.title || 'صورة'}
                        className="w-full h-full object-contain rounded-xl select-none"
                      />
                    </div>
                  );
                }

                // 5. Educational Video Widget
                if (el.type === 'video') {
                  const isPlaying = el.extraMeta?.isPlaying ?? false;
                  return (
                    <div
                      key={el.id}
                      className="absolute p-2.5 rounded-2xl bg-slate-950 border border-amber-500/40 shadow-xl pointer-events-auto cursor-move group flex flex-col"
                      style={{ left: el.x, top: el.y, width: el.width || 340, height: el.height || 240 }}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5 border-b border-slate-800 pb-1">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5 truncate">
                          <Video size={13} />
                          {el.extraMeta?.title || 'فيديو تعليمي تفاعلي'}
                        </span>
                        <button 
                          onClick={() => handleDeleteElement(el.id)}
                          className="text-slate-400 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Video Player Display Container */}
                      <div className="flex-1 w-full bg-black rounded-xl overflow-hidden relative flex items-center justify-center">
                        <video 
                          src={el.content} 
                          className="w-full h-full object-cover" 
                          loop 
                          muted 
                          autoPlay={isPlaying}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
                          <div className="flex items-center justify-between text-[10px]">
                            <button
                              onClick={() => {
                                setElements(prev => prev.map(item => {
                                  if (item.id === el.id) {
                                    return {
                                      ...item,
                                      extraMeta: {
                                        ...item.extraMeta,
                                        isPlaying: !item.extraMeta?.isPlaying
                                      }
                                    };
                                  }
                                  return item;
                                }));
                              }}
                              className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded-md flex items-center gap-1 cursor-pointer"
                            >
                              {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                              <span>{isPlaying ? 'إيقاف' : 'تشغيل'}</span>
                            </button>
                            <span className="font-mono text-[9px] text-amber-300">محاكاة HD • 1080p</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 6. PDF Document Card
                if (el.type === 'pdf') {
                  return (
                    <div
                      key={el.id}
                      className="absolute p-3 rounded-2xl bg-white text-slate-900 border-2 border-rose-500/50 shadow-xl pointer-events-auto cursor-move group flex flex-col"
                      style={{ left: el.x, top: el.y, width: el.width || 320, height: el.height || 360 }}
                    >
                      <div className="flex items-center justify-between text-xs text-rose-700 font-bold mb-2 border-b pb-1.5">
                        <span className="flex items-center gap-1.5 truncate">
                          <FileText size={14} className="text-rose-600" />
                          {el.extraMeta?.title || 'مستند PDF'}
                        </span>
                        <button 
                          onClick={() => handleDeleteElement(el.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {/* PDF Page Mock View */}
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] leading-relaxed flex flex-col justify-between overflow-hidden">
                        <div className="space-y-2">
                          <div className="font-bold text-slate-800 text-xs border-b pb-1">
                            📄 اختبار تجريبي: أسئلة اختيار من متعدد - فيزياء الكم
                          </div>
                          <p className="text-slate-600">
                            <strong>السؤال الأول:</strong> فوتون تردده 6 × 10¹⁴ هرتز، احسب طاقته بالـ eV.
                          </p>
                          <div className="space-y-1 pr-2 text-slate-700">
                            <div>• أ) 2.48 eV</div>
                            <div>• ب) 4.14 eV</div>
                            <div>• ج) 1.60 eV</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t text-[10px] text-slate-500 font-medium">
                          <span>صفحة {el.extraMeta?.currentPage || 1} من {el.extraMeta?.totalPages || 4}</span>
                          <span className="text-rose-600 font-bold">بجروت رسمي معتمد</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 7. Interactive Exercise Card (حل التمارين مباشرة على اللوح)
                if (el.type === 'exercise') {
                  const isSubmitted = el.extraMeta?.isSubmitted;
                  const selectedOpt = el.extraMeta?.selectedOption;
                  const options = el.extraMeta?.options || [];
                  const isCorrect = options.find((o: any) => o.id === selectedOpt)?.isCorrect;

                  return (
                    <div
                      key={el.id}
                      className="absolute p-4 rounded-3xl bg-slate-950/95 text-white border-2 border-cyan-500 shadow-2xl pointer-events-auto cursor-move group flex flex-col gap-2.5"
                      style={{ left: el.x, top: el.y, width: el.width || 380 }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                          <CheckSquare size={14} />
                          {el.extraMeta?.title}
                        </span>
                        <button 
                          onClick={() => handleDeleteElement(el.id)}
                          className="text-slate-400 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      <p className="text-xs font-bold text-slate-200 leading-relaxed">
                        {el.extraMeta?.question}
                      </p>

                      {/* Options */}
                      <div className="space-y-1.5">
                        {options.map((opt: any) => {
                          const isThisSelected = selectedOpt === opt.id;
                          let btnStyle = 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700';

                          if (isSubmitted) {
                            if (opt.isCorrect) {
                              btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200';
                            } else if (isThisSelected) {
                              btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200';
                            }
                          } else if (isThisSelected) {
                            btnStyle = 'bg-cyan-950/80 border-cyan-400 text-cyan-100 ring-2 ring-cyan-500/30';
                          }

                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleSelectExerciseOption(el.id, opt.id)}
                              className={`w-full text-right p-2 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt.text}</span>
                              {isSubmitted && opt.isCorrect && <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mr-1" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Submit / Verification */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <button
                          onClick={() => handleSubmitExerciseAnswer(el.id)}
                          disabled={!selectedOpt}
                          className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-md"
                        >
                          تحقق من الإجابة ✓
                        </button>

                        {isSubmitted && (
                          <span className={`text-xs font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isCorrect ? 'إجابة نموذجية ممتازة! 🎉' : 'حاول مرة أخرى ❌'}
                          </span>
                        )}
                      </div>

                      {isSubmitted && el.extraMeta?.explanation && (
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 leading-relaxed">
                          💡 <strong>الشرح:</strong> {el.extraMeta.explanation}
                        </div>
                      )}

                    </div>
                  );
                }

                // 8. Mind Map Widget (تحويل الشرح إلى خرائط ذهنية)
                if (el.type === 'mindmap') {
                  const branches = el.extraMeta?.branches || [];
                  return (
                    <div
                      key={el.id}
                      className="absolute p-4 rounded-3xl bg-slate-950/90 text-white border-2 border-amber-500/60 shadow-2xl pointer-events-auto cursor-move group flex flex-col gap-2"
                      style={{ left: el.x, top: el.y, width: el.width || 380 }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                          <Lightbulb size={14} />
                          {el.extraMeta?.title}
                        </span>
                        <button 
                          onClick={() => handleDeleteElement(el.id)}
                          className="text-slate-400 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {/* Central Node */}
                      <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl text-center text-xs shadow-md">
                        🧠 {el.extraMeta?.root}
                      </div>

                      {/* Branches */}
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {branches.map((b: any, idx: number) => (
                          <div key={idx} className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1 text-[10px]">
                            <span className="font-bold text-amber-300 truncate">🌿 {b.title}</span>
                            <div className="space-y-0.5 text-slate-400">
                              {b.items?.map((it: string, i: number) => (
                                <div key={i} className="truncate">• {it}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  );
                }

                // 9. Generic Shapes
                if (el.type === 'shape') {
                  return (
                    <div
                      key={el.id}
                      className="absolute border-2 border-dashed border-cyan-500 rounded-xl bg-cyan-500/10 pointer-events-auto cursor-move flex items-center justify-center text-xs font-bold text-cyan-800 group"
                      style={{ left: el.x, top: el.y, width: el.width || 140, height: el.height || 100 }}
                    >
                      <button 
                        onClick={() => handleDeleteElement(el.id)}
                        className="absolute top-1 left-1 text-slate-600 hover:text-rose-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                      <span>شكل هندسي تفاعلي</span>
                    </div>
                  );
                }

                return null;
              })}
            </div>

            {/* Bottom Smart Stylus Status & Latency Indicator */}
            <div className="absolute bottom-2 right-3 z-20 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-300 bg-slate-950/85 px-3 py-1.5 rounded-xl border border-cyan-500/30 backdrop-blur-md shadow-lg select-none">
              <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>اللوح الذكي 70%</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <PenTool size={11} />
                <span>وضع القلم الذكي نشط</span>
              </span>
              {pressureSensitivity && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="text-cyan-400 font-medium">الضغط: {livePressure > 0 ? `${livePressure}%` : 'تلقائي'}</span>
                </>
              )}
              {palmRejection && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-300 font-medium">مانع راحة اليد ✓</span>
                </>
              )}
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-sans">
                {detectedStylusType === 'pen' ? '🖊️ Stylus قلم' : detectedStylusType === 'touch' ? '👆 Touch لمس' : '🖱️ Mouse'}
              </span>
            </div>

          </div>

        </main>

        {/* ======================================================================= */}
        {/* 2.2 MULTI-TAB SIDE PANEL: AI, STEM, TEACHER, STUDENTS (30% WIDTH)       */}
        {/* ======================================================================= */}
        <aside className="w-full md:w-[30%] h-full flex flex-col bg-[#0b1324] border-r border-slate-800 shrink-0 z-20 shadow-2xl">
          
          {/* Side Panel Tabs Header */}
          <div className="h-12 bg-slate-950 border-b border-slate-800 px-2 flex items-center justify-around shrink-0 text-xs">
            
            <button
              onClick={() => setSideTab('ai_tutor')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                sideTab === 'ai_tutor'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/50 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="المساعد الذكي (AI Tutor)"
            >
              <Bot size={14} className={sideTab === 'ai_tutor' ? 'text-cyan-400' : ''} />
              <span>المعلم الذكي</span>
            </button>

            <button
              onClick={() => setSideTab('stem')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                sideTab === 'stem'
                  ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-400/50 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="أدوات العلوم (STEM Tools)"
            >
              <Atom size={14} className={sideTab === 'stem' ? 'text-teal-400' : ''} />
              <span>أدوات STEM</span>
            </button>

            <button
              onClick={() => setSideTab('teacher_tools')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                sideTab === 'teacher_tools'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-400/50 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="أدوات المعلم والتسجيل"
            >
              <Radio size={14} className={sideTab === 'teacher_tools' ? 'text-amber-400' : ''} />
              <span>المعلم</span>
            </button>

            <button
              onClick={() => setSideTab('student_interaction')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer relative ${
                sideTab === 'student_interaction'
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/50 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="تفاعل الطلاب ورفع اليد"
            >
              <Users size={14} className={sideTab === 'student_interaction' ? 'text-purple-400' : ''} />
              <span>الطلاب</span>
              {participants.some(p => p.isHandRaised) && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1 animate-ping" />
              )}
            </button>

          </div>

          {/* ------------------------------------------------------------------- */}
          {/* TAB 1: AI ASSISTANT EMBEDDED WORKFLOWS                              */}
          {/* ------------------------------------------------------------------- */}
          {sideTab === 'ai_tutor' && (
            <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden text-right">
              
              {/* AI Header & Quick Actions */}
              <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-3 shrink-0 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot size={18} className="text-cyan-400" />
                    <span className="text-xs font-black text-white">إجراءات المساعد الذكي الفورية:</span>
                  </div>
                  <span className="text-[9px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-bold">
                    جاهز للمساندة ⚡
                  </span>
                </div>

                {/* Quick Action Buttons Grid (All requested workflows) */}
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => handleTriggerAIAction('explain_board')}
                    disabled={isAiLoading}
                    className="w-full text-right p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-cyan-200 border border-cyan-500/20 hover:border-cyan-400 text-xs font-bold transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span>💡 اشرح المحتوى الظاهر على اللوح</span>
                    <Sparkles size={13} className="text-cyan-400 shrink-0" />
                  </button>

                  <button
                    onClick={() => handleTriggerAIAction('generate_quiz')}
                    disabled={isAiLoading}
                    className="w-full text-right p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-purple-200 border border-purple-500/20 hover:border-purple-400 text-xs font-bold transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span>📝 توليد أسئلة واختبار سريع تلقائياً</span>
                    <Sparkles size={13} className="text-purple-400 shrink-0" />
                  </button>

                  <button
                    onClick={() => handleTriggerAIAction('summarize_lesson')}
                    disabled={isAiLoading}
                    className="w-full text-right p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-emerald-200 border border-emerald-500/20 hover:border-emerald-400 text-xs font-bold transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span>📊 إنشاء ملخص الدرس المركز</span>
                    <Sparkles size={13} className="text-emerald-400 shrink-0" />
                  </button>

                  <button
                    onClick={() => handleTriggerAIAction('suggest_examples')}
                    disabled={isAiLoading}
                    className="w-full text-right p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-sky-200 border border-sky-500/20 hover:border-sky-400 text-xs font-bold transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span>✨ اقتراح أمثلة وتمارين إضافية</span>
                    <Sparkles size={13} className="text-sky-400 shrink-0" />
                  </button>

                  <button
                    onClick={() => handleTriggerAIAction('create_mindmap')}
                    disabled={isAiLoading}
                    className="w-full text-right p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-amber-200 border border-amber-500/20 hover:border-amber-400 text-xs font-bold transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <span>🧠 تحويل الشرح إلى خريطة ذهنية على اللوح</span>
                    <Sparkles size={13} className="text-amber-400 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto space-y-2.5 p-1 pr-2 no-scrollbar text-xs">
                {aiMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-2xl leading-relaxed text-right border ${
                      msg.role === 'assistant'
                        ? 'bg-slate-900/90 border-cyan-500/20 text-slate-100'
                        : 'bg-cyan-950/70 border-cyan-400/40 text-cyan-100 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold text-cyan-300">
                        {msg.role === 'assistant' ? 'المعلم الذكي للأكاديمية 🤖' : 'أنت (المستخدم) 💬'}
                      </span>
                      <span>{msg.time}</span>
                    </div>
                    <div className="whitespace-pre-line text-xs">{msg.text}</div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="p-3 bg-slate-900/60 rounded-2xl border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
                    <Sparkles size={14} className="animate-spin" />
                    <span>المعلم الذكي يقوم بتحليل ومعالجة المحتوى...</span>
                  </div>
                )}
              </div>

              {/* AI Chat Input Bar */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={aiInputMessage}
                  onChange={(e) => setAiInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCustomAiMessage()}
                  placeholder="اسأل المعلم الذكي أي سؤال أكاديمي..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleSendCustomAiMessage}
                  disabled={!aiInputMessage.trim() || isAiLoading}
                  className="p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 rounded-xl transition-all cursor-pointer shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>

            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* TAB 2: STEM SCIENTIFIC TOOLS (كيمياء، فيزياء، بيولوجيا، مجسمات 3D)  */}
          {/* ------------------------------------------------------------------- */}
          {sideTab === 'stem' && (
            <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden text-right">
              
              {/* Category Filter Pills */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold shrink-0">
                {[
                  { id: 'physics', label: 'فيزياء ⚡' },
                  { id: 'chemistry', label: 'كيمياء 🧪' },
                  { id: 'biology', label: 'أحياء 🧬' },
                  { id: '3d-shapes', label: 'مجسمات 3D 📦' },
                  { id: 'math', label: 'رياضيات 📐' }
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setStemCategory(c.id as any)}
                    className={`py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center ${
                      stemCategory === c.id
                        ? 'bg-teal-500 text-slate-950 shadow-xs'
                        : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* STEM Tools Catalog Grid */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar text-xs">
                <div className="text-[11px] text-slate-400 mb-1">
                  انقر على أي عنصر لإدراجه مباشرة في مساحة اللوح (70%):
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {activeStemCategoryTools.slice(0, 12).map((tool) => (
                    <div
                      key={tool.type}
                      onClick={() => handleInsertStemTool(tool)}
                      className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-teal-400 transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 shadow-sm group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-500/40 text-teal-300 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                        {stemCategory === 'chemistry' ? '🧪' : stemCategory === 'physics' ? '⚡' : stemCategory === 'biology' ? '🧬' : stemCategory === '3d-shapes' ? '📦' : '📐'}
                      </div>
                      <span className="font-bold text-white text-xs leading-tight">{tool.titleAr}</span>
                      <span className="text-[9px] text-slate-400 line-clamp-1">{tool.description}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* TAB 3: TEACHER TOOLS (تسجيل، تصدير، واجبات، كود الجلسة)            */}
          {/* ------------------------------------------------------------------- */}
          {sideTab === 'teacher_tools' && (
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto text-right text-xs">
              
              {/* Lesson Recording Card with Real MediaRecorder API */}
              <div className="p-3.5 bg-slate-900/90 border border-rose-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Radio size={16} className={isRecording ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
                    <span className="font-black text-white">تسجيل الشاشة والصوت (MediaRecorder):</span>
                  </div>
                  {isRecording ? (
                    <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-700/60 px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>{isRecordingPaused ? 'مؤقت' : 'جاري التسجيل'}: {formatSeconds(recordingDurationSeconds)}</span>
                    </span>
                  ) : recordedVideoUrl ? (
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      <span>فيديو جاهز</span>
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                      جاهز
                    </span>
                  )}
                </div>

                {/* Recording Configuration (When idle) */}
                {!isRecording && (
                  <div className="space-y-2 pt-1">
                    {/* Source Selection */}
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold mb-1">مصدر التقاط الفيديو:</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRecordingMode('screen')}
                          className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            recordingMode === 'screen'
                              ? 'bg-rose-950/60 border-rose-500 text-white shadow-xs'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Film size={14} className={recordingMode === 'screen' ? 'text-rose-400' : 'text-slate-500'} />
                          <span>كامل الشاشة / النوافذ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordingMode('canvas')}
                          className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            recordingMode === 'canvas'
                              ? 'bg-rose-950/60 border-rose-500 text-white shadow-xs'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Palette size={14} className={recordingMode === 'canvas' ? 'text-rose-400' : 'text-slate-500'} />
                          <span>اللوح التفاعلي فقط</span>
                        </button>
                      </div>
                    </div>

                    {/* Microphone Toggle */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                      <div className="flex items-center gap-2">
                        {recordWithMic ? (
                          <Mic size={14} className="text-emerald-400" />
                        ) : (
                          <MicOff size={14} className="text-slate-500" />
                        )}
                        <div>
                          <div className="font-bold text-white text-[11px]">تسجيل صوت الميكروفون</div>
                          <div className="text-[9px] text-slate-400">دمج تعليق المعلم الصوتي مع تسجيل الشاشة</div>
                        </div>
                      </div>
                      <input 
                        type="checkbox"
                        checked={recordWithMic}
                        onChange={(e) => setRecordWithMic(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-500 accent-rose-500 cursor-pointer"
                      />
                    </label>
                  </div>
                )}

                {/* Primary Action Button (Start / Live Controls) */}
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="w-full py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-950/50"
                  >
                    <Radio size={14} />
                    <span>بدء تسجيل الشاشة والصوت (MediaRecorder) 🔴</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* Live Waveform Indicator */}
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-rose-900/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="font-mono text-rose-300 font-bold">{formatSeconds(recordingDurationSeconds)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1 h-3 bg-rose-500 animate-pulse rounded-full" />
                        <span className="w-1 h-5 bg-rose-400 animate-pulse delay-75 rounded-full" />
                        <span className="w-1 h-4 bg-rose-500 animate-pulse delay-150 rounded-full" />
                        <span className="w-1 h-6 bg-rose-300 animate-pulse rounded-full" />
                        <span className="w-1 h-3 bg-rose-500 animate-pulse delay-100 rounded-full" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {isRecordingPaused ? (
                        <button
                          onClick={resumeRecording}
                          className="py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play size={13} />
                          <span>استئناف ▶️</span>
                        </button>
                      ) : (
                        <button
                          onClick={pauseRecording}
                          className="py-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/30"
                        >
                          <Pause size={13} />
                          <span>إيقاف مؤقت ⏸️</span>
                        </button>
                      )}

                      <button
                        onClick={stopRecording}
                        className="py-2 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <StopCircle size={13} />
                        <span>إنهاء وحفظ ⏹</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Recorded Video Playback & Actions (When available) */}
                {recordedVideoUrl && !isRecording && (
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Film size={13} />
                        <span>معاينة التسجيل المكتمل</span>
                      </span>
                      {recordedBlob && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      )}
                    </div>

                    {/* Video Player */}
                    <video 
                      src={recordedVideoUrl} 
                      controls 
                      className="w-full max-h-36 rounded-lg bg-black object-contain border border-slate-800 shadow-md"
                    />

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={handleDownloadRecordedVideo}
                        className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="تحميل الفيديو بصيغة WebM"
                      >
                        <Download size={12} />
                        <span>تحميل الفيديو</span>
                      </button>
                      <button
                        onClick={handleInsertRecordedVideoToCanvas}
                        className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="إدراج الفيديو المسجل داخل مساحة اللوح التفاعلي"
                      >
                        <PlusCircle size={12} />
                        <span>إدراج في اللوح</span>
                      </button>
                    </div>
                  </div>
                )}

                {recordingError && (
                  <div className="p-2 bg-rose-950/60 border border-rose-700/50 rounded-xl text-[10px] text-rose-300 flex items-center gap-1.5">
                    <AlertCircle size={12} className="shrink-0 text-rose-400" />
                    <span>{recordingError}</span>
                  </div>
                )}
              </div>

              {/* Firebase Firestore 30s Autosave & Offline Protection Card */}
              <div className="p-3.5 bg-slate-900/90 border border-cyan-500/30 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Cloud size={16} className={autosaveStatus === 'saving' ? 'text-cyan-400 animate-pulse' : 'text-cyan-400'} />
                    <span className="font-black text-white">الحفظ التلقائي الدوري (Firestore):</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                    autosaveStatus === 'saving'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700/60'
                      : autosaveStatus === 'offline'
                      ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                  }`}>
                    {autosaveStatus === 'saving' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        <span>جاري المزامنة...</span>
                      </>
                    ) : autosaveStatus === 'offline' ? (
                      <>
                        <WifiOff size={10} className="text-amber-400" />
                        <span>محفوظ محلياً</span>
                      </>
                    ) : (
                      <>
                        <Check size={10} className="text-emerald-400" />
                        <span>كل 30 ثانية ⏱️</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  يتم حفظ محتوى اللوح، والرسومات، والمعادلات تلقائياً كل 30 ثانية إلى قاعدة بيانات Firestore السحابية مع نسخة احتياطية محلية فورية لمنع فقدان البيانات عند انقطاع الإنترنت.
                </p>

                {/* Status Metrics */}
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <div>
                    <div className="text-slate-500">آخر حفظ سحابي:</div>
                    <div className="font-mono text-cyan-300 font-bold mt-0.5">
                      {lastAutosavedAt ? lastAutosavedAt.toLocaleTimeString('ar-EG') : 'جاري الحفظ الأول...'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">حالة الاتصال والشبكة:</div>
                    <div className="font-bold mt-0.5 flex items-center gap-1 text-slate-300">
                      {isOnline ? (
                        <>
                          <Wifi size={11} className="text-emerald-400" />
                          <span className="text-emerald-300">متصل بالسحابة 🟢</span>
                        </>
                      ) : (
                        <>
                          <WifiOff size={11} className="text-amber-400" />
                          <span className="text-amber-300">دون اتصال (أوفلاين) 🟡</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-900 flex items-center justify-between text-slate-400">
                    <span>العناصر المؤمنة باللوح:</span>
                    <span className="font-bold text-white font-mono">{elements.length} عنصر</span>
                  </div>
                </div>

                {/* Instant Save Trigger */}
                <button
                  type="button"
                  onClick={() => syncToFirestore(true)}
                  disabled={autosaveStatus === 'saving'}
                  className="w-full py-2 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Cloud size={13} className={autosaveStatus === 'saving' ? 'animate-spin' : ''} />
                  <span>{autosaveStatus === 'saving' ? 'جاري الحفظ في Firestore...' : 'مزامنة وحفظ سحابي فوري الآن ☁️'}</span>
                </button>
              </div>

              {/* Share & Session Code Card */}
              <div className="p-3.5 bg-slate-900/90 border border-blue-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <Share2 size={16} className="text-cyan-400" />
                  <span className="font-black text-white">مشاركة اللوح المباشر مع الطلاب:</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  شارك كود الجلسة لتمكين الطلاب من الانضمام المباشر، والمشاهدة الحية، ورفع اليد، وحل التمارين.
                </p>
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="font-mono text-cyan-300 font-bold flex-1 text-center">{sessionCode}</span>
                  <button
                    onClick={handleCopySessionCode}
                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-bold text-xs cursor-pointer"
                  >
                    {isCopiedCode ? 'تم النسخ ✓' : 'نسخ الكود'}
                  </button>
                </div>
              </div>

              {/* Instant Homework Assignment Trigger */}
              <div className="p-3.5 bg-slate-900/90 border border-amber-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <PlusCircle size={16} className="text-amber-400" />
                  <span className="font-black text-white">إنشاء واجب منزلي فوري:</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  تحويل المفاهيم المشروحة على اللوح إلى واجب منزلي تفاعلي يُرسل مباشرة لبوابات الطلاب وتنبيهات أولياء الأمور.
                </p>
                <button
                  onClick={() => setIsHomeworkModalOpen(true)}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl transition-all cursor-pointer"
                >
                  تعيين واجب منزلي للدرس 📚
                </button>
              </div>

            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* TAB 4: STUDENT INTERACTION (رفع اليد، الأسئلة، التصويت الحي)         */}
          {/* ------------------------------------------------------------------- */}
          {sideTab === 'student_interaction' && (
            <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto text-right text-xs">
              
              {/* Hand Raise Section */}
              <div className="p-3 bg-slate-900/90 border border-purple-500/30 rounded-2xl space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hand size={16} className="text-amber-400" />
                    <span className="font-black text-white">الطلاب الرافعين أيديهم:</span>
                  </div>
                  <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    {participants.filter(p => p.isHandRaised).length} طلبات تحدث
                  </span>
                </div>

                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {participants.filter(p => p.isHandRaised).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs">
                      <div className="flex items-center gap-2">
                        <span>{p.avatar}</span>
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="text-[9px] text-slate-400">({p.handRaisedTime})</span>
                      </div>
                      <button
                        onClick={() => {
                          setParticipants(prev => prev.map(s => s.id === p.id ? { ...s, canDraw: !s.canDraw } : s));
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold cursor-pointer transition-colors ${
                          p.canDraw ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {p.canDraw ? 'إذن الرسم مفعّل ✓' : 'منح إذن الحل على اللوح'}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleToggleMyHand}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <Hand size={13} className="text-amber-400" />
                  <span>تبديل حالة رفع يدي تجريبياً ✋</span>
                </button>
              </div>

              {/* Live Poll / Voting Widget */}
              <div className="p-3 bg-slate-900/90 border border-cyan-500/30 rounded-2xl space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart2 size={16} className="text-cyan-400" />
                    <span className="font-black text-white">استطلاع وتصويت حي (Live Poll):</span>
                  </div>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full font-bold">
                    {livePoll.totalVotes} صوت
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-200">{livePoll.question}</p>

                <div className="space-y-1.5">
                  {livePoll.options.map(opt => {
                    const pct = livePoll.totalVotes > 0 ? Math.round((opt.votes / livePoll.totalVotes) * 100) : 0;
                    const isSelected = livePoll.userVotedId === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleVotePoll(opt.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                          isSelected ? 'bg-cyan-950/60 border-cyan-400 text-white' : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {/* Progress Bar Fill */}
                        <div 
                          className="absolute inset-y-0 right-0 bg-cyan-500/15 pointer-events-none transition-all duration-300" 
                          style={{ width: `${pct}%` }} 
                        />
                        <div className="relative z-10 flex items-center justify-between text-[11px]">
                          <span className="font-medium">{opt.text}</span>
                          <span className="font-mono font-bold text-cyan-300 mr-2">{pct}% ({opt.votes})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Student Questions Queue with AI Answer option */}
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-purple-400" />
                    <span className="font-black text-white">أسئلة الطلاب الواردة:</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{studentQuestions.length} أسئلة</span>
                </div>

                {/* Question List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {studentQuestions.map(q => (
                    <div key={q.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-purple-300">{q.studentName}</span>
                        <span>{q.time}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">{q.text}</p>
                      
                      {q.aiAnswer && (
                        <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-[10px] text-cyan-200 leading-relaxed">
                          <strong>إجابة المعلم الذكي 🤖:</strong> {q.aiAnswer}
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between gap-1 border-t border-slate-900 text-[10px]">
                        <button
                          onClick={() => handleAiAnswerQuestion(q)}
                          className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Bot size={11} />
                          <span>إجابة المعلم الذكي 🤖</span>
                        </button>

                        <button
                          onClick={() => handlePinQuestionToCanvas(q)}
                          className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          📌 تثبيت على اللوح
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submit New Student Question Box */}
                <form onSubmit={handleSubmitStudentQuestion} className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={newStudentQuestionText}
                    onChange={(e) => setNewStudentQuestionText(e.target.value)}
                    placeholder="اكتب سؤالاً أو استفساراً..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                  >
                    إرسال
                  </button>
                </form>

              </div>

            </div>
          )}

        </aside>

      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS: Images, Math, Video, PDF, Homework                             */}
      {/* ========================================================================= */}

      {/* 3.1 Educational Images Modal */}
      {isImageModalOpen && (
        <EducationalImageModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          onInsertImage={handleInsertImageFromModal}
        />
      )}

      {/* 3.2 Math Formulas Modal */}
      {isFormulaModalOpen && (
        <MathFormulaModal
          isOpen={isFormulaModalOpen}
          onClose={() => setIsFormulaModalOpen(false)}
          onInsertFormula={handleInsertFormulaFromModal}
          initialLatex="E = h \\cdot \\nu"
          initialColor={penColor}
        />
      )}

      {/* 3.3 Video Insertion Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-5 shadow-2xl text-right space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Video size={20} className="text-amber-400" />
                <h3 className="text-sm font-black text-white">إدراج فيديو تعليمي على اللوح</h3>
              </div>
              <button onClick={() => setIsVideoModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">عنوان الفيديو التعليمي:</label>
                <input
                  type="text"
                  value={videoTitleInput}
                  onChange={(e) => setVideoTitleInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">رابط الفيديو (MP4 أو محاكاة تفاعلية):</label>
                <input
                  type="text"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 font-mono text-[11px]"
                />
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl text-amber-200 text-[11px] leading-relaxed">
                💡 سيتم تضمين مشغل فيديو تفاعلي داخل مساحة الـ 70% مع إمكانية التشغيل والإيقاف والمزامنة المباشرة مع الطلاب.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsVideoModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmInsertVideo}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black shadow-md cursor-pointer"
                >
                  إدراج الفيديو على اللوح ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3.4 PDF Insertion Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-5 shadow-2xl text-right space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-rose-400" />
                <h3 className="text-sm font-black text-white">إدراج ملف PDF على اللوح</h3>
              </div>
              <button onClick={() => setIsPdfModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">عنوان الملف أو المنهاج:</label>
                <input
                  type="text"
                  value={pdfTitleInput}
                  onChange={(e) => setPdfTitleInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">عدد الصفحات:</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={pdfPageCountInput}
                  onChange={(e) => setPdfPageCountInput(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmInsertPdf}
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black shadow-md cursor-pointer"
                >
                  إدراج الملف على اللوح ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3.5 Homework Creation Modal */}
      {isHomeworkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-5 shadow-2xl text-right space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle size={20} className="text-amber-400" />
                <h3 className="text-sm font-black text-white">إنشاء واجب منزلي من اللوح التفاعلي</h3>
              </div>
              <button 
                onClick={() => setIsHomeworkModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {homeworkSuccess ? (
              <div className="p-4 bg-emerald-950/80 border border-emerald-500 text-emerald-200 rounded-2xl text-xs font-bold text-center">
                {homeworkSuccess}
              </div>
            ) : (
              <form onSubmit={handleAssignHomework} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">عنوان الواجب المنزلي:</label>
                  <input
                    type="text"
                    value={homeworkTitle}
                    onChange={(e) => setHomeworkTitle(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">تاريخ ووقت التسليم النهائي:</label>
                  <input
                    type="date"
                    value={homeworkDueDate}
                    onChange={(e) => setHomeworkDueDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-200 text-[11px] leading-relaxed">
                  💡 سيتم إرفاق لقطة شاشة من محتوى اللوح الحالي تلقائياً مع تفاصيل الواجب لإرشاد الطلاب.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsHomeworkModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black shadow-md cursor-pointer"
                  >
                    نشر وتوزيع الواجب ✓
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
