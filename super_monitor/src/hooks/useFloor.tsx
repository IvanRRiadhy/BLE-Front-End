// src/hooks/useFloor.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { floorType, GetFilter } from 'src/store/apps/crud/floor';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';

const FLOOR_API_URL = '/api/MstFloor/';
const FLOOR_DT_URL = '/api/MstFloor/filter/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// ✅ Get list of floors (supports filters, pagination, sorting)
export function useFloorList(filter: GetFilter) {
  return useQuery({
    queryKey: ['floor-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(FLOOR_DT_URL, filter);
      const collection = response.data.collection;
      return {
        data: collection.data as floorType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<floorType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // data dianggap fresh 1 menit
    gcTime: 5 * 60_000, // cache disimpan 5 menit
  });
}

// ✅ Get all floors (unfiltered)
export function useAllFloors() {
  return useQuery({
    queryKey: ['floors-all'],
    queryFn: async () => {
      const res = await axiosServices.get(FLOOR_API_URL);
      return res.data.collection.data as floorType[];
    },
    placeholderData: [],
  });
}

// ✅ Add a new floor
export function useAddFloor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<floorType>) => {
      const { id, ...filteredPayload } = payload;
      const res = await axiosServices.post(FLOOR_API_URL, filteredPayload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-list'] });
      queryClient.invalidateQueries({ queryKey: ['floors-all'] });
    },
  });
}

// ✅ Edit existing floor (JSON)
export function useEditFloor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<floorType>) => {
      if (!payload.id) throw new Error('Missing floor id');
      const { id, ...filteredPayload } = payload;
      const res = await axiosServices.put(`${FLOOR_API_URL}${id}`, filteredPayload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-list'] });
      queryClient.invalidateQueries({ queryKey: ['floors-all'] });
    },
  });
}

// ✅ Delete a floor
export function useDeleteFloor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${FLOOR_API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-list'] });
      queryClient.invalidateQueries({ queryKey: ['floors-all'] });
    },
  });
}

// ✅ Import floors
export function useImportFloor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await axiosServices.post(`${FLOOR_API_URL}import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-list'] });
    },
  });
}

// ✅ Export floors (PDF / Excel)
export function useExportFloor() {
  return useMutation({
    mutationFn: async (format: 'pdf' | 'excel') => {
      const accessToken = localStorage.getItem('token');
      const url = `${window.location.origin}${FLOOR_API_URL}export/${format}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
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
      a.download = format === 'pdf' ? 'floors.pdf' : 'floors.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true;
    },
  });
}

// ✅ Status helper (like hasLoaded, totalCount)
export function useFloorStatus() {
  const floorFilter = useSelector((state: RootState) => state.floorReducer.floorFilter);
  const query = useFloorList(floorFilter);
  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsFiltered || 0,
  };
}
