import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { PatrolRouteType, GetFilter, PatrolAssignType } from 'src/store/apps/crud/patrolRoute';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/patrol-route/';
const API_DT_URL = '/api/patrol-route/filter/';
const API_URL_PATROL_ASSIGN = '/api/patrol-assignment/';
const API_DT_PATROL_ASSIGN = '/api/patrol-assignment/filter/';

// ✅ Shared paginated response interface
export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

function mapPatrolRoute(route: any): PatrolRouteType {
  return {
    ...route,
    patrolAreaIds: route.patrolAreas?.map((a: any) => a.patrolAreaId) ?? [],
    timeGroupIds: route.patrolTimeGroups?.map((tg: any) => tg.timeGroupId) ?? [],
  };
}

export function usePatrolRouteList(filter: GetFilter) {
  return useQuery({
    queryKey: ['patrol-route-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      return response.data.collection;
    },
    select: (collection) =>
      ({
        data: collection.data.map(mapPatrolRoute),
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      }) satisfies PaginatedResponse<PatrolRouteType>,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    gcTime: 5 * 60_000,
  });
}

export function useAllPatrolRoute() {
  return useQuery({
    queryKey: ['patrol-route-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      return response.data.collection.data;
    },
    select: (data) => data.map(mapPatrolRoute),
    placeholderData: [],
  });
}

export function usePatrolRouteId(id: string) {
  return useQuery({
    queryKey: ['patrol-route-id', id],
    queryFn: async () => {
      const response = await axiosServices.get(`${API_URL}${id}`);
      // console.log(response, id)
      return response.data.collection.data;
    },
    select: mapPatrolRoute,
    enabled: !!id,
  });
}

export function useAddPatrolRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patrolRoute: Partial<PatrolRouteType>) => {
      const { id, ...cleanData } = patrolRoute;
      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-route-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-route-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-route-id'] });
    },
  });
}

export function useEditPatrolRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patrolRoute: Partial<PatrolRouteType>) => {
      const { id, ...cleanData } = patrolRoute;
      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-route-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-route-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-route-id'] });
    },
  });
}

export function useDeletePatrolRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-route-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-route-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-route-id'] });
    },
  });
}

export function usePatrolRouteStatus() {
  const filter = useSelector((state: RootState) => state.PatrolRouteReducer.patrolRouteFilter);
  const query = usePatrolRouteList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal || 0,
    filteredCount: query.data?.recordsFiltered || 0,
  };
}

export function useAllPatrolAssign() {
  return useQuery({
    queryKey: ['patrol-assignment-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL_PATROL_ASSIGN);
      return response.data.collection.data as PatrolAssignType[];
    },
    placeholderData: [],
  });
}

export function usePatrolAssignList(filter: GetFilter) {
  return useQuery({
    queryKey: ['patrol-assignment-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_PATROL_ASSIGN, filter);
      const collection = response.data.collection;
      console.log('Patrol Assign: ', collection);
      return {
        data: collection.data as PatrolAssignType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<PatrolAssignType>;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 5000,
    staleTime: 5000, // fresh for 5 seconds
    gcTime: 5 * 60_000, // cache for 5 minutes
  });
}

export function usePatrolAssignmentId(patrolAssignId: string) {
  return useQuery({
    queryKey: ['patrol-assignment-id', patrolAssignId],
    queryFn: async () => {
      console.log('Patrol Assign Id: ', patrolAssignId);
      const response = await axiosServices.get(`${API_URL_PATROL_ASSIGN}${patrolAssignId}`);
      console.log('Patrol Assign by Id: ', response.data);
      return response.data;
    },
  });
}

export function usePatrolAssignmentByRoute(patrolRouteId: string, filter: GetFilter) {
  return useQuery({
    queryKey: ['patrol-assignment-by-route', patrolRouteId, filter],
    queryFn: async () => {
      const fullFilter = {
        ...filter,
        filters: {
          patrolRouteId: patrolRouteId,
        },
      };
      const response = await axiosServices.post(`${API_DT_PATROL_ASSIGN}`, fullFilter);
      const mappedResponse: PatrolAssignType[] = response.data.collection.data.map(
        (item: PatrolAssignType) => ({
          ...item,
          securityIds: item.securities?.map((security) => security.id) || [],
          timeGroupId: item.timeGroup?.id || '',
        }),
      );
      console.log('Patrol Assign by Route: ', mappedResponse);
      return mappedResponse;
    },
  });
}

export function usePatrolAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patrolAssignment: Partial<PatrolAssignType>) => {
      const {
        id,
        patrolRoute,
        timeGroup,
        securityHead1,
        securityHead2,
        securities,
        applicationId,
        status,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        shiftReplacements,
        nextPatrolStatus,
        isEnded,
        ...cleanData
      } = patrolAssignment;
      const res = await axiosServices.post(API_URL_PATROL_ASSIGN, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-id'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-by-route'] });
    },
  });
}

export function useEditPatrolAssign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patrolAssignment: Partial<PatrolAssignType>) => {
      const {
        id,
        patrolRoute,
        timeGroup,
        securities,
        applicationId,
        status,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        shiftReplacements,
        securityHead1,
        securityHead2,
        ...cleanData
      } = patrolAssignment;
      const res = await axiosServices.put(`${API_URL_PATROL_ASSIGN}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-id'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-by-route'] });
    },
  });
}

export function useDeletePatrolAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL_PATROL_ASSIGN}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-id'] });
    },
  });
}

export function useAssignmentReplacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      patrolAssignmentId: string;
      originalSecurityId: string;
      substituteSecurityId: string;
      replacementStartDate: string;
      replacementEndDate: string;
      reason: string;
    }) => {
      const res = await axiosServices.post(`${API_URL_PATROL_ASSIGN}replacement`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-id'] });
    },
  });
}

export function useDeleteReplacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL_PATROL_ASSIGN}replacement/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-list'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-assignment-id'] });
    },
  });
}
