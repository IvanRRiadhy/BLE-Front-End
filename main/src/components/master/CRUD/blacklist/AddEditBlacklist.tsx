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
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  blacklistType,
  addBlacklist,
  editBlacklist,
  fetchBlacklist,
  fetchBlacklistDT,
} from 'src/store/apps/crud/blacklist';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import { fetchVisitor } from 'src/store/apps/crud/visitor';
import { defaultBlaclistForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  blacklist?: blacklistType;
}

const AddEditBlacklist = ({ type, blacklist }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<blacklistType>({
    ...defaultBlaclistForm,
    ...blacklist,
  });
  const blacklistFilter = useSelector((state: RootState) => state.blacklistReducer.blacklistFilter);
  const visitorData = useSelector((state: RootState) => state.visitorReducer.visitors);
  const maskedAreaData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchVisitor());
    dispatch(fetchMaskedAreas());
  }, [dispatch]);

  const handleClickOpen = () => {
    if (type === 'edit' && blacklist) {
      if (!blacklist.id) {
        dispatch(fetchBlacklistDT(blacklistFilter));
      }
      setFormData({
        ...defaultBlaclistForm,
        ...blacklist,
      });
    } else {
      setFormData({ ...defaultBlaclistForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
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
      let result;
      if (type === 'edit') {
        result = await dispatch(editBlacklist(data)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addBlacklist(data));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchBlacklistDT(blacklistFilter));
        console.log('Blaclist Saved!');
        toast.success('Data Saved', { position: 'top-right' });
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      console.error('Error saving blacklist:', error);
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
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Blacklist">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Blacklist">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
          >
            Add Blacklist
          </Button>
        </Tooltip>
      )}

      {!loading && (
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
                  name="floorplanMaskedAreaId"
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

export default AddEditBlacklist;
