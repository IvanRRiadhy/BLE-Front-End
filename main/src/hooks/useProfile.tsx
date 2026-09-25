import { useQuery } from '@tanstack/react-query';
import axiosServices, { getAccessToken } from 'src/utils/axios';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  groupId: string;
  groupName: string;
  groupLevel: string;
  isEmailConfirmation: number;
  isIntegration: boolean;
  profilePicture: string | null;
  lastLoginAt: string;
  statusActive: string;
  groupIsHead: boolean;
  canApprovePatrol: boolean | null;
  canAlarmAction: boolean | null;
  canCreateMonitoringConfig: boolean | null;
  canUpdateMonitoringConfig: boolean | null;
  effectiveCanApprovePatrol: boolean;
  effectiveCanAlarmAction: boolean;
  effectiveCanCreateMonitoringConfig: boolean;
  effectiveCanUpdateMonitoringConfig: boolean;
}

export interface ProfileApiResponse {
  success: boolean;
  msg: string;
  collection?: {
    data: UserProfile;
  };
  code: number;
}

export function useProfile() {
  const token = getAccessToken();
  const hasSession = !!localStorage.getItem('levelPriority') || !!localStorage.getItem('username');

  return useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await axiosServices.get<ProfileApiResponse>('/api/Auth/me');
      return res.data?.collection?.data as UserProfile;
    },
    enabled: !!token || hasSession,
    staleTime: 5 * 60 * 1000,
  });
}
