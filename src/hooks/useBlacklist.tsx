import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { blacklistType, GetFilter } from '../store/apps/crud/blacklist';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/BlacklistArea/';
const API_DT_URL = '/api/BlacklistArea/filter/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useBlacklistList(filter: GetFilter) {
  return useQuery({
    queryKey: ['blacklist-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      return {
        data: collection.data as blacklistType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<blacklistType>;
    },
    placeholderData: keepPreviousData, // Keep old data during refetch
    staleTime: 5_000, // fresh for 1 minute
    gcTime: 5 * 60_000, // cache for 5 minutes
  });
}

export function useAllBlacklist() {
  return useQuery({
    queryKey: ['blacklist-list'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      return response.data.collection.data as blacklistType[];
    },
    placeholderData: [],
  });
}

export function useAddBlacklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blacklist: Partial<blacklistType>) => {
      const { id, createdAt, createdBy, updatedAt, updatedBy, ...cleanData } = blacklist;
      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist-list'] });
      queryClient.invalidateQueries({ queryKey: ['blacklist-all'] });
    },
  });
}

export function useEditBlacklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blacklist: Partial<blacklistType>) => {
      const { id, createdAt, createdBy, updatedAt, updatedBy, ...cleanData } = blacklist;
      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist-list'] });
      queryClient.invalidateQueries({ queryKey: ['blacklist-all'] });
    },
  });
}

export function useDeleteBlacklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist-list'] });
      queryClient.invalidateQueries({ queryKey: ['blacklist-all'] });
    },
  });
}

export function useBlacklistStatus() {
  const filter = useSelector((state: RootState) => state.blacklistReducer.blacklistFilter);
  const query = useBlacklistList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal || 0,
    filteredCount: query.data?.recordsFiltered || 0,
  };
}
