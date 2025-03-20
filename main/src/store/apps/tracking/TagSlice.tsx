import axios from '../../../utils/axios';
import { createSlice, current } from '@reduxjs/toolkit';
import { AppDispatch } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { isEdit } from '../contacts/ContactSlice';
import { setVisibilityFilter } from '../email/EmailSlice';

const API_URL = 'api/data/tracking/TagData';

interface StateType {
  tags: any[];
  tagContent: number;
  tagSearch: string;
  editTag: boolean;
  currentFilter: string;
}

const initialState = {
  tags: [],
  tagContent: 1,
  tagSearch: '',
  editTag: false,
  currentFilter: 'show_all',
};

export const TagSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    getTag: (state: StateType, action) => {
      state.tags = action.payload;
    },

    searchTag: (state: StateType, action) => {
      state.tagSearch = action.payload;
    },

    selectTag: (state: StateType, action) => {
      state.tagContent = action.payload;
    },

    toggleEdit: (state: StateType) => {
      state.editTag = !state.editTag;
    },
    setTagVisibilityFilter: (state: StateType, action) => {
      state.currentFilter = action.payload;
    },
  },
});

export const { getTag, searchTag, selectTag, toggleEdit, setTagVisibilityFilter } =
  TagSlice.actions;

export const fetchTag = () => async (dispatch: AppDispatch) => {
  try {
    const response = await axios.get(`${API_URL}`);
    dispatch(getTag(response.data));
  } catch (err: any) {
    throw new Error(err);
  }
};

export default TagSlice.reducer;
