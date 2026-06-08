import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { AlarmSettingType, GetFilter } from 'src/store/apps/alarmsetting/alarmSettings';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/AlarmCategorySettings/';

export interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useAlarmCategoryList(filter: GetFilter) {
  return useQuery({
    queryKey: ['alarmcategory-list', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_URL}filter`, filter);
      const collection = res.data.collection;
      const normalized: AlarmSettingType[] = collection.data.map((item: any) => ({
        ...item,
        isEnabled: item.isEnabled === 1,
      }));
      return {
        data: normalized,
        draw: collection.draw,
        recordsTotal: collection.recordsTotal,
        recordsFiltered: collection.recordsFiltered,
      } satisfies PaginatedResponse<AlarmSettingType>;
    },
    placeholderData: keepPreviousData, // Keep old data during refetch
    staleTime: 5_000, // fresh for 1 minute
    gcTime: 5 * 60_000, // cache for 5 minutes
  });
}

export function useAllAlarmCategory() {
  return useQuery({
    queryKey: ['alarmcategory-all'],
    queryFn: async () => {
      const res = await axiosServices.get(`${API_URL}`);
      const collection = res.data.collection;
      return collection.data as AlarmSettingType[];
    },
    placeholderData: [],
  });
}

export function useEditAlarmCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (AlarmCategory: Partial<AlarmSettingType>) => {
      const { id, remarks, alarmCategory, isEnabled, ...cleanData } = AlarmCategory;
      const filteredData = {
        ...cleanData,
        isEnabled: isEnabled ? 1 : 0,
      };

      const res = await axiosServices.put(`${API_URL}${id?.toUpperCase()}`, filteredData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarmcategory-list'] });
      queryClient.invalidateQueries({ queryKey: ['alarmcategory-all'] });
    },
  });
}
