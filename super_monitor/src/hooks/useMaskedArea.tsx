import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { MaskedAreaType, GetFilter } from 'src/store/apps/crud/maskedArea';
import { RootState, useSelector } from 'src/store/Store';
import { safeParseAreaShape } from 'src/utils/isJsonObject';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/FloorplanMaskedArea/';
const API_DT_URL = '/api/FloorplanMaskedArea/filter/';

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
export function useMaskedAreaList(filter: GetFilter) {
  return useQuery({
    queryKey: ['masked-area-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;

      // Parse nodes from areaShape string
      const dataWithParsedNodes = col.data.map((maskedArea: MaskedAreaType) => ({
        ...maskedArea,
        nodes: safeParseAreaShape(maskedArea.areaShape),
      }));
      console.log("dataWithParsedNodes", dataWithParsedNodes);
      return {
        data: dataWithParsedNodes as MaskedAreaType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<MaskedAreaType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    gcTime: 5 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL (for dropdowns, selectors, etc.)
// -----------------------------------------------------------------------------
export function useAllMaskedAreas() {
  return useQuery({
    queryKey: ['masked-area-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      const data = res.data.collection.data as MaskedAreaType[];
      const parsedData = data.map((maskedArea) => ({
        ...maskedArea,
        nodes: safeParseAreaShape(maskedArea.areaShape),
      }))
      // Parse nodes from areaShape string
      return parsedData;
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD MASKED AREA (POST JSON)
// -----------------------------------------------------------------------------
export function useAddMaskedArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (maskedArea: Partial<MaskedAreaType>) => {
      const {
        id,
        applicationId,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        generate,
        status,
        floor,
        floorplan,
        nodes,
        labels,
        ...cleanData
      } = maskedArea;

      // Stringify nodes back to areaShape if provided
      const dataToSend = {
        ...cleanData,
        ...(nodes && { areaShape: JSON.stringify(nodes) }),
      };

      const res = await axiosServices.post(API_URL, dataToSend);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masked-area-list'] });
      queryClient.invalidateQueries({ queryKey: ['masked-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EDIT MASKED AREA (PUT JSON)
// -----------------------------------------------------------------------------
export function useEditMaskedArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (maskedArea: Partial<MaskedAreaType>) => {
      console.log('Editing Masked Area:', maskedArea);
      if (!maskedArea.id) throw new Error('Masked Area ID is required for editing.');

      const {
        id,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        generate,
        status,
        floor,
        floorplan,
        nodes,
        labels,
        applicationId,
        ...cleanData
      } = maskedArea;

      // Stringify nodes back to areaShape if provided
      const dataToSend = {
        ...cleanData,
        ...(nodes && { areaShape: JSON.stringify(nodes) }),
      };

      const res = await axiosServices.put(`${API_URL}${id}`, dataToSend);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masked-area-list'] });
      queryClient.invalidateQueries({ queryKey: ['masked-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE MASKED AREA
// -----------------------------------------------------------------------------
export function useDeleteMaskedArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masked-area-list'] });
      queryClient.invalidateQueries({ queryKey: ['masked-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ IMPORT MASKED AREA
// -----------------------------------------------------------------------------
export function useImportMaskedArea() {
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
      queryClient.invalidateQueries({ queryKey: ['masked-area-list'] });
      queryClient.invalidateQueries({ queryKey: ['masked-area-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EXPORT MASKED AREA
// -----------------------------------------------------------------------------
export function useExportMaskedArea() {
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
      a.download = format === 'pdf' ? 'MaskedArea.pdf' : 'MaskedArea.xlsx';
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
export function useMaskedAreaStatus() {
  const filter = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaFilter);
  const query = useMaskedAreaList(filter);
  const all = useAllMaskedAreas();

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal ?? 0,
    filteredCount: query.data?.recordsFiltered ?? 0,
    allMaskedAreaCount: all.data?.length ?? 0,
  };
}
