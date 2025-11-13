import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { BoundaryAlarmType, GetFilter } from 'src/store/apps/alarmsetting/boundary';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/Boundary/';
const API_DT_URL = '/api/Boundary/filter/';

interface Nodes {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
}

interface BoundaryNodes {
  a: Nodes[];
  b: Nodes[];
}

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// Normalize the data (same logic as your Redux thunk)
const normalizeBoundaryData = (data: any[]): BoundaryAlarmType[] => {
  return (data || []).map((item: any) => {
    let nodes: BoundaryNodes | undefined = undefined;
    try {
      console.log("Area Shape:", item.areaShape);
      if (item.areaShape) {
        const parsed = JSON.parse(item.areaShape);
        console.log("Area Shape Parsed:", parsed);
        // ✅ new format
        if (parsed && parsed.a && parsed.b) {
          nodes = parsed as BoundaryNodes;
          console.log("Area Shape Nodes:", nodes);
        }
        // ✅ fallback: old format (flat array)
        else if (Array.isArray(parsed)) {
          nodes = { a: parsed, b: [] }; // wrap old array into {a, b}
          console.log("Area Shape Nodes:", nodes);
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

// Get all boundary alarms
export function useBoundaryAlarmsAll() {
  return useQuery({
    queryKey: ['boundary-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      return normalizeBoundaryData(response.data.collection.data || []);
    },
    staleTime: 5 * 60_000, // 5 minutes for static data
  });
}

// Get filtered/paginated boundary alarms
export function useBoundaryAlarms(filter: GetFilter) {
  return useQuery({
    queryKey: ['boundary-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      const normalizedData = normalizeBoundaryData(collection.data);
      
      return {
        data: normalizedData,
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<BoundaryAlarmType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000, // 30 seconds
  });
}

// Get single boundary alarm by ID
export function useBoundaryAlarm(id: string | null) {
  return useQuery({
    queryKey: ['boundary-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('No boundary alarm ID provided');
      const response = await axiosServices.get(`${API_URL}${id}`);
      const normalizedData = normalizeBoundaryData([response.data.collection])[0];
      return normalizedData;
    },
    enabled: !!id,
  });
}

// Add new boundary alarm
export function useAddBoundaryAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boundary: BoundaryAlarmType) => {
      const { id, nodes, floorplan, ...rest } = boundary;
      const filteredData = {
        ...rest,
        isActive: rest.isActive ? 1 : 0,
      };

      const response = await axiosServices.post(API_URL, filteredData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['boundary-all'] });
      queryClient.invalidateQueries({ queryKey: ['boundary-list'] });
    },
  });
}

// Edit boundary alarm
export function useEditBoundaryAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boundary: BoundaryAlarmType) => {
      const { id, nodes, floorplan, ...rest } = boundary;
      const filteredData = {
        ...rest,
        isActive: rest.isActive ? 1 : 0,
      };

      if (!id) throw new Error('Boundary alarm ID is required for edit');
      const response = await axiosServices.put(`${API_URL}${id}`, filteredData);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['boundary-all'] });
      queryClient.invalidateQueries({ queryKey: ['boundary-list'] });
      
      // Update the specific item in cache if it exists
      if (variables.id) {
        queryClient.setQueryData(
          ['boundary-detail', variables.id],
          (old: BoundaryAlarmType) => ({ ...old, ...variables })
        );
      }
    },
  });
}

// Delete boundary alarm
export function useDeleteBoundaryAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosServices.delete(`${API_URL}${id}`);
      return response.data;
    },
    onSuccess: (_, deletedId) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['boundary-all'] });
      queryClient.invalidateQueries({ queryKey: ['boundary-list'] });
      
      // Remove the specific item from cache
      queryClient.removeQueries({ queryKey: ['boundary-detail', deletedId] });
    },
  });
}

// Toggle active status
export function useToggleBoundaryAlarm() {
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
      queryClient.invalidateQueries({ queryKey: ['boundary-all'] });
      queryClient.invalidateQueries({ queryKey: ['boundary-list'] });
      
      // Optimistically update the specific item
      if (variables.id) {
        queryClient.setQueryData(
          ['boundary-detail', variables.id],
          (old: BoundaryAlarmType) => ({ ...old, isActive: variables.isActive })
        );
      }
    },
  });
}

// Hook for boundary alarm statistics
export function useBoundaryAlarmStats() {
    const filter = useSelector((state: RootState) => state.BoundaryReducer.boundaryAlarmFilter);
  const listData  = useBoundaryAlarms(filter);
  

  return {
    totalCount: listData.data?.recordsTotal || 0,
    filteredCount: listData.data?.recordsFiltered || 0,
    activeCount: listData.data?.data.filter(item => item.isActive).length || 0,
    inactiveCount: listData.data?.data.filter(item => !item.isActive).length || 0,
    hasLoaded: listData.isFetched,
    isFetching: listData.isFetching, // You might want to track this if needed
  };
}