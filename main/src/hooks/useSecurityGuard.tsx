import { useQuery, useMutation, useQueryClient, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';
import { memberType, securityType, GetFilter } from 'src/store/apps/crud/member';

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
        data: col.data as securityType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<securityType>;
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
        data: col.data as securityType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<securityType>;
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
      return res.data.collection.data as securityType[];
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
      return res.data.collection.data as securityType[];
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
    return res.data.collection.data as securityType;
  },
});
export function useSecurityByID(id: string) {
  return useQuery({
    ...securityByIdQuery(id),
    enabled: !!id,
  });
}
// -----------------------------------------------------------------------------
// ✅ CREATE SECURITY TYPES
// -----------------------------------------------------------------------------
export interface CreateSecurityAccount {
  username?: string | null;
  password?: string | null;
  groupId?: string | null;
}

export interface CreateSecurityPayload {
  personId?: string | null;
  identityId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  address?: string | null;
  faceImage?: string | null;
  organizationId?: string | null;
  departmentId?: string | null;
  districtId?: string | null;
  cardId?: string | null;
  isHead?: boolean | null;
  birthDate?: string | null;
  joinDate?: string | null;
  securityHead1Id?: string | null;
  securityHead2Id?: string | null;
  statusEmployee?: string | null;
  userId?: string | null;
  account?: CreateSecurityAccount | null;
  [key: string]: any;
}

// -----------------------------------------------------------------------------
// ✅ ADD Security (POST with FormData or JSON)
// -----------------------------------------------------------------------------
export function useAddSecurity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSecurityPayload | Partial<securityType> | FormData) => {
      let res;
      if (payload instanceof FormData) {
        payload.delete('id');
        res = await axiosServices.post(API_URL, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const { id, ...filteredPayload } = payload as any;
        res = await axiosServices.post(API_URL, filteredPayload);
      }
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
// ✅ EDIT Security (PUT with FormData or JSON)
// -----------------------------------------------------------------------------
export function useEditSecurity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<securityType> | FormData) => {
      let res;
      if (payload instanceof FormData) {
        const id = payload.get('id');
        payload.delete('id');
        payload.delete('organization');
        payload.delete('department');
        payload.delete('district');
        payload.delete('userId');
        payload.delete('account');
        res = await axiosServices.put(`${API_URL}${id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const { id, userId, account, organization, department, district, ...filteredPayload } = payload as any;
        console.log("Editing: ", filteredPayload);
        if (!id) throw new Error('Missing security id');
        res = await axiosServices.put(`${API_URL}${id}`, filteredPayload);
      }
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
