import { Box, Button, Checkbox, Drawer, Grid2 as Grid, ListItem, ListItemIcon, ListItemText, MenuItem, Typography } from '@mui/material';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { UpdateFilter } from 'src/store/apps/crud/floorplan';
import { RootState, useDispatch, useSelector } from 'src/store/Store';

const FloorplanFilter = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const floorList = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);
  const [appliedFilter, setAppliedFilter] = useState(floorplanFilter.filters);
  useEffect(() => {
    dispatch(fetchFloors());
    setAppliedFilter(floorplanFilter.filters);
  }, [dispatch]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: string }>,
  ) => {
    const { name, value } = e.target;
    if(value.includes('all')){
      setAppliedFilter((prev) => ({
        ...prev,
        FloorId: appliedFilter.FloorId?.length ? [] : floorList.map((floor) => floor.id),
      }))
      return;
    }
    if (name) {
      setAppliedFilter({ ...appliedFilter, [name]: value });
      //   dispatch(UpdateFilter({ filters: { ...floorplanFilter.filters, FloorId: value } }));
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
          Floorplan Filter
        </Typography>

        <Grid container spacing={3}>
          <Grid size={12}>
            <CustomFormLabel htmlFor="floorId">
              <Typography variant="caption">Floor :</Typography>
            </CustomFormLabel>
            <CustomSelect
              name="FloorId"
              value={appliedFilter.FloorId}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
              multiple
              renderValue={(selected: string[]) => {
                if (selected.length === 0) return 'All Floors';
                return floorList
                  .filter((floor) => selected.includes(floor.id))
                  .map((floor) => floor.name)
                  .join(', ');
              }}
                            MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 200, // Set the maximum height of the dropdown menu
                    width: 100, // Adjust the width of the dropdown menu
                  },
                },
              }}
            >
              <MenuItem value="all">
                <ListItemIcon>
                  <Checkbox 
                  checked={appliedFilter.FloorId?.length === floorList.length} 
                  indeterminate={appliedFilter.FloorId.length > 0 && appliedFilter.FloorId.length < floorList.length}
                  />
                </ListItemIcon>
                <ListItemText primary="All Floors" />
              </MenuItem>
              {floorList.map((floor) => (
                <MenuItem key={floor.id} value={floor.id}>
                  <ListItemIcon>
                    <Checkbox checked={appliedFilter.FloorId?.includes(floor.id)} />
                  </ListItemIcon>
                  {floor.name}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
        </Grid>

        <Box mt={3}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              handleApplyFilter();
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

export default FloorplanFilter;
