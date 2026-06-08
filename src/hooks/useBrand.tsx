import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { BrandType, GetFilter } from 'src/store/apps/crud/brand';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/MstBrand/';
const API_DT_URL = '/api/MstBrand/filter/';

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
export function useBrandList(filter: GetFilter) {
  return useQuery({
    queryKey: ['brand-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;
      return {
        data: col.data as BrandType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<BrandType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // data dianggap fresh 1 menit
    gcTime: 5 * 60_000, // cache disimpan 5 menit
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL (for dropdowns, selectors, etc.)
// -----------------------------------------------------------------------------
export function useAllBrands() {
  return useQuery({
    queryKey: ['brand-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      return res.data.collection.data as BrandType[];
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD BRAND (POST JSON)
// -----------------------------------------------------------------------------
export function useAddBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brand: Partial<BrandType>) => {
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

// -----------------------------------------------------------------------------
// ✅ EDIT BRAND (PUT JSON)
// -----------------------------------------------------------------------------
export function useEditBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brand: Partial<BrandType>) => {
      if (!brand.id) throw new Error('Brand ID is required for editing.');
      const { id, ...cleanData } = brand;
      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-list'] });
      queryClient.invalidateQueries({ queryKey: ['brand-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE BRAND
// -----------------------------------------------------------------------------
export function useDeleteBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-list'] });
      queryClient.invalidateQueries({ queryKey: ['brand-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ PAGINATION STATUS (for TopCards, etc.)
// -----------------------------------------------------------------------------
export function useBrandStatus() {
  const filter = useSelector((state: RootState) => state.brandReducer.brandFilter);
  const query = useBrandList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal ?? 0,
    filteredCount: query.data?.recordsFiltered ?? 0,
  };
}
