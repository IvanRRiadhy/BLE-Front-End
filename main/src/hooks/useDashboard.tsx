import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';
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
  floorplanMaskedAreaId: string | null;
  operatorName: string | null;
  visitorId: string | null;
  buildingId: string | null;
  floorId: string | null;
};

export function useAreaDistributionData(filter: DashboardFilterType) {
  return useQuery({
    queryKey: ['dashboard-area-distribution', filter],
    queryFn: async () => {
      const response = await axiosServices.post(`${API_TRACKING}area`, filter);
      console.log('Area Distribution Data fetched: ', response.data);
      return response.data.collection.data as AreaReportType[];
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    placeholderData: [],
  });
}

export function useTopButtonSummary() {
  return useQuery({
    queryKey: ['dashboard-count-summary'],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_DASHBOARD}count-summary`);
      console.log('Top Button Summary Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    placeholderData: {},
  });
}

export function useBeaconCount() {
  return useQuery({
    queryKey: ['dashboard-count-card'],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_DASHBOARD}count-card`);
      console.log('Beacon Count Data fetched: ', res.data.collection.data);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function useTrackingAreaAccessed(filter: DashboardFilterType) {
  return useQuery({
    queryKey: ['tracking-area-accessed', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_TRACKING}area-accessed`, filter);
      console.log('Tracking Area Accessed Data fetched: ', res.data, 'filter: ', filter);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
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
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    enabled: !!filter,
  });
}

export function useAreaDistribution(filter: DashboardFilterType, params?: Record<string, any>) {
  return useQuery({
    queryKey: ['area-distribution', filter, params],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_TRACKING}area`, filter, { params });
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function useBlacklistLog() {
  return useQuery({
    queryKey: ['blacklist-log'],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_DASHBOARD}blacklist-logs`);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function useAlarmByStatus(filter: any) {
  return useQuery({
    queryKey: ['alarm-by-status', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_ALARM}status`, filter);
      console.log('Result', res);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function useAlarmByArea(filter: any) {
  return useQuery({
    queryKey: ['alarm-by-area', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_ALARM}area`, filter);
      console.log('Result', res);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function useAlarmStatisticHourly(filter: any) {
  return useQuery({
    queryKey: ['alarm-hourly', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_ALARM}hourly`, filter);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function useRealtimeAlarmLog(filter: any) {
  return useQuery({
    queryKey: ['realtime-alarm-log', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_TRIGGER}filter`, filter);
      console.log('Realtime Alarm Log Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function useNotificationLog() {
  return useQuery({
    queryKey: ['notification-log'],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_TRIGGER}lookup`);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function usePeakHour(filter: DashboardFilterType, params?: Record<string, any>) {
  return useQuery({
    queryKey: ['peak-hour', filter, params],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_TRACKING}peak-hours-by-area`, filter, { params });
      console.log('Peak Hour Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function useAlarmInvestigatedResult(filter: DashboardFilterType) {
  return useQuery({
    queryKey: ['alarm-investigated-result', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_ALARM}investigated-result`, filter);
      console.log('Alarm Investigated Result Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

export function useAlarmPerformance(filter: DashboardFilterType) {
  return useQuery({
    queryKey: ['alarm-performance', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_ALARM}average-duration`, filter);
      console.log('Alarm Performance Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}
