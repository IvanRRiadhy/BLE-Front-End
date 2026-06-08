import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { TrxVisitorType, GetFilter } from '../store/apps/crud/trxVisitor';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/TrxVisitor/';
const API_DT_URL = '/api/TrxVisitor/filter/';
const SEND_INVITATION_URL = '/api/Visitor/batch/send-invitation/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useTrxVisitorList() {
  // Get filter from Redux instead of passing as parameter
  const filter = useSelector((state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter);
  
  return useQuery({
    queryKey: ['trx-visitor-list', filter], // React Query will refetch when filter changes
    queryFn: async () => {
      const response = await axiosServices.post(API_DT_URL, filter);
      const collection = response.data.collection;
      return {
        data: collection.data as TrxVisitorType[],
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<TrxVisitorType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useAllTrxVisitor() {
  return useQuery({
    queryKey: ['trx-visitor-all'],
    queryFn: async () => {
      const response = await axiosServices.get(API_URL);
      return response.data.collection.data as TrxVisitorType[];
    },
    placeholderData: [],
  });
}

export function useTrxVisitorStatus() {
  const query = useTrxVisitorList();

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal || 0,
    filteredCount: query.data?.recordsFiltered || 0,
  };
}

// Get single visitor detail
export function useTrxVisitorDetail(id: string | null) {
  return useQuery({
    queryKey: ['trx-visitor-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('No visitor ID provided');
      const response = await axiosServices.get(`${API_URL}${id}`);
      return response.data.collection as TrxVisitorType;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// Check-in visitor mutation
interface CheckInRequest {
  TrxVisitorId: string;
  CardId: string;
}

export function useCheckInVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CheckInRequest) => {
      const response = await axiosServices.post(`${API_URL}checkin`, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch all relevant queries
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-list'] });
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-detail'] });
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-all'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

// Check-out visitor mutation
export function useCheckOutVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trxVisitorId: string) => {
      const response = await axiosServices.post(`${API_URL}${trxVisitorId}/checkout`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-list'] });
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-detail'] });
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-all'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

// Change visitor status mutation (deny, block, unblock)
interface StatusChangeRequest {
  trxVisitorId: string;
  status: 'denied' | 'blocked' | 'unblocked';
  reason?: string;
}

export function useChangeVisitorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StatusChangeRequest) => {
      // Prepare body based on status
      let body: Record<string, string> | undefined;
      
      if (data.status === 'denied') {
        body = { denyReason: data.reason ?? '' };
      } else if (data.status === 'blocked') {
        body = { blockReason: data.reason ?? '' };
      }
      // For unblocked, no body is needed

      const response = await axiosServices.post(
        `${API_URL}${data.trxVisitorId}/${data.status}`,
        body
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-list'] });
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-detail'] });
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-all'] });
    },
  });
}

// Extend visitor time mutation
interface ExtendVisitorRequest {
  trxVisitorId: string;
  ExtendedVisitorTime: number;
}

export function useExtendVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ExtendVisitorRequest) => {
      const response = await axiosServices.post(
        `${API_URL}${data.trxVisitorId}/extend`,
        { ExtendedVisitorTime: data.ExtendedVisitorTime }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-list'] });
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-detail'] });
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-all'] });
    },
  });
}

// Get visitor by ID (public endpoint)
export function useTrxVisitorById(id: string) {
  return useQuery({
    queryKey: ['trx-visitor-by-id', id],
    queryFn: async () => {
      const response = await axiosServices.get(`${API_URL}public/${id}`);
      return response.data.collection.data as TrxVisitorType[];
    },
    enabled: !!id,
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: any[]) => {
      const started = Date.now();
      try {
        console.log('Sending invitation payload:', payload);
        
        const response = await axiosServices.post(SEND_INVITATION_URL, payload);
        console.log('Invitation response:', response.data);
        
        // Keep your existing delay logic for UX consistency
        const elapsed = Date.now() - started;
        if (elapsed < 500) await delay(500 - elapsed);
        
        return response.data;
      } catch (error) {
        console.error("Error sending Invitation:", error);
        const elapsed = Date.now() - started;
        if (elapsed < 500) await delay(500 - elapsed);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate both visitor and transaction queries
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-list'] });
      queryClient.invalidateQueries({ queryKey: ['trx-visitor-all'] });
    },
  });
}

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));



// Helper hook for common visitor operations
export function useVisitorOperations() {
  const checkInMutation = useCheckInVisitor();
  const checkOutMutation = useCheckOutVisitor();
  const statusChangeMutation = useChangeVisitorStatus();
  const extendMutation = useExtendVisitor();

  return {
    checkInVisitor: checkInMutation.mutateAsync,
    checkOutVisitor: checkOutMutation.mutateAsync,
    changeVisitorStatus: statusChangeMutation.mutateAsync,
    extendVisitor: extendMutation.mutateAsync,
    isLoading: checkInMutation.isPending || checkOutMutation.isPending || 
               statusChangeMutation.isPending || extendMutation.isPending,
  };
}