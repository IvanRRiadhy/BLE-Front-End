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

const LICENSE_STORAGE_KEY = 'app_license_info';

export function getCachedLicenseInfo(): AboutDataType | null {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedLicenseInfo(data: AboutDataType) {
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save license info to localStorage', e);
  }
}

export function clearCachedLicenseInfo() {
  try {
    localStorage.removeItem(LICENSE_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to remove license info from localStorage', e);
  }
}

export function useLicenseInfo() {
    return useQuery ({
        queryKey: ['info'],
        queryFn: async() => {
            const res = await axiosServices.get(`${API_URL}info`);
            console.log("Info Result: ", res.data);
            const data = res.data.collection.data as AboutDataType;
            setCachedLicenseInfo(data);
            return data;
        },
        initialData: () => getCachedLicenseInfo() ?? undefined,
        enabled: !getCachedLicenseInfo(),
    })
};

export function toggleFeatures() {
    const queryClient = useQueryClient();

    return useMutation ({
        mutationFn: async({ featureKey, enabled }: { featureKey: string; enabled: boolean }) => {
            const res = await axiosServices.post(`${API_URL}module/toggle`, { featureKey, enabled });
            console.log("Toggle Result: ", res.data);
            const data = res.data.collection.data as AboutDataType;
            setCachedLicenseInfo(data);
            return data;
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
            const data = res.data.collection.data as AboutDataType;
            setCachedLicenseInfo(data);
            return data;
        },
        onSuccess: () => {
            toast.success("License Activated");
            queryClient.invalidateQueries({ queryKey: ['info'] });
            queryClient.invalidateQueries({ queryKey: ['activeFeatures'] });
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