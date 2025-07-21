import { Box, Button, Drawer, Grid2 as Grid, MenuItem, Typography } from '@mui/material';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { fetchBuildings } from 'src/store/apps/crud/building';
import { UpdateFilter } from 'src/store/apps/crud/floor';
import { RootState, useDispatch, useSelector } from 'src/store/Store';

const FloorFilter = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const buildingList = useSelector((state: RootState) => state.buildingReducer.buildings);
  const floorFilter = useSelector((state: RootState) => state.floorReducer.floorFilter);
  const [appliedFilter, setAppliedFilter] = useState(floorFilter.filters);
  useEffect(() => {
    dispatch(fetchBuildings());
  }, [dispatch]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: string }>,
  ) => {
    const { name, value } = e.target;
    if (name) {
      setAppliedFilter({ ...appliedFilter, [name]: value });
    //   dispatch(UpdateFilter({ filters: { ...floorFilter.filters, BuildingId: value } }));
    }
  };
      const handleApplyFilter = () => {
        dispatch(UpdateFilter({ filters: appliedFilter }));
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
          Filter
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
          sx={{ my: 4, borderBottom: 5, borderColor: 'primary.main' }}
        >
          Floor Filter
        </Typography>

        <Grid container spacing={3}>
          <Grid size={12}>
            <CustomFormLabel htmlFor="integrationType">
              <Typography variant="caption">Building :</Typography>
            </CustomFormLabel>
            <CustomSelect
              name="BuildingId"
              value={appliedFilter.BuildingId || ''}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            >
              {buildingList.map((building) => (
                <MenuItem key={building.id} value={building.id}>
                  {building.name}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
        </Grid>

        <Box mt={3}>
          <Button variant="contained" fullWidth onClick={() => {
            handleApplyFilter();
            handleClose();
          }}>
            Apply Filter
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default FloorFilter;
