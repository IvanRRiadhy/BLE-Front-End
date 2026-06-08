import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';

const API_URL = '/api/TrackingAnalytics/reader-detection/';
// const API_REPORT_URL = '/api/TrackingAnalytics/reader-report/';

export type readerReportFilterType = {
    timeRange: string;
    buildingId: string[];
    floorId: string[];
    floorplanId: string[];
    areaId: string[];
    readerId: string[];
    personType: string;
    from: string | null;
    to: string | null;
}

export const defaultReaderReportFilter: readerReportFilterType = {
    timeRange: 'Daily',
    buildingId: [],
    floorId: [],
    floorplanId: [],
    areaId: [],
    readerId: [],
    personType: 'all',
    from: null,
    to: null
}

export const getReaderReportData = async (reportFilter: readerReportFilterType) => {
    const response = await axiosServices.post(API_URL, reportFilter);
    return response.data;
}

export const useReaderReport = (reportFilter: readerReportFilterType) => {
    return useQuery({
        queryKey: ['readerReport', reportFilter],
        queryFn: () => getReaderReportData(reportFilter),
        placeholderData: keepPreviousData,
    });
}