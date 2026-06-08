import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { DistrictType, GetFilter } from 'src/store/apps/crud/district';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/MstDistrict/';
const API_DT_URL = '/api/MstDistrict/filter/';

// ✅ Shared paginated response interface
export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// -----------------------------------------------------------------------------
// ✅ FETCH LIST (with pagination/filter for DataTables)
// -----------------------------------------------------------------------------
export function useDistrictList(filter: GetFilter) {
  return useQuery({
    queryKey: ['district-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;
      return {
        data: col.data as DistrictType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<DistrictType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // data dianggap fresh 1 menit
    gcTime: 5 * 60_000, // cache disimpan 5 menit
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL (for dropdowns, selectors, etc.)
// -----------------------------------------------------------------------------
export function useAllDistricts() {
  return useQuery({
    queryKey: ['district-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      return res.data.collection.data as DistrictType[];
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD DISTRICT (POST JSON)
// -----------------------------------------------------------------------------
export function useAddDistrict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (district: Partial<DistrictType>) => {
      const { id, createdBy, createdAt, updatedBy, updatedAt, ...cleanData } = district;
      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['district-list'] });
      queryClient.invalidateQueries({ queryKey: ['district-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD MULTIPLE DISTRICTS (BATCH)
// -----------------------------------------------------------------------------
export function useAddBatchDistrict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (districts: Partial<DistrictType>[]) => {
      const cleaned = districts.map(
        ({ id, createdBy, createdAt, updatedBy, updatedAt, applicationId, ...rest }) => rest,
      );
      const res = await axiosServices.post(`${API_URL}batch/`, cleaned);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['district-list'] });
      queryClient.invalidateQueries({ queryKey: ['district-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EDIT DISTRICT (PUT JSON)
// -----------------------------------------------------------------------------
export function useEditDistrict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (district: Partial<DistrictType>) => {
      if (!district.id) throw new Error('District ID is required for editing.');
      const { id, createdBy, createdAt, updatedBy, updatedAt, ...cleanData } = district;
      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['district-list'] });
      queryClient.invalidateQueries({ queryKey: ['district-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE DISTRICT
// -----------------------------------------------------------------------------
export function useDeleteDistrict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['district-list'] });
      queryClient.invalidateQueries({ queryKey: ['district-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ PAGINATION STATUS (for TopCards, etc.)
// -----------------------------------------------------------------------------
export function useDistrictStatus() {
  const filter = useSelector((state: RootState) => state.districtReducer.districtFilter);
  const query = useDistrictList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal ?? 0,
    filteredCount: query.data?.recordsFiltered ?? 0,
  };
}
