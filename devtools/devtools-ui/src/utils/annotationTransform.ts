import { GroundTruthPoint, ViewportTransform } from '../types/annotation';

/**
 * Converts screen client coordinates (clientX, clientY) to exact original image pixel space (xPx, yPx).
 * Uses native SVG CTM inverse transformation to handle zoom, pan, DPI, and layout positioning.
 */
export function screenToImagePixel(
  clientX: number,
  clientY: number,
  svgElement: SVGSVGElement | null,
  imageWidth: number,
  imageHeight: number,
  clampToBounds = true
): GroundTruthPoint {
  if (!svgElement) {
    return { xPx: 0, yPx: 0 };
  }

  const ctm = svgElement.getScreenCTM();
  if (!ctm) {
    return { xPx: 0, yPx: 0 };
  }

  const pt = svgElement.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const transformed = pt.matrixTransform(ctm.inverse());

  let x = Math.round(transformed.x);
  let y = Math.round(transformed.y);

  if (clampToBounds && imageWidth > 0 && imageHeight > 0) {
    x = Math.max(0, Math.min(imageWidth, x));
    y = Math.max(0, Math.min(imageHeight, y));
  }

  return { xPx: x, yPx: y };
}

/**
 * Calculates zoom and pan values to fit the floorplan image within the container viewport.
 */
export function calculateFitTransform(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  padding = 40
): ViewportTransform {
  if (containerWidth <= 0 || containerHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { zoom: 1, panX: 0, panY: 0 };
  }

  const availableWidth = Math.max(10, containerWidth - padding * 2);
  const availableHeight = Math.max(10, containerHeight - padding * 2);

  const scaleX = availableWidth / imageWidth;
  const scaleY = availableHeight / imageHeight;
  const zoom = Math.min(scaleX, scaleY);

  const displayedWidth = imageWidth * zoom;
  const displayedHeight = imageHeight * zoom;

  const panX = (containerWidth - displayedWidth) / 2;
  const panY = (containerHeight - displayedHeight) / 2;

  return { zoom, panX, panY };
}
