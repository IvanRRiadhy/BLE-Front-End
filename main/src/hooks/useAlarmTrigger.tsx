import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { AlarmTriggerType, GetFilter } from 'src/store/apps/crud/alarmTrigger';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_DT_URL = '/api/AlarmTriggers/filter';
const API_URL = '/api/AlarmTriggers/';

// ✅ Shared paginated response interface
export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// -----------------------------------------------------------------------------
// ✅ FETCH LIST (for DataTables / Pagination)
// -----------------------------------------------------------------------------
export function useAlarmTriggerList(filter: GetFilter) {
  return useQuery({
    queryKey: ['alarmTrigger-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;
      return {
        data: col.data as AlarmTriggerType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<AlarmTriggerType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // data dianggap fresh 1 menit
    gcTime: 5 * 60_000, // cache disimpan 5 menit
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL (for dropdowns, selectors, etc.)
// -----------------------------------------------------------------------------
export function useAllAlarmTriggers() {
  return useQuery({
    queryKey: ['alarmTrigger-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      return res.data.collection.data as AlarmTriggerType[];
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ ASSIGN ACTION (POST JSON)
// -----------------------------------------------------------------------------
export function useAddAlarmTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brand: Partial<AlarmTriggerType>) => {
      const { id, ...cleanData } = brand;
      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-list'] });
      queryClient.invalidateQueries({ queryKey: ['brand-all'] });
    },
  });
}

export function useAssignActionAlarmTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dmac, actionStatus }: { dmac: string; actionStatus: string }) => {
      try {
        console.log("Editing AlarmTrigger:", dmac, actionStatus);
        const response = await axiosServices.put(`${API_URL}tag/${dmac}`, { actionStatus });
        console.log(response);
        return response.data;
      } catch (error: any) {
        console.error("Error editing AlarmTrigger:", error);
        throw error.response?.data || new Error("Unknown error");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    },
  });
}

export function useAlarmTriggerStatus(){
  const filter = useSelector((state: RootState) => state.alarmTriggerReducer.alarmTriggerFilter);
  const query = useAlarmTriggerList(filter);
  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal || 0,
    filteredCount: query.data?.recordsFiltered || 0,
  };
}