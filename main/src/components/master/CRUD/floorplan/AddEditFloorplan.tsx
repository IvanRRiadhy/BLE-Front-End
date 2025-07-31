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
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import {
  FloorplanType,
  fetchFloorplan,
  addFloorplan,
  editFloorplan,
  fetchFloorplanDT,
} from 'src/store/apps/crud/floorplan';
import toast from 'react-hot-toast';
import { defaultFloorplanForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  floorplan?: FloorplanType;
}

const AddEditFloorplan = ({ type, floorplan }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({
    ...defaultFloorplanForm,
    ...floorplan,
  });
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);
  const dispatch: AppDispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchFloors());
    console.log(formData);
  }, [dispatch]);

  const floorData: floorType[] = useSelector((state: RootState) => state.floorReducer.floorAll);

  const handleClickOpen = () => {
    if (type === 'edit' && floorplan) {
      if (!floorplan.id) {
        dispatch(fetchFloorplanDT(floorplanFilter));
      }
      setFormData({ ...defaultFloorplanForm, ...floorplan });
    } else {
      setFormData({ ...defaultFloorplanForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    setOpen(false);
    console.log(floorData);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key: string) => {
        const value = formData[key as keyof typeof formData];
        if (typeof value === 'string' || value instanceof Blob) {
          data.append(key, value);
        } else {
          console.error(`Invalid value type for key ${key}: ${typeof value}`);
        }
      });
      let result;
      if (type === 'edit') {
        result = await dispatch(editFloorplan(data)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addFloorplan(data));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchFloorplanDT(floorplanFilter));
        console.log('Floorplan Saved!');
        toast.success('Data Saved', { position: 'top-right' });
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      console.error('Error saving floorplan:', error);
    }
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
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
        <Tooltip title="Edit Floorplan">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Floorplan">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
          >
            Add Floor
          </Button>
        </Tooltip>
      )}

      {!loading && (
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
                  value={formData.name}
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
            <Button
              onClick={handleClose}
              variant="outlined"
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
              disabled={isSaving}
            >
              {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {loading && (
        <Dialog open={true} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h6">Loading...</Typography>
            <CircularProgress size={20} color="inherit" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditFloorplan;
