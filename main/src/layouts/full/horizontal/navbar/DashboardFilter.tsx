import { Box, Button, Drawer, Grid2 as Grid, Typography } from '@mui/material';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import AutocompleteFilterNew from './AutocompleteFilterNew';
import { setDashboardFilter } from 'src/store/customizer/CustomizerSlice';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';

type FilterState = {
  BuildingId: string[];
  FloorId: string[];
  FloorplanId: string[];
  MaskedAreaId: string[];
};

const DashboardFilter = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  const handleClose = () => {
    setOpen(false);
  };

  const dashboardFilter = useSelector((state: RootState) => state.customizer.dashboardFilter);

  const [appliedFilter, setAppliedFilter] = useState<FilterState>({
    BuildingId: dashboardFilter?.BuildingId ?? [],
    FloorId: dashboardFilter?.FloorId ?? [],
    FloorplanId: dashboardFilter?.FloorplanId ?? [],
    MaskedAreaId: dashboardFilter?.FloorplanMaskedAreaId ?? [],
  });

  const handleClickOpen = () => {
    console.log('DashboardFilter: Opening and syncing from Redux:', dashboardFilter);
    setAppliedFilter({
      BuildingId: dashboardFilter?.BuildingId ?? [],
      FloorId: dashboardFilter?.FloorId ?? [],
      FloorplanId: dashboardFilter?.FloorplanId ?? [],
      MaskedAreaId: dashboardFilter?.FloorplanMaskedAreaId ?? [],
    });
    setOpen(true);
  };

  const buildingList = useAllBuilding().data || [];
  const floorList = useAllFloors().data || [];
  const floorplanList = useAllFloorplans().data || [];
  const maskedAreaList = useAllMaskedAreas().data || [];

  useEffect(() => {
    console.log('Building List:', buildingList);
  }, [buildingList]);

  const handleApplyFilter = () => {
    const finalFloorIds = appliedFilter.FloorId;
    const finalFloorplanIds = appliedFilter.FloorplanId;

    dispatch(
      setDashboardFilter({
        BuildingId: appliedFilter.BuildingId,
        FloorId: finalFloorIds.length ? finalFloorIds : ['Empty'],
        FloorplanId: finalFloorplanIds.length ? finalFloorplanIds : ['Empty'],
        FloorplanMaskedAreaId: appliedFilter.MaskedAreaId.length
          ? appliedFilter.MaskedAreaId
          : ['Empty'],
      }),
    );

    console.log('Dashboard Filter Set:', {
      BuildingId: appliedFilter.BuildingId,
      FloorId: finalFloorIds,
      FloorplanId: finalFloorplanIds,
      FloorplanMaskedAreaId: appliedFilter.MaskedAreaId,
    });

    setOpen(false);
  };

  const handleResetFilter = () => {
    setAppliedFilter({ BuildingId: [], FloorId: [], FloorplanId: [], MaskedAreaId: [] });
    setResetToken((n) => n + 1);
    dispatch(
      setDashboardFilter({ BuildingId: [], FloorId: [], FloorplanId: [], FloorplanMaskedAreaId: [] }),
    );
    setOpen(false);
  };

  const handleFilterChange = useCallback((f: FilterState) => {
    setAppliedFilter(f);
  }, []);

  return (
    <>
      <Button
        onClick={handleClickOpen}
        size="medium"
        variant="outlined"
        startIcon={<IconAdjustmentsHorizontal />}
        color="info"
        sx={{ height: 36, mx: 2 }}
      >
        <Typography variant="caption" fontSize={'0.7rem'}>
          Filter
        </Typography>
      </Button>
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 400, p: 3 },
        }}
      >
        <Typography
          variant="h5"
          sx={{ mt: 4, mb: 2, borderBottom: 5, borderColor: 'primary.main' }}
        >
          Filter
        </Typography>
        <Grid container spacing={2}>
          <Box sx={{ width: '100%' }}>
            {open && (
              <AutocompleteFilterNew
                buildings={buildingList}
                floors={floorList}
                floorplans={floorplanList}
                maskedAreas={maskedAreaList}
                initial={{
                  BuildingId: dashboardFilter?.BuildingId ?? [],
                  FloorId: dashboardFilter?.FloorId ?? [],
                  FloorplanId: dashboardFilter?.FloorplanId ?? [],
                  MaskedAreaId: dashboardFilter?.FloorplanMaskedAreaId ?? [],
                }}
                onChangeFilter={handleFilterChange}
                resetToken={resetToken}
                returnAll={false}
              />
            )}
          </Box>
        </Grid>
        <Box mt={3}>
          <Grid container justifyContent="space-between">
            <Grid size={3}>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={handleResetFilter}
              >
                Reset
              </Button>
            </Grid>
            <Grid size={6}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleApplyFilter}
              >
                Apply Filter
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Drawer>
    </>
  );
};

export default DashboardFilter;
