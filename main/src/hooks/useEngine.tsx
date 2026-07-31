import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices, { API_ENGINE_URL } from 'src/utils/axios';
// import { floorType, GetFilter } from 'src/store/apps/crud/floor';
import { EngineType, GetFilter } from 'src/store/apps/crud/engine';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';

const ENGINE_API_URL = '/api/MstEngine/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useAllEngines() {
  return useQuery({
    queryKey: ['allEngine'],
    queryFn: async () => {
      const res = await axiosServices.get(ENGINE_API_URL);
      return res.data.collection.data as EngineType[];
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // data dianggap fresh 1 menit
    gcTime: 5 * 60_000, // cache disimpan 5 menit
  });
}

export function useEngineList(filter: GetFilter){
  return useQuery({
    queryKey: ['engine-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(ENGINE_API_URL + 'filter', filter);
      const collection = res.data.collection;
            return {
              data: collection.data as EngineType[],
              draw: collection.draw,
              recordsTotal: collection.recordsTotal,
              recordsFiltered: collection.recordsFiltered,
            } satisfies PaginatedResponse<EngineType>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000, // data dianggap fresh 1 menit
    gcTime: 5 * 60_000, // cache disimpan 5 menit
  })
}

export function useDeleteEngine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (engineId: string) => {
      const res = await axiosServices.delete(`${ENGINE_API_URL}${engineId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engine-list'] });
    }
  })
}

export function useAssignReaders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { engineId: string, readerIds: string[] }) => {
      const res = await axiosServices.post(`${ENGINE_API_URL}${data.engineId}/assign-readers`, {
        readerIds: data.readerIds});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEngine'] });
    }
  });
}

export function useEngineStatus(){
  const engineFilter = useSelector((state: RootState) => state.EngineReducer.engineFilter);
  const query = useEngineList(engineFilter);
    return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasLoaded: query.isFetched,
    totalCount: query.data?.recordsFiltered || 0,
  };
}