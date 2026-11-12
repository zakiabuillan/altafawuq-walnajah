import { DocumentPage } from './types';

/**
 * Creates an initial rich sample document replicating Xournal++ with both PDF-like pages
 * and inserted blank scratchpad pages.
 */
export function createDefaultDocument(): DocumentPage[] {
  const standardWidth = 794;  // Standard A4 at 96 DPI
  const standardHeight = 1123;

  const page1: DocumentPage = {
    id: 'page_1_pdf',
    type: 'pdf',
    pdfPageIndex: 1,
    width: standardWidth,
    height: standardHeight,
    strokes: [
      // Sample teacher pen annotation (red check mark and comments)
      {
        id: 'stroke_1',
        tool: 'pen',
        color: '#dc2626',
        width: 2.5,
        opacity: 1,
        points: [
          { x: 620, y: 160, pressure: 0.6 },
          { x: 635, y: 180, pressure: 0.9 },
          { x: 665, y: 135, pressure: 0.7 }
        ]
      },
      // Yellow highlighter over formula
      {
        id: 'stroke_2',
        tool: 'highlighter',
        color: '#facc15',
        width: 14,
        opacity: 0.4,
        blendMode: 'multiply',
        points: [
          { x: 180, y: 310 },
          { x: 420, y: 310 }
        ]
      },
      // Arrow pointing to important note
      {
        id: 'stroke_3',
        tool: 'arrow',
        color: '#2563eb',
        width: 2,
        opacity: 1,
        isShape: true,
        shapeType: 'arrow',
        points: [
          { x: 680, y: 390 },
          { x: 550, y: 440 }
        ]
      }
    ],
    textAnnotations: [
      {
        id: 'text_1',
        x: 60,
        y: 60,
        width: 650,
        height: 60,
        text: 'أكاديمية التفوق للتعليم الإلكتروني • ورقة تدريب بجروت الفيزياء والرياضيات',
        color: '#0f172a',
        fontSize: 18,
        fontFamily: 'Cairo, sans-serif',
        isBold: true
      },
      {
        id: 'text_2',
        x: 60,
        y: 120,
        width: 650,
        height: 100,
        text: 'السؤال الأول: بالرجوع إلى قانون نيوتن الثاني F = m · a، وُضِع جسم كتلته m = 4 kg على سطح أفقي أملس.\nاحسب التسارع الناتج إذا أثرت قوة أفقية مقدارها 20 N، ثم استنتج السرعة بعد مرور 3 ثوانٍ.',
        color: '#334155',
        fontSize: 14,
        fontFamily: 'Cairo, sans-serif'
      },
      {
        id: 'text_3',
        x: 60,
        y: 290,
        width: 400,
        height: 40,
        text: 'معادلة الحركة: v(t) = v₀ + a · t  حيث v₀ = 0 m/s',
        color: '#1e3a8a',
        fontSize: 14,
        fontFamily: 'Courier New, monospace',
        isBold: true
      },
      {
        id: 'text_teacher_note',
        x: 550,
        y: 450,
        width: 200,
        height: 50,
        text: 'ملاحظة: تذكر التعويض بوحدات SI الصحيحة! (m/s²)',
        color: '#2563eb',
        fontSize: 12,
        fontFamily: 'Cairo, sans-serif',
        isBold: true
      }
    ],
    undoStack: [],
    redoStack: []
  };

  // Page 2: An inserted blank page (ruled style notebook) right after page 1!
  const page2: DocumentPage = {
    id: 'page_2_blank_ruled',
    type: 'blank',
    backgroundStyle: 'ruled',
    width: standardWidth,
    height: standardHeight,
    strokes: [
      // Coordinate axes drawn on the ruled page
      {
        id: 'stroke_coord_1',
        tool: 'coord-axes',
        color: '#0f172a',
        width: 1.5,
        opacity: 1,
        isShape: true,
        shapeType: 'coord-axes',
        points: [
          { x: 150, y: 400 },
          { x: 550, y: 750 }
        ]
      },
      // Linear function line y = 2x
      {
        id: 'stroke_line_1',
        tool: 'line',
        color: '#dc2626',
        width: 2.5,
        opacity: 1,
        isShape: true,
        shapeType: 'line',
        points: [
          { x: 200, y: 700 },
          { x: 500, y: 460 }
        ]
      }
    ],
    textAnnotations: [
      {
        id: 'text_blank_title',
        x: 80,
        y: 18,
        width: 600,
        height: 40,
        text: 'مسودة الشرح والحل التفصيلي (صفحة بيضاء مُدرجة ديناميكياً)',
        color: '#b45309',
        fontSize: 15,
        fontFamily: 'Cairo, sans-serif',
        isBold: true
      },
      {
        id: 'text_blank_steps',
        x: 80,
        y: 75,
        width: 620,
        height: 180,
        text: 'خطوات الحل النموذجي:\n1) حساب التسارع: a = F / m = 20 N / 4 kg = 5 m/s²\n2) حساب السرعة: v(3) = 0 + (5 m/s²)(3 s) = 15 m/s\n3) المسافة المقطوعة: Δx = 0.5 · a · t² = 0.5 · (5) · (9) = 22.5 m\n\nالرسم البياني لمنحنى السرعة مقابل الزمن v-t موضح أدناه:',
        color: '#0f172a',
        fontSize: 13,
        fontFamily: 'Cairo, sans-serif'
      }
    ],
    undoStack: [],
    redoStack: []
  };

  // Page 3: Coordinate Grid scratchpad
  const page3: DocumentPage = {
    id: 'page_3_blank_grid',
    type: 'blank',
    backgroundStyle: 'grid',
    width: standardWidth,
    height: standardHeight,
    strokes: [
      // Rectangle
      {
        id: 'stroke_rect_1',
        tool: 'rect',
        color: '#059669',
        width: 2,
        opacity: 1,
        isShape: true,
        shapeType: 'rect',
        points: [
          { x: 160, y: 220 },
          { x: 580, y: 520 }
        ]
      },
      // Ellipse
      {
        id: 'stroke_ellipse_1',
        tool: 'ellipse',
        color: '#7c3aed',
        width: 2,
        opacity: 1,
        isShape: true,
        shapeType: 'ellipse',
        points: [
          { x: 240, y: 620 },
          { x: 500, y: 840 }
        ]
      }
    ],
    textAnnotations: [
      {
        id: 'text_grid_title',
        x: 40,
        y: 40,
        width: 600,
        height: 40,
        text: 'شبكة الإحداثيات والهندسة التحليلية (صفحة مربعات Grid مُدرجة)',
        color: '#047857',
        fontSize: 16,
        fontFamily: 'Cairo, sans-serif',
        isBold: true
      },
      {
        id: 'text_grid_note',
        x: 40,
        y: 90,
        width: 650,
        height: 60,
        text: 'يمكنك استخدام أدوات الأشكال التلقائية (مستطيل، قطع ناقص، محاور إحداثية، مسطرة) للرسم بدقة هندسية عالية.',
        color: '#334155',
        fontSize: 12,
        fontFamily: 'Cairo, sans-serif'
      }
    ],
    undoStack: [],
    redoStack: []
  };

  return [page1, page2, page3];
}
