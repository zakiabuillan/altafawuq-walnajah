export type PageBackgroundStyle = 'plain' | 'ruled' | 'grid' | 'dotted';

export type XournalPageLayoutMode = 'single' | 'side-by-side' | 'continuous';

export type XournalTool = 
  | 'pen' 
  | 'eraser' 
  | 'highlighter' 
  | 'text' 
  | 'laser'
  | 'select-rect' 
  | 'select-object' 
  | 'shape-recognizer' 
  | 'line' 
  | 'arrow' 
  | 'rect' 
  | 'ellipse' 
  | 'coord-axes' 
  | 'ruler';

export type EraserType = 'standard' | 'whiteout' | 'stroke';

export type PenThickness = 'very-fine' | 'fine' | 'medium' | 'bold' | 'marker' | 'heavy' | 'custom';

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface CanvasStroke {
  id: string;
  tool: 'pen' | 'highlighter' | 'eraser-whiteout' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'coord-axes' | 'ruler';
  color: string;
  width: number;
  opacity: number;
  points: StrokePoint[];
  blendMode?: 'normal' | 'multiply';
  isShape?: boolean;
  shapeType?: 'line' | 'arrow' | 'rect' | 'ellipse' | 'coord-axes';
}

export interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  isBold?: boolean;
  isItalic?: boolean;
}

export interface PageHistoryState {
  strokes: CanvasStroke[];
  textAnnotations: TextAnnotation[];
}

export type DocumentPage = 
  | { 
      id: string; 
      type: 'pdf'; 
      pdfPageIndex: number; // 1-based index in the original PDF
      width: number; 
      height: number;
      pdfDataUrl?: string; // High-res rendered PDF page background
      strokes: CanvasStroke[];
      textAnnotations: TextAnnotation[];
      undoStack: PageHistoryState[];
      redoStack: PageHistoryState[];
    }
  | { 
      id: string; 
      type: 'blank'; 
      width: number; 
      height: number;
      backgroundStyle: PageBackgroundStyle; 
      strokes: CanvasStroke[];
      textAnnotations: TextAnnotation[];
      undoStack: PageHistoryState[];
      redoStack: PageHistoryState[];
    };

export interface XournalProject {
  title: string;
  createdAt: string;
  updatedAt: string;
  pdfFileName?: string;
  pdfArrayBuffer?: ArrayBuffer;
  pages: DocumentPage[];
}
