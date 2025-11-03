import {
  Box,
  Button,
  Drawer,
  Grid2 as Grid,
  Typography,
} from '@mui/material';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { isEqual } from 'lodash';
import { lazy, useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { UpdateFilter } from 'src/store/apps/crud/floorplan';
import { defaultFloorplanFilter } from 'src/store/apps/defaultForm';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
// import AutocompleteFilter from 'src/layouts/full/horizontal/navbar/AutocompleteFilter';

const AutocompleteFilter = lazy(() => import('src/layouts/full/horizontal/navbar/AutocompleteFilter'));

const FloorplanFilter = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  // --- Redux data ---
  const buildingList = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const floorList = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);

  // --- Local filter state (only FloorId matters for API) ---
  const [appliedFilter, setAppliedFilter] = useState({
    FloorId: floorplanFilter.filters?.FloorId ?? [],
  });

  // --- Locked initial (for stable AutocompleteFilter) ---
  const [lockedInitial, setLockedInitial] = useState<{
    BuildingId: string[];
    FloorId: string[];
    FloorplanId: string[];
    MaskedAreaId: string[];
  } | null>(null);

  // --- Fetch Data ---
  // useEffect(() => {
  //   dispatch(fetchBuildings());
  //   dispatch(fetchFloors());
  // }, [dispatch]);

  // --- Sync filters + lock initial ---
  useEffect(() => {
    const currentFloorIds = floorplanFilter.filters?.FloorId ?? [];
    setAppliedFilter({ FloorId: currentFloorIds });

    if (currentFloorIds.length > 0 && !lockedInitial) {
      // resolve parent buildings for the selected floors
      const buildingIds = Array.from(
        new Set(
          floorList
            .filter((f) => currentFloorIds.includes(f.id))
            .map((f) => f.buildingId),
        ),
      );

      setLockedInitial({
        BuildingId: buildingIds,
        FloorId: currentFloorIds,
        FloorplanId: [],
        MaskedAreaId: [],
      });
    }
  }, [floorplanFilter.filters, lockedInitial, floorList]);

  // --- Drawer controls ---
  const handleClickOpen = () => {
    // freeze snapshot when opening
    const buildingIds = Array.from(
      new Set(
        floorList
          .filter((f) => appliedFilter.FloorId.includes(f.id))
          .map((f) => f.buildingId),
      ),
    );
    setLockedInitial({
      BuildingId: buildingIds,
      FloorId: appliedFilter.FloorId ?? [],
      FloorplanId: [],
      MaskedAreaId: [],
    });
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  // --- Area Change handler (from AutocompleteFilter) ---
const handleAreaChange = (filter: {
  BuildingId: string[];
  FloorId: string[];
  FloorplanId: string[];
  MaskedAreaId: string[];
}) => {
  // Avoid triggering re-renders if same FloorIds
  setAppliedFilter((prev) => {
    const nextFloorIds = filter.FloorId ?? [];
    if (isEqual(prev.FloorId, nextFloorIds)) return prev;
    return { FloorId: nextFloorIds };
  });
};

  // --- Apply & Reset ---
  const handleApplyFilter = () => {
    dispatch(UpdateFilter({ Start: 0, filters: { FloorId: appliedFilter.FloorId ?? [] } }));
    setOpen(false);
  };

  const handleResetFilter = () => {
    setAppliedFilter({ FloorId: [] });
    setLockedInitial(null);
    setResetToken((t) => t + 1);
    dispatch(UpdateFilter({ filters: { FloorId: [] } }));
    setOpen(false);
  };

  return (
    <>
      {/* Filter Button */}
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

      {/* Drawer */}
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
          sx={{ my: 4, borderBottom: 5, borderColor: 'primary.main' }}
        >
          Floorplan Filter
        </Typography>

        <Grid container spacing={3}>
          {/* 🏢 Building + Floor Tree (Display) */}
          <Grid size={12}>
            <CustomFormLabel>
              <Typography variant="caption">Building / Floor :</Typography>
            </CustomFormLabel>

            <AutocompleteFilter
              buildings={buildingList}
              floors={floorList}
              floorplans={[]}       // hide deeper levels
              maskedAreas={[]}      // hide deeper levels
              initial={
                lockedInitial ?? {
                  BuildingId: [],
                  FloorId: appliedFilter.FloorId ?? [],
                  FloorplanId: [],
                  MaskedAreaId: [],
                }
              }
              onChangeFilter={handleAreaChange}
              resetToken={resetToken}
            />
          </Grid>
        </Grid>

        {/* Footer Buttons */}
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
                color="primary"
                fullWidth
                onClick={handleApplyFilter}
                disabled={isEqual(
                  appliedFilter.FloorId,
                  floorplanFilter.filters?.FloorId ?? [],
                )}
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Drawer>
    </>
  );
};

export default FloorplanFilter;
