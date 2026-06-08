import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { TimeGroupType, TimeBlockType, GetFilter } from 'src/store/apps/crud/timeGroup';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/TimeGroup/';
const API_DT_URL = '/api/TimeGroup/filter/';
const API_URL_TIME_BLOCK = '/api/TimeBlock/';

// ✅ Shared paginated response interface
export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// -----------------------------------------------------------------------------
// ✅ UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

// Build edit payload (updated to handle Partial<TimeGroupType>)
const buildEditPayload = (tg: Partial<TimeGroupType>) => {
  return {
    name: tg.name || '',
    description: tg.description || '',
    timeBlocks: (tg.timeBlocks || []).map((b) => {
      const normalized = {
        ...b,
        dayOfWeek: b.dayOfWeek.toLowerCase(),
      };

      // If id is empty or a temp id, exclude it
      if (!b.id || b.id.startsWith("block-")) {
        const { id, ...rest } = normalized;
        return rest;
      }

      return normalized;
    }),
    cardAccessIds: tg.cardAccessIds || [],
  };
};

// -----------------------------------------------------------------------------
// ✅ FETCH LIST (with pagination/filter for DataTables)
// -----------------------------------------------------------------------------
export function useTimeGroupList(filter: GetFilter) {
  return useQuery({
    queryKey: ['time-group-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;
      console.log('Time Group List fetched: ', col, "filter: ", filter);
      return {
        data: col.data as TimeGroupType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<TimeGroupType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    gcTime: 5 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL (for dropdowns, selectors, etc.)
// -----------------------------------------------------------------------------
export function useAllTimeGroups() {
  return useQuery({
    queryKey: ['time-group-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      return res.data.collection.data as TimeGroupType[];
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH SINGLE
// -----------------------------------------------------------------------------
export function useTimeGroupId(id: string) {
  return useQuery({
    queryKey: ['time-group-id', id],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_URL}${id}`);
      return res.data.collection.data as TimeGroupType[];
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD TIME GROUP (POST JSON)
// -----------------------------------------------------------------------------
export function useAddTimeGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeGroup: Partial<TimeGroupType>) => {
      const { id, ...cleanData } = timeGroup;
      console.log("Timegroup add: ", cleanData);
      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-group-list'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-all'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-id'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EDIT TIME GROUP (PUT JSON)
// -----------------------------------------------------------------------------
export function  useEditTimeGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeGroup: Partial<TimeGroupType>) => {
      if (!timeGroup.id) throw new Error('Time Group ID is required for editing.');
      
      const payload = buildEditPayload(timeGroup);
      
      const res = await axiosServices.put(`${API_URL}${timeGroup.id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-group-list'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-all'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-id'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE TIME GROUP
// -----------------------------------------------------------------------------
export function useDeleteTimeGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-group-list'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-all'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-id'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD TIME BLOCK
// -----------------------------------------------------------------------------
export function useAddTimeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeBlock: { 
      dayOfWeek: string; 
      startTime: string; 
      endTime: string; 
      TimeGroupId: string;
    }) => {
      console.log("TimeBlock: ", timeBlock);
      const res = await axiosServices.post(API_URL_TIME_BLOCK, timeBlock);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-group-list'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-all'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-id'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE TIME BLOCK
// -----------------------------------------------------------------------------
export function useDeleteTimeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL_TIME_BLOCK}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-group-list'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-all'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-id'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ PAGINATION STATUS (for TopCards, etc.)
// -----------------------------------------------------------------------------
export function useTimeGroupStatus() {
  const filter = useSelector((state: RootState) => state.TimeGroupReducer.timeGroupFilter);
  const query = useTimeGroupList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal ?? 0,
    filteredCount: query.data?.recordsFiltered ?? 0,
  };
}

// -----------------------------------------------------------------------------
// ✅ BATCH OPERATIONS (if needed in the future)
// -----------------------------------------------------------------------------
export function useAddBatchTimeGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeGroups: Partial<TimeGroupType>[]) => {
      const cleaned = timeGroups.map(({ id, ...rest }) => rest);
      
      const res = await axiosServices.post(`${API_URL}batch/`, cleaned);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-group-list'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-all'] });
      queryClient.invalidateQueries({ queryKey: ['time-group-id'] });
    },
  });
}