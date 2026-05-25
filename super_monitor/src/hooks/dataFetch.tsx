import { useQuery} from '@tanstack/react-query';
import {
    MonitoringSiteData,
    SiteBuilding,
    SiteBuildingData,
    SiteFloor,
    SiteFloorData,
    SiteFloorplan,
    SiteFloorplanData,
    SiteArea,
    SiteAreaData,
    Device,
    DeviceData,
} from 'src/types/apps/monitoring';
import axiosServices from 'src/utils/axios';


export function useMonitoring() {
    return useQuery({
        queryKey: ['Monitoring'],
        queryFn: async () => {
            const response = await axiosServices.get('/api/Monitoring/aggregate');
            // console.log('Monitoring data fetched successfully: ', response.data);
            return response.data.collection.data as MonitoringSiteData[];
        },
        placeholderData: [],
    });
}

export function useAllBuilding() {
    return useQuery({
        queryKey: ['building-all'],
        queryFn: async () => {
            const response = await axiosServices.get('/api/building');
            const data = response.data.collection.data as SiteBuildingData[];
            return data.flatMap(site =>
                (site.buildings || []).map(building => ({
                    ...building,
                    siteId: site.siteId,
                    siteName: site.siteName,
                }))
            ) as SiteBuilding[];
        },
        placeholderData: [],
    });
}

export function useAllFloor() {
    return useQuery({
        queryKey: ['floor-all'],
        queryFn: async () => {
            const response = await axiosServices.get('/api/floor');
            const data = response.data.collection.data as SiteFloorData[];
            return data.flatMap(site =>
                (site.floors || []).map(floor => ({
                    ...floor,
                    siteId: site.siteId,
                    siteName: site.siteName,
                }))
            ) as SiteFloor[];
        },
        placeholderData: [],
    });
}

export function useAllFloorplan() {
    return useQuery({
        queryKey: ['floorplan-all'],
        queryFn: async () => {
            const response = await axiosServices.get('/api/floorplan');
            const data = response.data.collection.data as SiteFloorplanData[];

            return data.flatMap(site =>
                (site.floorplans || []).map(floorplan => ({
                    ...floorplan,
                    // floorplanImage: `${site.baseUrl}${floorplan.floorplanImage}`,
                    siteId: site.siteId,
                    siteName: site.siteName,
                }))
            ) as SiteFloorplan[];
        },
        placeholderData: [],
    });
}

export function useAllArea() {
    return useQuery({
        queryKey: ['area-all'],
        queryFn: async () => {
            const response = await axiosServices.get('/api/area');
            const data = response.data.collection.data as SiteAreaData[];
            console.log('Data area: ', data)
            return data.flatMap(site =>
                (site.maskedAreas || site.areas || []).map(area => ({
                    ...area,
                    siteId: site.siteId,
                    siteName: site.siteName,
                }))
            ) as SiteArea[];
        },
        placeholderData: [],
    });

}

export function useAllDevice() {
    return useQuery({
        queryKey: ['device-all'],
        queryFn: async () => {
            const response = await axiosServices.get('/api/device');
            const data = response.data.collection.data as DeviceData[];
            return data.flatMap(site =>
                (site.floorplanDevices || []).map(device => ({
                    ...device,
                    siteId: site.siteId,
                    siteName: site.siteName,
                }))
            ) as Device[];
        },
        placeholderData: [],
    });
}

export function useLatestPosition() {
  return useQuery({
    queryKey: ['latest-position'],
    queryFn: async () => {
      const res = await axiosServices.get(`/api/tracking-analytics/latest-position`);
      // console.log('Latest Position Data fetched: ', res.data);
      return res.data.collection.data;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });
}