import { BASE_URL } from 'src/utils/axios';
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
import { visitorStatus, gender, visitorType } from 'src/types/crud/input';
import {
  addVisitor,
  editVisitor,
  fetchVisitor,
  masterVisitorType,
  VisitorType,
} from 'src/store/apps/crud/visitor';

interface FormType {
  type?: string;
  visitor?: VisitorType;
}

const AddEditVisitor = ({ type, visitor }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(visitor?.faceImage || null);
  const [formData, setFormData] = React.useState({
    id: visitor?.id || '',
    identityId: visitor?.identityId || '',
    name: visitor?.name || '',
    personId: visitor?.personId || '',
    cardNumber: visitor?.cardNumber || '',
    bleCardNumber: visitor?.bleCardNumber || '',
    visitorType: visitor?.visitorType || '',
    phone: visitor?.phone || '',
    email: visitor?.email || '',
    gender: visitor?.gender || '',
    address: visitor?.address || '',
    organizationId: visitor?.organizationId || '',
    districtId: visitor?.districtId || '',
    departmentId: visitor?.departmentId || '',
    isVip: visitor?.isVip || false,
    isEmailVerified: visitor?.isEmailVerified || false,
    emailVerificationSendAt: visitor?.emailVerificationSendAt || '',
    emailVerificationToken: visitor?.emailVerificationToken || '',
    visitorPeriodStart: visitor?.visitorPeriodStart || '',
    visitorPeriodEnd: visitor?.visitorPeriodEnd || '',
    isEmployee: visitor?.isEmployee || false,
    faceImage: visitor?.faceImage || '',
    applicationId: visitor?.applicationId || localStorage.getItem('applicationId') || '',

  });
  const dispatch: AppDispatch = useDispatch();
  const handleClickOpen = () => {
    setOpen(true);
    console.log('visitor Data: ', visitor);
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
          key !== 'visitorPeriodStart' &&
          key !== 'visitorPeriodEnd' &&
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
        console.log('Form Data :', JSON.stringify(Object.fromEntries(data.entries())));
        await dispatch(editVisitor(data)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addVisitor(data));
      }
      await dispatch(fetchVisitor());
      console.log('Saved!');
      setOpen(false);
    } catch (error) {
      console.error('Error saving visitor:', error);
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
        <Grid container spacing={3}>
          {/* id */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="id">Visitor ID</CustomFormLabel>
            <CustomTextField
              id="id"
              value={formData.id}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
              disabled={!!visitor} // usually ID should not be editable
            />
          </Grid>
          {/* identityId */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="identityId">Identity ID</CustomFormLabel>
            <CustomTextField
              id="identityId"
              value={formData.identityId}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* name */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="name">Name</CustomFormLabel>
            <CustomTextField
              id="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* personId */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="personId">Person ID</CustomFormLabel>
            <CustomTextField
              id="personId"
              value={formData.personId}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* cardNumber */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="cardNumber">Card Number</CustomFormLabel>
            <CustomTextField
              id="cardNumber"
              value={formData.cardNumber}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* bleCardNumber */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="bleCardNumber">BLE Card Number</CustomFormLabel>
            <CustomTextField
              id="bleCardNumber"
              value={formData.bleCardNumber}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* visitorType */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="visitorType">Visitor Type</CustomFormLabel>
            <CustomSelect
              name="visitorType"
              value={formData.visitorType}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            >
              {visitorType.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
          {/* phone */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
            <CustomTextField
              id="phone"
              value={formData.phone}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* email */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
            <CustomTextField
              id="email"
              value={formData.email}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* gender */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
            <CustomSelect
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            >
              {gender.map((g) => (
                <MenuItem key={g.value} value={g.value}>
                  {g.label}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
          {/* address */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="address">Address</CustomFormLabel>
            <CustomTextField
              id="address"
              value={formData.address}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* organizationId */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="organizationId">Organization ID</CustomFormLabel>
            <CustomTextField
              id="organizationId"
              value={formData.organizationId}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* districtId */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="districtId">District ID</CustomFormLabel>
            <CustomTextField
              id="districtId"
              value={formData.districtId}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* departmentId */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="departmentId">Department ID</CustomFormLabel>
            <CustomTextField
              id="departmentId"
              value={formData.departmentId}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* isVip */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="isVip">Is VIP</CustomFormLabel>
            <CustomSelect
              name="isVip"
              value={formData.isVip ? 'true' : 'false'}
              onChange={(e: SelectChangeEvent) =>
                setFormData(prev => ({
                  ...prev,
                  isVip: e.target.value === 'true'
                }))
              }
              fullWidth
              variant="outlined"
            >
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </CustomSelect>
          </Grid>
          {/* isEmailVerified */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="isEmailVerified">Email Verified</CustomFormLabel>
            <CustomSelect
              name="isEmailVerified"
              value={formData.isEmailVerified ? 'true' : 'false'}
              onChange={(e: SelectChangeEvent) =>
                setFormData(prev => ({
                  ...prev,
                  isEmailVerified: e.target.value === 'true'
                }))
              }
              fullWidth
              variant="outlined"
            >
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </CustomSelect>
          </Grid>
          {/* emailVerificationSendAt */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="emailVerificationSendAt">
              Email Verification Send At
            </CustomFormLabel>
            <CustomTextField
              id="emailVerificationSendAt"
              type="datetime-local"
              value={formData.emailVerificationSendAt}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* emailVerificationToken */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="emailVerificationToken">
              Email Verification Token
            </CustomFormLabel>
            <CustomTextField
              id="emailVerificationToken"
              value={formData.emailVerificationToken}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* visitorPeriodStart */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="visitorPeriodStart">
              Visitor Period Start
            </CustomFormLabel>
            <CustomTextField
              id="visitorPeriodStart"
              type="datetime-local"
              value={formData.visitorPeriodStart}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* visitorPeriodEnd */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="visitorPeriodEnd">
              Visitor Period End
            </CustomFormLabel>
            <CustomTextField
              id="visitorPeriodEnd"
              type="datetime-local"
              value={formData.visitorPeriodEnd}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* isEmployee */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="isEmployee">Is Employee</CustomFormLabel>
            <CustomSelect
              name="isEmployee"
              value={formData.isEmployee ? 'true' : 'false'}
              onChange={(e: SelectChangeEvent) =>
                setFormData(prev => ({
                  ...prev,
                  isEmployee: e.target.value === 'true'
                }))
              }
              fullWidth
              variant="outlined"
            >
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </CustomSelect>
          </Grid>
          {/* faceImage */}
          <Grid size={12}>
            <CustomFormLabel htmlFor="faceImage">Face Image</CustomFormLabel>
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleImageChange}
            />
            {preview && (
              <img
                src={typeof preview === 'string' && preview.startsWith('blob:') ? preview : `${BASE_URL}${preview}`}
                alt="Face Preview"
                style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
              />
            )}
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
// function fetchVisitors(): any {
//   throw new Error('Function not implemented.');
// }
