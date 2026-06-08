import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { CardAccessType, GetFilter } from '../store/apps/crud/cardAccess';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/CardAccess/';
const API_DT_URL = '/api/CardAccess/filter/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useCardAccessList(filter: GetFilter) {
  return useQuery({
    queryKey: ['card-access-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      // console.log("Card Access", collection)
      return {
        data: collection.data as CardAccessType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<CardAccessType>;
    },
    placeholderData: keepPreviousData, // Keep old data during refetch
    staleTime: 5_000, // fresh for 1 minute
    gcTime: 5 * 60_000, // cache for 5 minutes
  });
}

export function useAllCardAccess() {
  return useQuery({
    queryKey: ['card-access-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      return response.data.collection.data as CardAccessType[];
    },
    placeholderData: [],
  });
}

export function useAddCardAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardAccess: Partial<CardAccessType>) => {
      const {
        id,
        applicationId,
        accessNumber,
        maskedArea,
        createdBy,
        createdAt,
        updatedBy,
        updatedAt,
        ...cleanData
      } = cardAccess;
      console.log('cleanData', cleanData);
      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-access-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-access-list'] });
    },
  });
}

export function useEditCardAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardAccess: Partial<CardAccessType>) => {
      const {
        id,
        createdBy,
        applicationId,
        status,
        accessNumber,
        maskedArea,
        createdAt,
        updatedBy,
        updatedAt,
        ...cleanData
      } = cardAccess;
      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-access-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-access-list'] });
    },
  });
}

export function useDeleteCardAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-access-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-access-list'] });
    },
  });
}

export function useCardAccessStatus() {
  const filter = useSelector((state: RootState) => state.CardAccessReducer.cardAccessFilter);
  const query = useCardAccessList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal || 0,
    filteredCount: query.data?.recordsFiltered || 0,
  };
}
