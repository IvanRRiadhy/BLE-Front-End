import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { VisitorSessionType, GetFilter } from '../store/apps/crud/visitorSession';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/TrackingAnalytics/visitor-session/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useVisitorSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (filter: GetFilter) => {
      const response = await axiosServices.post(`${API_URL}`, filter);
      const collection = response.data.collection;
      return collection.data as VisitorSessionType[];
    },
  });
}