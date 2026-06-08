import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { GeoFencingAlarmType, GetFilter } from 'src/store/apps/alarmsetting/geofencing';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';

const API_URL = '/api/Geofence/';
const API_DT_URL = '/api/Geofence/filter/';

interface Nodes {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
}

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// Normalize the data (same logic as your Redux thunk)
const normalizeGeoFencingData = (data: any[]): GeoFencingAlarmType[] => {
  return (data || []).map((item: any) => {
    let nodes: Nodes[] | undefined = undefined;
    try {
      if (item.areaShape) {
        const parsed = JSON.parse(item.areaShape);
        if (Array.isArray(parsed)) {
          nodes = parsed;
        }
      }
    } catch (err) {
      console.error("Invalid areaShape JSON:", item.areaShape, err);
    }

    return {
      ...item,
      isActive: item.isActive === 1, // Convert 1/0 to boolean
      nodes, // Add parsed nodes
    };
  });
};

// Get all geo fencing alarms
export function useGeoFencingAlarmsAll() {
  return useQuery({
    queryKey: ['geo-fencing-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      return normalizeGeoFencingData(response.data.collection.data || []);
    },
    staleTime: 5 * 60_000, // 5 minutes for static data
  });
}

// Get filtered/paginated geo fencing alarms
export function useGeoFencingAlarms(filter: GetFilter) {
  return useQuery({
    queryKey: ['geo-fencing-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      const normalizedData = normalizeGeoFencingData(collection.data);
      
      return {
        data: normalizedData,
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<GeoFencingAlarmType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000, // 30 seconds
  });
}

// Get single geo fencing alarm by ID
export function useGeoFencingAlarm(id: string | null) {
  return useQuery({
    queryKey: ['geo-fencing-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('No geo fencing alarm ID provided');
      const response = await axiosServices.get(`${API_URL}${id}`);
      const normalizedData = normalizeGeoFencingData([response.data.collection])[0];
      return normalizedData;
    },
    enabled: !!id,
  });
}

// Add new geo fencing alarm
export function useAddGeoFencingAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (geoFence: GeoFencingAlarmType) => {
      const { id, nodes, floorplan, ...rest } = geoFence;
      const filteredData = {
        ...rest,
        isActive: rest.isActive ? 1 : 0,
      };

      const response = await axiosServices.post(API_URL, filteredData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['geo-fencing-all'] });
      queryClient.invalidateQueries({ queryKey: ['geo-fencing-list'] });
    },
  });
}

// Edit geo fencing alarm
export function useEditGeoFencingAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (geoFence: GeoFencingAlarmType) => {
      const { id, nodes, floorplan, ...rest } = geoFence;
      const filteredData = {
        ...rest,
        isActive: rest.isActive ? 1 : 0,
      };

      if (!id) throw new Error('Geo fencing alarm ID is required for edit');
      const response = await axiosServices.put(`${API_URL}${id}`, filteredData);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['geo-fencing-all'] });
      queryClient.invalidateQueries({ queryKey: ['geo-fencing-list'] });
      
      // Update the specific item in cache if it exists
      if (variables.id) {
        queryClient.setQueryData(
          ['geo-fencing-detail', variables.id],
          (old: GeoFencingAlarmType) => ({ ...old, ...variables })
        );
      }
    },
  });
}

// Delete geo fencing alarm
export function useDeleteGeoFencingAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosServices.delete(`${API_URL}${id}`);
      return response.data;
    },
    onSuccess: (_, deletedId) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['geo-fencing-all'] });
      queryClient.invalidateQueries({ queryKey: ['geo-fencing-list'] });
      
      // Remove the specific item from cache
      queryClient.removeQueries({ queryKey: ['geo-fencing-detail', deletedId] });
    },
  });
}

// Toggle active status
export function useToggleGeoFencingAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await axiosServices.patch(`${API_URL}${id}/status`, { isActive: isActive ? 1 : 0 });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['geo-fencing-all'] });
      queryClient.invalidateQueries({ queryKey: ['geo-fencing-list'] });
      
      // Optimistically update the specific item
      if (variables.id) {
        queryClient.setQueryData(
          ['geo-fencing-detail', variables.id],
          (old: GeoFencingAlarmType) => ({ ...old, isActive: variables.isActive })
        );
      }
    },
  });
}

// Hook for geo fencing alarm statistics
export function useGeoFencingAlarmStats() {
    const filter = useSelector((state: RootState) => state.GeoFencingReducer.geoFencingAlarmFilter);
  const listData = useGeoFencingAlarms(filter);

  return {
    totalCount: listData.data?.recordsTotal || 0,
    filteredCount: listData.data?.recordsFiltered || 0,
    activeCount: listData.data?.data.filter(item => item.isActive).length || 0,
    inactiveCount: listData.data?.data.filter(item => !item.isActive).length || 0,
    hasLoaded: listData.isFetched,
    isFetching: listData.isFetching,
  };
}