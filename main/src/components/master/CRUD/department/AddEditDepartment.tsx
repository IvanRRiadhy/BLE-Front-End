import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  SelectChangeEvent,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  addDepartment,
  DepartmentType,
  editDepartment,
  fetchDepartmentDT,
  fetchDepartments,
} from 'src/store/apps/crud/department';
import { defaultDepartmentForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  department?: DepartmentType;
}

const AddEditDepartment = ({ type, department }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<DepartmentType>({
    ...defaultDepartmentForm,
    ...department,
  });
  const departmentFilter = useSelector(
    (state: RootState) => state.departmentReducer.departmentFilter,
  );
  const dispatch: AppDispatch = useDispatch();

  const handleClickOpen = () => {
    if (type === 'edit' && department) {
      if (!department.id) {
        dispatch(fetchDepartmentDT(departmentFilter));
      }
      setFormData({ ...defaultDepartmentForm, ...department });
    } else {
      setFormData({ ...defaultDepartmentForm });
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
    setLoading(true);
    try {
      let result;
      if (type === 'edit') {
        result = await dispatch(editDepartment(formData)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addDepartment(formData));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchDepartmentDT(departmentFilter));
        console.log('Department Saved!');
        toast.success('Data Saved', { position: 'top-right' });
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      console.error('Error saving department:', error);
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
        <Tooltip title="Edit Department">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Department">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
          >
            Add Department
          </Button>
        </Tooltip>
      )}

      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Department' : 'Edit Department'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Department Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="department-code">Department Code</CustomFormLabel>
                <CustomTextField
                  id="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="department-host">Department Host</CustomFormLabel>
                <CustomTextField
                  id="departmentHost"
                  value={formData.departmentHost}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="department-Name">Department Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
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

export default AddEditDepartment;
