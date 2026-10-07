import { useQuery, useMutation } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { safeParseAreaShape } from 'src/utils/isJsonObject';

const API_URL = '/api/TrackingAnalytics/investigation';


//#region Person Overview
export interface InvestigateOverviewPayload {
  personId?: string | null;
  areaId?: string | null;
  timeRange?: string | null;
  from?: string | null;
  to?: string | null;
  timezone?: string | null;
}

export interface PersonOverviewInfo {
  personId: string;
  personType: string;
  name: string;
  identityId: string;
  identityType: string;
  organization: string;
  department: string;
  district: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  faceImage: string | null;
  isBlacklist: boolean;
  blacklistReason: string | null;
}

export interface PersonOverviewCurrentState {
  presenceStatus: string;
  currentArea: string;
  currentAreaId: string;
  currentFloor: string;
  currentBuilding: string;
  floorplanImage: string;
  lastSeenTime: string;
  activeCardNumber: string;
  activeBleMac: string;
  cardBattery: number;
  isLowBattery: boolean;
}

export interface PersonOverviewAreaBreakdown {
  areaId: string;
  areaName: string;
  floorName: string;
  buildingName: string;
  durationMinutes: number;
  durationFormatted: string;
  percentage: number;
  isRestrictedArea: boolean;
  isAllowedByAccess: boolean;
  visits?: number;
  visitCount?: number;
}

export interface PersonOverviewStayDurationAnalysis {
  totalPresenceMinutes: number;
  totalPresenceFormatted: string;
  firstDetected: string;
  lastDetected: string;
  longestStayArea: string;
  longestStayMinutes: number;
  longestStayFormatted: string;
  areaBreakdown: PersonOverviewAreaBreakdown[];
}

export interface PersonOverviewBreach {
  areaId?: string;
  areaName?: string;
  area?: string;
  floorName?: string;
  floor?: string;
  buildingName?: string;
  building?: string;
  buildingFloor?: string;
  enteredAt?: string;
  durationMinutes?: number;
  durationFormatted?: string;
  duration?: string;
  alarmTriggered?: boolean;
  alarmCategory?: string;
  reason?: string;
}

export interface PersonOverviewAccessCompliance {
  complianceScore: number;
  complianceStatus: string;
  totalAreasVisited: number;
  authorizedAreasVisited: number;
  unauthorizedAreasVisited: number;
  assignedAccessGroups: any[];
  allowedAreaList: any[];
  timeSchedule: any | null;
  visitorSchedule: any | null;
  unauthorizedBreaches: PersonOverviewBreach[];
}

export interface PersonOverviewIncidentSummary {
  totalIncidents: number;
  activeIncidents: number;
  alarms: any[];
}

export interface PersonOverviewTimelineItem {
  timestamp: string;
  eventType: string;
  badge: string;
  title: string;
  description: string;
  location: string;
}

export interface PersonOverviewData {
  personInfo: PersonOverviewInfo;
  currentState: PersonOverviewCurrentState;
  cardHistory: any[];
  stayDurationAnalysis: PersonOverviewStayDurationAnalysis;
  accessCompliance: PersonOverviewAccessCompliance;
  incidentSummary: PersonOverviewIncidentSummary;
  chronologicalTimeline: PersonOverviewTimelineItem[];
}

export interface PersonOverviewResponse {
  success: boolean;
  msg: string;
  collection: {
    data: PersonOverviewData;
  };
  code: number;
}

export function usePersonOverview(payload?: InvestigateOverviewPayload, enabled: boolean = true) {
  return useQuery({
    queryKey: ['investigation-person-overview', payload],
    queryFn: async () => {
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const isCustom = (payload?.timeRange || '').toLowerCase() === 'custom';
      const body: InvestigateOverviewPayload = {
        timezone: deviceTimezone,
        ...payload,
        timeRange: payload?.timeRange || 'daily',
        from: isCustom ? payload?.from ?? null : null,
        to: isCustom ? payload?.to ?? null : null,
      };
      const response = await axiosServices.post<PersonOverviewResponse>(`${API_URL}/person-overview`, body);
      return response.data.collection.data;
    },
    enabled: enabled && Boolean(payload?.personId || payload?.areaId),
    staleTime: 5_000,
  });
}

export function usePersonOverviewMutation() {
  return useMutation({
    mutationFn: async (payload: InvestigateOverviewPayload) => {
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const isCustom = (payload?.timeRange || '').toLowerCase() === 'custom';
      const body: InvestigateOverviewPayload = {
        timezone: deviceTimezone,
        ...payload,
        timeRange: payload?.timeRange || 'daily',
        from: isCustom ? payload?.from ?? null : null,
        to: isCustom ? payload?.to ?? null : null,
      };
      const response = await axiosServices.post<PersonOverviewResponse>(`${API_URL}/person-overview`, body);
      return response.data.collection.data;
    },
  });
}
//#endregion

//#region Area Investigation
// ==========================================
// Area Investigation Types & Fetchers
// ==========================================
export type Nodes = {
    id: string;
    x: number;
    y: number;
    x_px: number;
    y_px: number;
};

export type AreaInvestigationTimeRange =
  | 'daily'
  | 'yesterday'
  | 'weekly'
  | 'last_week'
  | 'monthly'
  | 'last_month'
  | 'yearly'
  | 'last_year'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'custom'
  | 'Custom';

export interface AreaInvestigationParams {
  areaId?: string | null;
  timeRange?: AreaInvestigationTimeRange | string;
  from?: string | null;
  to?: string | null;
}

export interface AreaInvestigationRequestPayload {
  areaId: string;
  timeRange: string;
  from: string | null;
  to: string | null;
  timezone: string;
  includeTimeline: boolean;
  topLoiterers: number;
  onlyBreaches: boolean;
}

export interface AreaInvestigationAuthorizedAccessGroup {
  cardAccessId: string;
  accessName: string;
  allowedAreasCount: number;
  isAllAccess: boolean;
}

export interface AreaInvestigationAreaInfo {
  areaId: string;
  areaName: string;
  areaShape: string;
  nodes?: Nodes[];
  floorplanId: string;
  floorplanName: string;
  floorplanImage: string;
  floorId: string;
  floorName: string;
  buildingId: string;
  buildingName: string;
  colorArea?: string;
  restrictedStatus?: string;
  isRestricted?: boolean;
  authorizedAccessGroups?: AreaInvestigationAuthorizedAccessGroup[];
}

export interface AreaInvestigationActiveOccupant {
  personId: string;
  personName: string;
  personType: string;
  cardNumber: string;
  enteredAt: string;
  currentDwellMinutes: number;
  currentDwellFormatted: string;
  isAuthorized: boolean;
  faceImage?: string | null;
}

export interface AreaInvestigationLiveState {
  currentOccupancy: number;
  membersCount: number;
  visitorsCount: number;
  securitiesCount: number;
  hasActiveAlarm: boolean;
  activeOccupants: AreaInvestigationActiveOccupant[];
}

export interface AreaInvestigationComplianceSummary {
  complianceScore: number;
  complianceStatus: string;
  totalVisits: number;
  authorizedVisitsCount: number;
  unauthorizedVisitsCount: number;
}

export interface AreaInvestigationUnauthorizedBreach {
  personId: string;
  personName: string;
  personType: string;
  cardNumber: string;
  enteredAt: string;
  exitedAt?: string | null;
  durationMinutes: number;
  durationFormatted: string;
  alarmTriggered: boolean;
  alarmState?: string;
  alarmStatus?: string;
  alarmCategory?: string | null;
  reason: string;
}

export interface AreaInvestigationAlarm {
  alarmId: string;
  incidentCode?: string;
  personId?: string | null;
  personName?: string | null;
  personType?: string | null;
  faceImage?: string | null;
  cardNumber?: string | null;
  category: string;
  areaName: string;
  floorplanName: string;
  floorplanImage: string;
  floorName: string;
  buildingName: string;
  triggeredTime: string;
  status: string;
  alarmColor?: string;
  acknowledgedBy?: string | null;
  acknowledgedTime?: string | null;
  dispatchedTo?: string | null;
  dispatchedTime?: string | null;
  investigatedBy?: string | null;
  investigatedTime?: string | null;
  investigatedResult?: string | null;
  isCarriedOver: boolean;
}

export interface AreaInvestigationIncidentSummary {
  totalIncidents: number;
  activeIncidents: number;
  triggeredInPeriod: number;
  carriedOverIncidents: number;
  alarms: AreaInvestigationAlarm[];
}

export interface AreaInvestigationTrafficDynamics {
  totalUniquePeople: number;
  totalSessions: number;
  averageDwellMinutes: number;
  averageDwellFormatted: string;
  peakHour: string;
  peakOccupancy: number;
}

export interface AreaInvestigationTopLoiterer {
  personId: string;
  personName: string;
  personType: string;
  cardNumber: string;
  totalStayMinutes: number;
  totalStayFormatted: string;
  visitCount: number;
  lastSeenAt: string;
  isAuthorized: boolean;
}

export interface AreaInvestigationTimelineItem {
  timestamp: string;
  eventType: string;
  badge: string;
  title: string;
  description: string;
  location: string;
}

export interface AreaInvestigationData {
  areaInfo: AreaInvestigationAreaInfo;
  liveState: AreaInvestigationLiveState;
  complianceSummary: AreaInvestigationComplianceSummary;
  unauthorizedBreaches: AreaInvestigationUnauthorizedBreach[];
  incidentSummary: AreaInvestigationIncidentSummary;
  trafficDynamics: AreaInvestigationTrafficDynamics;
  topLoiterers: AreaInvestigationTopLoiterer[];
  chronologicalTimeline: AreaInvestigationTimelineItem[];
}

export interface AreaInvestigationResponse {
  success: boolean;
  msg: string;
  collection: {
    data: AreaInvestigationData;
  };
  code: number;
}

const buildAreaInvestigationPayload = (
  params?: AreaInvestigationParams
): AreaInvestigationRequestPayload => {
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  const isCustom = (params?.timeRange || '').toLowerCase() === 'custom';

  return {
    areaId: params?.areaId || '',
    timeRange: params?.timeRange || 'daily',
    from: isCustom ? params?.from ?? null : null,
    to: isCustom ? params?.to ?? null : null,
    timezone: deviceTimezone,
    includeTimeline: true,
    topLoiterers: 10,
    onlyBreaches: false,
  };
};

export function useAreaInvestigation(
  params?: AreaInvestigationParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['investigation-area-overview', params],
    queryFn: async () => {
      const body = buildAreaInvestigationPayload(params);
      const response = await axiosServices.post<AreaInvestigationResponse>(`${API_URL}/area-overview`, body);
      const data = response.data.collection.data;
      if (data?.areaInfo) {
        data.areaInfo = {
          ...data.areaInfo,
          nodes: safeParseAreaShape(data.areaInfo.areaShape) as Nodes[],
        };
      }
      return data;
    },
    enabled: enabled && Boolean(params?.areaId),
    staleTime: 5_000,
  });
}

export function useAreaInvestigationMutation() {
  return useMutation({
    mutationFn: async (params?: AreaInvestigationParams) => {
      const body = buildAreaInvestigationPayload(params);
      const response = await axiosServices.post<AreaInvestigationResponse>(`${API_URL}/area-overview`, body);
      const data = response.data.collection.data;
      if (data?.areaInfo) {
        data.areaInfo = {
          ...data.areaInfo,
          nodes: safeParseAreaShape(data.areaInfo.areaShape) as Nodes[],
        };
      }
      return data;
    },
  });
}
//#endregion

//#region Global Investigation
// ==========================================
// Global Investigation Types & Fetchers
// ==========================================
export interface GlobalInvestigationRequestPayload {
  timeRange: string;
  areaId: string | null;
  from: string | null;
  to: string | null;
  timezone: string;
}

export interface GlobalInvestigationParams {
  timeRange?: AreaInvestigationTimeRange | string;
  areaId?: string | null;
  from?: string | null;
  to?: string | null;
  timezone?: string;
}

export interface GlobalFacilitySummary {
  totalPeopleOnSite: number;
  totalMembers: number;
  totalVisitors: number;
  totalSecurities: number;
  activeAlarmsCount: number;
  carriedOverAlarmsCount: number;
  totalBreachesToday: number;
  totalBreachesInPeriod: number;
}

export interface GlobalTopAccessViolator {
  personId: string;
  personName: string;
  personType: string;
  department: string;
  activeCard: string;
  faceImage?: string | null;
  totalAlarmsTriggered: number;
  unauthorizedAccessCount: number;
  mostViolatedArea: string;
  lastViolationAt: string;
}

export interface GlobalBreachHotspot {
  areaId: string;
  areaName: string;
  floorName: string;
  buildingName: string;
  totalBreaches: number;
  isRestrictedArea: boolean;
  dominantAlarmCategory: string;
}

export interface GlobalRestrictedAreaOccupant {
  personId: string;
  personName: string;
  personType: string;
  cardNumber: string;
  faceImage?: string | null;
  areaName: string;
  floorName: string;
  enteredAt: string;
  stayMinutes: number;
  stayFormatted: string;
  hasAccessPermission: boolean;
  alarmStatus: string;
}

export interface GlobalOverstayVisitor {
  visitorId: string;
  visitorName: string;
  cardNumber: string;
  faceImage?: string | null;
  hostMemberName?: string | null;
  periodEnd: string;
  overstayDurationMinutes: number;
  overstayDurationFormatted: string;
  currentArea: string;
  status: string;
}

export interface GlobalLowBatteryCard {
  cardId: string;
  cardNumber: string;
  bleCardNumber: string;
  batteryPercentage: number;
  assignedTo: string | null;
  currentArea: string | null;
}

export interface GlobalInvestigationData {
  facilitySummary: GlobalFacilitySummary;
  topAccessViolators: GlobalTopAccessViolator[];
  breachHotspots: GlobalBreachHotspot[];
  currentRestrictedAreaOccupants: GlobalRestrictedAreaOccupant[];
  overstayVisitors: GlobalOverstayVisitor[];
  lowBatteryCardsInUse: GlobalLowBatteryCard[];
}

export interface GlobalInvestigationResponse {
  success: boolean;
  msg: string;
  collection: {
    data: GlobalInvestigationData;
  };
  code: number;
}

const buildGlobalInvestigationPayload = (
  params?: GlobalInvestigationParams
): GlobalInvestigationRequestPayload => {
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  const isCustom = (params?.timeRange || '').toLowerCase() === 'custom';

  return {
    timeRange: params?.timeRange || 'daily',
    areaId: params?.areaId ?? null,
    from: isCustom ? params?.from ?? null : null,
    to: isCustom ? params?.to ?? null : null,
    timezone: params?.timezone || deviceTimezone,
  };
};



export function useGlobalInvestigationMutation() {
  return useMutation({
    mutationFn: async (params?: GlobalInvestigationParams) => {
      const body = buildGlobalInvestigationPayload(params);
      const response = await axiosServices.post<GlobalInvestigationResponse>(`${API_URL}/global-overview`, body);
      return response.data.collection.data;
    },
  });
}

export function useGlobalInvestigation(params?: GlobalInvestigationParams, enabled = true) {
  return useQuery({
    queryKey: ['global-investigation', params],
    queryFn: async () => {
      const body = buildGlobalInvestigationPayload(params);
      const response = await axiosServices.post<GlobalInvestigationResponse>(`${API_URL}/global-overview`, body);
      return response.data.collection.data;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
//#endregion

//#region Co-Presence

// ==========================================
// Co-Presence Investigation Types & Fetchers
// ==========================================
export interface CoPresenceInvestigationParams {
  personId?: string | null;
  areaId?: string | null;
  timeRange?: AreaInvestigationTimeRange | string;
  from?: string | null;
  to?: string | null;
  timezone?: string;
}

export interface CoPresenceInvestigationRequestPayload {
  personId: string | null;
  areaId: string | null;
  from: string | null;
  to: string | null;
  timeRange: string;
  timezone: string;
}

export interface CoPresenceSession {
  overlapStart: string;
  overlapEnd: string;
  sharedDurationMinutes: number;
  sharedDurationFormatted: string;
  isCurrentlyTogether: boolean;
}

export interface CoPresentPerson {
  personId: string;
  personName: string;
  personType: string;
  department: string | null;
  cardNumber: string;
  faceImage?: string | null;
  interactionCount: number;
  totalSharedDurationMinutes: number;
  totalSharedDurationFormatted: string;
  isCurrentlyTogether: boolean;
  sessions: CoPresenceSession[];
}

export interface CoPresenceInvestigationData {
  targetPerson: PersonOverviewInfo;
  targetArea: AreaInvestigationAreaInfo;
  totalCoPresentPeople: number;
  coPresentPeople: CoPresentPerson[];
}

export interface CoPresenceInvestigationResponse {
  success: boolean;
  msg: string;
  collection: {
    data: CoPresenceInvestigationData;
  };
  code: number;
}

const buildCoPresenceInvestigationPayload = (
  params?: CoPresenceInvestigationParams
): CoPresenceInvestigationRequestPayload => {
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  const isCustom = (params?.timeRange || '').toLowerCase() === 'custom';

  return {
    personId: params?.personId ?? null,
    areaId: params?.areaId ?? null,
    from: isCustom ? params?.from ?? null : null,
    to: isCustom ? params?.to ?? null : null,
    timeRange: params?.timeRange || 'daily',
    timezone: params?.timezone || deviceTimezone,
  };
};

export function useCoPresenceInvestigationMutation() {
  return useMutation({
    mutationFn: async (params?: CoPresenceInvestigationParams) => {
      const body = buildCoPresenceInvestigationPayload(params);
      const response = await axiosServices.post<CoPresenceInvestigationResponse>(
        `${API_URL}/co-presence`,
        body
      );
      const data = response.data.collection.data;
      if (data?.targetArea) {
        data.targetArea = {
          ...data.targetArea,
          nodes: safeParseAreaShape(data.targetArea.areaShape) as Nodes[],
        };
      }
      return data;
    },
  });
}

export function useCoPresenceInvestigation(
  params?: CoPresenceInvestigationParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['investigation-co-presence', params],
    queryFn: async () => {
      const body = buildCoPresenceInvestigationPayload(params);
      const response = await axiosServices.post<CoPresenceInvestigationResponse>(
        `${API_URL}/co-presence`,
        body
      );
      const data = response.data.collection.data;
      if (data?.targetArea) {
        data.targetArea = {
          ...data.targetArea,
          nodes: safeParseAreaShape(data.targetArea.areaShape) as Nodes[],
        };
      }
      return data;
    },
    enabled: enabled && Boolean(params?.personId && params?.areaId),
    staleTime: 5_000,
  });
}
//#endregion