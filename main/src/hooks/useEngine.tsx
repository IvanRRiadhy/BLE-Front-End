import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
// import { floorType, GetFilter } from 'src/store/apps/crud/floor';
import { EngineType } from 'src/store/apps/crud/engine';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';

const ENGINE_API_URL = '/api/MstEngine/';

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
