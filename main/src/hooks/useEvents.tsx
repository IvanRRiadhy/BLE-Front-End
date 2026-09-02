import { useInfiniteQuery } from '@tanstack/react-query';
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

export interface PaginatedEventResponse {
  data: EventType[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useEvents(filter: EventFilter, pageSize = 50) {
  return useInfiniteQuery({
    queryKey: ['events-infinite', { ...filter, start: undefined, length: undefined }, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axiosServices.post(`${API_URL}/filter`, {
        ...filter,
        start: pageParam,
        length: pageSize,
      });
      const col = res.data.collection;
      return {
        data: (col.data || []) as EventType[],
        draw: col.draw,
        recordsTotal: col.recordsTotal,
        recordsFiltered: col.recordsFiltered,
      } satisfies PaginatedEventResponse;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.flatMap((page) => page.data).length;
      if (loadedCount < lastPage.recordsFiltered) {
        return loadedCount;
      }
      return undefined;
    },
    refetchInterval: 30000,
  });
}

