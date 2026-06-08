import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { FloorplanDeviceType, GetFilter, PathsType } from 'src/store/apps/crud/floorplanDevice';
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
          (arr: any) => Array.isArray(arr) && arr.includes('Empty'),
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

      // ----------------------------
      // 🔥 PARSE PATH HERE
      // ----------------------------
      console.log("Raw device data with paths:", col.data);
      const parsedDevices = col.data.map((dev: FloorplanDeviceType) => {
        let devicePath: PathsType[] = [];
        // console.log("Parsing device path for device ID:", dev.id, "Path string:", dev.path);
        if (dev.path) {
          try {
            const parsed = JSON.parse(dev.path);
            console.log("Parsed device path:", parsed);
            // If backend returns a single PathsType
            if (!Array.isArray(parsed)) {
              devicePath = [parsed];
            }
            // If backend supports multiple paths
            else {
              devicePath = parsed;
            }
          } catch (err) {
            console.error("❌ Failed parsing device path JSON:", dev.path, err);
            devicePath = [];
          }
        }

        return {
          ...dev,
          devicePath, // <------ parsed, safe
        };
      });
      console.log("Devices after parsing paths:", parsedDevices);
      return {
        data: parsedDevices as FloorplanDeviceType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<FloorplanDeviceType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    gcTime: 5 * 60_000,
  });
}


// -----------------------------------------------------------------------------
// ✅ FETCH ALL (for dropdowns, selectors, etc.)
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// ✅ FETCH ALL FLOORPLAN DEVICES (with parsed paths)
// -----------------------------------------------------------------------------
export function useAllFloorplanDevices() {
  return useQuery({
    queryKey: ['floorplan-device-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      const rawDevices = res.data.collection.data as FloorplanDeviceType[];

      console.log("Raw ALL device data with paths:", rawDevices);

      const parsedDevices = rawDevices.map((dev: FloorplanDeviceType) => {
        let devicePath: PathsType[] = [];

        if (dev.path) {
          try {
            const parsed = JSON.parse(dev.path);
            console.log("Parsed ALL device path:", parsed);

            // If backend returns only 1 path object
            if (!Array.isArray(parsed)) devicePath = [parsed];
            else devicePath = parsed; // Already array
          } catch (err) {
            console.error("❌ Failed to parse ALL device path JSON:", dev.path, err);
            devicePath = [];
          }
        }

        return {
          ...dev,
          devicePath,
        };
      });

      console.log("ALL devices after parsing paths:", parsedDevices);
      return parsedDevices as FloorplanDeviceType[];
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
        floorplan,
        ...cleanData
      } = floorplanDevice;
      console.log("Clean Data:", cleanData);
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
      console.log('Editing Floorplan Device:', floorplanDevice);
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
        floorplan,
        status,
        applicationId,
        ...cleanData
      } = floorplanDevice;

      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      // console.log('Edit response:', res.data);
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
  const filter = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.floorplanDeviceFilter,
  );
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
      const cleaned = devices.map(
        ({
          id,
          createdAt,
          createdBy,
          updatedAt,
          updatedBy,
          accessCctv,
          reader,
          accessControl,
          floorplanMaskedArea,
          ...rest
        }) => rest,
      );

      const res = await axiosServices.post(`${API_URL}batch/`, cleaned);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-all'] });
    },
  });
}

export function useReleaseFloorplanDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deviceIds: string[]) => {
      const res = await axiosServices.post(`${API_URL}release/`, { deviceIds });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-device-all'] });
    },
  });
}