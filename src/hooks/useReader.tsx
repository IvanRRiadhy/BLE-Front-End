import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';
import { defaultBleReaderFilter } from 'src/store/apps/defaultForm';
import { json } from 'stream/consumers';
import { BrandType } from 'src/store/apps/crud/brand';
import { string } from 'prop-types';

// ---------------------------------------------------
// ✅ API Constants
// ---------------------------------------------------
const API_URL = '/api/MstBleReader/';
const API_DT_URL = '/api/MstBleReader/filter/';

// ---------------------------------------------------
// ✅ Type Definitions
// ---------------------------------------------------

export type GetFilter = {
  Draw: number;
  Start: number;
  Length: number;
  SortColumn: string;
  SortDir: 'asc' | 'desc';
  SearchValue: string;
  filters: {
    BrandId: string[];
    EngineReaderId: string[];
  };
};

export interface bleReaderType {
  id: string;
  brandId: string;
  name: string;
  gmac: string;
  ip: string;
  isAssigned?: boolean;
  readerType: 'Outdoor' | 'Indoor';
  measuredPower: number;
  pathLossExponent: number;
  heightMeter: number;
  forceReading: boolean;
  forceRadiusThreshold: number;
  forceRadiusMeter: number;
  brand?: BrandType;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface bleReaderGmacType {
  id: string;
  gmac: string;
  ip: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// ---------------------------------------------------
// ✅ Hook: Get paginated BleReaders (with filter)
// ---------------------------------------------------

export function useReaderList(filter: GetFilter) {
  return useQuery({
    queryKey: ['ble-reader-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      console.log("BLE Reader List Data:",collection, JSON.stringify(filter));
      return {
        data: collection.data as bleReaderType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<bleReaderType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // fresh for 1 minute
    gcTime: 5 * 60_000, // cached for 5 minutes
  });
}

// ---------------------------------------------------
// ✅ Hook: Get all BleReaders (non-paginated)
// ---------------------------------------------------

export function useAllReaders() {
  return useQuery({
    queryKey: ['ble-reader-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      return response.data.collection.data as bleReaderType[];
    },
    placeholderData: [],
  });
}

// ---------------------------------------------------
// ✅ Hook: Get all unassigned BleReaders (non-paginated)
// ---------------------------------------------------

export function useAllUnassignedReaders() {
  return useQuery({
    queryKey: ['ble-reader-all-unassigned'],
    queryFn: async () => {
      const response = await axiosServices.get(`${API_URL}unassigned`);
      console.log("BLE Reader Data",response)
      return response.data.collection.data as bleReaderType[];
    },
    placeholderData: [],
  });
}

// ---------------------------------------------------
// ✅ Hook: Add BleReader
// ---------------------------------------------------

export function useAddReader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newReader: bleReaderType) => {
      const { id,isAssigned, createdBy, createdAt, updatedBy, updatedAt, ...payload } = newReader;
      const response = await axiosServices.post(API_URL, payload);
      return response.data;
    },
    onSuccess: () => {
      // invalidate cache
      queryClient.invalidateQueries({ queryKey: ['ble-reader-list'] });
      queryClient.invalidateQueries({ queryKey: ['ble-reader-all'] });
    },
  });
}

// ---------------------------------------------------
// ✅ Hook: Edit BleReader
// ---------------------------------------------------

export function useEditReader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updatedReader: bleReaderType) => {
      const { id, isAssigned, createdBy, createdAt, updatedBy, updatedAt, brand, ...payload } = updatedReader;
      const response = await axiosServices.put(`${API_URL}${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-reader-list'] });
      queryClient.invalidateQueries({ queryKey: ['ble-reader-all'] });
    },
  });
}

// ---------------------------------------------------
// ✅ Hook: Delete BleReader
// ---------------------------------------------------

export function useDeleteReader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-reader-list'] });
      queryClient.invalidateQueries({ queryKey: ['ble-reader-all'] });
    },
  });
}

// ---------------------------------------------------
// ✅ Hook: Import Readers
// ---------------------------------------------------

export function useImportReader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axiosServices.post(`${API_URL}import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-reader-list'] });
      queryClient.invalidateQueries({ queryKey: ['ble-reader-all'] });
    },
  });
}

// ---------------------------------------------------
// ✅ Hook: Export Readers
// ---------------------------------------------------

export function useExportReader() {
  return useMutation({
    mutationFn: async (type: 'pdf' | 'excel') => {
      const url = `${API_URL}export/${type}`;
      const response = await axiosServices.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = type === 'pdf' ? 'BleReader.pdf' : 'BleReader.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    },
  });
}

// ---------------------------------------------------
// ✅ Hook: Get Readers Mac
// ---------------------------------------------------
export function useGMACList() {
    return useQuery({
    queryKey: ['ble-reader-gmac-list'],
    queryFn: async () => {
      const response = await axiosServices.get(`${API_URL}gmac-list`);
      console.log("BLE Reader GMAC List Data",response)
      return response.data.collection.data as bleReaderGmacType[];
    },
    placeholderData: [],
  });
}

// ---------------------------------------------------
// ✅ Hook: Derived state (replacement for Redux flags)
// ---------------------------------------------------

export function useReaderStatus() {
  const bleReaderFilter = useSelector(
    (state: RootState) => state.bleReaderReducer?.bleReaderFilter || defaultBleReaderFilter,
  );

  const query = useReaderList(bleReaderFilter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal || 0,
    filteredCount: query.data?.recordsFiltered || 0,
  };
}
