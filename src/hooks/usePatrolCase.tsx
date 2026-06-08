import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices, { axiosCdn } from 'src/utils/axios';
import { PatrolCaseType, GetFilter, CaseUploadType } from 'src/store/apps/crud/patrolCase';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/patrol-case/';
const API_DT_URL = '/api/patrol-case/filter/';
const API_CDN = '/api/upload-local';

export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function usePatrolCaseList(filter: GetFilter) {
  return useQuery({
    queryKey: ['patrol-case-list', filter],
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const res = response.data.collection;
      return {
        data: res.data as PatrolCaseType[],
        draw: res.draw,
        recordsTotal: res.recordsTotal,
        recordsFiltered: res.recordsFiltered,
      } satisfies PaginatedResponse<PatrolCaseType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // fresh for 1 minute
    gcTime: 5 * 60_000, // cache for 5 minutes
  });
}

export function useAllPatrolCase() {
  return useQuery({
    queryKey: ['patrol-case-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      const res = response.data.collection.data as PatrolCaseType[];
      return res;
    },
    placeholderData: [],
    staleTime: 5_000, // fresh for 1 minute
    gcTime: 5 * 60_000, // cache for 5 minutes
  });
}

export function useAddPatrolCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patrolCase: CaseUploadType) => {
      const res = await axiosServices.post(API_URL, patrolCase);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-case-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-case-list'] });
    },
  });
}
export function useEditPatrolCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; patrolCase: CaseUploadType }) => {
      const { id, patrolCase } = data;
      const { patrolSessionId, ...filteredPatrolCase } = patrolCase;
      const res = await axiosServices.put(`${API_URL}${id}`, filteredPatrolCase);
      console.log('edit res', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-case-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-case-list'] });
    },
  });
}

export function useUploadCDN() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      for (const [key, value] of formData.entries()) {
        console.log(key, value);
      }
      const response = await axiosCdn.post(API_CDN, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('File uploaded successfully: ', response.data);
      return response.data;
    },
  });
}

export function useApproveCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosServices.put(`${API_URL}${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-case-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-case-list'] });
    }
  })
};

export function useRejectCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosServices.put(`${API_URL}${id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-case-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-case-list'] });
    }
  })
};

export function useCloseCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosServices.put(`${API_URL}${id}/close`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-case-all'] });
      queryClient.invalidateQueries({ queryKey: ['patrol-case-list'] });
    }
  })
}
