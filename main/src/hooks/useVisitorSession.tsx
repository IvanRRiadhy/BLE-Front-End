import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosServices from 'src/utils/axios';
import { VisitorSessionType, GetFilter } from '../store/apps/crud/visitorSession';
import { RootState, useSelector } from 'src/store/Store';

const API_URL = '/api/VisitorSession/';

interface PaginatedResponse<T> {
  data: T[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
}