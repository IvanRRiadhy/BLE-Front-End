/**
 * Internal Detection Engine Models
 * 
 * Used during floorplan computer vision / contour analysis, area extraction,
 * and editor manipulation before final production serialization.
 */

export interface AreaPoint {
  /**
   * Internal point ID. Initially an empty string.
   */
  id: string;

  /**
   * World / floorplan coordinate X (e.g. normalized or metric coordinate).
   */
  x: number;

  /**
   * World / floorplan coordinate Y.
   */
  y: number;

  /**
   * Raw pixel coordinate X on the source floorplan image.
   */
  xPx: number;

  /**
   * Raw pixel coordinate Y on the source floorplan image.
   */
  yPx: number;
}

export interface DetectedArea {
  /**
   * Area identifier. Frontend editor state may use UUID v4,
   * but production backend exporter will output empty string unless bound.
   */
  id: string;

  /**
   * Name of the detected area (e.g., 'Area_001', 'Area_002', or user renamed).
   */
  name: string;

  /**
   * The ordered sequence of vertices forming the closed boundary polygon of the area.
   */
  polygon: AreaPoint[];
}
