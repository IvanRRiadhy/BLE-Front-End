import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { PatrolAreaType, GetFilter } from 'src/store/apps/crud/patrolArea';
import { RootState, useSelector } from 'src/store/Store';
import { safeParseAreaShape } from 'src/utils/isJsonObject';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/patrol-area/';
const API_DT_URL = '/api/patrol-area/filter/';

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
export function usePatrolAreaList(filter: GetFilter) {
  return useQuery({
    queryKey: ['patrol-area-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;

      // Parse nodes from areaShape string
      const dataWithParsedNodes = col.data.map((patrolArea: PatrolAreaType) => ({
        ...patrolArea,
        nodes: patrolArea.areaShape ? JSON.parse(patrolArea.areaShape) : [],
      }));
      console.log("dataWithParsedNodes", dataWithParsedNodes);
      return {
        data: dataWithParsedNodes as PatrolAreaType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<PatrolAreaType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    gcTime: 5 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL (for dropdowns, selectors, etc.)
// -----------------------------------------------------------------------------
export function useAllPatrolAreas() {
  return useQuery({
    queryKey: ['patrol-area-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      const data = res.data.collection.data as PatrolAreaType[];
      // console.log("data", data);

      const parsedData = data.map((patrolArea) => ({
        ...patrolArea,
        nodes: safeParseAreaShape(patrolArea.areaShape),
      }));

      // console.log("parsedData", parsedData);
      // Parse nodes from areaShape string
      return parsedData;
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD MASKED AREA (POST JSON)
// -----------------------------------------------------------------------------
export function useAddPatrolArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patrolArea: Partial<PatrolAreaType>) => {
      const {
        id,
        nodes,
        isActive,
        status,
        applicationId,
        floorName,
        floorplanName,
        ...cleanData
      } = patrolArea;

      // Stringify nodes back to areaShape if provided
      const dataToSend = {
        ...cleanData,
        ...(nodes && { areaShape: JSON.stringify(nodes) }),
      };

      const res = await axiosServices.post(API_URL, dataToSend);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-area-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EDIT MASKED AREA (PUT JSON)
// -----------------------------------------------------------------------------
export function useEditPatrolArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patrolArea: Partial<PatrolAreaType>) => {
      console.log('Editing Patrol Area:', patrolArea);
      if (!patrolArea.id) throw new Error('Patrol Area ID is required for editing.');

      const {
        id,
        nodes,
        isActive,
        status,
        applicationId,
        floorName,
        floorplanName,
        ...cleanData
      } = patrolArea;

      // Stringify nodes back to areaShape if provided
      const dataToSend = {
        ...cleanData,
        ...(nodes && { areaShape: JSON.stringify(nodes) }),
      };

      const res = await axiosServices.put(`${API_URL}${id}`, dataToSend);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-area-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE MASKED AREA
// -----------------------------------------------------------------------------
export function useDeletePatrolArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-area-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ IMPORT MASKED AREA
// -----------------------------------------------------------------------------
export function useImportPatrolArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await axiosServices.post(`${API_URL}import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-area-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EXPORT MASKED AREA
// -----------------------------------------------------------------------------
export function useExportPatrolArea() {
  return useMutation({
    mutationFn: async (format: 'pdf' | 'excel') => {
      const url = `${API_URL}export/${format}`;
      const accessToken = localStorage.getItem('token');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-BIOPEOPLETRACKING-API-KEY':
            'FujDuGTsyEXVwkKrtRgn52APwAVRGmPOiIRX8cffynDvIW35bJaGeH3NcH6HcSeK',
        },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = format === 'pdf' ? 'PatrolArea.pdf' : 'PatrolArea.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      return true;
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ PAGINATION STATUS (for TopCards, etc.)
// -----------------------------------------------------------------------------
export function usePatrolAreaStatus() {
  const filter = useSelector((state: RootState) => state.PatrolAreaReducer.patrolAreaFilter);
  const query = usePatrolAreaList(filter);
  const all = useAllPatrolAreas();

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal ?? 0,
    filteredCount: query.data?.recordsFiltered ?? 0,
    allPatrolAreaCount: all.data?.length ?? 0,
  };
}
