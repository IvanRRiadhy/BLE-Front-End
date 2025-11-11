import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { VisitorType, GetFilter } from '../store/apps/crud/visitor';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = "/api/Visitor/";
const API_DT_URL = "/api/Visitor/filter/";

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useVisitorList(filter: GetFilter) {
    return useQuery({
        queryKey: ['visitor-list', filter],
        queryFn: async () => {
            const response = await axiosServices.post(API_DT_URL, filter);
            const collection = response.data.collection;
            return {
                data: collection.data as VisitorType[],
                draw: collection.draw,
                recordsTotal: collection.recordsTotal,
                recordsFiltered: collection.recordsFiltered,
            } satisfies PaginatedResponse<VisitorType>;
        },
        placeholderData: keepPreviousData, // Keep old data during refetch
        staleTime: 60_000, // fresh for 1 minute
        gcTime: 5 * 60_000, // cache for 5 minutes
    })
};

export function useAllVisitor(){
    return useQuery({
        queryKey: ['visitor-all'],
        queryFn: async () => {
            const response = await axiosServices.get(API_URL);
            return response.data.collection.data as VisitorType[]
        },
        placeholderData: [],
    })
};

export function useVisitorStatus(){
    const filter = useSelector((state: RootState) => state.visitorReducer.visitorFilter);
    const query = useVisitorList(filter);

    return {
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        hasLoaded: query.isFetched,
        totalCount: query.data?.recordsTotal || 0,
        filteredCount: query.data?.recordsFiltered || 0,
    }
}