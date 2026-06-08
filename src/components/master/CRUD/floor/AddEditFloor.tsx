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
  Stack,
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
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';

interface FormType {
  type?: 'add' | 'edit';
  floor?: floorType;
  fixedBuildingId?: string;
  trigger?: (onClick: () => void) => React.ReactNode;
}

const AddEditFloor = ({ type, floor, fixedBuildingId, trigger }: FormType) => {
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
      setFormData({ 
        ...defaultFloorForm,
        buildingId: fixedBuildingId || '',
      });
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
    e:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { id?: string; name?: string; value: string } },
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
      {trigger ? (
        trigger(handleClickOpen)
      ) : type === 'edit' && (
        <Tooltip title="Edit Floor">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}

      {!trigger && type === 'add' && (
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
          <Typography component="div" variant="h4" my={2} fontWeight={700}>
            {type === 'add' ? 'Add Floor' : 'Edit Floor'}
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent>
          <Box mt={2}>
            <Stack spacing={2}>
              {/* Building Select */}
              <CustomFormLabel htmlFor="building">Building</CustomFormLabel>
              <Box display="flex" alignItems="center" gap={1}>
                <CustomAutocomplete<BuildingType>
                  multiple={false}
                  label="Building"
                  options={buildingData}
                  value={buildingData.find((b) => b.id === formData.buildingId) || null}
                  onChange={(val) => {
                    setFormData((prev) => ({ ...prev, buildingId: val?.id ?? '' }));
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.buildingId;
                      return next;
                    });
                  }}
                  getOptionLabel={(o) => o?.name ?? ''}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  required
                  error={!!formErrors.buildingId}
                  helperText={formErrors.buildingId}
                  sx={{ flex: 1 }}
                  disabled={!!fixedBuildingId}
                />
                {!fixedBuildingId && <AddEditBuilding type="add" />}
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
            </Stack>
          </Box>
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
