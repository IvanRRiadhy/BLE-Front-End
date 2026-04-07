import { useQuery } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';

const API_URL = '/api/audit-log';

export type EventFilter = {
  draw: number;
  start: number;
  length: number;
  sortColumn: string;
  sortDir: 'asc' | 'desc';
  searchValue: string;
};

export type EventType = {
  id: string;
  eventName: string;
  entityName: string;
  actor: string;
  eventTime: string;
  details: string;
};

export function useEvents(filter: EventFilter) {
  return useQuery({
    queryKey: ['events', filter],
    queryFn: async () => {
      const res = await axiosServices.post(`${API_URL}/filter`, filter);
      console.log('Events Result: ', res.data);
      return res.data.collection.data as EventType[];
    },
    refetchInterval: 30000,
  });
}
