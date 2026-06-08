import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { VisitorFilterPresetType, GetFilter } from '../store/apps/crud/visitorFilterPreset';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';

const VISITOR_FILTER_PRESET_API_URL = '/api/tracking-presets/';
const VISITOR_FILTER_PRESET_DT_URL = '/api/tracking-presetsfilter/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useVisitorFilterPresetList(filter: GetFilter) {
  return useQuery({
    queryKey: ['visitor-filter-preset-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(VISITOR_FILTER_PRESET_DT_URL, filter);
      const collection = response.data.collection;
      return {
        data: collection.data as VisitorFilterPresetType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<VisitorFilterPresetType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // data considered fresh for 1 minute
    gcTime: 5 * 60_000, // cache kept for 5 minutes
  });
}

export function useAllVisitorFilterPreset() {
  return useQuery({
    queryKey: ['visitor-filter-preset-all'],
    queryFn: async () => {
      const response = await axiosServices.get(VISITOR_FILTER_PRESET_API_URL);
      console.log('Visitor filter preset list fetched successfully: ', response.data);
      return response.data.collection.data as VisitorFilterPresetType[];
    },
    placeholderData: [],
  });
}

export function useAddVisitorFilterPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (visitorFilterPreset: Partial<VisitorFilterPresetType>) => {
      const response = await axiosServices.post(VISITOR_FILTER_PRESET_API_URL, visitorFilterPreset);
      console.log('Visitor filter preset added successfully: ', response.data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-list'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-all'] });
    },
  });
}

export function useEditVisitorFilterPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (visitorFilterPreset: VisitorFilterPresetType) => {
      const { id, ...updateData } = visitorFilterPreset;
      const response = await axiosServices.put(`${VISITOR_FILTER_PRESET_API_URL}${id}`, updateData);
      console.log('Visitor filter preset updated successfully: ', response.data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-list'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-all'] });
    },
  });
}

export function useDeleteVisitorFilterPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${VISITOR_FILTER_PRESET_API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-list'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-all'] });
    },
  });
}

type ApplyVisitorFilterPresetPayload = {
  from: string | null;
  to: string | null;
  personType: 'visitor' | 'member';
};

export function useApplyVisitorFilterPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ApplyVisitorFilterPresetPayload;
    }) => {
      const result = await axiosServices.post(
        `${VISITOR_FILTER_PRESET_API_URL}apply/${id}`,
        payload
      );

      console.log('Visitor filter preset applied successfully: ', result.data);
      return result;
    },

    onSuccess: () => {
      // optional invalidate kalau perlu refresh data
      // queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-list'] });
      // queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-all'] });
    },
  });
}

export function useVisitorFilterPresetStatus() {
    const filter = useSelector((state: RootState) => state.VisitorFilterPresetReducer.visitorFilterPresetFilter);
  const query = useVisitorFilterPresetList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsFiltered || 0,
    recordsTotal: query.data?.recordsTotal || 0,
  };
}

// src/hooks/visitorFilterPreset.ts (add this to your existing file)
// Dummy data for development


// Dummy hook for development
export function useAllVisitorFilterPresetDummy() {
  return useQuery({
    queryKey: ['visitor-filter-preset-all'],
    queryFn: async () => {
      const response = await axiosServices.get(VISITOR_FILTER_PRESET_API_URL);
      return response.data.collection.data as VisitorFilterPresetType[];
    },
    placeholderData: [],
  });
}

// Dummy delete mutation for development
export function useDeleteVisitorFilterPresetDummy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async(id: string) => {
      await axiosServices.delete(`${VISITOR_FILTER_PRESET_API_URL}${id}`);
      return id;
    },
    onSuccess: ()=> {
      queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-list'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-all'] });
    }
  })
}