import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';

// API URLs
const API_URL = '/api/evacuation-alert/';
const API_DT_URL = '/api/evacuation-alert/filter/';
const API_TRANS_URL = '/api/evacuation-transaction/';

export interface EvacuationAlertType {
  id: string;
  title: string;
  description: string;
  alertStatus: AlertStatus;
  triggerType: TriggerType;
  triggeredBy: string;
  startedAt: string; // ISO Date String
  completedAt: string | null; // ISO Date String
  completionNotes: string;
  completedBy: string;
  totalRequired: number;
  totalEvacuated: number;
  totalConfirmed: number;
  totalRemaining: number;
  totalConfirmedNotification: number;
}

export type AlertStatus =
  | "Pending"
  | "Active"
  | "Completed"
  | "Cancelled";

export type TriggerType =
  | "Manual"
  | "FireAlarm"
  | "FloodAlarm"
  | "EarthquakeAlarm"
  | "GasLeakAlarm"
  | "SmokeAlarm"
  | "PanicButton";

  export type EvacuationAlertPayload = {
    title : string;
    description: string;
    triggerType: TriggerType;
  }

  export type EvacuationFinalizePayload = {
    title: string;
    description: string;
    CompletionNotes: string;
  }

  export interface EvacuationAlertFilter {
    draw: number;
    start: number;
    length: number;
    searchValue: string;
    sortColumn: string;
    sortDir: string;
    filters?: {
        alertStatus?: AlertStatus;
        triggerType?: TriggerType;
        
    }
  }

  

  interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}



  export function useEvacuate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (payload: EvacuationAlertPayload) => {
        const res = await axiosServices.post(API_URL, payload);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['evacuate-list'] });
        queryClient.invalidateQueries({ queryKey: ['evacuate-all'] });
      },
    });
  }

  export function useEvacuationList(filter: EvacuationAlertFilter) {
    return useQuery({
      queryKey: ['evacuate-list', filter],
      queryFn: async () => {
        const res = await axiosServices.post(API_DT_URL, filter);
        const collection = res.data.collection;
        return {
          data: collection.data as EvacuationAlertType[],
          draw: collection.draw,
          recordsTotal: collection.recordsTotal,
          recordsFiltered: collection.recordsFiltered,
        } satisfies PaginatedResponse<EvacuationAlertType>;
      },
      placeholderData: keepPreviousData,
      staleTime: 5 * 60_000, // 5 minutes
      gcTime: 10 * 60_000, // 10 minutes
    });
  }

  export function useAllEvacuationAlert() {
    return useQuery({
      queryKey: ['evacuate-all'],
      queryFn: async () => {
        const res = await axiosServices.get(API_URL);
        return res.data.collection.data as EvacuationAlertType[];
      },
      placeholderData: [],
    });
  }

  export function useCompleteEvacuation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const res = await axiosServices.post(`${API_URL}${id}/complete`);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['evacuate-list'] });
        queryClient.invalidateQueries({ queryKey: ['evacuate-all'] });
      },
    });
  }

  export function useFinalizeEvacuation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ payload, id }: { payload: EvacuationFinalizePayload; id: string }) => {
        const res = await axiosServices.put(`${API_URL}${id}/completion-notes`, payload);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['evacuate-list'] });
        queryClient.invalidateQueries({ queryKey: ['evacuate-all'] });
      },
    });
  }

  export interface AssemblyPointSummary {
    assemblyPointId: string;
    name: string;
    evacuated: number;
    confirmed: number;
    confirmedNotification: number;
  }

  export interface PersonDetailSummary {
    transactionId: string;
    principalId: string;
    personName: string;
    cardNumber: string;
    personCategory: string;
    personStatus: string;
    assemblyPointId: string | null;
    assemblyPointName: string | null;
    detectedAt: string;
    lastDetectedAt: string | null;
    confirmedNotificationBy: string | null;
    confirmedNotificationAt: string | null;
    evacuationBy: string | null;
    evacuationAt: string | null;
    confirmedEvacuationBy: string | null;
    confirmedEvacuationAt: string | null;
    confirmationNotes: string | null;
  }

  export interface EvacuationSummaryResponse {
    evacuationAlertId: string;
    title: string;
    alertStatus: string;
    startedAt: string;
    totalRequired: number;
    totalEvacuated: number;
    totalConfirmed: number;
    totalRemaining: number;
    totalConfirmedNotification: number;
    byAssemblyPoint: AssemblyPointSummary[];
    personDetails: PersonDetailSummary[];
  }

  export function useEvacuationSummary(id: string) {
    return useQuery({
      queryKey: ['evacuate-summary', id],
      queryFn: async () => {
        const res = await axiosServices.get(`${API_URL}${id}/summary`);
        return res.data.collection.data as EvacuationSummaryResponse;
      },
      placeholderData: {
        evacuationAlertId: '',
        title: '',
        alertStatus: '',
        startedAt: '',
        totalRequired: 0,
        totalEvacuated: 0,
        totalConfirmed: 0,
        totalRemaining: 0,
        totalConfirmedNotification: 0,
        byAssemblyPoint: [],
        personDetails: [],
      },
      enabled: !!id,
    });
  }

  export interface PersonConfirmation {
    personStatus: "ConfirmedAlertNotification" | "Evacuated" | "ConfirmedEvacuated";
  }

  export function useConfirmEvacuation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ payload, id }: { payload: PersonConfirmation; id: string }) => {
        const res = await axiosServices.put(`${API_TRANS_URL}${id}/confirm`, payload);
        console.log("res", res);
        return res.data;
      },
      onSuccess: () => {
        // queryClient.invalidateQueries({ queryKey: ['evacuate-list'] });
        // queryClient.invalidateQueries({ queryKey: ['evacuate-all'] });
      },
    });
  }