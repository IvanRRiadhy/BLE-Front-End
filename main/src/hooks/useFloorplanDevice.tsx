import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { FloorplanDeviceType, GetFilter } from 'src/store/apps/crud/floorplanDevice';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/FloorplanDevice/';
const API_DT_URL = '/api/FloorplanDevice/filter/';

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
export function useFloorplanDeviceList(filter: GetFilter) {
  return useQuery({
    queryKey: ['floorplan-device-list', filter],
    queryFn: async () => {
      // Skip request if filter contains 'Empty'
      if (
        filter?.filters &&
        Object.values(filter.filters).some(
          (arr: any) => Array.isArray(arr) && arr.includes("Empty")
        )
      ) {
        console.log("Filter contains 'Empty', skipping request");
        return {
          data: [],
          draw: filter.Draw,
          recordsTotal: 0,
          recordsFiltered: 0,
        } satisfies PaginatedResponse<FloorplanDeviceType>;
      }

      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;

      return {
        data: col.data as FloorplanDeviceType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<FloorplanDeviceType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL (for dropdowns, selectors, etc.)
// -----------------------------------------------------------------------------
export function useAllFloorplanDevices() {
  return useQuery({
    queryKey: ['floorplan-device-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      return res.data.collection.data as FloorplanDeviceType[];
    },
    placeholderData: [],
  });
}

// -----------------------------------------------------------------------------
// ✅ ADD FLOORPLAN DEVICE (POST JSON)
// -----------------------------------------------------------------------------
export function useAddFloorplanDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (floorplanDevice: Partial<FloorplanDeviceType>) => {
      const { 
        id, 
        createdAt, 
        createdBy, 
        updatedAt, 
        updatedBy, 
        accessCctv, 
        reader, 
        accessControl, 
        floorplanMaskedArea,
        ...cleanData 
      } = floorplanDevice;

      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EDIT FLOORPLAN DEVICE (PUT JSON)
// -----------------------------------------------------------------------------
export function useEditFloorplanDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (floorplanDevice: Partial<FloorplanDeviceType>) => {
      if (!floorplanDevice.id) throw new Error('Floorplan Device ID is required for editing.');
      
      const { 
        id, 
        createdAt, 
        createdBy, 
        updatedAt, 
        updatedBy, 
        accessCctv, 
        reader, 
        accessControl, 
        floorplanMaskedArea,
        ...cleanData 
      } = floorplanDevice;

      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE FLOORPLAN DEVICE
// -----------------------------------------------------------------------------
export function useDeleteFloorplanDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ IMPORT FLOORPLAN DEVICE
// -----------------------------------------------------------------------------
export function useImportFloorplanDevice() {
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
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-all'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EXPORT FLOORPLAN DEVICE
// -----------------------------------------------------------------------------
export function useExportFloorplanDevice() {
  return useMutation({
    mutationFn: async (format: 'pdf' | 'excel') => {
      const url = `${API_URL}export/${format}`;
      const accessToken = localStorage.getItem('token');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-BIOPEOPLETRACKING-API-KEY': 'FujDuGTsyEXVwkKrtRgn52APwAVRGmPOiIRX8cffynDvIW35bJaGeH3NcH6HcSeK',
        },
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = format === 'pdf' ? 'FloorplanDevice.pdf' : 'FloorplanDevice.xlsx';
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
export function useFloorplanDeviceStatus() {
  const filter = useSelector((state: RootState) => state.floorplanDeviceReducer.floorplanDeviceFilter);
  const query = useFloorplanDeviceList(filter);
  const all = useAllFloorplanDevices();

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal ?? 0,
    filteredCount: query.data?.recordsFiltered ?? 0,
    allFloorplanDeviceCount: all.data?.length ?? 0,
  };
}

// -----------------------------------------------------------------------------
// ✅ BATCH OPERATIONS (if needed in the future)
// -----------------------------------------------------------------------------
export function useAddBatchFloorplanDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (devices: Partial<FloorplanDeviceType>[]) => {
      const cleaned = devices.map(({ 
        id, createdAt, createdBy, updatedAt, updatedBy, 
        accessCctv, reader, accessControl, floorplanMaskedArea, 
        ...rest 
      }) => rest);

      const res = await axiosServices.post(`${API_URL}batch/`, cleaned);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-all'] });
    },
  });
}