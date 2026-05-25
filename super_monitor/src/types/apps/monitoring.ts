export interface MonitoringDisplay {
  displayType: number;
  displayOutput: string;
}

export interface MonitoringScreenSettings {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface MonitoringScreen {
  id: string;
  type?: number;
  floorplanId: string;
  display: MonitoringDisplay;
  settings: MonitoringScreenSettings;
}

export interface MonitoringFocus {
  type: string;
  id: string;
}

/**
 * Represents the typed structure of the parsed `config` field from a `MonitoringConfig`.
 * Since `config` in the API is a JSON-serialized string, developers can parse it into this shape.
 */
export interface ParsedMonitoringConfig {
  grid: number;
  screens: MonitoringScreen[];
  focus?: MonitoringFocus;
}

export interface MonitoringConfig {
  name: string;
  description: string | null;
  config: string; // The raw JSON string or special configuration markers (e.g. "", "test")
  buildingIds: string[];
  buildingNames: string[];
}

export interface MonitoringSiteData {
  siteId: string;
  siteName: string;
  description: string | null;
  baseUrl: string;
  overallStatus: 'Online' | 'Offline' | string;
  monitoringConfigs: MonitoringConfig[];
  errorMessage: string | null;
}

export interface MonitoringAggregateCollection {
  data: MonitoringSiteData[];
}

export interface MonitoringAggregateResponse {
  success: boolean;
  msg: string;
  collection: MonitoringAggregateCollection;
  code: number;
}

// Site Building Types
export interface SiteBuilding {
  id: string;
  name: string;
  image: string;
  tag: string;
  siteId?: string;
  siteName?: string;
}

export interface SiteBuildingData {
  siteId: string;
  siteName: string;
  description: string | null;
  baseUrl: string;
  overallStatus: string;
  buildings: SiteBuilding[];
  errorMessage: string | null;
}

// Site Floor Types
export interface SiteFloor {
  id: string;
  name: string;
  buildingId: string;
  tag?: string;
  level?: number;
  siteId?: string;
  siteName?: string;
}

export interface SiteFloorData {
  siteId: string;
  siteName: string;
  description: string | null;
  baseUrl: string;
  overallStatus: string;
  floors: SiteFloor[];
  errorMessage: string | null;
}

// Site Floorplan Types
export interface SiteFloorplan {
  id: string;
  name: string;
  floorId: string;
  floorplanImage: string;
  pixelX: number;
  pixelY: number;
  floorX: number;
  floorY: number;
  meterPerPx: number;
  siteId?: string;
  siteName?: string;
}

export interface SiteFloorplanData {
  siteId: string;
  siteName: string;
  description: string | null;
  baseUrl: string;
  overallStatus: string;
  floorplans: SiteFloorplan[];
  errorMessage: string | null;
}

// Site Area Types
export interface SiteArea {
  id: string;
  name: string;
  floorplanId: string;
  areaShape: string;
  siteId?: string;
  siteName?: string;
  colorArea?: string;
  restrictedStatus?: string;
  allowFloorChange?: boolean;
  nodes?: any[];
  isAssemblyPoint?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface SiteAreaData {
  siteId: string;
  siteName: string;
  description: string | null;
  baseUrl: string;
  overallStatus: string;
  areas?: SiteArea[];
  maskedAreas?: SiteArea[];
  errorMessage: string | null;
}

// Site Floorplan Device Types
export interface SiteFloorplanDevice {
  id: string;
  name: string;
  type: string;
  deviceStatus: string;
  posX: number;
  posY: number;
  posPxX: number;
  posPxY: number;
  readerId: string | null;
  floorplanId: string;
  areaId: string | null;
  path: string | null;
  floorplan?: any;
  reader?: any;
  area?: any;
  applicationId: string | null;
  siteId?: string;
  siteName?: string;
}

export interface SiteFloorplanDeviceData {
  siteId: string;
  siteName: string;
  description: string | null;
  baseUrl: string;
  overallStatus: string;
  floorplanDevices: SiteFloorplanDevice[];
  errorMessage: string | null;
}

// Aliases for compatibility
export type Device = SiteFloorplanDevice;
export type DeviceData = SiteFloorplanDeviceData;


