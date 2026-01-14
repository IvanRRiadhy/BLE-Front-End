import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { PatrolRouteType, GetFilter } from 'src/store/apps/crud/patrolRoute';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/patrol-route/';
const API_DT_URL = '/api/patrol-route/filter/';

// ✅ Shared paginated response interface
export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function usePatrolRouteList(filter: GetFilter) {
  return useQuery({
    queryKey: ['patrol-route-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      // console.log("Card Access", collection)
      return {
        data: collection.data as PatrolRouteType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<PatrolRouteType>;
    },
    placeholderData: keepPreviousData, // Keep old data during refetch
    staleTime: 5_000, // fresh for 1 minute
    gcTime: 5 * 60_000, // cache for 5 minutes
  });
};

export function useAllPatrolRoute() {
  return useQuery({
    queryKey: ['patrol-route-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      return response.data.collection.data as PatrolRouteType[];
    },
    placeholderData: [],
  });
}

export function useAddPatrolRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patrolRoute: Partial<PatrolRouteType>) => {
      const { id, ...cleanData } = patrolRoute;
      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-route-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-route-list'] });
    },
  });
}

export function useEditPatrolRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patrolRoute: Partial<PatrolRouteType>) => {
      const { id, ...cleanData } = patrolRoute;
      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-route-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-route-list'] });
    },
  });
}

export function useDeletePatrolRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-route-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-route-list'] });
    },
  });
}

export function usePatrolRouteStatus() {
  const filter = useSelector((state: RootState) => state.PatrolRouteReducer.patrolRouteFilter);
  const query = usePatrolRouteList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal || 0,
    filteredCount: query.data?.recordsFiltered || 0,
  };
}
