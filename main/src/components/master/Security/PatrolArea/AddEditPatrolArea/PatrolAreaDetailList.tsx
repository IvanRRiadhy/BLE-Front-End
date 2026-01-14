import {
  Button,
  Box,
  Grid2 as Grid,
  MenuItem,
  SelectChangeEvent,
  Typography,
  Switch,
  FormControlLabel,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  EditUnsavedPatrolArea,
  SelectEditingPatrolArea,
  SelectPatrolArea,
  RevertPatrolArea,
  SavePatrolArea,
} from 'src/store/apps/crud/patrolArea';
import { restrictedStatus } from 'src/types/crud/input';
import isEqual from 'lodash/isEqual';

// Define the form data type for better type safety
interface PatrolAreaFormData {
  id: string;
  name: string;
  remarks: string;
  color: string;
  areaShape: string;
  // wideArea: number;
  // positionPxX: number;
  // positionPxY: number;
  // engineAreaId: string;
  floorId: string;
  floorplanId: string;
  isActive: boolean;
}

const PatrolAreaDetailList = () => {
  const dispatch: AppDispatch = useDispatch();
  const patrolArea = useSelector((state: RootState) => state.PatrolAreaReducer.editingPatrolArea);

  // Initialize form data with area data or defaults
  const [formData, setFormData] = useState<PatrolAreaFormData>({
    id: '',
    name: '',
    remarks: '',
    color: '#363636',
    areaShape: '',
    // wideArea: 0,
    // positionPxX: 0,
    // positionPxY: 0,
    // engineAreaId: '',
    floorId: '',
    floorplanId: '',
    isActive: false,
  });

  // Update form data when area changes - optimized version
  useEffect(() => {
    if (patrolArea) {
      const newFormData: PatrolAreaFormData = {
        id: patrolArea.id || '',
        name: patrolArea.name || '',
        remarks: patrolArea.remarks || '',
        color: patrolArea.color || '#363636',
        areaShape: patrolArea.areaShape || '',
        floorId: patrolArea.floorId || '',
        floorplanId: patrolArea.floorplanId || '',
        isActive: patrolArea.isActive || false,
      };

      // Only update if data actually changed
      if (!isEqual(formData, newFormData)) {
        setFormData(newFormData);
      }
    }
  }, [patrolArea]); // Remove formData from dependencies to avoid infinite loops

  const handleClose = () => {
    // Reset to current area data or empty form
    if (patrolArea) {
      setFormData({
        id: patrolArea.id || '',
        name: patrolArea.name || '',
        remarks: patrolArea.remarks || '',
        color: patrolArea.color || '#363636',
        areaShape: patrolArea.areaShape || '',
        floorId: patrolArea.floorId || '',
        floorplanId: patrolArea.floorplanId || '',
        isActive: patrolArea.isActive || false,
      });
    }
    dispatch(SelectEditingPatrolArea(null));
    dispatch(SelectPatrolArea(null));
  };

  // Define required fields
  const requiredFields = ['name', 'colorArea', 'restrictedStatus'];

  // Validation function
  const isFormValid = () => {
    return requiredFields.every(
      (field) => formData[field as keyof PatrolAreaFormData]?.toString().trim() !== '',
    );
  };

  const handleSave = async () => {
    if (!isFormValid()) return;

    try {
      // Update the unsaved area in Redux store
      dispatch(EditUnsavedPatrolArea(formData));

      // Mark as saved in Redux (this is local state management)
      dispatch(SavePatrolArea(formData.id));

      handleClose();
    } catch (error) {
      console.error('Error saving patrol area: ', error);
    }
  };

  const handleCancel = () => {
    if (formData.id) {
      dispatch(RevertPatrolArea(formData.id));
    }
    handleClose();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };

    const fieldName = (id || name) as keyof PatrolAreaFormData;

    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Color palette for the area
  const colorPalette = [
    '#FF4D4F', // Bright Red
    '#B22222', // Crimson
    '#D633FF', // Magenta
    '#5D3FD3', // Indigo
    '#0047FF', // Deep Blue
    '#00CFFF', // Cyan
    '#228B22', // Dark Green
    '#FFCC00', // Yellow
    '#C8B560', // Khaki
    '#FF7A00', // Orange
  ];

  // If no area is selected for editing, don't render the component
  if (!patrolArea) {
    return (
      <Box
        sx={{
          height: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No area selected for editing
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '90vh',
        display: 'grid',
        minHeight: 0,
        gridTemplateRows: 'auto 1fr auto',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box p={3} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Edit Patrol Area Details
        </Typography>
      </Box>

      {/* Form Content */}
      <Box sx={{ minHeight: 0, overflow: 'auto' }}>
        <Box pl={3} pr={1}>
          <Grid container spacing={1}>
            {/* Area Name */}
            <Grid size={12}>
              <CustomFormLabel htmlFor="area-name">Area Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                variant="outlined"
                fullWidth
                placeholder="Enter area name"
              />
            </Grid>

            <Grid size={12}>
              <CustomFormLabel htmlFor="area-description">Area Description</CustomFormLabel>
              <CustomTextField
                id="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                placeholder="Enter area description"
              />
            </Grid>

            {/* Color Selection */}
            <Grid size={12}>
              <CustomFormLabel htmlFor="area-color">Area Color</CustomFormLabel>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  p: 1,
                  border: '1px solid #ccc',
                  borderRadius: 1,
                  backgroundColor: '#f9f9f9',
                  justifyContent: 'space-between',
                }}
              >
                {colorPalette.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setFormData((prev) => ({ ...prev, color: color }))}
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      backgroundColor: color,
                      border:
                        formData.color === color
                          ? '3px solid #000'
                          : '2px solid rgba(0,0,0,0.2)',
                      transition: 'all 0.25s ease',
                      boxShadow:
                        formData.color === color
                          ? '0 0 0 3px rgba(0,0,0,0.15)'
                          : '0 1px 4px rgba(0,0,0,0.1)',
                      '&:hover': {
                        transform: 'scale(1.12)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      },
                    }}
                  />
                ))}
              </Box>

              {/* Selected Color Display */}
              <Box
                sx={{
                  mt: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: formData.color,
                    border: '1px solid #aaa',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formData.color}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box
        p={2}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fafafa',
        }}
      >
        <Box display="flex" justifyContent="space-between">
          <Button variant="outlined" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!isFormValid()}>
            Save
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PatrolAreaDetailList;
