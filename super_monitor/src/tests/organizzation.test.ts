// src/tests/organization.test.ts
import { describe, test, expect, beforeEach, vi } from 'vitest';
import axiosServices from 'src/utils/axios';
import organizationReducer, {
  GetOrganization,
  fetchOrganizations,
  fetchOrganizationDT,
} from 'src/store/apps/crud/organization';
import { configureStore } from '@reduxjs/toolkit';

// 🧩 Mock Axios globally
vi.mock('src/utils/axios');

// ✅ Create a real Redux store with just the slice under test
const makeStore = () =>
  configureStore({
    reducer: {
      organizations: organizationReducer,
    },
  });

// Define reusable mock data
const mockOrganizationList = [
  { id: '1', name: 'Wayne Enterprises' },
  { id: '2', name: 'Arkham Labs' },
];

describe('🧪 Organization Slice - API Query & Reducer Tests', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    vi.resetAllMocks();
  });

  // --------------------------------------------------
  // ✅ Test 1: fetchOrganizations (GET)
  // --------------------------------------------------
  test('fetchOrganizations dispatches GetAllOrganization with API data', async () => {
    (axiosServices.get as any).mockResolvedValueOnce({
      data: {
        collection: {
          data: mockOrganizationList,
        },
      },
    });

    await store.dispatch(fetchOrganizations() as any);

    const state = store.getState().organizations;
    expect(state.organizationAll).toHaveLength(2);
    expect(state.organizationAll[0].name).toBe('Wayne Enterprises');
    expect(axiosServices.get).toHaveBeenCalledWith('/api/MstOrganization/');
  });

  // --------------------------------------------------
  // ✅ Test 2: fetchOrganizationDT (POST)
  // --------------------------------------------------
  test('fetchOrganizationDT calls correct endpoint and updates store', async () => {
    (axiosServices.post as any).mockResolvedValueOnce({
      data: {
        collection: {
          data: [{ id: '99', name: 'Gotham City Power' }],
          recordsTotal: 1,
          recordsFiltered: 1,
        },
      },
    });

    const filter = {
      Draw: 1,
      Start: 0,
      Length: 10,
      SortColumn: 'name',
      SortDir: 'asc' as const,
      SearchValue: '',
    };

    const thunk = fetchOrganizationDT(filter);
    const result = await store.dispatch(thunk as any);

    expect(axiosServices.post).toHaveBeenCalledWith(
      '/api/MstOrganization/filter/',
      filter
    );
    expect(result.payload.recordsTotal).toBe(1);

    const state = store.getState().organizations;
    expect(state.organizationFilteredCount).toBe(1);
  });

  // --------------------------------------------------
  // ✅ Test 3: Reducer logic for GetOrganization
  // --------------------------------------------------
  test('reducer updates state on GetOrganization', () => {
    const initialState = organizationReducer(undefined, { type: 'init' });
    const action = GetOrganization(mockOrganizationList as any);
    const newState = organizationReducer(initialState, action);

    expect(newState.organizations).toHaveLength(2);
    expect(newState.organizations[0].name).toBe('Wayne Enterprises');
  });
});
