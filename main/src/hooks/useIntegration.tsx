import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices, { getAccessToken } from 'src/utils/axios';
import { IntegrationType, GetFilter } from 'src/store/apps/crud/integration';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = "/api/MstIntegration/";

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

type brandType = {
  id: string;
  name: string;
}

export interface NewIntegrationType {
  id: string;
  brandId: string;
  integrationType: string;
  apiTypeAuth: string;
  apiUrl: string;
  apiAuthUsername: string;
  apiAuthPasswd: string;
  apiKeyField: string;
  apiKeyValue: string;
  applicationId: string;
  brand: brandType;
  isSystem: boolean;
  scopes: string; 
}

export interface IntegrationScopeType {
  key: string;
  name: string;
  module: string;
  description?: string;
}

export interface NewIntegrationRequestType {
  integrationType: string;
  apiTypeAuth: string;
  apiUrl: string;
  apiAuthUsername: string;
  apiAuthPasswd: string;
  apiKeyField: string;
  apiKeyValue: string;
  applicationId: string;
  brandId: string;
  scopes: string;
}

// -----------------------------------------------------------------------------
// ✅ FETCH LIST (with pagination/filter for DataTables)
// -----------------------------------------------------------------------------
export function useIntegrationList(filter: GetFilter){
    return useQuery({
        queryKey: ['integration-list', filter],
        queryFn: async () => {
            const res = await axiosServices.post(API_URL, filter);
            const col = res.data.collection;
            return {
                data: col.data as IntegrationType[],
                draw: col.draw,
                recordsTotal: col.recordsTotal,
                recordsFiltered: col.recordsFiltered,
            } satisfies PaginatedResponse<IntegrationType>;
        },
        placeholderData: keepPreviousData,
        staleTime: 5_000,
        gcTime: 5 * 60_000,
    });
}

// -----------------------------------------------------------------------------
// ✅ FETCH ALL (for dropdowns, selectors, etc.)
// -----------------------------------------------------------------------------
export function useAllIntegrations() {
    return useQuery({
        queryKey: ['integration-all'],
        queryFn: async () => {
            const res = await axiosServices.get(API_URL);
            const data = res.data.collection.data as IntegrationType[];
            return data;
        },
        placeholderData: [],
    });
}

// -----------------------------------------------------------------------------
// ✅ ADD INTEGRATION (POST JSON)
// -----------------------------------------------------------------------------
export function useAddIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integration: Partial<IntegrationType>) => {
      const { id, createdAt, createdBy, updatedAt, updatedBy, ...cleanData } = integration;
      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-list'] });
      queryClient.invalidateQueries({ queryKey: ['integration-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ EDIT INTEGRATION (PUT JSON)
// -----------------------------------------------------------------------------
export function useEditIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integration: Partial<IntegrationType>) => {
      if (!integration.id) throw new Error('Integration ID is required for editing.');
      const { id, createdAt, createdBy, updatedAt, updatedBy, ...cleanData } = integration;
      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-list'] });
      queryClient.invalidateQueries({ queryKey: ['integration-all'] });
    },
  });
}

// -----------------------------------------------------------------------------
// ✅ DELETE INTEGRATION
// -----------------------------------------------------------------------------
export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-list'] });
      queryClient.invalidateQueries({ queryKey: ['integration-all'] });
    },
  });
}

export interface IntegrationSecretType {
  id: string;
  brandName?: string;
  apiTypeAuth: string;
  apiKeyField: string;
  apiKeyValue: string;
  apiAuthUsername: string | null;
  apiAuthPasswd: string | null;
}

export function useGenerateApiKey() {
  return useMutation({
    mutationFn: async () => {
      const res = await axiosServices.get(`${API_URL}generate-key`);
      return res.data.collection.data.apiKey as string;
    },
  });
}

export function useIntegrationSecret(id: string, enabled: boolean = false) {
  return useQuery({
    queryKey: ['integration-secret', id],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_URL}${id}/secret`);
      return res.data.collection.data as IntegrationSecretType;
    },
    enabled: !!id && enabled,
    staleTime: 0,
  });
}

export function useIntegrationScope() {
  return useQuery({
    queryKey: ['integration-scope'],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_URL}scopes`);
      const data = res.data.collection.data as IntegrationScopeType[];
      return data;
    },
    placeholderData: [],
  });
}

export function useIntegrationStatus() {
    const filter = useSelector((state: RootState) => state.integrationReducer.IntegrationFilter);
    const query = useIntegrationList(filter);
    const all = useAllIntegrations();
    return {
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        hasLoaded: query.isFetched,
        totalCount: query.data?.recordsTotal ?? 0,
        filteredCount: query.data?.recordsFiltered ?? 0,
        allIntegrationCount: all.data?.length ?? 0,
  };
}