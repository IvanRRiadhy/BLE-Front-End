import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';
import { userType, GetFilter, userGroupType, userRegistrationType } from 'src/store/apps/crud/users';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/Auth/users';
const API_DT_URL = '/api/user';
const REGIST_URL = '/api/Auth/register/';
const GROUP_URL = '/api/UserGroup';
const AssignBuilding = '/api/access';

// ✅ Shared paginated response interface
export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL USERS (for dropdowns, etc.)
// -----------------------------------------------------------------------------
export function useAllUsers() {
  return useQuery({
    queryKey: ['user-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      console.log('Users: ', res.data);
      return res.data.collection.data as userType[];
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH USERS WITH FILTER (DataTable)
// -----------------------------------------------------------------------------
export function useUserList(filter: GetFilter) {
  return useQuery({
    queryKey: ['user-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_DT_URL}/filter`, filter);
      const col = res.data.collection;

      return {
        data: col.data as userType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<userType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
}
// -----------------------------------------------------------------------------
// ✅ REGISTER NEW USER
// -----------------------------------------------------------------------------
export function useRegisterUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: userRegistrationType) => {
      const res = await axiosServices.post(REGIST_URL, payload);
      console.log('Adding Result', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-all'] });
    },
  });
}
// -----------------------------------------------------------------------------
// ✅ CREATE USER DIRECTLY 
// -----------------------------------------------------------------------------
export function useCreateUserDirect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: userRegistrationType) => {
      const res = await axiosServices.post(`${API_DT_URL}/create-direct`, payload);
      console.log('Adding Result', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-all'] });
    },
  });
}
// -----------------------------------------------------------------------------
// ✅ EDIT USER
// -----------------------------------------------------------------------------
export function useEditUser() {
  const queryClient = useQueryClient();
  return useMutation({ 
    mutationFn: async ({payload, id} : {payload: userRegistrationType, id: string})  => {
      const res = await axiosServices.put(`${API_DT_URL}/${id}`, payload);
      console.log('Editing Result', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-all', 'user-list'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL USER GROUPS (for dropdowns, etc.)
// -----------------------------------------------------------------------------
export function useAllUserGroups() {
  return useQuery({
    queryKey: ['user-group-all'],
    queryFn: async () => {
      const res = await axiosServices.get(GROUP_URL);
      console.log('User Groups: ', res.data);
      return res.data.collection.data as userGroupType[];
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ CREATE NEW USER GROUPS
// -----------------------------------------------------------------------------
export function useAddUserGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; levelPriority: string; isHead: boolean }) => {
      const res = await axiosServices.post(GROUP_URL, payload);
      console.log('Adding Result', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-group-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EDIT USER GROUPS
// -----------------------------------------------------------------------------
export function useEditUserGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async(payload: { name: string; levelPriority: string; isHead: boolean, id: string }) => {
      const { id, ...restPayload } = payload;
      const res = await axiosServices.put(`${GROUP_URL}/${id}`, restPayload);
      console.log('Editing Result', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-group-all'] });
    }
  })
}

// -----------------------------------------------------------------------------
// ✅ ASSIGN BUILDING TO USER GROUPS
// -----------------------------------------------------------------------------
export function useAssignBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { groupId: string; buildingIds: string[] }) => {
      const res = await axiosServices.post(`${AssignBuilding}/assign`, payload);
      console.log('Adding Result', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-group-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ REVOKE BUILDING TO USER GROUPS
// -----------------------------------------------------------------------------
export function useRevokeBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { groupId: string; buildingId: string }) => {
      const res = await axiosServices.delete(`${AssignBuilding}/revoke`, { data: payload });
      console.log('Adding Result', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-group-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ REVOKE ALL BUILDING TO USER GROUPS
// -----------------------------------------------------------------------------
export function useRevokeAllBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId }: { groupId: string }) => {
      const res = await axiosServices.delete(`${AssignBuilding}/revoke-all`, {
        params: { groupId },
      });
      console.log('Adding Result', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-group-all'] });
    },
  });
}
