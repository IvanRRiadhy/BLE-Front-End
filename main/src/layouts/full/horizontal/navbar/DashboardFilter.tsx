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
import { RootState, useDispatch, useSelector } from 'src/store/Store';
type FilterState = {
  buildingId: string[];
  floorId: string[];
  floorplanId: string[];
  maskedAreaId: string[];
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
    buildingId: [],
    floorId: [],
    floorplanId: [],
    maskedAreaId: [],
  });
  const filteredFloors = useMemo(() => {
    return floorList.filter((floor: any) => appliedFilter.buildingId.includes(floor.buildingId));
  }, [appliedFilter.buildingId, floorList]);

  const filteredFloorplans = useMemo(() => {
    return floorplanList.filter((fp: any) => appliedFilter.floorId.includes(fp.floorId));
  }, [appliedFilter.floorId, floorplanList]);

  const filteredMaskedAreas = useMemo(() => {
    return maskedAreaList.filter((m: any) => appliedFilter.floorplanId.includes(m.floorplanId));
  }, [appliedFilter.floorplanId, maskedAreaList]);

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
        <Typography variant="body2" gutterBottom sx={{ mb: 2 }} color='error.dark'>
          *Leave empty to skip filter
        </Typography>
        <Grid container spacing={2}>
          {/* Building Filter */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="building">
              <Typography variant="caption">Building(s)</Typography>
            </CustomFormLabel>
            <CustomSelect
              name="buildingId"
              value={appliedFilter.buildingId || []}
              onChange={(e: any) => {
                const value = e.target.value;
                if (value.includes('all')) {
                  setAppliedFilter({
                    ...appliedFilter,
                    buildingId:
                      appliedFilter.buildingId.length === buildingList.length
                        ? []
                        : buildingList.map((b: any) => b.id),
                    floorId: [],
                    floorplanId: [],
                    maskedAreaId: [],
                  });
                  return;
                }
                setAppliedFilter({
                  ...appliedFilter,
                  buildingId: value,
                  floorId: [],
                  floorplanId: [],
                  maskedAreaId: [],
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
                if (selected.length === 0) return 'Select Building';
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
                    checked={appliedFilter.buildingId?.length === buildingList.length}
                    indeterminate={
                      appliedFilter.buildingId?.length > 0 &&
                      appliedFilter.buildingId?.length < buildingList.length
                    }
                  />
                </ListItemIcon>
                <ListItemText primary="All Buildings" />
              </MenuItem>
              {buildingList.map((building: BuildingType) => (
                <MenuItem key={building.id} value={building.id}>
                  <ListItemIcon>
                    <Checkbox checked={appliedFilter.buildingId?.includes(building.id)} />
                  </ListItemIcon>
                  {building.name}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>

          {/* Floor Filter */}
          {appliedFilter.buildingId?.length > 0 && (
            <Grid size={12}>
              <CustomFormLabel htmlFor="floor">
                <Typography variant="caption">Floor(s)</Typography>
              </CustomFormLabel>
              <CustomSelect
                name="floorId"
                value={appliedFilter.floorId || []}
                onChange={(e: any) => {
                  const value = e.target.value;
                  if (value.includes('all')) {
                    setAppliedFilter({
                      ...appliedFilter,
                      floorId:
                        appliedFilter.floorId.length === filteredFloors.length
                          ? []
                          : filteredFloors.map((f: any) => f.id),
                      floorplanId: [],
                      maskedAreaId: [],
                    });
                    return;
                  }
                  setAppliedFilter({
                    ...appliedFilter,
                    floorId: value,
                    floorplanId: [],
                    maskedAreaId: [],
                  });
                  console.log('Selected Floors:', value);
                  console.log('All Floorplans:', floorplanList);
                  console.log('Filtered Floorplans:', filteredFloorplans);
                }}
                fullWidth
                variant="outlined"
                multiple
                renderValue={(selected: string[]) => {
                  const filtered = filteredFloors.filter((f: any) => selected.includes(f.id));
                  if (selected.length === 0) return 'Select Floor';
                  return filtered.map((f: any) => f.name).join(', ');
                }}
              >
                <MenuItem value="all">
                  <ListItemIcon>
                    <Checkbox
                      checked={
                        appliedFilter.floorId?.length ===
                        filteredFloors.filter((f: any) =>
                          appliedFilter.buildingId.includes(f.buildingId),
                        ).length
                      }
                      indeterminate={
                        appliedFilter.floorId?.length > 0 &&
                        appliedFilter.floorId?.length <
                          filteredFloors.filter((f: any) =>
                            appliedFilter.buildingId.includes(f.buildingId),
                          ).length
                      }
                    />
                  </ListItemIcon>
                  <ListItemText primary="All Floors" />
                </MenuItem>
                {filteredFloors.map((floor: floorType) => (
                  <MenuItem key={floor.id} value={floor.id}>
                    <ListItemIcon>
                      <Checkbox checked={appliedFilter.floorId.includes(floor.id)} />
                    </ListItemIcon>
                    {floor.name}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          )}

          {/* Floorplan Filter */}
          {appliedFilter.floorId?.length > 0 && (
            <Grid size={12}>
              <CustomFormLabel htmlFor="floorplan">
                <Typography variant="caption">Floorplan(s)</Typography>
              </CustomFormLabel>
              <CustomSelect
                name="floorplanId"
                value={appliedFilter.floorplanId || []}
                onChange={(e: any) => {
                  const value = e.target.value;
                  const selected = value.includes('all')
                    ? filteredFloorplans
                        .filter((fp: any) => appliedFilter.floorId.includes(fp.floorId))
                        .map((fp: any) => fp.id)
                    : value;
                  setAppliedFilter({
                    ...appliedFilter,
                    floorplanId: selected,
                    maskedAreaId: [],
                  });
                }}
                fullWidth
                variant="outlined"
                multiple
                renderValue={(selected: string[]) => {
                  const filtered = filteredFloorplans.filter((fp: any) => selected.includes(fp.id));
                  if (selected.length === 0) return 'Select Floorplan';
                  return filtered.map((f: any) => f.name).join(', ');
                }}
              >
                <MenuItem value="all">
                  <ListItemIcon>
                    <Checkbox
                      checked={
                        appliedFilter.floorplanId?.length ===
                        filteredFloorplans.filter((f: FloorplanType) =>
                          appliedFilter.floorId.includes(f.floorId),
                        ).length
                      }
                      indeterminate={
                        appliedFilter.floorplanId?.length > 0 &&
                        appliedFilter.floorplanId?.length <
                          filteredFloorplans.filter((f: FloorplanType) =>
                            appliedFilter.floorId.includes(f.floorId),
                          ).length
                      }
                    />
                  </ListItemIcon>
                  <ListItemText primary="All Floorplans" />
                </MenuItem>
                {filteredFloorplans.map((fp: any) => (
                  <MenuItem key={fp.id} value={fp.id}>
                    <ListItemIcon>
                      <Checkbox checked={appliedFilter.floorplanId.includes(fp.id)} />
                    </ListItemIcon>
                    {fp.name}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          )}

          {/* Masked Area Filter */}
          {appliedFilter.floorplanId?.length > 0 && (
            <Grid size={12}>
              <CustomFormLabel htmlFor="maskedArea">
                <Typography variant="caption">Masked Area(s)</Typography>
              </CustomFormLabel>
              <CustomSelect
                name="maskedAreaId"
                value={appliedFilter.maskedAreaId || []}
                onChange={(e: any) => {
                  const value = e.target.value;
                  const selected = value.includes('all')
                    ? maskedAreaList
                        .filter((m: any) => appliedFilter.floorplanId.includes(m.floorplanId))
                        .map((m: any) => m.id)
                    : value;
                  setAppliedFilter({
                    ...appliedFilter,
                    maskedAreaId: selected,
                  });
                }}
                fullWidth
                variant="outlined"
                multiple
                renderValue={(selected: string[]) => {
                  const filtered = maskedAreaList.filter((m: any) => selected.includes(m.id));
                  if (selected.length === 0) return 'Select Masked Area';
                  return filtered.map((m: any) => m.name).join(', ');
                }}
              >
                <MenuItem value="all">
                  <ListItemIcon>
                    <Checkbox
                      checked={
                        appliedFilter.maskedAreaId?.length ===
                        filteredMaskedAreas.filter((m: any) =>
                          appliedFilter.floorplanId.includes(m.floorplanId),
                        ).length
                      }
                      indeterminate={
                        appliedFilter.maskedAreaId?.length > 0 &&
                        appliedFilter.maskedAreaId?.length <
                          filteredMaskedAreas.filter((m: any) =>
                            appliedFilter.floorplanId.includes(m.floorplanId),
                          ).length
                      }
                    />
                  </ListItemIcon>
                  <ListItemText primary="All Masked Areas" />
                </MenuItem>
                {filteredMaskedAreas.map((m: any) => (
                  <MenuItem key={m.id} value={m.id}>
                    <ListItemIcon>
                      <Checkbox checked={appliedFilter.maskedAreaId.includes(m.id)} />
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
              handleClose();
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
