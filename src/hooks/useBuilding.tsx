import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { BuildingType, GetFilter } from '../store/apps/crud/building';
import { RootState, useSelector } from 'src/store/Store';

const Building_API_URL = '/api/MstBuilding/';
const Building_DT_URL = '/api/MstBuilding/filter/';
const Config_URL = '/api/config-exchange/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useBuildingList(filter: GetFilter) {
    return useQuery({
        queryKey: ['building-list', filter],
        queryFn: async () => {
            const response = await axiosServices.post(Building_DT_URL, filter);
            const collection = response.data.collection;
            return {
                data: collection.data as BuildingType[],
                draw: collection.draw,
                recordsTotal: collection.recordsTotal,
                recordsFiltered: collection.recordsFiltered,
            } satisfies PaginatedResponse<BuildingType>;
        },
        placeholderData: keepPreviousData, // ✅ TanStack v5 way
        staleTime: 5_000, // data dianggap fresh 5 detik
        gcTime: 5 * 60_000, // cache disimpan 5 menit
    });
}

export function useAllBuilding() {
    return useQuery({
        queryKey: ['building-all'],
        queryFn: async () => {
            const response = await axiosServices.get(Building_API_URL);
            // console.log('Building list fetched successfully: ', response.data);
            return response.data.collection.data as BuildingType[];
        },
        placeholderData: [],
    });
}

export function useAddBuilding(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await axiosServices.post(Building_API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // console.log('Building added successfully: ', response.data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['building-list']});
            queryClient.invalidateQueries({queryKey: ['building-all']});
        },
    });
}

export function useEditBuilding(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (formData: FormData) => {
            const id = formData.get('id');
            const res = await axiosServices.put(`${Building_API_URL}${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['building-list']});
            queryClient.invalidateQueries({queryKey: ['building-all']});
        },
    });
}

export function useDeleteBuilding(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await axiosServices.delete(`${Building_API_URL}${id}`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['building-list']});
            queryClient.invalidateQueries({queryKey: ['building-all']});
        },
    }); 
}

export function useBuildingStatus(){
    const buildingFilter = useSelector((state: RootState) => state.buildingReducer.buildingFilter);
    const query = useBuildingList(buildingFilter);

    return {
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        hasLoaded: query.isFetched, // ✅ substitusi untuk redux.hasLoaded
        totalCount: query.data?.recordsFiltered || 0,
    }
}

export function useExportBuildingConfig(){
    return useMutation({
        mutationFn: async (building_id: string) => {
            const response = await axiosServices.get(`${Config_URL}export/${building_id}`, {
                responseType: 'blob',
            });
            return response.data;
        }, 
    });
}

export function useImportBuildingConfig(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await axiosServices.post(Config_URL + 'import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // console.log('Building added successfully: ', response.data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['building-list']});
            queryClient.invalidateQueries({queryKey: ['building-all']});
        },
    });
}