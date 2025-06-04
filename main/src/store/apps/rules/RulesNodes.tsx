import axios from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from 'src/store/Store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { uniqueId } from 'lodash';
import { deleteArrowsByNode } from './RulesConnectors';

export interface nodeType {
  id: string;
  name: string;
  type: string;
  details: string;
  posX: number;
  posY: number;
  extraDetails: string;
  startNode: boolean;
}

interface StateType {
  nodes: nodeType[];
  selectedNode: string;
}

const initialState: StateType = {
  nodes: [],
  selectedNode: '',
};

export const NodeSlice = createSlice({
  name: 'nodes',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<nodeType[]>) => {
      state.nodes = action.payload;
    },
    setSelectedNode: (state, action: PayloadAction<string>) => {
      state.selectedNode = action.payload;
    },
    AddNode: (state, action: PayloadAction<{ name: string; type: string }>) => {
      const { name, type } = action.payload;
      const newNode: nodeType = {
        id: uniqueId(),
        name,
        type,
        details: `Choose a ${name}`,
        posX: 100,
        posY: 100,
        extraDetails: '',
        startNode: false,
      };
      state.nodes.push(newNode);
    },
    updateNodePosition: (
      state,
      action: PayloadAction<{ id: string; posX: number; posY: number }>,
    ) => {
      const { id, posX, posY } = action.payload;
      const node = state.nodes.find((node) => node.id === id);
      if (node) {
        node.posX = posX;
        node.posY = posY;
      }
    },
    updateNodeDetails: (state, action: PayloadAction<{ id: string; details: string }>) => {
      const { id, details } = action.payload;
      const node = state.nodes.find((node) => node.id === id);
      if (node) {
        node.details = details;
      }
    },

    setStartNode: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      state.nodes.forEach((node) => {
        node.startNode = node.id === nodeId;
      });
    },

    addExtraDetails: (state, action: PayloadAction<{ id: string; extraDetails: string }>) => {
      const { id, extraDetails } = action.payload;
      const node = state.nodes.find((node) => node.id === id);
      if (node) {
        node.extraDetails = extraDetails;
      }
    },
    deleteNode: (state, action: PayloadAction<string>) => {
      state.nodes = state.nodes.filter((node) => node.id !== action.payload);
    },
  },
});

export const {
  setNodes,
  setSelectedNode,
  AddNode,
  updateNodePosition,
  updateNodeDetails,
  addExtraDetails,
  setStartNode,
  deleteNode,
} = NodeSlice.actions;

export const setStartNodeThunk = createAsyncThunk(
  'nodes/setStartNode',
  async (nodeId: string, { dispatch, getState }) => {
    // Clear all connectors going to the node
    dispatch(deleteArrowsByNode(nodeId));
    dispatch(setStartNode(nodeId));
  },
);

export default NodeSlice.reducer;
