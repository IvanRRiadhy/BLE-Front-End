import {
  Box,
  Button,
  Checkbox,
  Drawer,
  Grid2 as Grid,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Typography,
} from '@mui/material';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { BuildingType, fetchBuildingDT, fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import AutocompleteFilter from './AutocompleteFilter';
import { setDashboardFilter } from 'src/store/customizer/CustomizerSlice';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
type FilterState = {
  BuildingId: string[];
  FloorId: string[];
  FloorplanId: string[];
  MaskedAreaId: string[];
};
type FilterResult<T> = { data: T[]; empty: boolean };

const DashboardFilter = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const buildingList = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const floorList = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplanList = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const maskedAreaList = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);
  const dashboardFilter = useSelector((state: RootState) => state.customizer.dashboardFilter);
  const [appliedFilter, setAppliedFilter] = useState<FilterState>({
    BuildingId: [],
    FloorId: [],
    FloorplanId: [],
    MaskedAreaId: [],
  });
  const filteredFloors = useMemo(() => {
    return floorList.filter((floor: any) => appliedFilter.BuildingId.includes(floor.buildingId));
  }, [appliedFilter.BuildingId, floorList]);

  const filteredFloorplans = useMemo(() => {
    return floorplanList.filter((fp: any) => appliedFilter.FloorId.includes(fp.floorId));
  }, [appliedFilter.FloorId, floorplanList]);

  const filteredMaskedAreas = useMemo(() => {
    return maskedAreaList.filter((m: any) => appliedFilter.FloorplanId.includes(m.floorplanId));
  }, [appliedFilter.FloorplanId, maskedAreaList]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: string }>,
  ) => {
    // console.log('e.target.name', e.target.name);
    const { name, value } = e.target;
    if (name) {
      setAppliedFilter({ ...appliedFilter, [name]: value });
      //   dispatch(UpdateFilter({ filters: { ...bleReaderFilter.filters, BrandId: value } }));
    }
  };
  useEffect(() => {
    dispatch(fetchBuildings());
    dispatch(fetchFloors());
    dispatch(fetchFloorplan());
    dispatch(fetchMaskedAreas());
  }, [dispatch]);
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

  // const handleApplyFilter = () => {
  //   // Step 1: Derive each level based on the current appliedFilter
  //   // 1. Filter Floors
  //   const floorsResult = filterData(
  //     floorList.filter((floor: floorType) =>
  //       appliedFilter.BuildingId.length === 0
  //         ? true
  //         : appliedFilter.BuildingId.includes(floor.buildingId),
  //     ), // filter by building first
  //     appliedFilter.FloorId,
  //     (f: floorType) => f.id,
  //   );
  //   // floorsResult: { data: floorType[], empty: boolean }

  //   // 2. Filter Floorplans (only from filtered floors)
  //   let floorplansResult: FilterResult<FloorplanType> = { data: [], empty: true };
  //   if (!floorsResult.empty) {
  //     const floorIds = floorsResult.data.map((f: floorType) => f.id);
  //     floorplansResult = filterData(
  //       floorplanList.filter((fp: FloorplanType) => floorIds.includes(fp.floorId)),
  //       appliedFilter.FloorplanId,
  //       (fp: FloorplanType) => fp.id,
  //     );
  //   }
  //   // floorplansResult: { data: FloorplanType[], empty: boolean }

  //   // 3. Filter MaskedAreas (only from filtered floorplans)
  //   let maskedAreasResult: FilterResult<MaskedAreaType> = { data: [], empty: true };
  //   if (!floorplansResult.empty) {
  //     const floorplanIds = floorplansResult.data.map((fp) => fp.id);
  //     maskedAreasResult = filterData(
  //       maskedAreaList.filter((m) => floorplanIds.includes(m.floorplanId)),
  //       appliedFilter.MaskedAreaId,
  //       (m) => m.id,
  //     );
  //   }
  //   // maskedAreasResult: { data: MaskedAreaType[], empty: boolean }

  //   // // Step 2: Update appliedFilter ONCE
  //   // setAppliedFilter((prev) => ({
  //   //   ...prev,
  //   //   floorId: floors.map((f: any) => f.id),
  //   //   floorplanId: floorplans.map((fp: any) => fp.id),
  //   //   maskedAreaId: maskedAreas.map((m: any) => m.id),
  //   // }));
  //   console.log('Filtered Floors:', floorsResult);
  //   console.log('Filtered Floorplans:', floorplansResult);
  //   console.log('Filtered Masked Areas:', maskedAreasResult);
  //   // Step 3: Dispatch the final filter state
  //   dispatch(
  //     setDashboardFilter({
  //       BuildingId: appliedFilter.BuildingId,
  //       FloorId: floorsResult.empty ? ['Empty'] : floorsResult.data.map((f: any) => f.id),
  //       FloorplanId: floorplansResult.empty
  //         ? ['Empty']
  //         : floorplansResult.data.map((fp: any) => fp.id),
  //       FloorplanMaskedAreaId: maskedAreasResult.empty
  //         ? ['Empty']
  //         : maskedAreasResult.data.map((m: any) => m.id),
  //     }),
  //   );
  //   handleClose();
  // };

  const handleApplyFilter = () => {
    // appliedFilter already expanded by AutocompleteFilter
    dispatch(
      setDashboardFilter({
        BuildingId: appliedFilter.BuildingId,
        FloorId: appliedFilter.FloorId.length ? appliedFilter.FloorId : ['Empty'],
        FloorplanId: appliedFilter.FloorplanId.length ? appliedFilter.FloorplanId : ['Empty'],
        FloorplanMaskedAreaId: appliedFilter.MaskedAreaId.length
          ? appliedFilter.MaskedAreaId
          : ['Empty'],
      }),
    );
    setOpen(false);
  };

  // const handleResetFilter = () => {
  //   setAppliedFilter({ BuildingId: [], FloorId: [], FloorplanId: [], MaskedAreaId: [] });
  //   dispatch(
  //     setDashboardFilter({ BuildingId: [], FloorId: [], FloorplanId: [], MaskedAreaId: [] }),
  //   );
  //   handleClose();
  // };

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
        <Typography variant="body2" gutterBottom sx={{ mb: 2 }} color="error.dark">
          *Leave empty to skip filter
        </Typography>
        <Grid container spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <AutocompleteFilter
              buildings={buildingList}
              floors={floorList}
              floorplans={floorplanList}
              maskedAreas={maskedAreaList}
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
