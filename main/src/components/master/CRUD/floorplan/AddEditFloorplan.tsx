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
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { FloorplanType, fetchFloorplan, addFloorplan, editFloorplan } from 'src/store/apps/crud/floorplan';

interface FormType {
  type?: string;
  floorplan?: FloorplanType;
}

const AddEditFloorplan = ({ type, floorplan }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    id: floorplan?.id || '',
    name: floorplan?.name || '',
    floorId: floorplan?.floorId || '',
    applicationId: floorplan?.applicationId || '78f30f8c-f04e-4792-be1e-b9c10723d27e',
    createdBy: floorplan?.createdBy || '',
    createdAt: floorplan?.createdAt || '',
    updatedBy: floorplan?.updatedBy || '',
    updatedAt: floorplan?.updatedAt || '',
  })
  const dispatch: AppDispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchFloors());
    console.log(formData);
  },[dispatch]);

  const floorData: floorType[] = useSelector((state: RootState) => state.floorReducer.floors);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    console.log(floorData);
  };

const handleSave = async () => {
  try {
    const data = new FormData();
Object.keys(formData).forEach((key: string) => {
  data.append(key, formData[key as keyof typeof formData]);
});


    if (type === 'edit') {
      await dispatch(editFloorplan(data)); // Dispatch update
    }
    if (type === 'add') {
      await dispatch(addFloorplan(data));
    }
    await dispatch(fetchFloorplan());
    console.log('Saved!');
    setOpen(false);
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
    console.log('Input Change:', { id, name, value });
    setFormData((prev) => ({ ...prev, [id || name]: value }));
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
            {type === 'add' ? 'Add Floorplan' : 'Edit Floorplan'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Floorplan Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="floorplan-Name">Floorplan Name</CustomFormLabel>
              <CustomTextField
                id="name"
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
                            <CustomFormLabel htmlFor="floor-id">Floor</CustomFormLabel>
              <CustomSelect
                name="floorId"
                id="floorId"
                value={formData.floorId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                <MenuItem value="" disabled>
                  Select Floor
                </MenuItem>
                {floorData.map((floor) => (
                  <MenuItem key={floor.id} value={floor.id}>
                    {floor.name}
                  </MenuItem>
                ))}
              </CustomSelect>
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

export default AddEditFloorplan;
