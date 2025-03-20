import { useEffect } from 'react';
import { useSelector, useDispatch, AppDispatch } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { fetchGates, SelectGate } from '../../../store/apps/tracking/GatesSlice';
import { gatesType } from 'src/types/tracking/gate';
import { Box } from '@mui/system';
import { Alert, TextField, Typography } from '@mui/material';

const GatewayList = () => {
  const dispatch: AppDispatch = useDispatch();
  const activeGateway = useSelector((state) => state.gateReducer.gateContent.toString());

  const filterGates = (gates: gatesType[], gSearch: string) => {
    if (gSearch !== '')
      return gates.filter(
        (t: any) =>
          t.isActive && t.id.toLocaleLowerCase().concat(' ').includes(gSearch.toLocaleLowerCase()),
      );
    return gates.filter((t) => t.isActive);
  };

  const gateways = useSelector((state) =>
    filterGates(state.gateReducer.gates, state.gateReducer.gateSearch),
  );
};
