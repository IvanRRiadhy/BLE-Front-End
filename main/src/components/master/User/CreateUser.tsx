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
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, dispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { userType, userRegistration, fetchUser, userRegistrationType } from 'src/store/apps/crud/users';

const CreateUser = () => {
    const [open, setOpen] = React.useState(false);
    const [formData, setFormData] = React.useState<userRegistrationType>({
        username: '',
        email: '',
        groupId: 'C2AAA502-E314-4388-8762-EE46EB9CEB93',
    });

      const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    try {
        const data = new FormData();
              // Append non-file fields
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
        await dispatch(userRegistration(formData));
        await dispatch(fetchUser());
        setOpen(false);

    } catch (error) {
        console.error('Error saving application:', error);
    }
  }
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
        <Button
          variant="contained"
          color="primary"
          startIcon={<IconPlus size={20} />}
          onClick={handleClickOpen}
        >
          Create
        </Button>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            New User
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="username">Username</CustomFormLabel>
              <CustomTextField
                id="username"
                placeholder={formData.username}
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

export default CreateUser;