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
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, useDispatch } from 'src/store/Store';
import { visitorStatus, gender } from 'src/types/crud/input';
import { addVisitor, editVisitor, visitorType } from 'src/store/apps/crud/visitor';

interface FormType {
  type?: string;
  visitor?: visitorType;
}

const BASE_URL = 'http://localhost:5034';

const AddEditVisitor = ({ type, visitor }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(visitor?.faceImage || null);
  const [formData, setFormData] = React.useState({
    id: visitor?.id || '',
    personId: visitor?.personId || '',
    identityId: visitor?.identityId || '',
    cardNumber: visitor?.cardNumber || '',
    bleCardNumber: visitor?.bleCardNumber || '',
    name: visitor?.name || '',
    phone: visitor?.phone || '',
    email: visitor?.email || '',
    gender: visitor?.gender || 'Please select Gender',
    address: visitor?.address || '',
    faceImage: visitor?.faceImage || '',
    uploadFr: visitor?.uploadFr || 0,
    uploadFrError: visitor?.uploadFrError || '',
    applicationId: visitor?.applicationId || '',
    registeredDate: visitor?.registeredDate || '',
    visitorArrival: visitor?.visitorArrival || '',
    visitorEnd: visitor?.visitorEnd || '',
    portalKey: visitor?.portalKey || 0,
    timestampPreRegistration: visitor?.timestampPreRegistration || '',
    timestampCheckedIn: visitor?.timestampCheckedIn || '',
    timestampCheckedOut: visitor?.timestampCheckedOut || '',
    timestampDeny: visitor?.timestampDeny || '',
    timestampBlocked: visitor?.timestampBlocked || '',
    timestampUnblocked: visitor?.timestampUnblocked || '',
    checkinBy: visitor?.checkinBy || '',
    checkoutBy: visitor?.checkoutBy || '',
    denyBy: visitor?.denyBy || '',
    blockBy: visitor?.blockBy || '',
    unblockBy: visitor?.unblockBy || '',
    reasonDeny: visitor?.reasonDeny || '',
    reasonBlock: visitor?.reasonBlock || '',
    reasonUnblock: visitor?.reasonUnblock || '',
    status: visitor?.status || 'Please select Status',
  });
  const dispatch: AppDispatch = useDispatch();
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    try {
      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (
          key !== 'faceImage' &&
          key !== 'registeredDate' &&
          key !== 'visitorArrival' &&
          key !== 'visitorEnd' &&
          key !== 'timestampBlocked' &&
          key !== 'timestampCheckedIn' &&
          key !== 'timestampCheckedOut' &&
          key !== 'timestampPreRegistration' &&
          key !== 'timestampUnblocked' &&
          key !== 'timestampDeny'
        ) {
          data.append(key, value.toString());
        }
      });
      if (image) {
        data.append('faceImage', image);
      }
      if (type === 'edit') {
        await dispatch(editVisitor(data)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addVisitor(data));
      }
      await dispatch(fetchVisitors());
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
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const maxSize = 5 * 1024 * 1024;
    if (file) {
      if (file.size > maxSize) {
        alert('File size exceeds 5MB. Please upload a smaller file.');
        return;
      }
      if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setImage(file);
        setPreview(URL.createObjectURL(file)); // Preview selected image
      } else {
        alert('Please select a valid image file (PNG, JPG, JPEG)');
      }
    }
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Visitor">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Visitor">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
          >
            Add Visitor
          </Button>
        </Tooltip>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Visitor' : 'Edit Visitor'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            IDs
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="person-id">Person ID</CustomFormLabel>
              <CustomTextField
                id="personId"
                placeholder={formData.personId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
              <CustomTextField
                id="identityId"
                placeholder={formData.identityId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="application-id">Application ID</CustomFormLabel>
              <CustomTextField
                id="applicationId"
                placeholder={formData.applicationId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Card Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="card-number">Card Number</CustomFormLabel>
              <CustomTextField
                id="cardNumber"
                placeholder={formData.cardNumber}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
              <CustomTextField
                id="bleCardNumber"
                placeholder={formData.bleCardNumber}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Visitor Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="name">Name</CustomFormLabel>
              <CustomTextField
                id="name"
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
              <CustomTextField
                id="email"
                placeholder={formData.email}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
              <CustomTextField
                id="addess"
                placeholder={formData.address}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
              <CustomTextField
                id="phone"
                placeholder={formData.phone}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
              <CustomSelect
                name="gender"
                value={formData.gender || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {gender.map((gender) => (
                  <MenuItem
                    key={gender.value}
                    value={gender.value}
                    disabled={gender.disabled || false}
                  >
                    {gender.label}
                  </MenuItem>
                ))}
              </CustomSelect>
              <CustomFormLabel htmlFor="status">Status</CustomFormLabel>
              <CustomSelect
                name="status"
                value={formData.status || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {visitorStatus.map((status) => (
                  <MenuItem
                    key={status.value}
                    value={status.value}
                    disabled={status.disabled || false}
                  >
                    {status.label}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Photo
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={12}>
              <CustomFormLabel htmlFor="face-image">Face Image</CustomFormLabel>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
              />
              {preview && (
                <img
                  src={`${BASE_URL}${preview}`}
                  alt="Face Preview"
                  style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
                />
              )}
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="upload-Fr">Upload Fr</CustomFormLabel>
              <CustomTextField
                id="uploadFr"
                placeholder={formData.uploadFr}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="upload-Fr-Error">Upload Fr Error</CustomFormLabel>
              <CustomTextField
                id="uploadFrError"
                placeholder={formData.uploadFrError}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Visit Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="check-in-by">Check-in by</CustomFormLabel>
              <CustomTextField
                id="checkinBy"
                placeholder={formData.checkinBy}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="portal-key">Portal Key</CustomFormLabel>
              <CustomTextField
                id="portalKey"
                placeholder={formData.portalKey}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel></CustomFormLabel>
              <CustomFormLabel htmlFor="check-out-by">Check-out by</CustomFormLabel>
              <CustomTextField
                id="checkoutBy"
                placeholder={formData.checkoutBy}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Restricion Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="deny-by">Deny By</CustomFormLabel>
              <CustomTextField
                id="denyBy"
                placeholder={formData.denyBy}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}></Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="blocked-by">Blocked By</CustomFormLabel>
              <CustomTextField
                id="blockBy"
                placeholder={formData.blockBy}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="unblocked-by">Unblocked By</CustomFormLabel>
              <CustomTextField
                id="unblockBy"
                placeholder={formData.unblockBy}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Restriction Reason
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="reason-deny">Deny Reason</CustomFormLabel>
              <CustomTextField
                id="reasonDeny"
                placeholder={formData.reasonDeny}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}></Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="reason-block">Block Reason</CustomFormLabel>
              <CustomTextField
                id="reasonBlock"
                placeholder={formData.reasonBlock}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="reason-unblock">Unblock Reason</CustomFormLabel>
              <CustomTextField
                id="reasonUnblock"
                placeholder={formData.reasonUnblock}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
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

export default AddEditVisitor;
function fetchVisitors(): any {
  throw new Error('Function not implemented.');
}
