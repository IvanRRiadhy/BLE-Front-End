import * as React from 'react';
import { AddGate } from 'src/store/apps/tracking/GatesSlice';
import { UpdateFloorplan } from 'src/store/apps/tracking/FloorPlanSlice';
import {
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Divider,
  Grid2 as Grid,
} from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';

const AddGateway = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = React.useState(false);
  const [gcolor, setGcolor] = React.useState<string>('primary');
  const id = useSelector((state) => state.gateReducer.gates.length + 1);
  const floor = useSelector((state) => state.floorplanReducer.floorplanContent);
  const [name, setName] = React.useState('');
  const [posX, setPosX] = React.useState(0);
  const [posY, setPosY] = React.useState(0);

  const setColor = (e: string) => {
    setGcolor(e);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = () => {
    dispatch(AddGate(name, gcolor, posX, posY, true));
    dispatch(UpdateFloorplan(floor.toString(), 'gateways', id.toString()));
    console.log('Gate Added', id, floor);
    handleClose();
  };

  return (
    <>
      <Button variant="contained" disableElevation color="primary" onClick={handleClickOpen}>
        Add Gateway
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <Typography variant="h5" mb={2} fontWeight={700}>
            Add New Gateway
          </Typography>
          <Divider />
          <Grid display="flex" alignItems="center" size={12}>
            <CustomFormLabel htmlFor="gw-name" sx={{ mt: 3, mb: 1 }}>
              Gateway Name
            </CustomFormLabel>
          </Grid>
          <Grid size={12}>
            <CustomTextField
              id="name"
              placeholder="Gateway Name"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              fullWidth
              sx={{ maxWidth: '385px' }}
            />
          </Grid>
          <Grid container alignItems="center" spacing={1}>
            <Grid size={12}>
              <CustomFormLabel sx={{ mr: 2, mb: 0 }}>Position</CustomFormLabel>
            </Grid>
            <Grid mr={2}>
              {/* X-axis Field */}
              <Typography sx={{ mr: 0 }} align="center">
                X
              </Typography>
              <CustomTextField
                id="posX"
                placeholder="Position on X"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPosX(parseInt(e.target.value))
                }
                sx={{ width: '100%' }} // Adjust width as needed
                fullWidth
              />
            </Grid>
            <Grid>
              {/* Y-axis Field */}
              <Typography sx={{ mr: 0 }} align="center">
                Y
              </Typography>
              <CustomTextField
                id="posY"
                placeholder="Position on Y"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPosY(parseInt(e.target.value))
                }
                sx={{ width: '100%' }} // Adjust width as needed
                fullWidth
              />
            </Grid>
          </Grid>
          <Grid display="flex" alignItems="center" size={12}>
            <CustomFormLabel htmlFor="gw-color">Color</CustomFormLabel>
          </Grid>
          <Grid size={12}>
            <CustomTextField
              id="color"
              placeholder="Gateway Color"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
              fullWidth
              sx={{ maxWidth: '385px' }}
            />
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            disabled={name === '' || posX === 0 || posY === 0 || gcolor === ''}
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            variant="contained"
            color="primary"
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddGateway;
