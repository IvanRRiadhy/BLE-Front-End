import { useEffect } from 'react';
import { useSelector, useDispatch, AppDispatch } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import {
  fetchFloorplans,
  selectFloorPlan,
  SearchFloorplan,
} from '../../../store/apps/tracking/FloorPlanSlice';
import { fetchGates, SetActiveGate } from '../../../store/apps/tracking/GatesSlice';
import { floorplanType } from 'src/types/tracking/floorplan';
import { Box } from '@mui/system';
import { Alert, TextField, Typography } from '@mui/material';
import { gatesType } from 'src/types/tracking/gate';

const FloorList = () => {
  const dispatch: AppDispatch = useDispatch();
  const activeFloorplan = useSelector((state) =>
    state.floorplanReducer2.floorplanContent.toString(),
  );
  const searchTerm = useSelector((state) => state.floorplanReducer2.floorplanSearch);
  const selectedFloorPlan: floorplanType | null = useSelector(
    (state) => state.floorplanReducer2.selectedFloorPlan,
  );
  const gateways: gatesType[] = useSelector((state) => state.gateReducer.gates);

  useEffect(() => {
    dispatch(fetchFloorplans());
    dispatch(fetchGates());
  }, [dispatch]);

  const filterFloors = (floors: floorplanType[], fSearch: string) => {
    //console.log(floors);
    if (fSearch !== '')
      return floors.filter((t: any) =>
        t.name.toLocaleLowerCase().concat(' ').includes(fSearch.toLocaleLowerCase()),
      );
    return floors;
  };
  useEffect(() => {
    if (selectedFloorPlan) {
      const activeGateways = (selectedFloorPlan as floorplanType | null)?.gateways ?? [];
      gateways.forEach((gate) => {
        dispatch(SetActiveGate(gate.id, activeGateways.includes(gate.id)));
      });
    }
  }, [selectedFloorPlan, dispatch]); // Runs when selectedFloorPlan changes

  const floors = useSelector((state) =>
    filterFloors(state.floorplanReducer2.floorplans, state.floorplanReducer2.floorplanSearch),
  );

  const handleOnClick = (id: string) => {
    console.log('id: ', id);
    dispatch(selectFloorPlan(id));
    // console.log('selectedFloorPlan: ', selectedFloorPlan);
    // const activeGateways = (selectedFloorPlan as floorplanType | null)?.gateways ?? [];
    // gateways.map((gate) => {
    //   if (activeGateways.includes(gate.id)) {
    //     dispatch(SetActiveGate(gate.id, true));
    //   } else {
    //     dispatch(SetActiveGate(gate.id, false));
    //   }
    // });
  };

  return (
    <>
      <Box p={3} px={2}>
        <TextField
          id="search"
          value={searchTerm}
          placeholder="Search Floorplan"
          inputProps={{ 'aria-label': 'Search Floorplan' }}
          size="small"
          type="search"
          variant="outlined"
          fullWidth
          onChange={(e) => dispatch(SearchFloorplan(e.target.value))}
        />
        <Typography variant="h6" mb={0} mt={4} pl={1}>
          All Floorplans
        </Typography>
      </Box>
      <Box>
        <Scrollbar
          sx={{ height: { lg: 'calc(100vh - 250px)', sm: '100vh' }, maxHeight: 'fit-content' }}
        >
          {floors && floors.length ? (
            floors.map((floor) => (
              <Box key={floor.id} px={2}>
                <Box
                  p={2}
                  sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    mb: 1,
                    transition: '0.1s ease-in',
                    transform: activeFloorplan === floor.id ? 'scale(1)' : 'scale(0.9)',
                    backgroundColor: `${floor.color}.light`,
                  }}
                  onClick={() => handleOnClick(floor.id)}
                >
                  <Typography variant="h6" noWrap color={floor.color + '.main'}>
                    {floor.name}
                  </Typography>
                </Box>
              </Box>
            ))
          ) : (
            <Box m={2}>
              <Alert severity="error" variant="filled" sx={{ color: 'white' }}>
                No Floors Found!
              </Alert>
            </Box>
          )}
        </Scrollbar>
      </Box>
    </>
  );
};

export default FloorList;
