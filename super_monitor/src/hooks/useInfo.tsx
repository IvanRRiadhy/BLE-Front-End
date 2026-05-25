import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import toast from 'react-hot-toast';

export type FeaturesType ={
    key: string;
    displayName: string;
    description: string;
    isEnabled: boolean;
}

export type AboutDataType = {
    isValid: boolean;
    validationMessage: string;
    licenseType: string;
    licenseTier: string;
    customerName: string;
    applicationName: string;
    applicationCustomName: string;
    applicationCustomDomain: string;
    applicationRegistered: string;
    expirationDate: string;
    daysRemaining: number;
    maxBeacons: number;
    maxReaders: number;
    features: {
        core: Record<string, FeaturesType>;
        modules: Record<string, FeaturesType>;
        subModules?: Record<string, FeaturesType>;
    };
}

export interface ActiveFeaturesType {
    activeFeatures: string[];
}



const API_URL = '/api/license/';

export function useLicenseInfo() {
    return useQuery ({
        queryKey: ['info'],
        queryFn: async() => {
            const res = await axiosServices.get(`${API_URL}info`);
            console.log("Info Result: ", res.data);
            return res.data.collection.data as AboutDataType
        },
    })
};

export function toggleFeatures() {
    const queryClient = useQueryClient();

    return useMutation ({
        mutationFn: async({ featureKey, enabled }: { featureKey: string; enabled: boolean }) => {
            const res = await axiosServices.post(`${API_URL}module/toggle`, { featureKey, enabled });
            console.log("Toggle Result: ", res.data);
            return res.data.collection.data as AboutDataType
        },
        onSuccess: (_data, variables) => {
            toast.success(`Module Feature Turned ${variables.enabled ? 'On' : 'Off'}`);
            queryClient.invalidateQueries({ queryKey: ['info'] });
        },
        onError: () => {
            toast.error("Failed to toggle module feature");
        }
    })
}

export function getMachineId(enabled: boolean = true) {
    return useQuery ({
        queryKey: ['machineId'],
        queryFn: async() => {
            const res = await axiosServices.get(`${API_URL}machine-id`);
            console.log("Machine ID Result: ", res.data);
            return res.data.collection.data.machineId as string
        },
        enabled: enabled,
    })
}

export function activateLicense() {
    const queryClient = useQueryClient();

    return useMutation ({
        mutationFn: async({ file }: { file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await axiosServices.post(`${API_URL}activate`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log("Activate Result: ", res.data);
            return res.data.collection.data as AboutDataType
        },
        onSuccess: () => {
            toast.success("License Activated");
            queryClient.invalidateQueries({ queryKey: ['info'] });
        },
        onError: () => {
            toast.error("Failed to activate license");
        }
    })
}

export function getActiveFeatures(enabled: boolean = true) {
    return useQuery ({
        queryKey: ['activeFeatures'],
        queryFn: async() => {
            const res = await axiosServices.get(`${API_URL}features/active-keys`);
            console.log("Active Features Result: ", res.data);
            return res.data.collection.data as ActiveFeaturesType
        },
        enabled: enabled,
    })
}