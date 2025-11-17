import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';
import { IntegrationType } from 'src/store/apps/crud/integration';
import { defaultAccessCCTVFilter } from 'src/store/apps/defaultForm';

const API_URL = '/api/MstAccessCctv/';
const API_DT_URL = '/api/MstAccessCctv/filter/';

// ---------------------------------------------------
// ✅ Type Definitions
// ---------------------------------------------------

export interface CCTVType {
  id: string;
  name: string;
  rtsp: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  integrationId: string;
  applicationId: string;
  integration?: IntegrationType;
}

export interface GetFilter {
  Draw: number;
  Start: number;
  Length: number;
  SortColumn: string;
  SortDir: 'asc' | 'desc';
  SearchValue: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// ---------------------------------------------------
// ✅ Hook: Get CCTV list (with pagination/filter)
// ---------------------------------------------------

export function useCCTVList(filter: GetFilter) {
  return useQuery({
    queryKey: ['cctv-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      return {
        data: collection.data as CCTVType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<CCTVType>;
    },
    placeholderData: keepPreviousData, // Keep old data during refetch
    staleTime: 5_000, // fresh for 1 minute
    gcTime: 5 * 60_000, // cache retained 5 minutes
  });
}

// ---------------------------------------------------
// ✅ Hook: Get all CCTV (no pagination)
// ---------------------------------------------------

export function useAllCCTV() {
  return useQuery({
    queryKey: ['cctv-list-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      return response.data.collection.data as CCTVType[];
    },
    placeholderData: [],
  });
}

// ---------------------------------------------------
// ✅ Hook: Get all unassigned CCTV (no pagination)
// ---------------------------------------------------

export function useAllUnassignedCCTV() {
  return useQuery({
    queryKey: ['cctv-list-all-unassigned'],
    queryFn: async () => {
      const response = await axiosServices.get(`${API_URL}unassigned`);
      console.log("CCTV Data",response)
      return response.data.collection.data as CCTVType[];
    },
    placeholderData: [],
  });
}

// ---------------------------------------------------
// ✅ Hook: Add CCTV
// ---------------------------------------------------

export function useAddCCTV() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCCTV: CCTVType) => {
      const { id, integrationId, createdBy, createdAt, updatedBy, updatedAt, ...filteredData } =
        newCCTV;
      const response = await axiosServices.post(API_URL, filteredData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-list'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-list-all'] });
    },
  });
}

// ---------------------------------------------------
// ✅ Hook: Edit CCTV
// ---------------------------------------------------

export function useEditCCTV() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updatedCCTV: CCTVType) => {
      const { id, createdBy, createdAt, updatedBy, updatedAt, ...filteredData } = updatedCCTV;
      const response = await axiosServices.put(`${API_URL}${id}`, filteredData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-list'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-list-all'] });
    },
  });
}

// ---------------------------------------------------
// ✅ Hook: Delete CCTV
// ---------------------------------------------------

export function useDeleteCCTV() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-list'] });
      queryClient.invalidateQueries({ queryKey: ['cctv-list-all'] });
    },
  });
}

// ---------------------------------------------------
// ✅ Hook: Derived status (replacement for Redux flags)
// ---------------------------------------------------

export function useCCTVStatus() {
  const cctvFilter = useSelector(
    (state: RootState) => state.CCTVReducer?.cctvFilter || defaultAccessCCTVFilter,
  );
  const query = useCCTVList(cctvFilter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal || 0,
    filteredCount: query.data?.recordsFiltered || 0,
  };
}
