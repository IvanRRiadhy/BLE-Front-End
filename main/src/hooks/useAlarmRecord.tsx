import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { NewAlarmType, NewGetFilter } from 'src/store/apps/crud/alarmRecordTracking';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_REPORT_URL = '/api/alarm-record/event-log';
const API_URL = '/api/alarm-record/';

export function useAlarmLog() {
    const queryClient = useQueryClient();
  return useMutation({
        mutationFn: async (filter: NewGetFilter) => {
      const res = await axiosServices.post(API_REPORT_URL, filter);
      const col = res.data.collection;
      console.log('Fetched Alarm Log:', col);
      return col.data as NewAlarmType[];
    }
  });
}
