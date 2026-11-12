import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { jsPDF } from 'jspdf';
import { WhiteboardPage } from '../types/whiteboard';

// Configure worker for PDF.js - prefer local bundled worker to eliminate CORS/origin issues
if (typeof window !== 'undefined') {
  try {
    if (pdfWorkerUrl) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    } else {
      const version = pdfjsLib.version || '6.3.289';
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    }
  } catch (e) {
    console.warn('PDF.js worker setup warning:', e);
  }
}

export interface RenderedPdfPage {
  pageNumber: number;
  dataUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
}

export interface PdfDocumentInfo {
  numPages: number;
  title?: string;
  pages: {
    pageNumber: number;
    thumbnailUrl: string;
    width: number;
    height: number;
  }[];
  pdfDoc: any;
}

/**
 * Parses user-friendly page range strings like "1, 3-5, 8" into an array of page numbers
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    // Default to all pages if empty
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const selectedPages = new Set<number>();
  const parts = rangeStr.split(/[,،]/); // Support Arabic & English commas

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (part.includes('-') || part.includes('–') || part.includes('—')) {
      const [startStr, endStr] = part.split(/[-–—]/).map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(totalPages, Math.max(start, end));
        for (let p = from; p <= to; p++) {
          selectedPages.add(p);
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        selectedPages.add(p);
      }
    }
  }

  return Array.from(selectedPages).sort((a, b) => a - b);
}

/**
 * Quickly loads PDF metadata and lightweight thumbnail previews for the Page Selector modal
 */
export async function loadPdfMetadataAndThumbnails(
  file: File | ArrayBuffer,
  onProgress?: (loaded: number, total: number) => void
): Promise<PdfDocumentInfo> {
  try {
    let data: ArrayBuffer;
    if (file instanceof File) {
      data = await file.arrayBuffer();
    } else {
      data = file;
    }

    // Always slice array buffer so the source buffer is never detached or neutered by worker transfer
    const dataCopy = data.slice(0);
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(dataCopy),
      useWorkerFetch: true,
      isEvalSupported: false,
      useSystemFonts: true
    } as any);

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pagesInfo: PdfDocumentInfo['pages'] = [];

    // Render fast low-res thumbnails
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      // Low-res thumbnail scale (0.4 for rapid loading)
      const viewport = page.getViewport({ scale: 0.4 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) continue;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport
      } as any).promise;

      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
      pagesInfo.push({
        pageNumber: pageNum,
        thumbnailUrl,
        width: viewport.width * 2.5,
        height: viewport.height * 2.5
      });

      if (typeof onProgress === 'function') {
        try {
          onProgress(pageNum, numPages);
        } catch (e) {
          // ignore
        }
      }
    }

    return {
      numPages,
      title: file instanceof File ? file.name : 'مستند PDF',
      pages: pagesInfo,
      pdfDoc
    };
  } catch (error) {
    console.error('Error loading PDF thumbnails:', error);
    throw error;
  }
}

/**
 * Loads specific selected PDF pages in crystal-clear high-res (2.0x to 4.0x) for whiteboard canvas
 */
export async function loadSelectedPdfPages(
  pdfDocOrFile: any,
  selectedPageNumbers: number[],
  onProgressOrScale?: ((completed: number, total: number) => void) | number,
  renderScale: number = 2.5
): Promise<RenderedPdfPage[]> {
  try {
    let onProgress: ((completed: number, total: number) => void) | undefined;
    let effectiveScale = renderScale;

    // Support flexible argument positions: (pdfDoc, pages, scale) or (pdfDoc, pages, callback, scale)
    if (typeof onProgressOrScale === 'number') {
      effectiveScale = onProgressOrScale;
      onProgress = undefined;
    } else if (typeof onProgressOrScale === 'function') {
      onProgress = onProgressOrScale;
    }

    effectiveScale = Math.min(4.0, Math.max(1.5, effectiveScale));

    let pdfDoc = pdfDocOrFile;
    if (pdfDocOrFile instanceof File || pdfDocOrFile instanceof ArrayBuffer) {
      let data: ArrayBuffer = pdfDocOrFile instanceof File ? await pdfDocOrFile.arrayBuffer() : pdfDocOrFile;
      const dataCopy = data.slice(0);
      const task = pdfjsLib.getDocument({ 
        data: new Uint8Array(dataCopy), 
        isEvalSupported: false, 
        useSystemFonts: true 
      } as any);
      pdfDoc = await task.promise;
    }

    const renderedPages: RenderedPdfPage[] = [];
    const total = selectedPageNumbers.length;

    for (let i = 0; i < selectedPageNumbers.length; i++) {
      const pageNum = selectedPageNumbers[i];
      const page = await pdfDoc.getPage(pageNum);
      
      // High-res viewport for razor-sharp Retina & SmartBoard rendering
      const viewport = page.getViewport({ scale: effectiveScale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) continue;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      // High quality smoothing settings
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport,
        intent: 'print'
      } as any).promise;

      // Use crisp PNG or high-quality image format
      const dataUrl = canvas.toDataURL('image/png');
      
      renderedPages.push({
        pageNumber: pageNum,
        dataUrl,
        width: Math.floor(viewport.width / effectiveScale), // Logical unscaled width
        height: Math.floor(viewport.height / effectiveScale) // Logical unscaled height
      });

      if (typeof onProgress === 'function') {
        try {
          onProgress(i + 1, total);
        } catch (cbErr) {
          console.warn('Progress callback error:', cbErr);
        }
      }
    }

    return renderedPages;
  } catch (error) {
    console.error('Error rendering selected PDF pages:', error);
    throw error;
  }
}

/**
 * Creates a merged dual-page side-by-side spread background (Right Page + Left Page)
 */
export async function createDualPageSpread(
  pageRight: RenderedPdfPage | null,
  pageLeft: RenderedPdfPage | null,
  options: {
    spreadWidth?: number;
    spreadHeight?: number;
    scratchpadBg?: string;
    rightLabel?: string;
    leftLabel?: string;
  } = {}
): Promise<string> {
  const spreadWidth = options.spreadWidth || 1920;
  const spreadHeight = options.spreadHeight || 1080;
  const canvas = document.createElement('canvas');
  canvas.width = spreadWidth;
  canvas.height = spreadHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const halfWidth = Math.floor(spreadWidth / 2);

  // 1. Draw overall book background
  ctx.fillStyle = '#0f172a'; // Deep slate book container
  ctx.fillRect(0, 0, spreadWidth, spreadHeight);

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Helper to draw a single page sheet in halfWidth x spreadHeight
  const drawPageSheet = async (
    pageData: RenderedPdfPage | null,
    offsetX: number,
    label: string,
    isScratchpad: boolean = false
  ) => {
    const margin = 16;
    const pageW = halfWidth - margin * 2;
    const pageH = spreadHeight - margin * 2;
    const x = offsetX + margin;
    const y = margin;

    // Draw page shadow and white paper background
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = offsetX === 0 ? 4 : -4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x, y, pageW, pageH, 12);
    ctx.fill();
    ctx.restore();

    if (pageData && pageData.dataUrl) {
      try {
        const img = await loadImage(pageData.dataUrl);
        // Calculate aspect fit inside pageW, pageH
        const scale = Math.min(pageW / img.width, pageH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const imgX = x + (pageW - drawW) / 2;
        const imgY = y + (pageH - drawH) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, pageW, pageH, 12);
        ctx.clip();
        ctx.drawImage(img, imgX, imgY, drawW, drawH);
        ctx.restore();
      } catch (e) {
        console.warn('Failed to load page image in spread:', e);
      }
    } else if (isScratchpad) {
      // Draw grid or ruled lines for scratchpad
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, pageW, pageH, 12);
      ctx.clip();

      if (options.scratchpadBg === 'ruled') {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1;
        const lineSpacing = 32;
        for (let ly = y + 50; ly < y + pageH - 20; ly += lineSpacing) {
          ctx.beginPath();
          ctx.moveTo(x + 20, ly);
          ctx.lineTo(x + pageW - 20, ly);
          ctx.stroke();
        }
      } else {
        // Subtle math grid
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 0.8;
        const gridSize = 30;
        for (let gx = x + 20; gx < x + pageW - 20; gx += gridSize) {
          ctx.beginPath();
          ctx.moveTo(gx, y + 20);
          ctx.lineTo(gx, y + pageH - 20);
          ctx.stroke();
        }
        for (let gy = y + 20; gy < y + pageH - 20; gy += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x + 20, gy);
          ctx.lineTo(x + pageW - 20, gy);
          ctx.stroke();
        }
      }

      // Scratchpad watermarked title
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 15px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.fillText('📝 مسودة الحل وملاحظات الشرح الذكي', x + pageW / 2, y + 36);
      ctx.restore();
    }

    // Top subtle label badge
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x + pageW / 2 - 60, y + 8, 120, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(label, x + pageW / 2, y + 24);

    // Bottom subtle Academy footer
    ctx.save();
    ctx.strokeStyle = 'rgba(30, 58, 138, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 24, y + pageH - 28);
    ctx.lineTo(x + pageW - 24, y + pageH - 28);
    ctx.stroke();

    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 11px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText('🎓 أكاديمية التفوق أون لاين', x + pageW / 2, y + pageH - 12);
    ctx.restore();
  };

  // Draw Right Page (White Scratchpad on the Right in dual spread) and Left Page (PDF on the Left)
  await drawPageSheet(
    pageRight,
    halfWidth, // Right side
    options.rightLabel || (pageRight ? `الصفحة ${pageRight.pageNumber}` : '📝 اللوح الأبيض للشرح والحل'),
    !pageRight
  );

  await drawPageSheet(
    pageLeft,
    0, // Left side
    options.leftLabel || (pageLeft ? `📄 مستند PDF - صفحة ${pageLeft.pageNumber}` : 'مسودة الشرح والحل'),
    !pageLeft
  );

  // 2. Draw middle book spine / seam
  ctx.save();
  const spineGrad = ctx.createLinearGradient(halfWidth - 16, 0, halfWidth + 16, 0);
  spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
  spineGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.8)');
  spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(halfWidth - 8, 0, 16, spreadHeight);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Creates a merged vertical continuous stacked spread with pages placed one below the other
 * Layout: PDF Pages strictly on the LEFT, White Board / Scratchpad strictly on the RIGHT.
 */
export async function createVerticalStackedPagesSpread(
  pages: RenderedPdfPage[],
  options: {
    spreadWidth?: number;
    hasScratchpadSideLane?: boolean;
    scratchpadBg?: string;
    margin?: number;
    pageGap?: number;
    showPageHeaders?: boolean;
    canvasBgColor?: string;
  } = {}
): Promise<string> {
  if (pages.length === 0) return '';

  const spreadWidth = options.spreadWidth || 1600;
  const margin = options.margin ?? 32;
  const pageGap = options.pageGap ?? 52;
  const showHeaders = options.showPageHeaders !== false;
  const hasSideLane = options.hasScratchpadSideLane !== false; // Default to true (Whiteboard on right, PDF on left)
  const canvasBgColor = options.canvasBgColor || '#0f172a';

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Pre-load all page images to compute exact heights
  const loadedImages: HTMLImageElement[] = [];
  for (const page of pages) {
    try {
      const img = await loadImage(page.dataUrl);
      loadedImages.push(img);
    } catch (e) {
      console.warn('Failed to load page image for vertical stack:', page.pageNumber, e);
    }
  }

  if (loadedImages.length === 0) return '';

  const contentWidth = spreadWidth - margin * 2;
  const gapBetweenCols = 24;
  // Balanced width: PDF on the left gets 48%, Whiteboard on the right gets 52%
  const pdfWidth = hasSideLane ? Math.floor((contentWidth - gapBetweenCols) * 0.48) : contentWidth;
  const scratchWidth = hasSideLane ? contentWidth - pdfWidth - gapBetweenCols : 0;
  const headerHeight = showHeaders ? 46 : 0;

  // Compute layout positions for each page
  interface PageLayoutInfo {
    page: RenderedPdfPage;
    img: HTMLImageElement;
    y: number;
    pdfHeight: number;
    totalBlockHeight: number;
  }

  let currentY = margin;
  const layoutInfos: PageLayoutInfo[] = [];

  for (let i = 0; i < loadedImages.length; i++) {
    const img = loadedImages[i];
    const page = pages[i];
    const aspect = img.naturalHeight / (img.naturalWidth || 1);
    const pdfHeight = Math.max(700, Math.round(pdfWidth * aspect));
    const totalBlockHeight = headerHeight + pdfHeight;

    layoutInfos.push({
      page,
      img,
      y: currentY,
      pdfHeight,
      totalBlockHeight
    });

    currentY += totalBlockHeight + pageGap;
  }

  const totalCanvasHeight = currentY - pageGap + margin;

  const canvas = document.createElement('canvas');
  canvas.width = spreadWidth;
  canvas.height = totalCanvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Draw overall canvas background
  ctx.fillStyle = canvasBgColor;
  ctx.fillRect(0, 0, spreadWidth, totalCanvasHeight);

  // 2. Draw each page in vertical stack: PDF on LEFT, White Page on RIGHT
  for (let i = 0; i < layoutInfos.length; i++) {
    const info = layoutInfos[i];
    const blockY = info.y;
    // PDF is positioned on the LEFT side:
    const pdfX = margin;
    // White Board / Scratchpad is positioned on the RIGHT side:
    const scratchX = pdfX + pdfWidth + gapBetweenCols;

    // --- LEFT COLUMN: PDF PAGE CONTAINER ---
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(pdfX, blockY, pdfWidth, info.totalBlockHeight, 14);
    ctx.fill();
    ctx.restore();

    // PDF Header bar
    if (showHeaders) {
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(pdfX, blockY, pdfWidth, headerHeight, [14, 14, 0, 0]);
      ctx.fill();

      // Header Page badge
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillText(`📄 صفحة ${info.page.pageNumber} من المستند (PDF على اليسار)`, pdfX + pdfWidth - 18, blockY + 30);

      // Left subtitle / index
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px Cairo, sans-serif';
      ctx.textAlign = 'left';
      ctx.direction = 'ltr';
      ctx.fillText(`صفحة ${i + 1} من ${layoutInfos.length}`, pdfX + 18, blockY + 30);
      ctx.restore();
    }

    // PDF Image content inside left container
    const imgY = blockY + headerHeight;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pdfX, imgY, pdfWidth, info.pdfHeight, showHeaders ? [0, 0, 14, 14] : 14);
    ctx.clip();
    ctx.drawImage(info.img, pdfX, imgY, pdfWidth, info.pdfHeight);
    ctx.restore();

    // --- RIGHT COLUMN: WHITE SCRATCHPAD / WHITEBOARD CONTAINER ---
    if (hasSideLane && scratchWidth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(scratchX, blockY, scratchWidth, info.totalBlockHeight, 14);
      ctx.fill();
      ctx.restore();

      // Whiteboard header bar (on the right)
      if (showHeaders) {
        ctx.save();
        ctx.fillStyle = '#065f46'; // Elegant emerald teacher banner
        ctx.beginPath();
        ctx.roundRect(scratchX, blockY, scratchWidth, headerHeight, [14, 14, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#d1fae5';
        ctx.font = 'bold 14px Cairo, sans-serif';
        ctx.textAlign = 'right';
        ctx.direction = 'rtl';
        ctx.fillText(`📝 الصفحة البيضاء للشرح والحل (مقابل صـ ${info.page.pageNumber})`, scratchX + scratchWidth - 18, blockY + 30);

        ctx.fillStyle = '#a7f3d0';
        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.textAlign = 'left';
        ctx.direction = 'rtl';
        ctx.fillText('اللوح الأبيض التفاعلي ✍️', scratchX + 18, blockY + 30);
        ctx.restore();
      }

      // Whiteboard paper surface pattern
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(scratchX, imgY, scratchWidth, info.pdfHeight, [0, 0, 14, 14]);
      ctx.clip();

      if (options.scratchpadBg === 'ruled') {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1;
        for (let ly = imgY + 44; ly < imgY + info.pdfHeight - 20; ly += 34) {
          ctx.beginPath();
          ctx.moveTo(scratchX + 16, ly);
          ctx.lineTo(scratchX + scratchWidth - 16, ly);
          ctx.stroke();
        }
      } else if (options.scratchpadBg === 'blank') {
        // Pure crisp white canvas with subtle watermark
        ctx.fillStyle = 'rgba(203, 213, 225, 0.25)';
        ctx.font = 'bold 16px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        ctx.fillText('مساحة بيضاء مخصصة للشرح والحل بالرسم والكتابة ✍️', scratchX + scratchWidth / 2, imgY + 50);
      } else {
        // Grid pattern (default high-clarity grid)
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 0.8;
        const gridSize = 28;
        for (let gx = scratchX + 16; gx < scratchX + scratchWidth - 16; gx += gridSize) {
          ctx.beginPath();
          ctx.moveTo(gx, imgY + 16);
          ctx.lineTo(gx, imgY + info.pdfHeight - 16);
          ctx.stroke();
        }
        for (let gy = imgY + 16; gy < imgY + info.pdfHeight - 16; gy += gridSize) {
          ctx.beginPath();
          ctx.moveTo(scratchX + 16, gy);
          ctx.lineTo(scratchX + scratchWidth - 16, gy);
          ctx.stroke();
        }

        // Helpful watermark
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.font = 'bold 13px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        ctx.fillText('📝 اكتب خطوات الحل والمعادلات هنا بحرية', scratchX + scratchWidth / 2, imgY + 36);
      }
      ctx.restore();
    }

    // Academy Footer at bottom of stacked page block
    ctx.save();
    const footerSepY = imgY + info.pdfHeight + 8;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, footerSepY);
    ctx.lineTo(spreadWidth - margin, footerSepY);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11.5px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(`🎓 أكاديمية التفوق أون لاين   |   صفحة ${info.page.pageNumber} من ${layoutInfos.length}`, spreadWidth / 2, footerSepY + 16);
    ctx.restore();

    // =========================================================================
    // Connectors / Numbered Organized Dividers between stacked pages
    // فواصل مرقمة ومنظمة تدل على رقم كل صفحة متتابعة كما ملف pdf
    // =========================================================================
    if (i < layoutInfos.length - 1) {
      const nextInfo = layoutInfos[i + 1];
      const dividerY = blockY + info.totalBlockHeight + pageGap / 2;
      
      ctx.save();
      
      // Upper and lower accent rules
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(margin, dividerY - 4);
      ctx.lineTo(spreadWidth - margin, dividerY - 4);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.moveTo(margin, dividerY + 4);
      ctx.lineTo(spreadWidth - margin, dividerY + 4);
      ctx.stroke();

      // Numbered Page Transition Central Pill
      const pillWidth = 520;
      const pillHeight = 44;
      const pillX = (spreadWidth - pillWidth) / 2;
      const pillY = dividerY - pillHeight / 2;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 22);
      ctx.fill();

      // Golden Amber border
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Main Text inside Pill
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 13px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.fillText(
        `📑 فاصل منظم • نهاية صفحة (${info.page.pageNumber}) ⬇️ بداية صفحة (${nextInfo.page.pageNumber}) من ${layoutInfos.length} صفحات`,
        spreadWidth / 2,
        dividerY + 5
      );

      // Left Tag: Scroll guide
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px Cairo, sans-serif';
      ctx.textAlign = 'left';
      ctx.direction = 'rtl';
      ctx.fillText(`تتابع مستمر 🖱️ حرك بالماوس`, margin + 12, dividerY + 4);

      // Right Tag: Next page badge
      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 11px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillText(`الصفحة التالية: صـ ${nextInfo.page.pageNumber}`, spreadWidth - margin - 12, dividerY + 4);

      ctx.restore();
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Loads all PDF pages (legacy fallback)
 */
export async function loadPdfPages(file: File | ArrayBuffer): Promise<RenderedPdfPage[]> {
  const metadata = await loadPdfMetadataAndThumbnails(file);
  const allPageNums = Array.from({ length: metadata.numPages }, (_, i) => i + 1);
  return loadSelectedPdfPages(metadata.pdfDoc, allPageNums);
}

/**
 * Exports multiple whiteboard pages to a single merged PDF file in high resolution
 */
export async function exportWhiteboardToPdf(
  pages: WhiteboardPage[],
  renderPageCanvas: (page: WhiteboardPage) => Promise<HTMLCanvasElement>,
  filename: string = 'اللوح_الذكي_المكتمل.pdf'
): Promise<void> {
  if (pages.length === 0) return;

  try {
    // Render first page to determine initial orientation
    const firstCanvas = await renderPageCanvas(pages[0]);
    const isLandscape = firstCanvas.width > firstCanvas.height;

    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'px',
      format: [firstCanvas.width, firstCanvas.height],
      hotfixes: ['px_scaling'],
      compress: true
    });

    // Add first page with highest quality
    const firstImgData = firstCanvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(firstImgData, 'JPEG', 0, 0, firstCanvas.width, firstCanvas.height, undefined, 'SLOW');

    // Add remaining pages
    for (let i = 1; i < pages.length; i++) {
      const pageCanvas = await renderPageCanvas(pages[i]);
      const pageIsLandscape = pageCanvas.width > pageCanvas.height;
      
      pdf.addPage([pageCanvas.width, pageCanvas.height], pageIsLandscape ? 'landscape' : 'portrait');
      const imgData = pageCanvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, pageCanvas.width, pageCanvas.height, undefined, 'SLOW');
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (error) {
    console.error('Failed to export whiteboard pages to PDF:', error);
    throw error;
  }
}

/**
 * Downloads a canvas element as an image (PNG or JPG)
 */
export function downloadCanvasImage(
  canvas: HTMLCanvasElement, 
  filename: string = 'لوح_تعليمي_ذكي.png',
  format: 'png' | 'jpeg' = 'png'
): void {
  try {
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? 0.95 : 1.0;
    const dataUrl = canvas.toDataURL(mime, quality);

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error downloading canvas as image:', err);
  }
}

