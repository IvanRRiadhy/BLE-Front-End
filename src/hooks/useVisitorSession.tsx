import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { VisitorSessionType, GetFilter,  VisitorSessionResponseType, OldGetFilter } from '../store/apps/crud/visitorSession';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/TrackingAnalytics/visitor-session/';
const API_REPORT_URL = '/api/TrackingAnalytics/visitor-report/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
 
 
  recordsFiltered: number;
}

export type VisitorSessionQueryOptions = {
  includeSummary?: boolean;
  includeVisualPaths?: boolean;
  includeIncident?: boolean;
};

export type VisitorSessionQueryRequest = {
  filter: GetFilter;
  options?: VisitorSessionQueryOptions;
};
export function useVisitorSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (filter: OldGetFilter) => {
      const response = await axiosServices.post(`${API_REPORT_URL}`, filter);
      const collection = response.data.collection;
      return collection.data as VisitorSessionType[];
    },
  });
}
export function useNewVisitorSession() {
  return useMutation({
    mutationFn: async ({ filter, options }: VisitorSessionQueryRequest) => {
      const {
        includeSummary = true,
        includeVisualPaths = true,
        includeIncident = true,
      } = options ?? {};

      const response = await axiosServices.post(`${API_URL}`, filter, {
        params: {
          includeSummary,
          includeVisualPaths,
          includeIncident,
        },
      });

      const collection = response.data.collection;

      console.log('collection:', collection);

      return collection.data as VisitorSessionResponseType;
    },
  });
}