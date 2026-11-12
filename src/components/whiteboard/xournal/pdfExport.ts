import { PDFDocument, rgb } from 'pdf-lib';
import { DocumentPage, PageBackgroundStyle, CanvasStroke, TextAnnotation } from './types';

/**
 * Renders the canvas overlay (strokes + text) of a given page to a high-res PNG data URL
 */
export async function renderPageCanvasToDataUrl(
  page: DocumentPage,
  scale: number = 2
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(page.width * scale);
  canvas.height = Math.floor(page.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // If blank page, draw background
  if (page.type === 'blank') {
    drawPageBackground(ctx, page.width, page.height, page.backgroundStyle);
  }

  // Draw strokes
  for (const stroke of page.strokes) {
    drawStrokeOnContext(ctx, stroke);
  }

  // Draw text annotations
  for (const text of page.textAnnotations) {
    drawTextOnContext(ctx, text);
  }

  // Official Academy margin / footer at the bottom of each page
  drawPageFooter(ctx, page.width, page.height);

  return canvas.toDataURL('image/png');
}

/**
 * Draws the official Academy margin/footer at the bottom of the page
 * Formatted with "أكاديمية التفوق أون لاين" and "واتساب: +972 50-932-9568"
 */
export function drawPageFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pageNumber?: number
) {
  ctx.save();
  const footerHeight = 24;
  const y = height - footerHeight;

  // Background white bar with subtle top divider
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, y, width, footerHeight);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();

  ctx.textBaseline = 'middle';
  const textY = y + footerHeight / 2;

  // Right side: اسم الأكاديمية
  ctx.font = 'bold 10px Tahoma, "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#0D365A';
  ctx.textAlign = 'right';
  ctx.fillText('🎓 أكاديمية التفوق أون لاين', width - 16, textY);

  // Left side: واتساب + رقم الصفحة
  ctx.font = 'bold 9.5px Tahoma, "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#059669';
  ctx.textAlign = 'left';
  const pageLabel = pageNumber ? `   •   صـ ${pageNumber}` : '';
  ctx.fillText(`واتساب: +972 50-932-9568${pageLabel}`, 16, textY);

  ctx.restore();
}

/**
 * Draws background pattern (plain, ruled, grid, dotted)
 */
export function drawPageBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: PageBackgroundStyle
) {
  // Base paper color
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Always draw the official footer on the background
  drawPageFooter(ctx, width, height);

  if (style === 'plain') return;

  if (style === 'ruled') {
    // Ruled lined paper (Xournal++ style notebook)
    const lineSpacing = 28;
    const topMargin = 50;
    const bottomMargin = 40;
    const leftMargin = 60; // Pink margin line

    // Horizontal blue ruled lines
    ctx.strokeStyle = '#cce3f5';
    ctx.lineWidth = 1;

    for (let y = topMargin; y < height - bottomMargin; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical pink margin line
    ctx.strokeStyle = '#f8b4b4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftMargin, 0);
    ctx.lineTo(leftMargin, height);
    ctx.stroke();
  } else if (style === 'grid') {
    // Coordinate grid paper (Xournal++ 5mm grid style)
    const gridSize = 20;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.8;

    // Vertical lines
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Major grid lines every 5 units
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    for (let x = 0; x < width; x += gridSize * 5) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize * 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (style === 'dotted') {
    // Dotted bullet journal style
    const dotSpacing = 20;
    ctx.fillStyle = '#94a3b8';

    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Draws a single stroke on 2D canvas context
 */
export function drawStrokeOnContext(ctx: CanvasRenderingContext2D, stroke: CanvasStroke) {
  if (!stroke.points || stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;

  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = stroke.opacity || 0.35;
    ctx.globalCompositeOperation = 'multiply';
  } else if (stroke.tool === 'eraser-whiteout') {
    ctx.strokeStyle = '#FFFFFF';
    ctx.globalAlpha = 1.0;
  } else {
    ctx.globalAlpha = stroke.opacity || 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Handle Shapes
  if (stroke.isShape && stroke.shapeType && stroke.points.length >= 2) {
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];

    if (stroke.shapeType === 'line') {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (stroke.shapeType === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLength = Math.max(12, stroke.width * 3.5);
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle - Math.PI / 6),
        end.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle + Math.PI / 6),
        end.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    } else if (stroke.shapeType === 'rect') {
      ctx.beginPath();
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (stroke.shapeType === 'ellipse') {
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (stroke.shapeType === 'coord-axes') {
      // Draw Cartesian coordinate axes
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      // X-Axis
      ctx.beginPath();
      ctx.moveTo(minX, midY);
      ctx.lineTo(maxX, midY);
      // X-Arrowhead
      ctx.lineTo(maxX - 8, midY - 5);
      ctx.moveTo(maxX, midY);
      ctx.lineTo(maxX - 8, midY + 5);
      ctx.stroke();

      // Y-Axis
      ctx.beginPath();
      ctx.moveTo(midX, maxY);
      ctx.lineTo(midX, minY);
      // Y-Arrowhead
      ctx.lineTo(midX - 5, minY + 8);
      ctx.moveTo(midX, minY);
      ctx.lineTo(midX + 5, minY + 8);
      ctx.stroke();

      // Ticks
      const step = 20;
      for (let x = midX + step; x < maxX - 10; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, midY - 3);
        ctx.lineTo(x, midY + 3);
        ctx.stroke();
      }
      for (let x = midX - step; x > minX + 10; x -= step) {
        ctx.beginPath();
        ctx.moveTo(x, midY - 3);
        ctx.lineTo(x, midY + 3);
        ctx.stroke();
      }
      for (let y = midY - step; y > minY + 10; y -= step) {
        ctx.beginPath();
        ctx.moveTo(midX - 3, y);
        ctx.lineTo(midX + 3, y);
        ctx.stroke();
      }
      for (let y = midY + step; y < maxY - 10; y += step) {
        ctx.beginPath();
        ctx.moveTo(midX - 3, y);
        ctx.lineTo(midX + 3, y);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  // Freehand path with stylus pressure support
  const pts = stroke.points;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, Math.max(1, stroke.width / 2), 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }

  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a single text annotation with word-wrapping and multiline support
 */
export function drawTextOnContext(ctx: CanvasRenderingContext2D, text: TextAnnotation) {
  if (!text.text) return;
  ctx.save();
  ctx.fillStyle = text.color;
  ctx.font = `${text.isItalic ? 'italic ' : ''}${text.isBold ? 'bold ' : ''}${text.fontSize}px ${text.fontFamily || 'Cairo, sans-serif'}`;
  ctx.textBaseline = 'top';

  const maxWidth = Math.max(120, text.width || 650);
  const rawLines = text.text.split('\n');
  const lineHeight = text.fontSize * 1.4;
  let currentY = text.y;

  for (const rawLine of rawLines) {
    if (!rawLine) {
      currentY += lineHeight;
      continue;
    }

    const words = rawLine.split(' ');
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(currentLine, text.x, currentY);
        currentLine = words[n];
        currentY += lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      ctx.fillText(currentLine, text.x, currentY);
      currentY += lineHeight;
    }
  }

  ctx.restore();
}

/**
 * Main PDF Export function:
 * Compiles all pages in the unified list (both original PDF pages and inserted blank pages),
 * blending annotations on top at full vector print resolution.
 */
export async function exportDocumentToAnnotatedPdf(
  pages: DocumentPage[],
  originalPdfBuffer?: ArrayBuffer,
  documentTitle: string = 'Xournal_Document'
): Promise<Uint8Array> {
  const exportPdf = await PDFDocument.create();

  // If original PDF exists, load it to copy original vector pages
  let sourcePdfDoc: PDFDocument | null = null;
  if (originalPdfBuffer && originalPdfBuffer.byteLength > 0) {
    try {
      sourcePdfDoc = await PDFDocument.load(originalPdfBuffer);
    } catch (e) {
      console.warn('Could not load source PDF bytes, will fallback to high-res raster overlays:', e);
    }
  }

  const exportScale = 2.5; // High-DPI scaling for sharp print resolution

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    if (page.type === 'pdf') {
      let targetPage: any = null;

      // Copy source vector page if available
      if (sourcePdfDoc && page.pdfPageIndex >= 1 && page.pdfPageIndex <= sourcePdfDoc.getPageCount()) {
        try {
          const [copiedPage] = await exportPdf.copyPages(sourcePdfDoc, [page.pdfPageIndex - 1]);
          targetPage = exportPdf.addPage(copiedPage);
        } catch (e) {
          console.warn('Copy page error, falling back to new page:', e);
        }
      }

      if (!targetPage) {
        targetPage = exportPdf.addPage([page.width, page.height]);
        // If high-res background image dataUrl is present, embed it (supporting both PNG and JPEG)
        if (page.pdfDataUrl) {
          try {
            const isJpg = page.pdfDataUrl.startsWith('data:image/jpeg') || page.pdfDataUrl.startsWith('data:image/jpg');
            const embeddedBg = isJpg
              ? await exportPdf.embedJpg(page.pdfDataUrl)
              : await exportPdf.embedPng(page.pdfDataUrl);
            targetPage.drawImage(embeddedBg, {
              x: 0,
              y: 0,
              width: page.width,
              height: page.height
            });
          } catch (e) {
            console.error('Error embedding PDF page background:', e);
          }
        }
      }

      // Render official academy footer margin + annotations layer to high-res transparent PNG and overlay
      const annotationCanvas = document.createElement('canvas');
      annotationCanvas.width = Math.floor(page.width * exportScale);
      annotationCanvas.height = Math.floor(page.height * exportScale);
      const ctx = annotationCanvas.getContext('2d');
      if (ctx) {
        ctx.scale(exportScale, exportScale);
        for (const s of page.strokes) {
          drawStrokeOnContext(ctx, s);
        }
        for (const t of page.textAnnotations) {
          drawTextOnContext(ctx, t);
        }
        // Always draw the official Academy footer margin on PDF pages
        drawPageFooter(ctx, page.width, page.height, page.pdfPageIndex || (i + 1));

        const overlayDataUrl = annotationCanvas.toDataURL('image/png');
        const overlayPng = await exportPdf.embedPng(overlayDataUrl);
        targetPage.drawImage(overlayPng, {
          x: 0,
          y: 0,
          width: page.width,
          height: page.height
        });
      }
    } else {
      // Blank Inserted Page (Plain, Ruled, Grid, or Dotted)
      const targetPage = exportPdf.addPage([page.width, page.height]);

      // Render full blank page with ruled/grid background + annotations at high resolution
      const fullPageDataUrl = await renderPageCanvasToDataUrl(page, exportScale);
      if (fullPageDataUrl) {
        const fullPagePng = await exportPdf.embedPng(fullPageDataUrl);
        targetPage.drawImage(fullPagePng, {
          x: 0,
          y: 0,
          width: page.width,
          height: page.height
        });
      }
    }
  }

  const pdfBytes = await exportPdf.save();
  return pdfBytes;
}

/**
 * Triggers file download of Uint8Array PDF
 */
export function downloadPdfBytes(pdfBytes: Uint8Array, fileName: string = 'document.pdf') {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
