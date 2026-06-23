import { useQuery, useMutation, useQueryClient, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';
import { memberType, GetFilter } from 'src/store/apps/crud/member';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/MstMember/';
const API_DT_URL = '/api/MstMember/filter/';

// ✅ Shared paginated response interface
export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// -----------------------------------------------------------------------------
// ✅ FETCH LIST (for DataTables with pagination/filter)
// -----------------------------------------------------------------------------
export function useMemberList(filter: GetFilter) {
  return useQuery({
    queryKey: ['member-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;
      return {
        data: col.data as memberType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<memberType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // data dianggap fresh 1 menit
    gcTime: 5 * 60_000, // cache disimpan 5 menit
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH LIST INFINITE (for infinite scrolling)
// -----------------------------------------------------------------------------
export function useInfiniteMemberList(filter: GetFilter, pageSize = 50) {
  return useInfiniteQuery({
    queryKey: ['member-list-infinite', { ...filter, Length: undefined, Start: undefined }, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axiosServices.post(API_DT_URL, {
        ...filter,
        Start: pageParam,
        Length: pageSize,
      });
      const col = res.data.collection;
      return {
        data: col.data as memberType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<memberType>;
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
// ✅ FETCH ALL MEMBERS (for dropdowns, etc.)
// -----------------------------------------------------------------------------
export function useAllMembers() {
  return useQuery({
    queryKey: ['member-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      return res.data.collection.data as memberType[];
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH MEMBERS By ID (for dropdowns, etc.)
// -----------------------------------------------------------------------------
export const memberByIdQuery = (id: string) => ({
  queryKey: ['member', id],
  queryFn: async () => {
    const res = await axiosServices.get(`${API_URL}${id}`);
    console.log('Response Member: ', res, 'With Id: ', id);
    return res.data.collection.data as memberType;
  },
});
export function useMemberByID(id: string) {
  return useQuery({
    ...memberByIdQuery(id),
    enabled: !!id,
    placeholderData: {} as memberType,
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD MEMBER (POST with FormData)
// -----------------------------------------------------------------------------
export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      formData.delete('id');
      const res = await axiosServices.post(API_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-list'] });
      queryClient.invalidateQueries({ queryKey: ['member-all'] });
      queryClient.invalidateQueries({ queryKey: ['member'] });
      queryClient.invalidateQueries({ queryKey: ['card-unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['card-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-list'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EDIT MEMBER (PUT with FormData)
// -----------------------------------------------------------------------------
export function useEditMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const id = formData.get('id');
      formData.delete('id');
      const res = await axiosServices.put(`${API_URL}${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-list'] });
      queryClient.invalidateQueries({ queryKey: ['member-all'] });
      queryClient.invalidateQueries({ queryKey: ['member'] });
      queryClient.invalidateQueries({ queryKey: ['card-unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['card-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-list'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ BLOCK / UNBLOCK MEMBER
// -----------------------------------------------------------------------------
export function useBlacklistMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, blacklistReason }: { memberId: string; blacklistReason: string }) => {
      const res = await axiosServices.post(`${API_URL}${memberId}/blacklist`, { blacklistReason: blacklistReason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-list'] });
      queryClient.invalidateQueries({ queryKey: ['member-all'] });
      queryClient.invalidateQueries({ queryKey: ['member'] });
    },
  });
}
export function useUnBlacklistMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ( memberId: string ) => {
      const res = await axiosServices.post(`${API_URL}${memberId}/unblacklist`,{});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-list'] });
      queryClient.invalidateQueries({ queryKey: ['member-all'] });
      queryClient.invalidateQueries({ queryKey: ['member'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE MEMBER
// -----------------------------------------------------------------------------
export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-list'] });
      queryClient.invalidateQueries({ queryKey: ['member-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['card-all'] });
      queryClient.invalidateQueries({ queryKey: ['card-list'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ PAGINATION STATUS (for TopCards, etc.)
// -----------------------------------------------------------------------------
export function useMemberStatus() {
  const filter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const query = useMemberList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal ?? 0,
    filteredCount: query.data?.recordsFiltered ?? 0,
  };
}
