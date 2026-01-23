import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';
import { userType, GetFilter } from 'src/store/apps/crud/users';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = "/api/Auth/users";
const REGIST_URL = '/api/Auth/register/';

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
      console.log("Users: ", res.data);
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
      const res = await axiosServices.post(`${API_URL}/filter`, filter);
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