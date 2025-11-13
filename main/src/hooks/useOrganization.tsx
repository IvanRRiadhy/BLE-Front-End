import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { OrganizationType, GetFilter } from 'src/store/apps/crud/organization';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/MstOrganization/';
const API_DT_URL = '/api/MstOrganization/filter/';

export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useOrganizationList(filter: GetFilter) {
  return useQuery({
    queryKey: ['organization-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(API_DT_URL, filter);
      const col = res.data.collection;
      return {
        data: col.data as OrganizationType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedResponse<OrganizationType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // data dianggap fresh 1 menit
    gcTime: 5 * 60_000, // cache disimpan 5 menit
  });
}

export function useAllOrganizations() {
  return useQuery({
    queryKey: ['organization-all'],
    queryFn: async () => {
      const res = await axiosServices.get(API_URL);
      return res.data.collection.data as OrganizationType[];
    },
    placeholderData: [],
  });
}

export function useAddOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organization: Partial<OrganizationType>) => {
      const { id, createdBy, createdAt, updatedBy, updatedAt, applicationId, ...cleanData } =
        organization;
      console.log(cleanData);
      const res = await axiosServices.post(API_URL, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-list'] });
      queryClient.invalidateQueries({ queryKey: ['organization-all'] });
    },
  });
}

export function useEditOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organization: Partial<OrganizationType>) => {
      if (!organization.id) throw new Error('Organization ID missing for edit.');
      const { id, createdBy, createdAt, updatedBy, updatedAt, ...cleanData } = organization;
      const res = await axiosServices.put(`${API_URL}${id}`, cleanData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-list'] });
      queryClient.invalidateQueries({ queryKey: ['organization-all'] });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosServices.delete(`${API_URL}${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-list'] });
      queryClient.invalidateQueries({ queryKey: ['organization-all'] });
    },
  });
}

export function useOrganizationStatus() {
  const filter = useSelector((state: RootState) => state.organizationReducer.organizationFilter);
  const query = useOrganizationList(filter);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsTotal ?? 0,
    filteredCount: query.data?.recordsFiltered ?? 0,
  };
}
