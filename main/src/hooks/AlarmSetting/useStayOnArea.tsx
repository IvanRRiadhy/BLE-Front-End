import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { StayOnAreaAlarmType, GetFilter } from 'src/store/apps/alarmsetting/stayonarea';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/StayOnArea/';
const API_DT_URL = '/api/StayOnArea/filter/';

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
const normalizeStayOnAreaData = (data: any[]): StayOnAreaAlarmType[] => {
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

// Get all stay on area alarms
export function useStayOnAreaAlarmsAll() {
  return useQuery({
    queryKey: ['stay-on-area-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      return normalizeStayOnAreaData(response.data.collection.data || []);
    },
    staleTime: 5 * 60_000, // 5 minutes for static data
  });
}

// Get filtered/paginated stay on area alarms
export function useStayOnAreaAlarms(filter: GetFilter) {
  return useQuery({
    queryKey: ['stay-on-area-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      const normalizedData = normalizeStayOnAreaData(collection.data);
      
      return {
        data: normalizedData,
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<StayOnAreaAlarmType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000, // 30 seconds
  });
}

// Get single stay on area alarm by ID
export function useStayOnAreaAlarm(id: string | null) {
  return useQuery({
    queryKey: ['stay-on-area-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('No stay on area alarm ID provided');
      const response = await axiosServices.get(`${API_URL}${id}`);
      const normalizedData = normalizeStayOnAreaData([response.data.collection])[0];
      return normalizedData;
    },
    enabled: !!id,
  });
}

// Add new stay on area alarm
export function useAddStayOnAreaAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alarm: StayOnAreaAlarmType) => {
      const { id, nodes, floorplan, ...rest } = alarm;
      const filteredData = {
        ...rest,
        isActive: rest.isActive ? 1 : 0,
      };

      console.log('Adding stay on area alarm:', filteredData);
      const response = await axiosServices.post(API_URL, filteredData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['stay-on-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['stay-on-area-list'] });
    },
  });
}

// Edit stay on area alarm
export function useEditStayOnAreaAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alarm: StayOnAreaAlarmType) => {
      const { id, nodes, floorplan, ...rest } = alarm;
      const filteredData = {
        ...rest,
        isActive: rest.isActive ? 1 : 0,
      };

      if (!id) throw new Error('Stay on area alarm ID is required for edit');
      const response = await axiosServices.put(`${API_URL}${id}`, filteredData);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['stay-on-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['stay-on-area-list'] });
      
      // Update the specific item in cache if it exists
      if (variables.id) {
        queryClient.setQueryData(
          ['stay-on-area-detail', variables.id],
          (old: StayOnAreaAlarmType) => ({ ...old, ...variables })
        );
      }
    },
  });
}

// Delete stay on area alarm
export function useDeleteStayOnAreaAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosServices.delete(`${API_URL}${id}`);
      return response.data;
    },
    onSuccess: (_, deletedId) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['stay-on-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['stay-on-area-list'] });
      
      // Remove the specific item from cache
      queryClient.removeQueries({ queryKey: ['stay-on-area-detail', deletedId] });
    },
  });
}

// Toggle active status
export function useToggleStayOnAreaAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await axiosServices.patch(`${API_URL}${id}/status`, { 
        isActive: isActive ? 1 : 0 
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['stay-on-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['stay-on-area-list'] });
      
      // Optimistically update the specific item
      if (variables.id) {
        queryClient.setQueryData(
          ['stay-on-area-detail', variables.id],
          (old: StayOnAreaAlarmType) => ({ ...old, isActive: variables.isActive })
        );
      }
    },
  });
}

// Hook for stay on area alarm statistics
export function useStayOnAreaAlarmStats() {
    const filter = useSelector((state:RootState) => state.StayOnAreaReducer.stayOnAreaAlarmFilter);
  const listData = useStayOnAreaAlarms(filter);

  return {
    totalCount: listData.data?.recordsTotal || 0,
    filteredCount: listData.data?.recordsFiltered || 0,
    activeCount: listData.data?.data.filter(item => item.isActive).length || 0,
    inactiveCount: listData.data?.data.filter(item => !item.isActive).length || 0,
    hasLoaded: listData?.isFetched,
    isFetching: listData?.isFetching,
  };
}