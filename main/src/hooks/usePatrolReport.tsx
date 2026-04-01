import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices, { axiosCdn } from 'src/utils/axios';
import { PatrolReportType, GetFilter } from 'src/store/apps/crud/patrolReport';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/patrol-analytics/report/';

export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function usePatrolReportList(filter: GetFilter) {
    return useQuery({
        queryKey: ['patrol-report-list', filter],
        queryFn: async () => {
            const response = await axiosServices.post(API_URL, filter);
            const res = response.data.collection;
            return {
                data: res.data as PatrolReportType[],
                draw: res.draw,
                recordsTotal: res.recordsTotal,
                recordsFiltered: res.recordsFiltered,
            } satisfies PaginatedResponse<PatrolReportType>;
        },
        placeholderData: keepPreviousData,
        staleTime: 5_000, // fresh for 1 minute
        gcTime: 5 * 60_000, // cache for 5 minutes
    });
}

export function usePatrolReport() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (filter: GetFilter) => {
            const response = await axiosServices.post(API_URL, filter);
            console.log('Generate Patrol Report: ', response.data, 'With Filter: ', filter);
            return response.data.collection.data;
        },
        onSuccess: () => {
            // queryClient.invalidateQueries({ queryKey: ['patrol-report-list'] });
        },
    });
}