import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { VisitorType, GetFilter } from '../store/apps/crud/visitor';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/Visitor/';
const API_DT_URL = '/api/Visitor/filter/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}
type BlacklistReasonInput = { visitorId: string; BlacklistReason: string };

export function useVisitorList(filter: GetFilter) {
  return useQuery({
    queryKey: ['visitor-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      // console.log('Fetch Visitors', collection);
      return {
        data: collection.data as VisitorType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<VisitorType>;
    },
    placeholderData: keepPreviousData, // Keep old data during refetch
    staleTime: 5_000, // fresh for 1 minute
    gcTime: 5 * 60_000, // cache for 5 minutes
  });
}

export const visitorByIdQuery = (id: string) => ({
  queryKey: ['visitor', id],
  queryFn: async () => {
    const res = await axiosServices.get(`${API_URL}${id}`);
    console.log('Response Visitor: ', res, 'With Id: ', id);
    return res.data.collection.data as VisitorType;
  },
});
export function useVisitorByID(id: string) {
  return useQuery({
    ...visitorByIdQuery(id),
    enabled: !!id,
    placeholderData: {} as VisitorType,
  });
}

export function useAllVisitor() {
  return useQuery({
    queryKey: ['visitor-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      // console.log(response.data.collection.data);
      return response.data.collection.data as VisitorType[];
    },
    placeholderData: [],
  });
}

export function useBlacklistVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ( BlacklistReasonInput: BlacklistReasonInput) => {
      const response = await axiosServices.post(
        `${API_URL}${BlacklistReasonInput.visitorId}/blacklist`,
        { BlacklistReason: BlacklistReasonInput.BlacklistReason},
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-list'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-all'] });
    },
  });
}

export function useUnBlacklistVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (visitorId: string) => {
      const response = await axiosServices.post(`${API_URL}${visitorId}/unblacklist`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-list'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-all'] });
    },
  });
}

export function useVisitorStatus() {
  const filter = useSelector((state: RootState) => state.visitorReducer.visitorFilter);
  const query = useVisitorList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal || 0,
    filteredCount: query.data?.recordsFiltered || 0,
  };
}
