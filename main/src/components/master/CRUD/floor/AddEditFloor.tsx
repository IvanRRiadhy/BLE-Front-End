import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { addFloor, editFloor, fetchFloorDT, fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { fetchBuildings, BuildingType } from 'src/store/apps/crud/building';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';

interface FormType {
  type?: string;
  floor?: floorType;
}

const BASE_URL = 'http://192.168.1.116:5000';

const AddEditFloor = ({ type, floor }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(floor?.floorImage || null);
  const [formData, setFormData] = React.useState({
    id: floor?.id || '',
    buildingId: floor?.buildingId || '',
    name: floor?.name || '',
    floor: floor?.floorImage || '',
    pixelX: floor?.pixelX || 0,
    pixelY: floor?.pixelY || 0,
    floorX: floor?.floorX || 0,
    floorY: floor?.floorY || 0,
    meterPerPx: floor?.meterPerPx || 0,
    engineFloorId: floor?.engineFloorId || 0,
    createdBy: floor?.createdBy || '',
    createdAt: floor?.createdAt || '',
    updatedBy: floor?.updatedBy || '',
    updatedAt: floor?.updatedAt || '',
  });
  const dispatch: AppDispatch = useDispatch();
  const buildingData: BuildingType[] = useSelector(
    (state: RootState) => state.buildingReducer.buildingAll,
  );
    const floorFilter = useSelector((state: RootState) => state.floorReducer.floorFilter);
  React.useEffect(() => {
    dispatch(fetchBuildings());
  }, [dispatch]);

  const handleClickOpen = () => {
    setOpen(true);
    console.log('Floor Data:', formData);
    // console.log('buildingData:', buildingData);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      id: floor?.id || '',
      buildingId: floor?.buildingId || '',
      name: floor?.name || '',
      floor: floor?.floorImage || '',
      pixelX: floor?.pixelX || 0,
      pixelY: floor?.pixelY || 0,
      floorX: floor?.floorX || 0,
      floorY: floor?.floorY || 0,
      meterPerPx: floor?.meterPerPx || 0,
      engineFloorId: floor?.engineFloorId || 0,
      createdBy: floor?.createdBy || '',
      createdAt: floor?.createdAt || '',
      updatedBy: floor?.updatedBy || '',
      updatedAt: floor?.updatedAt || '',
    });
    setImage(null);
    setPreview(floor?.floorImage || null);
    console.log('Form reset to initial state');
  };
  React.useEffect(() => {
    // Only run for edit mode and if floorImage is a string path
    if (type === 'edit' && floor?.floorImage && typeof floor.floorImage === 'string') {
      // Fetch the image from the server
      fetch(`${BASE_URL}${floor.floorImage}`)
        .then((res) => res.blob())
        .then((blob) => {
          // Create a File object from the Blob
          const file = new File([blob], floor.floorImage.split('/').pop() || 'floorplan.jpg', {
            type: blob.type,
          });
          setImage(file);
          // Optionally set preview as well
          setPreview(URL.createObjectURL(file));
        })
        .catch((err) => {
          console.error('Failed to fetch floor image:', err);
        });
    }
    // eslint-disable-next-line
  }, [open]);

  const handleSave = async () => {
    try {
      const data = new FormData();

      // Append non-file fields
      Object.entries(formData).forEach(([key, value]) => {
        if (
          key !== 'floorImage' &&
          key !== 'createdBy' &&
          key !== 'createdAt' &&
          key !== 'updatedBy' &&
          key !== 'updatedAt'
        ) {
          data.append(key, value.toString());
        }
      });

      // Append the file if selected
      if (image) {
        data.append('floorImage', image); // File goes here
        console.log('Image file added to form data:', image);
      }
      console.log('data', JSON.stringify(Object.fromEntries(data.entries())));
      if (type === 'edit') {
        await dispatch(editFloor(data)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addFloor(data));
      }

      await dispatch(fetchFloorDT(floorFilter));
      console.log('Saved!');
      handleClose();
    } catch (error) {
      console.error('Error saving application:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    const key = id || name;

    // Prepare new value for the field being changed
    const newValue = value;

    setFormData((prev) => {
      // Prepare updated values for calculation
      const updated = { ...prev, [key]: newValue };

      // Only recalculate if floorX, floorY, pixelX, and pixelY are available
      let meterPerPx = prev.meterPerPx;
      if (key === 'floorX' || key === 'floorY') {
        const floorX = Number(key === 'floorX' ? newValue : updated.floorX) || 0;
        const floorY = Number(key === 'floorY' ? newValue : updated.floorY) || 0;
        const pixelX = Number(updated.pixelX) || 0;
        const pixelY = Number(updated.pixelY) || 0;
        if (pixelX && pixelY && floorX && floorY) {
          meterPerPx = (floorX / pixelX + floorY / pixelY) / 2;
        }
      }

      return {
        ...updated,
        meterPerPx,
      };
    });
  };
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setImage(file);
        const prepreview = URL.createObjectURL(file);
        console.log(prepreview);
        setPreview(prepreview); // Preview selected image
        console.log(image);
        // Calculate image dimensions
        const img = new window.Image();
        img.onload = () => {
          const pixelX = img.width;
          const pixelY = img.height;
          // Calculate meterPerPx if floorX and floorY are set
          const floorX = Number(formData.floorX) || 0;
          const floorY = Number(formData.floorY) || 0;
          let meterPerPx = 0;
          if (pixelX && pixelY && floorX && floorY) {
            meterPerPx = (floorX / pixelX + floorY / pixelY) / 2;
          }
          setFormData((prev) => ({
            ...prev,
            pixelX,
            pixelY,
            meterPerPx,
          }));
        };
        img.src = prepreview;
      } else {
        alert('Please select a valid image file (PNG, JPG, JPEG)');
      }
    }
  };

  return (
    <>
      {type === 'edit' && (
        <IconButton color="primary" size="small" onClick={handleClickOpen}>
          <IconPencil size={20} />
        </IconButton>
      )}
      {type === 'add' && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<IconPlus size={20} />}
          onClick={handleClickOpen}
        >
          Add Floor
        </Button>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Floor' : 'Edit Floor'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Floor Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="building-id">Building ID</CustomFormLabel>
              <CustomSelect
                name="buildingId"
                id="buildingId"
                value={formData.buildingId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                <MenuItem value="" disabled>
                  Select Building
                </MenuItem>
                {buildingData.map((building) => (
                  <MenuItem key={building.id} value={building.id}>
                    {building.name}
                  </MenuItem>
                ))}
              </CustomSelect>
              <CustomFormLabel htmlFor="floor-name">name</CustomFormLabel>
              <CustomTextField
                id="name"
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="floor-pixelX">Pixel X</CustomFormLabel>
              <CustomTextField
                id="pixelX"
                placeholder={formData.pixelX}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                disabled
              />
              <CustomFormLabel htmlFor="floorX">Floor X</CustomFormLabel>
              <CustomTextField
                id="floorX"
                placeholder={formData.floorX}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                type="number"
                inputProps={{ step: 'any' }}
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="Engine-id">Engine Floor ID</CustomFormLabel>
              <CustomTextField
                id="engineFloorId"
                placeholder={formData.engineFloorId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="m-per-px">Meter Per Pixel</CustomFormLabel>
              <CustomTextField
                id="meterPerPx"
                placeholder={formData.meterPerPx}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                disabled
              />
              <CustomFormLabel htmlFor="floor-pixelY">Pixel Y</CustomFormLabel>
              <CustomTextField
                id="pixelY"
                placeholder={formData.pixelY}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                disabled
              />
              <CustomFormLabel htmlFor="floorY">Floor Y</CustomFormLabel>
              <CustomTextField
                id="floorY"
                placeholder={formData.floorY}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                type="number"
                inputProps={{ step: 'any' }}
              />
            </Grid>
            <Grid size={{ lg: 12, md: 12, sm: 12 }} direction={'column'}>
              <Grid size={12}>
                <CustomFormLabel htmlFor="fp-image">Floorplan Image</CustomFormLabel>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleImageChange}
                />
                {preview && (
                  <img
                    src={preview?.startsWith('blob:') ? preview : `${BASE_URL}${preview}`}
                    alt="Floorplan Preview"
                    style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
                  />
                )}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddEditFloor;
