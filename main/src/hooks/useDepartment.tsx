import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { DepartmentType, GetFilter } from 'src/store/apps/crud/department';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/MstDepartment/';
const API_DT_URL = '/api/MstDepartment/filter/';

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
export function useDepartmentList(filter: GetFilter) {
  return useQuery({
    queryKey: ['department-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;
      return {
        data: col.data as DepartmentType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<DepartmentType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // data dianggap fresh 1 menit
    gcTime: 5 * 60_000, // cache disimpan 5 menit
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL (for dropdowns / selectors)
// -----------------------------------------------------------------------------
export function useAllDepartments() {
  return useQuery({
    queryKey: ['department-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      return res.data.collection.data as DepartmentType[];
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD DEPARTMENT (POST JSON)
// -----------------------------------------------------------------------------
export function useAddDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (department: Partial<DepartmentType>) => {
      const { id, createdBy, createdAt, updatedBy, updatedAt, ...cleanData } = department;
      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-list'] });
      queryClient.invalidateQueries({ queryKey: ['department-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD MULTIPLE DEPARTMENTS (BATCH)
// -----------------------------------------------------------------------------
export function useAddBatchDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (departments: Partial<DepartmentType>[]) => {
      const cleaned = departments.map(
        ({ id, createdBy, createdAt, updatedBy, updatedAt, applicationId, ...rest }) => rest,
      );
      const res = await axiosServices.post(`${API_URL}batch/`, cleaned);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-list'] });
      queryClient.invalidateQueries({ queryKey: ['department-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EDIT DEPARTMENT (PUT JSON)
// -----------------------------------------------------------------------------
export function useEditDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (department: Partial<DepartmentType>) => {
      if (!department.id) throw new Error('Department ID is required for editing.');
      const { id, createdBy, createdAt, updatedBy, updatedAt, ...cleanData } = department;
      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-list'] });
      queryClient.invalidateQueries({ queryKey: ['department-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE DEPARTMENT
// -----------------------------------------------------------------------------
export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-list'] });
      queryClient.invalidateQueries({ queryKey: ['department-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ PAGINATION STATUS (for TopCards, table info, etc.)
// -----------------------------------------------------------------------------
export function useDepartmentStatus() {
  const filter = useSelector((state: RootState) => state.departmentReducer.departmentFilter);
  const query = useDepartmentList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal ?? 0,
    filteredCount: query.data?.recordsFiltered ?? 0,
  };
}
