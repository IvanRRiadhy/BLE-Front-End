import * as React from 'react';
import { AddFloor } from 'src/store/apps/tracking/FloorPlanSlice';
import {
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Divider,
  Grid2 as Grid,
  Fab,
} from '@mui/material';
import { useDispatch } from 'src/store/Store';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { IconCheck } from '@tabler/icons-react';

interface Props {
  colors: any[];
}

const AddFloorplan = ({ colors }: Props) => {
  const dispatch = useDispatch();
  const [open, setOpen] = React.useState(false);
  const [fColor, setFColor] = React.useState<
    'error' | 'primary' | 'inherit' | 'secondary' | 'success' | 'info' | 'warning'
  >('primary');
  const [fName, setFName] = React.useState('');
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const handleClickOpen = () => {
    setFColor('primary');
    setFName('');
    setImage(null);
    setPreview(null);
    setOpen(true);
  };

  const handleClose = () => {
    setFColor('primary');
    setFName('');
    setImage(null);
    setPreview(null);
    setOpen(false);
  };

  const handleSubmit = () => {
    if (image) {
      const reader = new FileReader();
      reader.readAsDataURL(image);
      reader.onloadend = () => {
        dispatch(AddFloor(fName, fColor, reader.result));
        console.log('Floorplan Added!');
      };
    }
    handleClose();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/png')) {
      setImage(file);
      setPreview(URL.createObjectURL(file)); // Preview selected image
    }
  };

  return (
    <>
      <Button variant="contained" disableElevation color="primary" onClick={handleClickOpen}>
        Add Floorplan
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <Typography variant="h5" mb={2} fontWeight={700}>
            Add a New Floorplan
          </Typography>
          <Divider />
          {/* Floorplan Name */}
          <Grid display="flex" alignItems="center" size={12}>
            <CustomFormLabel htmlFor="fp-name" sx={{ mt: 3, mb: 1 }}>
              Floorplan Name
            </CustomFormLabel>
          </Grid>
          <Grid size={12}>
            <CustomTextField
              id="name"
              placeholder="Floorplan Name"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFName(e.target.value)}
              fullWidth
              sx={{ maxWidth: '385px' }}
            />
          </Grid>
          {/* Floorplan Color */}
          <Grid display="flex" alignItems="center" size={12}>
            <CustomFormLabel htmlFor="fp-color">Color</CustomFormLabel>
          </Grid>
          <Grid size={12}>
            {colors.map((color) => (
              <Fab
                color={color.disp}
                sx={{
                  marginRight: '3px',
                  transition: '0.1s ease-in',
                  scale: fColor === color.disp ? '0.9' : '0.7',
                }}
                size="small"
                key={color.disp}
                onClick={() => setFColor(color.disp)}
              >
                {fColor === color.disp ? <IconCheck /> : ''}
              </Fab>
            ))}
          </Grid>
          {/* Floorplan Image */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="fp-image">Floorplan Image</CustomFormLabel>
            <input type="file" accept="image/png" onChange={handleImageChange} />
            {preview && (
              <img
                src={preview}
                alt="Floorplan Preview"
                style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
              />
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            disabled={fName === '' || !fColor || !image}
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

export default AddFloorplan;
