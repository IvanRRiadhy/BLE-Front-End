import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  UseQueryOptions,
} from '@tanstack/react-query';
import { axiosEngine } from 'src/utils/axios';

import { AlarmPlaybackDataType } from 'src/store/apps/crud/alarmPlayback';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/playback/';
// const API_DT_URL = '/api/AlarmPlayback/filter/';

export type AlarmPlaybackRequest = {
  alarm_trigger_id: string;
  beforeMinutes: number;
  afterMinutes: number;
};

export function useAlarmPlayback() {
  return useMutation({
    mutationFn: async ({ alarm_trigger_id, beforeMinutes, afterMinutes }: AlarmPlaybackRequest) => {
    //   console.log('ENGINE', axiosEngine);
      const response = await axiosEngine.get(`${API_URL}${alarm_trigger_id}`, {
        params: {
          beforeMinutes,
          afterMinutes,
        },
      });

      console.log('Playback Response: ', response);

      return response.data.collection.data as AlarmPlaybackDataType;
    },
  });
}
