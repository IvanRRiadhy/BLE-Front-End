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
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  blacklistType,
  addBlacklist,
  editBlacklist,
  fetchBlacklist,
} from 'src/store/apps/crud/blacklist';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import { fetchVisitor, visitorType } from 'src/store/apps/crud/visitor';

interface FormType {
  type?: string;
  blacklist?: blacklistType;
}

const AddEditBlacklist = ({ type, blacklist }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(
    blacklist || { id: '', visitorId: '', floorplanMaskedAreaId: '' },
  );

  const visitorData = useSelector((state: RootState) => state.visitorReducer.visitors);
    const floorplanData: FloorplanType[] = useSelector(
    (state: RootState) => state.floorplanReducer.floorplans,
  );
  const maskedAreaData = useSelector(
    (state: RootState) => state.maskedAreaReducer.maskedAreas,
  );
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchVisitor());
        dispatch(fetchFloorplan());
        dispatch(fetchMaskedAreas());
  }, [dispatch]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    const data = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (
        key !== 'createdBy' &&
        key !== 'createdAt' &&
        key !== 'updatedBy' &&
        key !== 'updatedAt'
      ) {
        data.append(key, value.toString());
      }
    });
    try {
      if (type === 'edit') {
        await dispatch(editBlacklist(data)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addBlacklist(data));
      }
      await dispatch(fetchBlacklist());
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
          Add Blacklist
        </Button>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Blacklist' : 'Edit Blacklist'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Blacklist Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="visitor-id">Visitor</CustomFormLabel>
              <CustomSelect
                name="visitorId"
                value={formData.visitorId || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {visitorData.map((visitor) => (
                  <MenuItem key={visitor.id} value={visitor.id}>
                    {visitor.name}
                  </MenuItem>
                ))}
              </CustomSelect>
              <CustomFormLabel htmlFor="floorplanMaskedArea-id">Area</CustomFormLabel>
              <CustomSelect
                id="floorplanMaskedAreaId"
                name='floorplanMaskedAreaId'
                value={formData.floorplanMaskedAreaId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {maskedAreaData.map((maskedArea) => (
                  <MenuItem key={maskedArea.id} value={maskedArea.id}>
                    {maskedArea.name}
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

export default AddEditBlacklist;
