import { DrawStroke, DrawPoint } from '../../types/whiteboard';

export type WhiteboardStroke = DrawStroke;
export type StrokePoint = DrawPoint;

export interface RecognizedShapeResult {
  tool: 
    | 'line' 
    | 'arrow' 
    | 'rect' 
    | 'circle' 
    | 'ellipse' 
    | 'triangle' 
    | 'right-triangle' 
    | 'diamond' 
    | 'star' 
    | 'math-axis';
  points: StrokePoint[];
  labelAr: string;
  confidence: number;
}

// Distance between two points
function dist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

// Total length of a polyline
function pathLength(points: StrokePoint[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += dist(points[i - 1], points[i]);
  }
  return len;
}

// Perpendicular distance from a point to a line segment
function perpendicularDistance(p: StrokePoint, p1: StrokePoint, p2: StrokePoint): number {
  const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
  if (l2 === 0) return dist(p, p1);
  const t = Math.max(0, Math.min(1, ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2));
  const projection = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  return dist(p, projection);
}

// Douglas-Peucker Algorithm for curve simplification & corner detection
export function simplifyPolyline(points: StrokePoint[], epsilon: number): StrokePoint[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const last = points.length - 1;

  for (let i = 1; i < last; i++) {
    const d = perpendicularDistance(points[i], points[0], points[last]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const rec1 = simplifyPolyline(points.slice(0, index + 1), epsilon);
    const rec2 = simplifyPolyline(points.slice(index), epsilon);
    return [...rec1.slice(0, rec1.length - 1), ...rec2];
  } else {
    return [points[0], points[last]];
  }
}

// Compute Bounding Box
function getBoundingBox(points: StrokePoint[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2
  };
}

/**
 * Intelligent Hand-Drawn Geometric Shape Recognizer
 * Analyzes point coordinates, trajectory, curvature, closure, and aspect ratio
 * to accurately identify and construct pure geometric primitives.
 */
export function recognizeDrawnShape(stroke: WhiteboardStroke): RecognizedShapeResult | null {
  const rawPoints = stroke.points;
  if (!rawPoints || rawPoints.length < 5) return null;

  const totalLen = pathLength(rawPoints);
  if (totalLen < 25) return null; // Ignore tiny accidental strokes or dots

  const firstPt = rawPoints[0];
  const lastPt = rawPoints[rawPoints.length - 1];
  const startEndDist = dist(firstPt, lastPt);
  const bbox = getBoundingBox(rawPoints);
  const diagonal = Math.hypot(bbox.width, bbox.height);

  // 1. Check if CLOSED SHAPE (Start & End points are close relative to overall length/diagonal)
  const isClosed = (startEndDist / totalLen < 0.22) || (startEndDist < Math.max(28, diagonal * 0.18));

  // ==========================================
  // A. OPEN STROKES: Lines & Arrows
  // ==========================================
  if (!isClosed) {
    // Check for Straight Line: ratio of direct distance to actual travel distance
    const directDist = startEndDist;
    const straightness = directDist / totalLen;

    // Check maximum deviation from the chord line
    let maxDev = 0;
    for (const p of rawPoints) {
      const d = perpendicularDistance(p, firstPt, lastPt);
      if (d > maxDev) maxDev = d;
    }
    const relativeDev = maxDev / directDist;

    // Straight Line detected
    if (straightness > 0.88 && relativeDev < 0.12 && directDist > 30) {
      let p1 = { ...firstPt };
      let p2 = { ...lastPt };

      // Snap to exact horizontal / vertical if very close (< 7 degrees)
      const angleRad = Math.atan2(Math.abs(p2.y - p1.y), Math.abs(p2.x - p1.x));
      const angleDeg = (angleRad * 180) / Math.PI;

      if (angleDeg < 8) {
        // Snap to horizontal
        p2.y = p1.y;
      } else if (angleDeg > 82) {
        // Snap to vertical
        p2.x = p1.x;
      } else if (Math.abs(angleDeg - 45) < 6) {
        // Snap to exact 45 degrees
        const signX = p2.x >= p1.x ? 1 : -1;
        const signY = p2.y >= p1.y ? 1 : -1;
        const avgDelta = (Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y)) / 2;
        p2.x = p1.x + avgDelta * signX;
        p2.y = p1.y + avgDelta * signY;
      }

      return {
        tool: 'line',
        points: [p1, p2],
        labelAr: 'خط مستقيم دقيق 📏',
        confidence: Math.min(0.99, straightness)
      };
    }

    // Check for Arrow (straight shaft with a quick hook or arrowhead at the end)
    if (rawPoints.length > 12) {
      const shaftLen = Math.floor(rawPoints.length * 0.75);
      const shaftPoints = rawPoints.slice(0, shaftLen);
      const shaftStart = shaftPoints[0];
      const shaftEnd = shaftPoints[shaftPoints.length - 1];
      const shaftStraightness = dist(shaftStart, shaftEnd) / pathLength(shaftPoints);

      if (shaftStraightness > 0.85 && dist(shaftStart, lastPt) > 40) {
        return {
          tool: 'arrow',
          points: [shaftStart, lastPt],
          labelAr: 'سهم توجيهي مستقيم ➡️',
          confidence: 0.88
        };
      }
    }
  }

  // ==========================================
  // B. CLOSED STROKES: Circles, Rectangles, Triangles, Diamonds
  // ==========================================
  if (isClosed) {
    const { minX, maxX, minY, maxY, width, height, cx, cy } = bbox;
    const aspectRatio = width / height;

    // Calculate distance from each point to center
    let radiusSum = 0;
    const radii: number[] = [];
    for (const p of rawPoints) {
      const r = dist(p, { x: cx, y: cy });
      radii.push(r);
      radiusSum += r;
    }
    const meanRadius = radiusSum / radii.length;

    // Calculate radius standard deviation / variance
    let varianceSum = 0;
    for (const r of radii) {
      varianceSum += (r - meanRadius) ** 2;
    }
    const stdDev = Math.sqrt(varianceSum / radii.length);
    const radiusCv = stdDev / meanRadius; // Coefficient of variation (smaller = more circular)

    // Simplified polygon vertices using Douglas-Peucker
    const epsilon = Math.max(12, diagonal * 0.08);
    const simplified = simplifyPolyline(rawPoints, epsilon);
    const vertexCount = simplified.length - 1; // Since closed path repeats first/last point

    // 1. CIRCLE RECOGNITION
    // Low radial variation and aspect ratio close to 1:1
    if (radiusCv < 0.18 && aspectRatio >= 0.75 && aspectRatio <= 1.33 && meanRadius > 15) {
      const r = (width + height) / 4;
      return {
        tool: 'circle',
        points: [
          { x: cx - r, y: cy - r, pressure: 0.5 },
          { x: cx + r, y: cy + r, pressure: 0.5 }
        ],
        labelAr: 'دائرة منتظمة مثالية ⭕',
        confidence: Math.max(0.7, 1 - radiusCv * 2)
      };
    }

    // 2. ELLIPSE RECOGNITION
    // Oval with low variance when normalized to ellipse equation
    if (aspectRatio < 0.72 || aspectRatio > 1.38) {
      let ellipseDev = 0;
      const rx = width / 2;
      const ry = height / 2;
      for (const p of rawPoints) {
        const eq = ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2;
        ellipseDev += Math.abs(eq - 1);
      }
      const avgEllipseDev = ellipseDev / rawPoints.length;

      if (avgEllipseDev < 0.35) {
        return {
          tool: 'ellipse',
          points: [
            { x: minX, y: minY, pressure: 0.5 },
            { x: maxX, y: maxY, pressure: 0.5 }
          ],
          labelAr: 'شكل بيضاوي منتظم ⬭',
          confidence: 0.89
        };
      }
    }

    // 3. TRIANGLE RECOGNITION (3 dominant corners)
    if (vertexCount === 3 || vertexCount === 4) {
      // Find top/highest apex point and bottom corners
      let minYPoint = rawPoints[0];
      for (const p of rawPoints) {
        if (p.y < minYPoint.y) minYPoint = p;
      }

      // Check if Right-Triangle (one corner is ~ 90 degrees or close to bounding box corner)
      const isRightTri = Math.abs(minYPoint.x - minX) < width * 0.2 || Math.abs(minYPoint.x - maxX) < width * 0.2;

      if (isRightTri) {
        return {
          tool: 'right-triangle',
          points: [
            { x: minX, y: minY, pressure: 0.5 },
            { x: maxX, y: maxY, pressure: 0.5 }
          ],
          labelAr: 'مثلث قائم الزاوية 📐',
          confidence: 0.92
        };
      } else {
        return {
          tool: 'triangle',
          points: [
            { x: minX, y: minY, pressure: 0.5 },
            { x: maxX, y: maxY, pressure: 0.5 }
          ],
          labelAr: 'مثلث هندسي متناسق 🔺',
          confidence: 0.90
        };
      }
    }

    // 4. RECTANGLE / SQUARE RECOGNITION (4 dominant corners or high area occupancy)
    // Compare path perimeter with bounding box perimeter
    const bboxPerimeter = 2 * (width + height);
    const perimeterRatio = totalLen / bboxPerimeter;

    if (perimeterRatio >= 0.85 && perimeterRatio <= 1.25 && width > 20 && height > 20) {
      // Check if it's a Diamond (Rhombus) rotated 45 deg
      // Find midpoints of edges
      const isSquare = aspectRatio >= 0.85 && aspectRatio <= 1.18;

      if (isSquare) {
        // Square
        const side = Math.max(width, height);
        return {
          tool: 'rect',
          points: [
            { x: cx - side / 2, y: cy - side / 2, pressure: 0.5 },
            { x: cx + side / 2, y: cy + side / 2, pressure: 0.5 }
          ],
          labelAr: 'مربع هندسي متساوي الأضلاع ⏹️',
          confidence: 0.94
        };
      } else {
        // Rectangle
        return {
          tool: 'rect',
          points: [
            { x: minX, y: minY, pressure: 0.5 },
            { x: maxX, y: maxY, pressure: 0.5 }
          ],
          labelAr: 'مستطيل هندسي دقيق ▭',
          confidence: 0.93
        };
      }
    }

    // 5. DIAMOND / RHOMBUS RECOGNITION
    if (vertexCount === 4 && aspectRatio >= 0.7 && aspectRatio <= 1.4) {
      return {
        tool: 'diamond',
        points: [
          { x: minX, y: minY, pressure: 0.5 },
          { x: maxX, y: maxY, pressure: 0.5 }
        ],
        labelAr: 'معين هندسي (Rhombus) 🔶',
        confidence: 0.86
      };
    }
  }

  // Fallback: If no recognized shape pattern matches with high confidence, return null
  return null;
}
