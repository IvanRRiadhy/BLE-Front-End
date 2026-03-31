import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { MaskedAreaLabelType } from 'src/store/apps/crud/maskedArea';
import axiosServices from 'src/utils/axios';
import toast from 'react-hot-toast';



const API_URL = '/api/masked-area-label/';

export function useMaskedAreaLabels() {
    return useQuery ({
        queryKey: ['masked-area-labels'],
        queryFn: async() => {
            const res = await axiosServices.get(API_URL);
            console.log("Masked Area Labels Result: ", res.data);
            return res.data.collection.data as MaskedAreaLabelType[]
        },
        staleTime: 5 * 60_000, // 5 minutes
        gcTime: 10 * 60_000, // 10 minutes
    })
};

export function useCreateMaskedAreaLabel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (labelName: string) => {
            const res = await axiosServices.post(API_URL, { labelName });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['masked-area-labels'] });
        },
    });
};

export function useDeleteMaskedAreaLabel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await axiosServices.delete(`${API_URL}${id}`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['masked-area-labels'] });
        },
    });
};