import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { RootState, useSelector } from 'src/store/Store';

// -----------------------------------------------------------------------------
// ✅ API URLs
// -----------------------------------------------------------------------------
const API_URL = '/api/AlarmAnalyticsIncident/security-head-dashboard/';

export type  securityViewDashboardFilterType  = {
    timeRange: string | null,
    floorplanMaskedAreaId: string | null,
    operatorName: string | null,
    visitorId: string | null,
    buildingId: string | null,
    floorId: string | null
}

export const useSecurityViewDashboard = (filter: securityViewDashboardFilterType) => {
  return useQuery({
    queryKey: ['securityViewDashboard', filter],
    queryFn: async () =>{
      const res = await axiosServices.post(API_URL, filter);
      return res.data.collection.data
    },
    placeholderData: {},
  })
}