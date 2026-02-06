import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { PatrolSessionType, GetFilter } from 'src/store/apps/crud/patrolSession';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/patrol-session/';
const API_DT_URL = '/api/patrol-session/filter/';

export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function usePatrolSessionList (filter: GetFilter) {
    return useQuery({
        queryKey: ['patrol-session-list', filter],
        queryFn: async () => {
            const response = await axiosServices.post(API_DT_URL, filter);
            const res = response.data.collection;
            console.log('Patrol Session Data fetched: ', res);
            return{
                data: res.data as PatrolSessionType[],
                draw: res.draw,
                recordsTotal: res.recordsTotal,
                recordsFiltered: res.recordsFiltered
            } satisfies PaginatedResponse<PatrolSessionType>;
        },
        placeholderData: keepPreviousData,
        staleTime: 5_000, // fresh for 1 minute
        gcTime: 5 * 60_000, // cache for 5 minutes

    });
}

export function useAllPatrolSessions() {
    return useQuery({
        queryKey: ['patrol-session-all'],
        queryFn: async () => {
            const response = await axiosServices.get(API_URL);
            return response.data.collection.data as PatrolSessionType[];
        },
        placeholderData: [],
    })
}

export function useStartPatrol() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (PatrolAssignmentId: string) => {
            const res = await axiosServices.post(`${API_URL}start`, {PatrolAssignmentId: PatrolAssignmentId});
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patrol-session-all'] });
            queryClient.invalidateQueries({ queryKey: ['patrol-session-list'] });
            queryClient.invalidateQueries({ queryKey: ['patrol-session-id'] });
        },
    })
};

export function useStopPatrol() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (PatrolAssignmentId: string) => {
            const res = await axiosServices.post(`${API_URL}${PatrolAssignmentId}/stop`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patrol-session-all'] });
            queryClient.invalidateQueries({ queryKey: ['patrol-session-list'] });
            queryClient.invalidateQueries({ queryKey: ['patrol-session-id'] });
        },
    })
}