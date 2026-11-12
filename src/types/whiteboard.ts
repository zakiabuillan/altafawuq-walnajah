import { StemItem } from './stemWhiteboard';

export type WhiteboardTool = 
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'pixel-eraser'
  | 'line'
  | 'arrow'
  | 'double-arrow'
  | 'rect'
  | 'rounded-rect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'right-triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'cube-3d'
  | 'cylinder-3d'
  | 'math-axis'
  | 'number-line'
  | 'trig-circle'
  | 'callout'
  | 'text'
  | 'sticky'
  | 'laser'
  | 'ruler'
  | 'protractor'
  | 'pan';

export interface DrawPoint {
  x: number;
  y: number;
  pressure?: number; // 0 to 1
  time?: number;
}

export interface DrawStroke {
  id: string;
  tool: WhiteboardTool;
  points: DrawPoint[];
  color: string;
  width: number;
  opacity: number;
  isFilled?: boolean;
  fillColor?: string;
  dashStyle?: 'solid' | 'dashed' | 'dotted';
  isRecognizedShape?: boolean;
  recognizedLabel?: string;
  rawPoints?: DrawPoint[];
  rawTool?: WhiteboardTool;
}

export interface TextItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  color: string;
  bgColor?: string;
  borderColor?: string;
  isSticky?: boolean;
  isFormula?: boolean;
  latex?: string;
  isChemistry?: boolean;
  renderedSvgDataUrl?: string;
  rotation?: number;
  align?: 'right' | 'center' | 'left';
}

export interface ImageItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  originalWidth?: number;
  originalHeight?: number;
  rotation?: number;
  aspectRatio?: number;
  title?: string;
}

export type WhiteboardBackgroundType = 
  | 'blank'
  | 'grid'
  | 'dots'
  | 'ruled'
  | 'lined'
  | 'chalkboard'
  | 'dark'
  | 'isometric'
  | 'music'
  | 'math-plane'
  | 'graph'
  | 'pdf';

export interface WhiteboardPage {
  id: string;
  title: string;
  backgroundType: WhiteboardBackgroundType;
  backgroundColor: string;
  backgroundImage?: string; // High-res PDF page render or imported image background
  pdfPageNumber?: number;
  pdfPageNumbers?: number[]; // For dual-page spreads (e.g. [1, 2])
  isDualSpread?: boolean; // True if this page is formatted as a 2-page side-by-side spread
  isVerticalStack?: boolean; // True if this page is formatted as continuous vertical stacked pages (pages under each other)
  dualSpreadType?: 'dual_pdf' | 'pdf_and_scratchpad' | 'vertical_stack' | 'custom';
  
  // Layer Support - Visibility Toggles
  showBackgroundTemplate?: boolean; // Toggle background grid/pattern/template visibility (default: true)
  showPdfBackground?: boolean;      // Toggle background PDF/worksheet/image visibility (default: true)
  showAnnotations?: boolean;        // Toggle ink, drawing strokes & highlighter visibility (default: true)
  showTextItems?: boolean;          // Toggle text boxes and sticky notes visibility (default: true)
  showImageItems?: boolean;         // Toggle educational images and diagrams visibility (default: true)
  showStemItems?: boolean;          // Toggle STEM objects visibility (default: true)

  // Layer Support - Opacity Controls (0.0 to 1.0)
  backgroundTemplateOpacity?: number;
  pdfBackgroundOpacity?: number;
  annotationsOpacity?: number;
  textItemsOpacity?: number;
  imageItemsOpacity?: number;
  stemItemsOpacity?: number;

  // Layer Support - Locking
  isPdfLocked?: boolean;             // Protect and lock PDF layer from accidental displacement
  isAnnotationsLocked?: boolean;     // Protect and lock drawing layer from editing/erasing
  isBackgroundLocked?: boolean;

  strokes: DrawStroke[];
  textItems: TextItem[];
  imageItems: ImageItem[];
  stemItems?: StemItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface WhiteboardProject {
  id: string;
  title: string;
  teacherId?: string;
  teacherName?: string;
  subject?: string;
  pages: WhiteboardPage[];
  activePageIndex: number;
  viewMode?: 'single' | 'dual'; // Whiteboard viewport display mode
  lectureNotes?: any[];
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
}

export interface WhiteboardPresetColor {
  name: string;
  value: string;
  glow?: string;
}

export type WhiteboardTheme = 
  | 'classic-dark' 
  | 'midnight-blue' 
  | 'emerald-forest' 
  | 'royal-purple' 
  | 'warm-amber' 
  | 'minimal-light';

export interface WhiteboardThemeOption {
  id: WhiteboardTheme;
  name: string;
  arabicName: string;
  description: string;
  icon: string;
  previewColors: string[];
  toolbarBg: string;
  headerBg: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  buttonActive: string;
  buttonHover: string;
  textColor: string;
  panelBg: string;
  panelBorder: string;
  canvasBg: string;
  defaultPageBgType: WhiteboardBackgroundType;
  defaultPageBgColor: string;
  defaultPenColor: string;
}

export interface WhiteboardSnapshot {
  pageIndex: number;
  strokes: DrawStroke[];
  textItems: TextItem[];
  imageItems: ImageItem[];
  stemItems?: StemItem[];
  backgroundType?: WhiteboardBackgroundType;
  backgroundImage?: string;
  timestamp: number;
  actionLabel?: string;
}


