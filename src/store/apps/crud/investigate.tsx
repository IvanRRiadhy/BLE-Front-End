import axiosServices from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { dispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ensureMinLatency, retryUntilSuccess } from 'src/utils/retry';



interface StateType {
    activeMode: 'visitor' | 'alarm' | 'area';
}

const initialState: StateType = {
    activeMode: 'visitor',
};

export const InvestigateSlice = createSlice({
    name: 'investigate',
    initialState,
    reducers: {
        setActiveMode: (state, action: PayloadAction<'visitor' | 'alarm' | 'area'>) => {
            state.activeMode = action.payload;
        },
    },
});

export const { setActiveMode } = InvestigateSlice.actions;

export default InvestigateSlice.reducer;