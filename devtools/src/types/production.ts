/**
 * Production BIONIC System Models
 * 
 * Strict specifications matching the existing backend and frontend
 * MaskedArea storage formats.
 */

/**
 * Shape point structure inside the stringified `areaShape` array.
 */
export interface ProductionAreaShapePoint {
  /**
   * Point ID. Defaults to empty string "".
   */
  id: string;

  /**
   * World / floorplan coordinate X.
   */
  x: number;

  /**
   * World / floorplan coordinate Y.
   */
  y: number;

  /**
   * Source floorplan pixel coordinate X.
   */
  x_px: number;

  /**
   * Source floorplan pixel coordinate Y.
   */
  y_px: number;
}

/**
 * Text box configuration inside stringified `areaNameTextBox` and `occupancyNameTextBox`.
 */
export interface ProductionTextBox {
  posX: number;
  posY: number;
  fontSize: number;
  fontColor: string;
}

/**
 * Production Area JSON structure used by the BIONIC system.
 */
export interface ProductionAreaJson {
  /**
   * Backend floorplan identifier. Default is empty string "".
   */
  floorplanId: string;

  /**
   * Backend floor identifier. Default is empty string "".
   */
  floorId: string;

  /**
   * Logical area name (e.g. 'Area_001').
   */
  name: string;

  /**
   * JSON stringified array of ProductionAreaShapePoint:
   * e.g. "[{\"id\":\"\",\"x\":10,\"y\":20,\"x_px\":100,\"y_px\":200}, ...]"
   */
  areaShape: string;

  /**
   * Hex color code. Default is "#228B22".
   */
  colorArea: string;

  /**
   * JSON stringified ProductionTextBox for the area label.
   * e.g. "{\"posX\":866,\"posY\":215,\"fontSize\":18,\"fontColor\":\"rgb(28, 118, 28)\"}"
   */
  areaNameTextBox: string;

  /**
   * JSON stringified ProductionTextBox for occupancy text.
   * e.g. "{\"posX\":868,\"posY\":278,\"fontSize\":15,\"fontColor\":\"rgb(28, 118, 28)\"}"
   */
  occupancyNameTextBox: string;

  /**
   * Restricted status. Default is "NonRestrict".
   */
  restrictedStatus: string;

  /**
   * Floor change permission. Default is false.
   */
  allowFloorChange: boolean;

  /**
   * Assembly point flag. Default is false.
   */
  isAssemblyPoint: boolean;

  /**
   * Associated label UUIDs. Default is [].
   */
  labelIds: string[];
}

/**
 * Default constants defined by BIONIC production specification.
 */
export const PRODUCTION_DEFAULTS = {
  floorplanId: '',
  floorId: '',
  colorArea: '#228B22',
  restrictedStatus: 'NonRestrict',
  allowFloorChange: false,
  isAssemblyPoint: false,
  labelIds: [] as string[],
  areaNameTextBox: {
    fontSize: 18,
    fontColor: 'rgb(28, 118, 28)',
  },
  occupancyNameTextBox: {
    fontSize: 15,
    fontColor: 'rgb(28, 118, 28)',
  },
} as const;
