import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Autocomplete,
  TextField,
  Box,
  FormHelperText,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { defaultFloorForm } from 'src/store/apps/defaultForm';
import AddEditBuilding from '../building/AddEditBuilding';
import { useAddFloor, useEditFloor } from 'src/hooks/useFloor';
import { useAllBuilding } from 'src/hooks/useBuilding'; // ✅ Your React Query building hook
import type { floorType } from 'src/store/apps/crud/floor';
import { BuildingType } from 'src/store/apps/crud/building';

interface FormType {
  type?: 'add' | 'edit';
  floor?: floorType;
}

const AddEditFloor = ({ type, floor }: FormType) => {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    ...defaultFloorForm,
    ...floor,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ✅ Hooks
  const addMutation = useAddFloor();
  const editMutation = useEditFloor();
  const { data: buildingData = [], isLoading: buildingLoading } = useAllBuilding();

  // 🧭 Open/close dialog
  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && floor) {
      setFormData({ ...defaultFloorForm, ...floor });
    } else {
      setFormData({ ...defaultFloorForm });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  // 🧩 Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Floor name is required';
    if (!formData.buildingId) errors.buildingId = 'Building is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 💾 Save handler
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        id: formData.id,
        name: formData.name,
        buildingId: formData.buildingId,
      };

      if (type === 'add') {
        await addMutation.mutateAsync(payload);
        toast.success('Floor added successfully!');
      } else {
        await editMutation.mutateAsync(payload);
        toast.success('Floor updated successfully!');
      }

      handleClose();
    } catch (error) {
      console.error('Error saving floor:', error);
      toast.error('Saving data unsuccessful.');
    } finally {
      setIsSaving(false);
    }
  };

  // 🧠 Handle input changes
const handleInputChange = (
  e: React.ChangeEvent<HTMLInputElement> | { target: { id?: string; name?: string; value: string } },
) => {
  const { id, name, value } = e.target;
  const key = (id || name) as keyof typeof formData; // ✅ explicitly assert string key
  if (!key) return; // safeguard

  setFormData((prev) => ({
    ...prev,
    [key]: value,
  }));
};

  return (
    <>
      {/* Trigger buttons */}
      {type === 'edit' && (
        <Tooltip title="Edit Floor">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}

      {type === 'add' && (
        <Tooltip title="Add Floor">
          <Button
            variant="contained"
            color="primary"
            sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
            onClick={handleClickOpen}
          >
            <IconPlus size={20} />
          </Button>
        </Tooltip>
      )}

      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Floor' : 'Edit Floor'}
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              {/* Building Select */}
              <CustomFormLabel htmlFor="building">Building</CustomFormLabel>
              <Box display="flex" alignItems="center" gap={1}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  loading={buildingLoading}
                  options={buildingData.map((b: BuildingType) => ({ id: b.id, label: b.name }))}
                  value={
                    buildingData
                      .map((b: BuildingType) => ({ id: b.id, label: b.name }))
                      .find((opt: { id: string; label: string }) => opt.id === formData.buildingId) || null
                  }
                  onChange={(_, newVal) => {
                    const id = newVal?.id ?? '';
                    setFormData((prev) => ({ ...prev, buildingId: id }));
                    setFormErrors((prev) => {
                      if (!prev.buildingId) return prev;
                      const next = { ...prev };
                      delete next.buildingId;
                      return next;
                    });
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  getOptionLabel={(option) =>
                    typeof option === 'string' ? option : option.label
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      id="buildingId"
                      variant="outlined"
                      fullWidth
                      required
                      error={!!formErrors.buildingId}
                      helperText={formErrors.buildingId}
                    />
                  )}
                />
                <AddEditBuilding type="add" />
              </Box>

              {/* Floor Name */}
              <CustomFormLabel htmlFor="floor-name">Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
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
    </>
  );
};

export default AddEditFloor;
