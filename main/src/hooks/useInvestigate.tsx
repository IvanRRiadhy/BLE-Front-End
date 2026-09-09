import { useQuery, useMutation } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';

const API_URL = '/api/TrackingAnalytics/investigation/person-overview';

export interface InvestigateOverviewPayload {
  personId?: string | null;
  areaId?: string | null;
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
      const body: InvestigateOverviewPayload = {
        timezone: deviceTimezone,
        ...payload,
      };
      const response = await axiosServices.post<PersonOverviewResponse>(API_URL, body);
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
      const body: InvestigateOverviewPayload = {
        timezone: deviceTimezone,
        ...payload,
      };
      const response = await axiosServices.post<PersonOverviewResponse>(API_URL, body);
      return response.data.collection.data;
    },
  });
}