import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
// import { DashboardAreaChartFilter as DashboardFilter } from 'src/store/apps/dashboard/Dashboard';

const API_DASHBOARD = '/api/Dashboard/';
const API_TRACKING = '/api/TrackingAnalytics/';
const API_ALARM = '/api/AlarmAnalyticsIncident/';
const API_TRIGGER = '/api/AlarmTriggers/';

export type AreaReportType = {
  areaId: string;
  areaName: string;
  totalRecords: number;
};

export type DashboardFilterType = {
  from?: string | null;
  to?: string | null;
  TimeRange?: string | null;
  timezone?: string | null;
  areaId: string[] | null;
  operatorName: string | null;
  visitorId: string | null;
  buildingId: string[] | null;
  floorId: string[] | null;
  floorplanId: string[] | null;
};
export type newDashboardFilterType = {
  buildingId: string[];
  floorId: string[];
  floorplanId: string[];
  areaId: string[];
  TimeRange: string;
};

export function useAreaDistributionData(filter: DashboardFilterType) {
  return useQuery({
    queryKey: ['dashboard-area-distribution', filter],
    queryFn: async () => {
      const response = await axiosServices.post(`${API_TRACKING}area`, filter);
      // console.log('Area Distribution Data fetched: ', response.data);
      return response.data.collection.data as AreaReportType[];
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    placeholderData: [],
  });
}

export function useTopButtonSummary(filter: newDashboardFilterType) {
  return useQuery({
    queryKey: ['dashboard-count-summary'],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_DASHBOARD}count-summary`, filter);
      // console.log('Top Button Summary Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    placeholderData: {},
  });
}

export function useBeaconCount(filter: newDashboardFilterType) {
  return useQuery({
    queryKey: ['dashboard-count-card'],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_DASHBOARD}count-card`, filter);
      // console.log('Beacon Count Data fetched: ', res.data.collection.data);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export function useTrackingAreaAccessed(filter: DashboardFilterType) {
  return useQuery({
    queryKey: ['tracking-area-accessed', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_TRACKING}area-accessed`, filter);
      // console.log('Tracking Area Accessed Data fetched: ', res.data, 'filter: ', filter);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    enabled: !!filter,
  });
}

export function useUpcomingVisitor(filter: any) {
  return useQuery({
    queryKey: ['upcoming-visitor', filter],
    queryFn: async () => {
      const res = await axiosServices.post('/api/TrxVisitor/filter', filter);
      console.log('Upcoming Visitor Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    enabled: !!filter,
  });
}

export function useInfiniteUpcomingVisitor(baseFilter: any, pageSize = 10) {
  return useInfiniteQuery({
    queryKey: ['upcoming-visitor-infinite', { ...baseFilter, start: undefined, length: undefined }, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axiosServices.post('/api/TrxVisitor/filter', {
        ...baseFilter,
        start: pageParam,
        length: pageSize,
      });
      const col = res.data.collection;
      return {
        data: col.data as any[],
        recordsTotal: col.recordsTotal as number,
        recordsFiltered: col.recordsFiltered as number,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.flatMap((p) => p.data).length;
      if (loadedCount < lastPage.recordsFiltered) {
        return loadedCount;
      }
      return undefined;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    enabled: !!baseFilter,
  });
}


export function useAreaDistribution(filter: DashboardFilterType, params?: Record<string, any>) {
  return useQuery({
    queryKey: ['area-distribution', filter, params],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_TRACKING}area`, filter, { params });
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export function useBlacklistLog() {
  return useQuery({
    queryKey: ['blacklist-log'],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_DASHBOARD}blacklist-logs`, {});
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export function useAlarmByStatus(filter: any) {
  return useQuery({
    queryKey: ['alarm-by-status', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_ALARM}status`, filter);
      // console.log('Result', res);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export function useAlarmByArea(filter: newDashboardFilterType) {
  return useQuery({
    queryKey: ['alarm-by-area', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_ALARM}area`, filter);
      console.log('Result area', res.data.collection.data, "Filter : ", filter);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export function useAlarmStatisticHourly(filter: DashboardFilterType) {
  return useQuery({
    queryKey: ['alarm-hourly', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_ALARM}hourly`, filter);
      console.log("Alarm hourly", res.data.collection.data, "Filter : ", filter);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export function useRealtimeAlarmLog(filter: any) {
  return useQuery({
    queryKey: ['realtime-alarm-log', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_TRIGGER}filter`, filter);
      // console.log('Realtime Alarm Log Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export function useInfiniteRealtimeAlarmLog(baseFilter: any, pageSize = 10) {
  return useInfiniteQuery({
    queryKey: ['realtime-alarm-log-infinite', { ...baseFilter, start: undefined, length: undefined }, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axiosServices.post(`${API_TRIGGER}filter`, {
        ...baseFilter,
        start: pageParam,
        length: pageSize,
      });
      const col = res.data.collection;
      return {
        data: col.data as any[],
        recordsTotal: col.recordsTotal as number,
        recordsFiltered: col.recordsFiltered as number,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.flatMap((p) => p.data).length; 
      if (loadedCount < lastPage.recordsFiltered) {
        return loadedCount;
      }
      return undefined;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    enabled: !!baseFilter,
  });
}


export function useNotificationLog() {
  return useQuery({
    queryKey: ['notification-log'],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_TRIGGER}lookup`);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export function usePeakHour(filter: DashboardFilterType, params?: Record<string, any>) {
  return useQuery({
    queryKey: ['peak-hour', filter, params],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_TRACKING}peak-hours-by-area`, filter, { params });
      // console.log('Peak Hour Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export function useAlarmInvestigatedResult(filter: DashboardFilterType) {
  return useQuery({
    queryKey: ['alarm-investigated-result', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_ALARM}investigated-result`, filter);
      // console.log('Alarm Investigated Result Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export function useAlarmPerformance(filter: DashboardFilterType) {
  return useQuery({
    queryKey: ['alarm-performance', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_ALARM}average-duration`, filter);
      // console.log('Alarm Performance Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}

export type LatestPositionType = {
  areaId: string;
  areaName: string;
  bleCardNumber: string;
  buildingId: string;
  buildingName: string;
  cardId: string;
  cardName: string;
  cardNumber: string;
  floorId: string;
  floorName: string;
  floorplanId: string;
  floorplanName: string;
  floorplanImage: string;
  identityId: string;
  lastDetectedAt: string;
  lastX: number;
  lastY: number;
  memberId: string | null;
  memberName: string | null;
  personId: string;
  personName: string;
  securityId: string | null;
  securityName: string | null;
  visitorId: string | null;
  visitorName: string | null;
};

export function useLatestPosition(timeRange: string) {
  return useQuery({
    queryKey: ['latest-position', timeRange],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_TRACKING}latest-position`, { timeRange });
      // console.log('Latest Position Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}
