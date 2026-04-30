import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { CardType, GetFilter } from '../store/apps/crud/card';
import { RootState, useSelector } from 'src/store/Store';

const API_URL_V1 = '/api/Card/';
const API_URL_V2 = '/api/Card/v2/';
const API_DT_URL = '/api/Card/filter/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useCardList(filter: GetFilter) {
  return useQuery({
    queryKey: ['card-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      return {
        data: collection.data as CardType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<CardType>;
    },
    placeholderData: keepPreviousData, // Keep old data during refetch
    staleTime: 5_000, // fresh for 1 minute
    gcTime: 5 * 60_000, // cache for 5 minutes
  });
}

export function useAllCard() {
  return useQuery({
    queryKey: ['card-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL_V1);
      console.log('All Cards fetched: ', response.data.collection.data);
      return response.data.collection.data as CardType[];
    },
    placeholderData: [],
  });
}

export function useUnassignedCard() {
  return useQuery({
    queryKey: ['card-unassigned'],
    queryFn: async () => {
      const response = await axiosServices.get(`${API_URL_V1}unused`);
      return response.data.collection.data as CardType[];
    },
    placeholderData: [],
  });
}

export function useAddCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (card: Partial<CardType>) => {
      const { id, ...cleanData } = card;
      const res = await axiosServices.post(API_URL_V2, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-list'] });
      queryClient.invalidateQueries({ queryKey: ['card-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-unassigned'] });
    },
  });
}

export function useBulkAddCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cards: Partial<CardType>[]) => {
      console.log('payload: ', cards);
      const res = await axiosServices.post(`${API_URL_V1}bulk`, cards);
      console.log("Res: ", res)
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-list'] });
      queryClient.invalidateQueries({ queryKey: ['card-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-unassigned'] });
    },
  });
}

export function useEditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (card: Partial<CardType>) => {
      const { id, ...cleanData } = card;
      const res = await axiosServices.put(`${API_URL_V2}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-list'] });
      queryClient.invalidateQueries({ queryKey: ['card-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-unassigned'] });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL_V1}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-list'] });
      queryClient.invalidateQueries({ queryKey: ['card-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-unassigned'] });
    },
  });
}

export function useReleaseCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.put(`${API_URL_V1}${id}/release-ownership`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-list'] });
      queryClient.invalidateQueries({ queryKey: ['card-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['member-list'] });
      queryClient.invalidateQueries({ queryKey: ['security-list'] });
      queryClient.invalidateQueries({ queryKey: ['member-all'] });
      queryClient.invalidateQueries({ queryKey: ['security-all'] });
      queryClient.invalidateQueries({ queryKey: ['member'] });
      queryClient.invalidateQueries({ queryKey: ['security-lookup'] });
    },
  });
}

export function useCardStatus() {
  const filter = useSelector((state: RootState) => state.CardReducer.cardFilter);
  const query = useCardList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal || 0,
    filteredCount: query.data?.recordsFiltered || 0,
  };
}

