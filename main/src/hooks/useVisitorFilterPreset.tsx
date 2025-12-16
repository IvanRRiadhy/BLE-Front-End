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

export function useApplyVisitorFilterPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await axiosServices.post(`${VISITOR_FILTER_PRESET_API_URL}apply/${id}`);
      console.log('Visitor filter preset applied successfully: ', result.data);
      return result;
    },
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-list'] });
      // queryClient.invalidateQueries({ queryKey: ['visitor-filter-preset-all'] });
    }
  })
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
const dummyVisitorFilterPresets: VisitorFilterPresetType[] = [
  {
    id: '1',
    name: 'Daily Visitor Report',
    timeRange: 'Daily',
    startTime: '09:00',
    endTime: '17:00',
    areaId: 'main-area',
    floorplanId: null,
    floorId: 'floor-1',
    buildingId: 'building-a',
    hostName: 'John Smith',
    visitorId: null,
    memberId: 'member-456',
  },
  {
    id: '2',
    name: 'Weekly Summary',
    timeRange: 'Weekly',
    startTime: null,
    endTime: null,
    areaId: null,
    floorplanId: 'floorplan-2',
    floorId: 'floor-2',
    buildingId: 'building-b',
    hostName: null,
    visitorId: 'visitor-123',
    memberId: null,
  },
  {
    id: '3',
    name: 'Monthly All Areas',
    timeRange: 'Monthly',
    startTime: '08:00',
    endTime: '18:00',
    areaId: 'all-areas',
    floorplanId: null,
    floorId: null,
    buildingId: null,
    hostName: 'All Hosts',
    visitorId: null,
    memberId: null,
  },
  {
    id: '4',
    name: 'Custom Time Range',
    timeRange: 'Custom',
    startTime: '10:30',
    endTime: '15:45',
    areaId: 'lobby-area',
    floorplanId: 'floorplan-1',
    floorId: 'floor-1',
    buildingId: 'building-a',
    hostName: 'Sarah Johnson',
    visitorId: 'visitor-456',
    memberId: null,
  },
];

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