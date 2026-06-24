import { useQuery, useMutation, useQueryClient, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';
import { memberType, GetFilter } from 'src/store/apps/crud/member';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/MstSecurity/';
const API_DT_URL = '/api/MstSecurity/filter/';

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
export function useSecurityList(filter: GetFilter) {
  return useQuery({
    queryKey: ['security-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;
      console.log('Security Guard List fetched: ', col);
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
export function useInfiniteSecurityList(filter: GetFilter, pageSize = 50) {
  return useInfiniteQuery({
    queryKey: ['security-list-infinite', { ...filter, Length: undefined, Start: undefined }, pageSize],
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
// ✅ FETCH ALL SecurityS (for dropdowns, etc.)
// -----------------------------------------------------------------------------
export function useAllSecuritys() {
  return useQuery({
    queryKey: ['security-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      return res.data.collection.data as memberType[];
    },
    placeholderData: [],
  });
}
// -----------------------------------------------------------------------------
// ✅ FETCH ALL Security Lookup (for dropdowns, etc.)
// -----------------------------------------------------------------------------
export function useAllSecurityLookup() {
  return useQuery({
    queryKey: ['security-lookup'],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_URL}lookup`);
      return res.data.collection.data as memberType[];
    },
    placeholderData: [],
  });
}
// -----------------------------------------------------------------------------
// ✅ FETCH SECURITY By ID (for dropdowns, etc.)
// -----------------------------------------------------------------------------
export const securityByIdQuery = (id: string) => ({
  queryKey: ['security', id],
  queryFn: async () => {
    const res = await axiosServices.get(`${API_URL}${id}`);
    console.log('Response Security: ', res, 'With Id: ', id);
    return res.data.collection.data as memberType;
  },
});
export function useSecurityByID(id: string) {
  return useQuery({
    ...securityByIdQuery(id),
    enabled: !!id,
    placeholderData: {} as memberType,
  });
}
// -----------------------------------------------------------------------------
// ✅ ADD Security (POST with FormData)
// -----------------------------------------------------------------------------
export function useAddSecurity() {
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
      queryClient.invalidateQueries({ queryKey: ['security-list'] });
      queryClient.invalidateQueries({ queryKey: ['security-all'] });
      queryClient.invalidateQueries({ queryKey: ['security-lookup'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EDIT Security (PUT with FormData)
// -----------------------------------------------------------------------------
export function useEditSecurity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const id = formData.get('id');
      formData.delete('id');
      formData.delete('organization');
      formData.delete('department');
      formData.delete('district');
      const res = await axiosServices.put(`${API_URL}${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-list'] });
      queryClient.invalidateQueries({ queryKey: ['security-all'] });
      queryClient.invalidateQueries({ queryKey: ['security-lookup'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ BLOCK / UNBLOCK Security
// -----------------------------------------------------------------------------
export function useBlacklistSecurity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ securityId, blacklistReason }: { securityId: string; blacklistReason: string }) => {
      const res = await axiosServices.post(`${API_URL}${securityId}/blacklist`, { blacklistReason: blacklistReason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-list'] });
      queryClient.invalidateQueries({ queryKey: ['security-all'] });
      queryClient.invalidateQueries({ queryKey: ['security-lookup'] });
    },
  });
}
export function useUnBlacklistSecurity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ( securityId: string ) => {
      const res = await axiosServices.post(`${API_URL}${securityId}/unblacklist`,{});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-list'] });
      queryClient.invalidateQueries({ queryKey: ['security-all'] });
      queryClient.invalidateQueries({ queryKey: ['security-lookup'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE Security
// -----------------------------------------------------------------------------
export function useDeleteSecurity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-list'] });
      queryClient.invalidateQueries({ queryKey: ['security-all'] });
      queryClient.invalidateQueries({ queryKey: ['security-lookup'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ PAGINATION STATUS (for TopCards, etc.)
// -----------------------------------------------------------------------------
export function useSecurityStatus() {
  const filter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const query = useSecurityList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal ?? 0,
    filteredCount: query.data?.recordsFiltered ?? 0,
  };
}
