import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { BuildingType, GetFilter } from '../store/apps/crud/building';
import { RootState, useSelector } from 'src/store/Store';

const Building_API_URL = '/api/building/';
// const Building_DT_URL = '/api/building/filter/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

// export function useBuildingList(filter: GetFilter) {
//     return useQuery({
//         queryKey: ['building-list', filter],
//         queryFn: async () => {
//             const response = await axiosServices.post(Building_DT_URL, filter);
//             const collection = response.data.collection;
//             return {
//                 data: collection.data as BuildingType[],
//                 draw: collection.draw,
//                 recordsTotal: collection.recordsTotal,
//                 recordsFiltered: collection.recordsFiltered,
//             } satisfies PaginatedResponse<BuildingType>;
//         },
//         placeholderData: keepPreviousData, // ✅ TanStack v5 way
//         staleTime: 5_000, // data dianggap fresh 5 detik
//         gcTime: 5 * 60_000, // cache disimpan 5 menit
//     });
// }

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
