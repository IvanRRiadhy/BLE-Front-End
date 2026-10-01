import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { BuildingType, GetFilter } from '../store/apps/crud/building';
import { RootState, useSelector } from 'src/store/Store';

const Building_API_URL = '/api/MstBuilding/';
const Building_DT_URL = '/api/MstBuilding/filter/';
const Config_URL = '/api/config-exchange/';
const Analytic_URL = '/api/TrackingAnalytics/'

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}

export function useBuildingList(filter: GetFilter) {
    return useQuery({
        queryKey: ['building-list', filter],
        queryFn: async () => {
            const response = await axiosServices.post(Building_DT_URL, filter);
            const collection = response.data.collection;
            return {
                data: collection.data as BuildingType[],
                draw: collection.draw,
                recordsTotal: collection.recordsTotal,
                recordsFiltered: collection.recordsFiltered,
            } satisfies PaginatedResponse<BuildingType>;
        },
        placeholderData: keepPreviousData, // ✅ TanStack v5 way
        staleTime: 5_000, // data dianggap fresh 5 detik
        gcTime: 5 * 60_000, // cache disimpan 5 menit
    });
}

export function useAllBuilding() {
    return useQuery({
        queryKey: ['building-all'],
        queryFn: async () => {
            const response = await axiosServices.get(Building_API_URL);
            // console.log('Building list fetched successfully: ', response.data);
            return response.data.collection.data as BuildingType[];
        },
        placeholderData: [],
    });
}

export function useAddBuilding(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<BuildingType> | FormData) => {
            let res;
            if (payload instanceof FormData) {
                res = await axiosServices.post(Building_API_URL, payload, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                const { id, ...filteredPayload } = payload;
                res = await axiosServices.post(Building_API_URL, filteredPayload);
            }
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['building-list']});
            queryClient.invalidateQueries({queryKey: ['building-all']});
        },
    });
}

export function useEditBuilding(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<BuildingType> | FormData) => {
            let res;
            if (payload instanceof FormData) {
                const id = payload.get('id');
                res = await axiosServices.put(`${Building_API_URL}${id}`, payload, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                const { id, ...filteredPayload } = payload;
                if (!id) throw new Error('Missing building id');
                res = await axiosServices.put(`${Building_API_URL}${id}`, filteredPayload);
            }
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['building-list']});
            queryClient.invalidateQueries({queryKey: ['building-all']});
        },
    });
}

export function useDeleteBuilding(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await axiosServices.delete(`${Building_API_URL}${id}`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['building-list']});
            queryClient.invalidateQueries({queryKey: ['building-all']});
        },
    }); 
}

export function useBuildingStatus(){
    const buildingFilter = useSelector((state: RootState) => state.buildingReducer.buildingFilter);
    const query = useBuildingList(buildingFilter);

    return {
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        hasLoaded: query.isFetched, // ✅ substitusi untuk redux.hasLoaded
        totalCount: query.data?.recordsFiltered || 0,
    }
}

export function useExportBuildingConfig(){
    return useMutation({
        mutationFn: async (building_id: string) => {
            const response = await axiosServices.get(`${Config_URL}export/${building_id}`, {
                responseType: 'blob',
            });
            return response.data;
        }, 
    });
}

export function useImportBuildingConfig(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await axiosServices.post(Config_URL + 'import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // console.log('Building added successfully: ', response.data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['building-list']});
            queryClient.invalidateQueries({queryKey: ['building-all']});
        },
    });
}

export interface LocationArea {
    id: string;
    name: string;
    colorArea?: string;
    restrictedStatus?: string;
    isRestricted?: boolean;
}

export interface LocationFloorplan {
    id: string;
    name: string;
    floorplanImage?: string;
    areas?: LocationArea[];
}

export interface LocationFloor {
    id: string;
    name: string;
    floorplans?: LocationFloorplan[];
}

export interface LocationBuildingNode {
    id: string;
    name: string;
    floors?: LocationFloor[];
}

export function useLocationHierarchy(){
    return useQuery({
        queryKey: ['location-hierarchy'],
        queryFn: async () => {
            const response = await axiosServices.get(`${Analytic_URL}location-hierarchy/`);
            console.log('Location hierarchy fetched successfully: ', response.data);
            return (response.data?.collection?.data?.tree ?? []) as LocationBuildingNode[];
        },
    });
}

export type AreaInvestigationTimeRange = 
    | 'daily'
    | 'yesterday'
    | 'weekly'
    | 'last_week'
    | 'monthly'
    | 'last_month'
    | 'yearly'
    | 'last_year'
    | 'last_7_days'
    | 'last_30_days'
    | 'last_90_days';

export interface AreaInvestigationPayload {
    areaId: string;
    timeRange?: AreaInvestigationTimeRange;
    from?: string | null;
    to?: string | null;
    timezone?: string;
    includeTimeline?: boolean;
    topLoiterers?: number;
    onlyBreaches?: boolean;
}

export interface AreaInvestigationAuthorizedAccessGroup {
    cardAccessId: string;
    accessName: string;
    allowedAreasCount: number;
    isAllAccess: boolean;
}

export interface AreaInvestigationAreaInfo {
    areaId: string;
    areaName: string;
    floorplanId: string;
    floorplanName: string;
    floorplanImage: string;
    floorId: string;
    floorName: string;
    buildingId: string;
    buildingName: string;
    colorArea?: string;
    restrictedStatus?: string;
    isRestricted?: boolean;
    authorizedAccessGroups?: AreaInvestigationAuthorizedAccessGroup[];
}

export interface AreaInvestigationActiveOccupant {
    personId: string;
    personName: string;
    personType: string;
    cardNumber: string;
    enteredAt: string;
    currentDwellMinutes: number;
    currentDwellFormatted: string;
    isAuthorized: boolean;
    faceImage?: string | null;
}

export interface AreaInvestigationLiveState {
    currentOccupancy: number;
    membersCount: number;
    visitorsCount: number;
    securitiesCount: number;
    hasActiveAlarm: boolean;
    activeOccupants: AreaInvestigationActiveOccupant[];
}

export interface AreaInvestigationComplianceSummary {
    complianceScore: number;
    complianceStatus: string;
    totalVisits: number;
    authorizedVisitsCount: number;
    unauthorizedVisitsCount: number;
}

export interface AreaInvestigationUnauthorizedBreach {
    personId: string;
    personName: string;
    personType: string;
    cardNumber: string;
    enteredAt: string;
    exitedAt?: string | null;
    durationMinutes: number;
    durationFormatted: string;
    alarmTriggered: boolean;
    reason: string;
}

export interface AreaInvestigationAlarm {
    alarmId: string;
    category: string;
    areaName: string;
    floorplanName: string;
    floorplanImage: string;
    floorName: string;
    buildingName: string;
    triggeredTime: string;
    status: string;
    alarmColor?: string;
    acknowledgedBy?: string | null;
    acknowledgedTime?: string | null;
    dispatchedTo?: string | null;
    dispatchedTime?: string | null;
    investigatedBy?: string | null;
    investigatedTime?: string | null;
    investigatedResult?: string | null;
    isCarriedOver: boolean;
}

export interface AreaInvestigationIncidentSummary {
    totalIncidents: number;
    activeIncidents: number;
    triggeredInPeriod: number;
    carriedOverIncidents: number;
    alarms: AreaInvestigationAlarm[];
}

export interface AreaInvestigationTrafficDynamics {
    totalUniquePeople: number;
    totalSessions: number;
    averageDwellMinutes: number;
    averageDwellFormatted: string;
    peakHour: string;
    peakOccupancy: number;
}

export interface AreaInvestigationTopLoiterer {
    personId: string;
    personName: string;
    personType: string;
    cardNumber: string;
    totalStayMinutes: number;
    totalStayFormatted: string;
    visitCount: number;
    lastSeenAt: string;
    isAuthorized: boolean;
}

export interface AreaInvestigationData {
    areaInfo: AreaInvestigationAreaInfo;
    liveState: AreaInvestigationLiveState;
    complianceSummary: AreaInvestigationComplianceSummary;
    unauthorizedBreaches: AreaInvestigationUnauthorizedBreach[];
    incidentSummary: AreaInvestigationIncidentSummary;
    trafficDynamics: AreaInvestigationTrafficDynamics;
    topLoiterers: AreaInvestigationTopLoiterer[];
    chronologicalTimeline: any[];
}

export interface AreaInvestigationResponse {
    success: boolean;
    msg: string;
    collection: {
        data: AreaInvestigationData;
    };
    code: number;
}

export function useAreaInvestigation(payload?: AreaInvestigationPayload, enabled: boolean = true) {
    return useQuery({
        queryKey: ['area-investigation', payload],
        queryFn: async () => {
            const body: AreaInvestigationPayload = {
                timeRange: 'daily',
                from: null,
                to: null,
                timezone: 'SE Asia Standard Time',
                includeTimeline: false,
                topLoiterers: 10,
                onlyBreaches: false,
                ...payload,
            } as AreaInvestigationPayload;

            const response = await axiosServices.post<AreaInvestigationResponse>(
                `${Analytic_URL}investigation/area-overview`,
                body    
            );
            return response.data?.collection?.data;
        },
        enabled: enabled && Boolean(payload?.areaId),
    });
}

export function useAreaInvestigationMutation() {
    return useMutation({
        mutationFn: async (payload: AreaInvestigationPayload) => {
            const body: AreaInvestigationPayload = {
                timeRange: 'daily',
                from: null,
                to: null,
                timezone: 'SE Asia Standard Time',
                includeTimeline: false,
                topLoiterers: 10,
                onlyBreaches: false,
                ...payload,
            };

            const response = await axiosServices.post<AreaInvestigationResponse>(
                `${Analytic_URL}investigation/area-overview`,
                body
            );
            return response.data?.collection?.data;
        },
    });
}