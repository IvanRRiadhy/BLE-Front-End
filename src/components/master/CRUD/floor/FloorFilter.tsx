import {
  Box,
  Button,
  Drawer,
  Grid2 as Grid,
  Typography,
} from '@mui/material';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { isEqual } from 'lodash';
import { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { fetchBuildings } from 'src/store/apps/crud/building';
import { UpdateFilter } from 'src/store/apps/crud/floor';
import { defaultFloorFilter } from 'src/store/apps/defaultForm';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import AutocompleteFilter from 'src/layouts/full/horizontal/navbar/AutocompleteFilter';

const FloorFilter = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  const buildingList = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const floorFilter = useSelector((state: RootState) => state.floorReducer.floorFilter);

  // Local copy of filters
  const [appliedFilter, setAppliedFilter] = useState(floorFilter.filters);

  // --- stable lockedInitial (to prevent clearing) ---
  const [lockedInitial, setLockedInitial] = useState<{
    BuildingId: string[];
    FloorId: string[];
    FloorplanId: string[];
    MaskedAreaId: string[];
  } | null>(null);

  // --- Fetch + Sync ---
  useEffect(() => {
    dispatch(fetchBuildings());
  }, [dispatch]);

  useEffect(() => {
    setAppliedFilter(floorFilter.filters);

    // Lock the first non-empty filter for AutocompleteFilter
    if (
      floorFilter.filters?.BuildingId?.length > 0 &&
      !lockedInitial
    ) {
      setLockedInitial({
        BuildingId: floorFilter.filters.BuildingId ?? [],
        FloorId: [],
        FloorplanId: [],
        MaskedAreaId: [],
      });
    }
  }, [floorFilter.filters, lockedInitial]);

  // --- Drawer Controls ---
  const handleClickOpen = () => {
    // Lock snapshot when opening (even if empty)
    setLockedInitial({
      BuildingId: appliedFilter.BuildingId ?? [],
      FloorId: [],
      FloorplanId: [],
      MaskedAreaId: [],
    });
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  // --- Building change handler ---
  const handleBuildingChange = (filter: {
    BuildingId: string[];
    FloorId: string[];
    FloorplanId: string[];
    MaskedAreaId: string[];
  }) => {
    setAppliedFilter((prev: typeof appliedFilter) => ({
      ...prev,
      BuildingId: filter.BuildingId ?? [],
    }));
  };

  // --- Apply & Reset ---
  const handleApplyFilter = () => {
    dispatch(UpdateFilter({Start: 0, filters: appliedFilter }));
    setOpen(false);
  };

  const handleResetFilter = () => {
    setAppliedFilter(defaultFloorFilter.filters);
    setLockedInitial(null);
    setResetToken((t) => t + 1);
    dispatch(UpdateFilter({ filters: defaultFloorFilter.filters }));
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
          Floor Filter
        </Typography>

        <Grid container spacing={3}>
          {/* 🏢 Building Filter (AutocompleteFilter) */}
          <Grid size={12}>
            <CustomFormLabel>
              <Typography variant="caption">Building :</Typography>
            </CustomFormLabel>

            <AutocompleteFilter
              buildings={buildingList}
              floors={[]}                // disable deeper levels
              floorplans={[]}
              maskedAreas={[]}
              initial={lockedInitial ?? {
                BuildingId: appliedFilter.BuildingId ?? [],
                FloorId: [],
                FloorplanId: [],
                MaskedAreaId: [],
              }}
              onChangeFilter={handleBuildingChange}
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
                disabled={isEqual(appliedFilter, floorFilter.filters)}
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

export default FloorFilter;
