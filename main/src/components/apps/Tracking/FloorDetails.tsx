import { Divider, Grid2 as Grid, Typography } from '@mui/material';
import { useSelector, useDispatch, AppDispatch } from 'src/store/Store';
import React, { useEffect, useState } from 'react';

import { fetchFloorplans } from 'src/store/apps/tracking/FloorPlanSlice';
import { floorplanType } from 'src/types/tracking/floorplan';

const FloorDetails = () => {
  const dispatch: AppDispatch = useDispatch();
  const activeFloorplan = useSelector((state) =>
    state.floorplanReducer2.floorplanContent.toString(),
  );
  const [memberCount, setMemberCount] = useState(0);
  const [visitorCount, setVisitorCount] = useState(0);
  const [gatewayCount, setGatewayCount] = useState(0);

  useEffect(() => {
    dispatch(fetchFloorplans());
  }, [dispatch]);

  const filterFloors = (floors: floorplanType[], fSearch: string) => {
    //console.log(floors);
    if (fSearch !== '')
      return floors.filter((t: any) =>
        t.name.toLocaleLowerCase().concat(' ').includes(fSearch.toLocaleLowerCase()),
      );
    return floors;
  };

  const floors = useSelector((state) =>
    filterFloors(state.floorplanReducer2.floorplans, state.floorplanReducer.floorplanSearch),
  );
  const activeFloorData = floors.find((floor) => floor.id === activeFloorplan);

  if (!activeFloorData) {
    return (
      <div>
        <Typography variant="h6" mb={0} mt={5} align="center">
          Please Select a Floor
        </Typography>
      </div>
    );
  }

  return (
    <div>
      <Grid
        container
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: 'relative',
          padding: '16px',
          borderBottom: '1px solid #ddd',
          backgroundColor: '#fff',
          zIndex: 1000,
        }}
      >
        <Typography variant="h6" pl={1}>
          Floor Details
        </Typography>
        <Divider />
        <Grid size={12} alignItems="center" pl={1.5}>
          <Typography variant="body2" color="grey.600" mb={2} mt={3}>
            Member Count: {memberCount}
          </Typography>
          <Typography variant="body2" color="grey.600" mb={2}>
            Visitor Count: {visitorCount}
          </Typography>
          <Typography variant="body2" color="grey.600" mb={2}>
            Gateway Count: {gatewayCount}
          </Typography>
        </Grid>
      </Grid>
    </div>
  );
};

export default FloorDetails;
