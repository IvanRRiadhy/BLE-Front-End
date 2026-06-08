import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';
import { CardHistoryType, CardUsageType, GetFilter } from 'src/store/apps/crud/cardRecord';

const API_URL = '/api/CardRecord';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useCardUsage() {
    return useQuery({
        queryKey: ['card-usage'],
        queryFn: async () => {
            const response = await axiosServices.get(`${API_URL}/usage`);
            console.log('Card Usage Data fetched: ', response.data);
            return response.data.collection.data as CardUsageType[];
        },
        placeholderData: [],
    });
};

export function useCardHistory(cardId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['card-history', cardId],
        queryFn: async () => {
            const response = await axiosServices.post(`${API_URL}/history`, {
                    cardId: cardId,
            });
            console.log("Card History: ", response.data.collection.data);
            return response.data.collection.data as CardHistoryType[];
        },
        enabled: options?.enabled ?? true,
        placeholderData: [],
    });
};