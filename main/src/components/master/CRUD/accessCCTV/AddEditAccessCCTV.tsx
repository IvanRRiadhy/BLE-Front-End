import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  Typography,
  SelectChangeEvent,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  CCTVType,
  editCCTV,
  addCCTV,
  fetchAccessCCTV,
  fetchAccessCCTVDT,
} from 'src/store/apps/crud/accessCCTV';
import { defaultAccessCCTVForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  cctv?: CCTVType;
}

const AddEditAccessCCTV = ({ type, cctv }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CCTVType>({
    ...defaultAccessCCTVForm,
    ...cctv,
  });
    const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const CCTVFilter = useSelector((state: RootState) => state.CCTVReducer.cctvFilter);
  const dispatch: AppDispatch = useDispatch();

  const handleClickOpen = async () => {
    if (type === 'edit' && cctv) {
      if (!cctv.id) {
        await dispatch(fetchAccessCCTVDT(CCTVFilter));
      }
      setFormData({ ...defaultAccessCCTVForm, ...cctv });
    } else {
      setFormData({ ...defaultAccessCCTVForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'CCTV Name is required';
    if (!formData.rtsp?.trim()) errors.rtsp = 'CCTV RTSP is required';
    // if (!formData.?.trim()) errors.departmentHost = 'Department host is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }
    setLoading(true);
    try {
      let result;
      if (type === 'edit') {
        result = await dispatch(editCCTV(formData)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addCCTV(formData));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchAccessCCTVDT(CCTVFilter));
        console.log('CCTV Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving application:', error);
    }
    setTimeout(() => {
      setLoading(false);
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
        <Tooltip title="Edit Access CCTV">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Access CCTV">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
          >
            Add Access CCTV
          </Button>
        </Tooltip>
      )}
      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Access CCTV' : 'Edit Access CCTV'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Access CCTV Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="cctv-Name">Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  required
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
                {/* <CustomFormLabel htmlFor="integration-id">Integration ID</CustomFormLabel>
              <CustomTextField
                id="integrationId"
                value={formData.integrationId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              /> */}
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="cctv-RTSP">RTSP</CustomFormLabel>
                <CustomTextField
                  id="rtsp"
                  value={formData.rtsp}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  required
                  error={!!formErrors.rtsp}
                  helperText={formErrors.rtsp}
                />
                {/* <CustomFormLabel htmlFor="app-id">Application</CustomFormLabel>
              <CustomSelect
                name="applicationId"
                value={formData.applicationId || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {appData.map((app) => (
                  <MenuItem key={app.id} value={app.id}>
                    {app.applicationName}
                  </MenuItem>
                ))}
              </CustomSelect> */}
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
        <Dialog open={true} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h1" mb={5}>
              Loading...{' '}
            </Typography>
            <CircularProgress size={50} color="primary" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditAccessCCTV;
