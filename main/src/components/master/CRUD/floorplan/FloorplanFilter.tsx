import { Box, Button, Drawer, Grid2 as Grid, MenuItem, Typography } from '@mui/material';
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

  const floorList = useSelector((state: RootState) => state.floorReducer.floors);
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
              value={appliedFilter.FloorId || ''}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            >
              {floorList.map((floor) => (
                <MenuItem key={floor.id} value={floor.id}>
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
