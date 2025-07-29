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
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React from 'react';
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

interface FormType {
  type?: string;
  cctv?: CCTVType;
}

const AddEditAccessCCTV = ({ type, cctv }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<CCTVType>(
    cctv || {
      id: '',
      name: '',
      rtsp: '',
      createdBy: '',
      createdAt: '',
      updatedBy: '',
      updatedAt: '',
      integrationId: '48842BFF-1605-422A-A0B7-98380EE7D1B8',
      applicationId: localStorage.getItem('applicationId') || '',
    },
  );

  const CCTVFilter = useSelector((state: RootState) => state.CCTVReducer.cctvFilter);
  const dispatch: AppDispatch = useDispatch();

const handleClickOpen = () => {
  if (type === 'edit' && cctv) {
    setFormData(cctv);
  } else {
    setFormData({} as CCTVType);
  }
  setOpen(true);
};
  const handleClose = () => {
    setOpen(false);
  };
  const handleSave = async () => {
    try {
      if (type === 'edit') {
        await dispatch(editCCTV(formData)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addCCTV(formData));
      }
      await dispatch(fetchAccessCCTVDT(CCTVFilter));
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
          Add Access CCTV
        </Button>
      )}
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

export default AddEditAccessCCTV;
