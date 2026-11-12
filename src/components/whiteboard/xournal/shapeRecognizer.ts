import { StrokePoint, CanvasStroke } from './types';

export interface RecognizedShape {
  type: 'line' | 'arrow' | 'rect' | 'ellipse';
  points: StrokePoint[];
}

/**
 * Recognizes if a freehand drawn stroke approximates a basic geometric shape
 */
export function recognizeDrawnShape(points: StrokePoint[]): RecognizedShape | null {
  if (!points || points.length < 5) return null;

  const start = points[0];
  const end = points[points.length - 1];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  let totalLength = 0;
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    minX = Math.min(minX, pt.x);
    maxX = Math.max(maxX, pt.x);
    minY = Math.min(minY, pt.y);
    maxY = Math.max(maxY, pt.y);

    if (i > 0) {
      const prev = points[i - 1];
      totalLength += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    }
  }

  const directDistance = Math.hypot(end.x - start.x, end.y - start.y);
  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;

  // 1. Straight Line Check: path length is very close to direct Euclidean distance
  if (totalLength > 30 && directDistance / totalLength > 0.92) {
    return {
      type: 'line',
      points: [start, end]
    };
  }

  // 2. Closed Loop Check (Start and End are close together)
  const isClosed = directDistance < Math.max(25, Math.hypot(bboxWidth, bboxHeight) * 0.2);

  if (isClosed && bboxWidth > 20 && bboxHeight > 20) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = bboxWidth / 2;
    const ry = bboxHeight / 2;

    // Check if points fit an ellipse/circle
    let ellipseDeviationSum = 0;
    for (const pt of points) {
      const normX = (pt.x - cx) / (rx || 1);
      const normY = (pt.y - cy) / (ry || 1);
      const distFrom1 = Math.abs(Math.hypot(normX, normY) - 1);
      ellipseDeviationSum += distFrom1;
    }
    const avgEllipseDeviation = ellipseDeviationSum / points.length;

    if (avgEllipseDeviation < 0.22) {
      return {
        type: 'ellipse',
        points: [
          { x: minX, y: minY },
          { x: maxX, y: maxY }
        ]
      };
    }

    // Check if points fit a rectangle
    // A rectangle perimeter is approximately 2 * (w + h)
    const rectPerimeter = 2 * (bboxWidth + bboxHeight);
    if (Math.abs(totalLength - rectPerimeter) / rectPerimeter < 0.3) {
      return {
        type: 'rect',
        points: [
          { x: minX, y: minY },
          { x: maxX, y: maxY }
        ]
      };
    }
  }

  return null;
}
