import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  UseQueryOptions,
  useInfiniteQuery,
} from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import {
  AlarmTriggerType,
  IntruderType,
  GetFilter,
  AlarmTimelineType,
  NearestSecurityType,
} from 'src/store/apps/crud/alarmTrigger';
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
      console.log('Fetched AlarmTrigger List:', col);
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
// ✅ FETCH LIST INFINITE (for infinite scrolling, per-category)
// -----------------------------------------------------------------------------
export function useInfiniteAlarmTriggerList(filter: GetFilter, pageSize = 50) {
  return useInfiniteQuery({
    queryKey: ['alarmTrigger-list-infinite', { ...filter, Length: undefined, Start: undefined }, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axiosServices.post(API_DT_URL, {
        ...filter,
        Start: pageParam,
        Length: pageSize,
      });
      const col = res.data.collection;
      return {
        data: col.data as AlarmTriggerType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<AlarmTriggerType>;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.flatMap((page) => page.data).length;
      if (loadedCount < lastPage.recordsFiltered) {
        return loadedCount;
      }
      return undefined;
    },
    staleTime: 5_000,
    gcTime: 5 * 60_000,
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

// export function useAlarmTriggerByID( id: string ) {
//   return useQuery({
//     queryKey: ['alarmTrigger', id],
//     queryFn: async () => {
//       const res = await axiosServices.get(API_URL, { params: { id } });
//       return res.data.collection.data as AlarmTriggerType[];
//     },
//     enabled: !!id,
//     placeholderData: [],
//   });
// }
export const alarmTriggerByIdQuery = (id: string) => ({
  queryKey: ['alarmTrigger', id],
  queryFn: async () => {
    const res = await axiosServices.get(`${API_URL}${id}`);
    console.log('Response: ', res, 'With Id: ', id);
    return res.data.collection.data as AlarmTriggerType;
  },
});
export function useAlarmTriggerByID(id: string) {
  return useQuery({
    ...alarmTriggerByIdQuery(id),
    enabled: !!id,
    placeholderData: {} as AlarmTriggerType,
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH INTRUDER (for dropdowns, selectors, etc.)
// -----------------------------------------------------------------------------
export function useAllIntruders() {
  return useQuery({
    queryKey: ['intruder-all'],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_URL}lookup`);
      // console.log('Intruders: ', res.data.collection.data);
      return res.data.collection.data as IntruderType[];
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

export function useAssignActionAlarmTriggerByDMAC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dmac,
      actionStatus,
      investigatedResult,
      assignedSecurityId,
    }: {
      dmac: string;
      actionStatus: string;
      investigatedResult: string | null;
      assignedSecurityId: string | null;
    }) => {
      try {
        // console.log('Editing AlarmTrigger:', dmac, actionStatus);
        const response = await axiosServices.put(`${API_URL}${dmac}`, {
          actionStatus,
          investigatedResult,
          assignedSecurityId,
        });
        // console.log(response);
        return response.data;
      } catch (error: any) {
        console.error('Error editing AlarmTrigger:', error);
        throw error.response?.data || new Error('Unknown error');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    },
  });
}

export function useAssignActionAlarmTriggerByID() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      triggerId,
      actionStatus,
      investigatedResult,
      assignedSecurityId,
    }: {
      triggerId: string;
      actionStatus: string;
      investigatedResult: string | null;
      assignedSecurityId: string | null;
    }) => {
      try {
        // console.log('Editing AlarmTrigger:', triggerId, actionStatus);
        const response = await axiosServices.put(`${API_URL}${triggerId}`, {
          actionStatus,
          investigatedResult,
          assignedSecurityId,
        });
        // console.log(response);
        return response.data;
      } catch (error: any) {
        console.error('Error editing AlarmTrigger:', error);
        throw error.response?.data || new Error('Unknown error');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    },
  });
}

export function useAlarmTimeline(
  id: string,
  options?: Omit<
    UseQueryOptions<
      AlarmTimelineType, // TQueryFnData
      Error, // TError
      AlarmTimelineType, // TData
      ['alarmTrigger-timeline', string] // TQueryKey
    >,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: ['alarmTrigger-timeline', id],
    queryFn: async (): Promise<AlarmTimelineType> => {
      const res = await axiosServices.get(`${API_URL}${id}/timeline`);
      console.log('Response: ', res, 'With Id: ', id);
      return res.data.collection.data as AlarmTimelineType;
    },
    enabled: !!id,
    // placeholderData: {} as AlarmTimelineType,
    ...options,
  });
}

export function useAlarmTriggerStatus() {
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

export function useAcknowledgeAlarmTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosServices.put(`${API_URL}${id}/acknowledge`);
      console.log('Acknowledge res', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    },
  });
}

export function useDispatchAlarmTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assignedSecurityId }: { id: string; assignedSecurityId: string }) => {
      const res = await axiosServices.put(`${API_URL}${id}/dispatch`, { assignedSecurityId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    },
  });
}

export function useDispatchMultipleAlarmTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async({AlarmTriggerIds, assignedSecurityIds}: {AlarmTriggerIds: string[], assignedSecurityIds: string[]}) => {
      const res = await axiosServices.post(`${API_URL}dispatch-multiple`, { AlarmTriggerIds, assignedSecurityIds });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    }
  })
}

export function useAcceptInvestigate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosServices.put(`${API_URL}${id}/accept`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    },
  });
}

export function useInvestigateAlarmTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, result, note }: { id: string; result: string; note: string }) => {
      const res = await axiosServices.put(`${API_URL}${id}/done-investigated`, {
        investigatedResult: result,
        InvestigationNotes: note,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    },
  });
}

export function usePostponeAlarmTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      postponedUntilDate,
      postponeReason,
    }: {
      id: string;
      postponedUntilDate: string;
      postponeReason: string;
    }) => {
      const res = await axiosServices.put(`${API_URL}${id}/postpone-investigated`, {
        postponedUntilDate,
        postponeReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    },
  });
}

export function useResolveAlarmTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosServices.put(`${API_URL}${id}/resolve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    },
  });
}

export function useNearestSecurity(
  triggerId: string,
  options?: Omit<
    UseQueryOptions<
      NearestSecurityType, // TQueryFnData
      Error, // TError
      NearestSecurityType, // TData
      ['alarmTrigger-nearest-security', string] // TQueryKey
    >,
    'queryKey' | 'queryFn'
  >,
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['alarmTrigger-nearest-security', triggerId],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_URL}${triggerId}/nearest-securities`);
      console.log("result nearest: ", res)
      return res.data.collection.data as NearestSecurityType[];
    },
    enabled: !!triggerId,
  });
}

export type attachmentType = {
  fileUrl: string;
  fileType: string;
};

export function useAlarmAttachmentSend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, attachments }: { id: string; attachments: attachmentType[] }) => {
      const res = await axiosServices.post(`${API_URL}${id}/attachments`, { attachments });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmTrigger-all'] });
    },
  });
}
