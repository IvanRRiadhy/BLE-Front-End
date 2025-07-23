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
import { useEffect, useMemo, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { BuildingType, fetchBuildingDT, fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import { setDashboardFilter } from 'src/store/customizer/CustomizerSlice';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
type FilterState = {
  BuildingId: string[];
  FloorId: string[];
  FloorplanId: string[];
  MaskedAreaId: string[];
};

const DashboardFilter = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
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

  const handleApplyFilter = () => {
     // Step 1: Derive each level based on the current appliedFilter
     let floors = [];
     let floorplans = [];
     let maskedAreas = [];
     if (appliedFilter.FloorId.length === 0) {
      floors = floorList.filter((floor: any) => appliedFilter.BuildingId.includes(floor.buildingId)) ?? ["none"];
    }
    else {
      floors = floorList.filter((floor: any) => appliedFilter.FloorId.includes(floor.id));
    }
    if(appliedFilter.FloorplanId.length === 0) {
      floorplans = floorplanList.filter((fp: any) => floors.map((f) => f.id).includes(fp.floorId)) ?? ["none"];
    } else {
      floorplans = floorplanList.filter((fp: any) => appliedFilter.FloorplanId.includes(fp.id));    
    }
    if(appliedFilter.MaskedAreaId.length === 0) {
      maskedAreas = maskedAreaList.filter((m: any) => floorplans.map((fp) => fp.id).includes(m.floorplanId)) ?? ["none"];
    } else {
      maskedAreas = maskedAreaList.filter((m: any) => appliedFilter.MaskedAreaId.includes(m.id));
    }

    // Step 2: Update appliedFilter ONCE
    setAppliedFilter((prev) => ({
      ...prev,
      floorId: floors.map((f: any) => f.id) ?? [null],
      floorplanId: floorplans.map((fp: any) => fp.id) ?? [null],
      maskedAreaId: maskedAreas.map((m: any) => m.id) ?? [null],
    }));
    
    console.log('Filtered Floors:', floors);
    console.log('Filtered Floorplans:', floorplans);
    console.log('Filtered Masked Areas:', maskedAreas);
    // Step 3: Dispatch the final filter state
    dispatch(
      setDashboardFilter({
        BuildingId: appliedFilter.BuildingId,
        FloorId: floors.map((f: any) => f.id).length === 0 ? null : floors.map((f: any) => f.id),
        FloorplanId: floorplans.map((fp: any) => fp.id).length === 0 ? null : floorplans.map((fp: any) => fp.id),
        FloorplanMaskedAreaId: maskedAreas.map((m: any) => m.id).length === 0 ? null : maskedAreas.map((m: any) => m.id),
      }),
    );
    handleClose();
  };

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
          {/* Building Filter */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="building">
              <Typography variant="caption">Building(s)</Typography>
            </CustomFormLabel>
            <CustomSelect
              id="BuildingId"
              name="BuildingId"
              value={appliedFilter.BuildingId || []}
              onChange={(e: any) => {
                const value = e.target.value;
                if (value.includes('all')) {
                  setAppliedFilter({
                    ...appliedFilter,
                    BuildingId:
                      appliedFilter.BuildingId.length === buildingList.length
                        ? []
                        : buildingList.map((b: any) => b.id),
                    FloorId: [],
                    FloorplanId: [],
                    MaskedAreaId: [],
                  });
                  return;
                }
                setAppliedFilter({
                  ...appliedFilter,
                  BuildingId: value,
                  FloorId: [],
                  FloorplanId: [],
                  MaskedAreaId: [],
                });

                console.log('Selected Buildings:', value);
                // const isAllSelected = value.includes('all');
                // const newValue = isAllSelected ? buildingList.map((b: any) => b.id) : value;
                // setAppliedFilter({
                //   ...appliedFilter,
                //   buildingId: newValue,
                //   floorId: [],
                //   floorplanId: [],
                //   maskedAreaId: [],
                // });
              }}
              fullWidth
              variant="outlined"
              multiple
              renderValue={(selected: string[]) => {
                if (selected.length === 0) return 'All Building';
                if (selected.length === buildingList.length) return 'All Buildings';
                return selected
                  .map((id: string) => buildingList.find((b: any) => b.id === id)?.name)
                  .join(', ');
              }}
              MenuProps={{ PaperProps: { style: { maxHeight: 200 } } }}
            >
              <MenuItem value="all">
                <ListItemIcon>
                  <Checkbox
                    checked={appliedFilter.BuildingId?.length === buildingList.length}
                    indeterminate={
                      appliedFilter.BuildingId?.length > 0 &&
                      appliedFilter.BuildingId?.length < buildingList.length
                    }
                  />
                </ListItemIcon>
                <ListItemText primary="All Buildings" />
              </MenuItem>
              {buildingList.map((building: BuildingType) => (
                <MenuItem key={building.id} value={building.id}>
                  <ListItemIcon>
                    <Checkbox checked={appliedFilter.BuildingId?.includes(building.id)} />
                  </ListItemIcon>
                  {building.name}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>

          {/* Floor Filter */}
          {appliedFilter.BuildingId?.length > 0 && (
            <Grid size={12}>
              <CustomFormLabel htmlFor="floor">
                <Typography variant="caption">Floor(s)</Typography>
              </CustomFormLabel>
              <CustomSelect
                id="FloorId"
                name="FloorId"
                value={appliedFilter.FloorId || []}
                onChange={(e: any) => {
                  const value = e.target.value;
                  if (value.includes('all')) {
                    setAppliedFilter({
                      ...appliedFilter,
                      FloorId:
                        appliedFilter.FloorId.length === filteredFloors.length
                          ? []
                          : filteredFloors.map((f: any) => f.id),
                      FloorplanId: [],
                      MaskedAreaId: [],
                    });
                    return;
                  }
                  setAppliedFilter({
                    ...appliedFilter,
                    FloorId: value,
                    FloorplanId: [],
                    MaskedAreaId: [],
                  });
                  console.log('Selected Floors:', value);
                  console.log('All Floorplans:', floorplanList);
                  console.log('Filtered Floorplans:', filteredFloorplans);
                }}
                fullWidth
                variant="outlined"
                multiple
                renderValue={(selected: string[]) => {
                  if(selected.length === 0) return 'All Floors';
                  if (selected.length === filteredFloors.length) return 'All Floors';
                  const filtered = filteredFloors.filter((f: any) => selected.includes(f.id));
                  if (selected.length === 0) return 'Select Floor';
                  return filtered.map((f: any) => f.name).join(', ');
                }}
              >
                <MenuItem value="all">
                  <ListItemIcon>
                    <Checkbox
                      checked={
                        appliedFilter.FloorId?.length ===
                        filteredFloors.filter((f: any) =>
                          appliedFilter.BuildingId.includes(f.buildingId),
                        ).length
                      }
                      indeterminate={
                        appliedFilter.FloorId?.length > 0 &&
                        appliedFilter.FloorId?.length <
                          filteredFloors.filter((f: any) =>
                            appliedFilter.BuildingId.includes(f.buildingId),
                          ).length
                      }
                    />
                  </ListItemIcon>
                  <ListItemText primary="All Floors" />
                </MenuItem>
                {filteredFloors.map((floor: floorType) => (
                  <MenuItem key={floor.id} value={floor.id}>
                    <ListItemIcon>
                      <Checkbox checked={appliedFilter.FloorId.includes(floor.id)} />
                    </ListItemIcon>
                    {floor.name}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          )}

          {/* Floorplan Filter */}
          {appliedFilter.FloorId?.length > 0 && (
            <Grid size={12}>
              <CustomFormLabel htmlFor="floorplan">
                <Typography variant="caption">Floorplan(s)</Typography>
              </CustomFormLabel>
              <CustomSelect
                id="FloorplanId"
                name="FloorplanId"
                value={appliedFilter.FloorplanId || []}
                onChange={(e: any) => {
                  const value = e.target.value;
                  const selected = value.includes('all')
                    ? filteredFloorplans
                        .filter((fp: any) => appliedFilter.FloorId.includes(fp.floorId))
                        .map((fp: any) => fp.id)
                    : value;
                  setAppliedFilter({
                    ...appliedFilter,
                    FloorplanId: selected,
                    MaskedAreaId: [],
                  });
                }}
                fullWidth
                variant="outlined"
                multiple
                renderValue={(selected: string[]) => {
                  if(selected.length === 0) return 'All Floorplans';
                  if (selected.length === filteredFloorplans.length) return 'All Floorplans';
                  const filtered = filteredFloorplans.filter((fp: any) => selected.includes(fp.id));
                  if (selected.length === 0) return 'Select Floorplan';
                  return filtered.map((f: any) => f.name).join(', ');
                }}
              >
                <MenuItem value="all">
                  <ListItemIcon>
                    <Checkbox
                      checked={
                        appliedFilter.FloorplanId?.length ===
                        filteredFloorplans.filter((f: FloorplanType) =>
                          appliedFilter.FloorId.includes(f.floorId),
                        ).length
                      }
                      indeterminate={
                        appliedFilter.FloorplanId?.length > 0 &&
                        appliedFilter.FloorplanId?.length <
                          filteredFloorplans.filter((f: FloorplanType) =>
                            appliedFilter.FloorId.includes(f.floorId),
                          ).length
                      }
                    />
                  </ListItemIcon>
                  <ListItemText primary="All Floorplans" />
                </MenuItem>
                {filteredFloorplans.map((fp: any) => (
                  <MenuItem key={fp.id} value={fp.id}>
                    <ListItemIcon>
                      <Checkbox checked={appliedFilter.FloorplanId.includes(fp.id)} />
                    </ListItemIcon>
                    {fp.name}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          )}

          {/* Masked Area Filter */}
          {appliedFilter.FloorplanId?.length > 0 && (
            <Grid size={12}>
              <CustomFormLabel htmlFor="maskedArea">
                <Typography variant="caption">Masked Area(s)</Typography>
              </CustomFormLabel>
              <CustomSelect
                id="MaskedAreaId"
                name="MaskedAreaId"
                value={appliedFilter.MaskedAreaId || []}
                onChange={(e: any) => {
                  const value = e.target.value;
                  const selected = value.includes('all')
                    ? maskedAreaList
                        .filter((m: any) => appliedFilter.FloorplanId.includes(m.floorplanId))
                        .map((m: any) => m.id)
                    : value;
                  setAppliedFilter({
                    ...appliedFilter,
                    MaskedAreaId: selected,
                  });
                }}
                fullWidth
                variant="outlined"
                multiple
                renderValue={(selected: string[]) => {
                  if(selected.length === 0) return 'All Masked Areas';
                  if (selected.length === filteredMaskedAreas.length) return 'All Masked Areas';
                  const filtered = maskedAreaList.filter((m: any) => selected.includes(m.id));
                  if (selected.length === 0) return 'Select Masked Area';
                  return filtered.map((m: any) => m.name).join(', ');
                }}
              >
                <MenuItem value="all">
                  <ListItemIcon>
                    <Checkbox
                      checked={
                        appliedFilter.MaskedAreaId?.length ===
                        filteredMaskedAreas.filter((m: any) =>
                          appliedFilter.FloorplanId.includes(m.floorplanId),
                        ).length
                      }
                      indeterminate={
                        appliedFilter.MaskedAreaId?.length > 0 &&
                        appliedFilter.MaskedAreaId?.length <
                          filteredMaskedAreas.filter((m: any) =>
                            appliedFilter.FloorplanId.includes(m.floorplanId),
                          ).length
                      }
                    />
                  </ListItemIcon>
                  <ListItemText primary="All Masked Areas" />
                </MenuItem>
                {filteredMaskedAreas.map((m: any) => (
                  <MenuItem key={m.id} value={m.id}>
                    <ListItemIcon>
                      <Checkbox checked={appliedFilter.MaskedAreaId.includes(m.id)} />
                    </ListItemIcon>
                    {m.name}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          )}
        </Grid>
        <Box mt={3}>
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
        </Box>
      </Drawer>
    </>
  );
};

export default DashboardFilter;
