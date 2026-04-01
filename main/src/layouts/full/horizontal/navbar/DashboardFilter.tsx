import { Box, Button, Drawer, Grid2 as Grid, Typography } from '@mui/material';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import AutocompleteFilter from './AutocompleteFilter';
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

  const handleClickOpen = () => {
    console.log('Dashboard Filter: ', dashboardFilter);
    console.log('Filter: ', appliedFilter);
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const buildingList = useAllBuilding().data || [];
  const floorList = useAllFloors().data || [];
  const floorplanList = useAllFloorplans().data || [];
  const maskedAreaList = useAllMaskedAreas().data || [];
  const dashboardFilter = useSelector((state: RootState) => state.customizer.dashboardFilter);
  const [appliedFilter, setAppliedFilter] = useState<FilterState>({
    BuildingId: dashboardFilter?.BuildingId ?? [],
    FloorId: dashboardFilter?.FloorId ?? [],
    FloorplanId: dashboardFilter?.FloorplanId ?? [],
    MaskedAreaId: dashboardFilter?.FloorplanMaskedAreaId ?? [],
  });
  // useEffect(() => {
  //   dispatch(fetchBuildings());
  //   dispatch(fetchFloors());
  //   dispatch(fetchFloorplan());
  //   // // dispatch(fetchMaskedAreas());
  // }, [dispatch]);
  useEffect(() => {
    console.log('Building List:', buildingList);
  }, [buildingList]);
  useEffect(() => {
    console.log('Floor List:', floorList);
  }, [floorList]);
  useEffect(() => {
    console.log('Floorplan List:', floorplanList);
  }, [floorplanList]);
  useEffect(() => {
    console.log('Masked Area List:', maskedAreaList);
  }, [maskedAreaList]);

  function filterData<T>(
    list: T[],
    filterIds: string[],
    getId: (item: T) => string,
  ): { data: T[]; empty: boolean } {
    let data: T[];
    if (filterIds.length === 0) {
      data = list;
    } else {
      data = list.filter((item) => filterIds.includes(getId(item)));
    }
    return { data, empty: data.length === 0 };
  }
  const handleApplyFilter = () => {
    let finalFloorIds: string[] = [];
    let finalFloorplanIds: string[] = [];

    // 🧠 If there are masked areas selected, collect their parent floor/floorplan
    if (appliedFilter.MaskedAreaId.length > 0) {
      for (const maId of appliedFilter.MaskedAreaId) {
        const ma = maskedAreaList.find((m: any) => m.id === maId);
        if (ma) {
          const fpId = ma.floorplanId;
          if (fpId && !finalFloorplanIds.includes(fpId)) finalFloorplanIds.push(fpId);

          // Prefer ma.floorId, fallback to floorplan.floorId
          let fId = ma.floorId;
          if (!fId) {
            const fp = floorplanList.find((f: any) => f.id === fpId);
            fId = fp?.floorId ?? '';
          }
          if (fId && !finalFloorIds.includes(fId)) finalFloorIds.push(fId);
        }
      }
    } else {
      // 🧩 If no MaskedArea is selected, use the existing ones or empty
      finalFloorIds = appliedFilter.FloorId;
      finalFloorplanIds = appliedFilter.FloorplanId;
    }

    // 🧩 Send to Redux with the updated floor/floorplan sets
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
    setResetToken((n) => n + 1); // tell Autocomplete to clear selection
    dispatch(
      setDashboardFilter({ BuildingId: [], FloorId: [], FloorplanId: [], MaskedAreaId: [] }),
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
          Filter by Area
        </Typography>
      </Button>
      {/* Right-side sliding Drawer (non-modal) */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 320,
            padding: 3,
            backgroundColor: 'background.paper',
          },
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ mt: 4, mb: 2, borderBottom: 5, borderColor: 'primary.main' }}
        >
          Filter
        </Typography>
        <Grid container spacing={2}>
          <Box sx={{ width: '100%' }}>
            <AutocompleteFilter
              buildings={buildingList}
              floors={floorList}
              floorplans={floorplanList}
              maskedAreas={maskedAreaList}
              initial={appliedFilter}
              onChangeFilter={handleFilterChange}
              resetToken={resetToken}
            />
          </Box>
        </Grid>
        <Box mt={3}>
          <Grid container justifyContent="space-between">
            <Grid size={3}>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => {
                  handleResetFilter();
                }}
                // disabled={isEqual(appliedFilter, defaultFloorFilter.filters)}
              >
                Reset
              </Button>
            </Grid>
            <Grid size={6}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  //   handleApplyFilter();
                  console.log('Applied Filters:', appliedFilter);
                  handleApplyFilter();
                }}
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
