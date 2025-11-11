import { Button, Box, Grid2 as Grid, MenuItem, SelectChangeEvent, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  EditUnsavedMaskedArea,
  SelectEditingMaskedArea,
  SelectMaskedArea,
  RevertMaskedArea,
  SaveMaskedArea,
} from 'src/store/apps/crud/maskedArea';
import { restrictedStatus } from 'src/types/crud/input';
import isEqual from 'lodash/isEqual';

// Define the form data type for better type safety
interface AreaFormData {
  id: string;
  name: string;
  colorArea: string;
  areaShape: string;
  restrictedStatus: string;
  wideArea: number;
  positionPxX: number;
  positionPxY: number;
  engineAreaId: string;
  floorId: string;
  floorplanId: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

const AreaDetailList = () => {
  const dispatch: AppDispatch = useDispatch();
  const area = useSelector((state: RootState) => state.maskedAreaReducer.editingMaskedArea);
  
  // Initialize form data with area data or defaults
  const [formData, setFormData] = useState<AreaFormData>({
    id: '',
    name: '',
    colorArea: '#363636',
    areaShape: '',
    restrictedStatus: '',
    wideArea: 0,
    positionPxX: 0,
    positionPxY: 0,
    engineAreaId: '',
    floorId: '',
    floorplanId: '',
    createdBy: '',
    createdAt: '',
    updatedBy: '',
    updatedAt: '',
  });

  // Update form data when area changes - optimized version
  useEffect(() => {
    if (area) {
      const newFormData: AreaFormData = {
        id: area.id || '',
        name: area.name || '',
        colorArea: area.colorArea || '#363636',
        areaShape: area.areaShape || '',
        restrictedStatus: area.restrictedStatus || '',
        wideArea: area.wideArea || 0,
        positionPxX: area.positionPxX || 0,
        positionPxY: area.positionPxY || 0,
        engineAreaId: area.engineAreaId || '',
        floorId: area.floorId || '',
        floorplanId: area.floorplanId || '',
        createdBy: area.createdBy || '',
        createdAt: area.createdAt || '',
        updatedBy: area.updatedBy || '',
        updatedAt: area.updatedAt || '',
      };

      // Only update if data actually changed
      if (!isEqual(formData, newFormData)) {
        setFormData(newFormData);
      }
    }
  }, [area]); // Remove formData from dependencies to avoid infinite loops

  const handleClose = () => {
    // Reset to current area data or empty form
    if (area) {
      setFormData({
        id: area.id || '',
        name: area.name || '',
        colorArea: area.colorArea || '#363636',
        areaShape: area.areaShape || '',
        restrictedStatus: area.restrictedStatus || '',
        wideArea: area.wideArea || 0,
        positionPxX: area.positionPxX || 0,
        positionPxY: area.positionPxY || 0,
        engineAreaId: area.engineAreaId || '',
        floorId: area.floorId || '',
        floorplanId: area.floorplanId || '',
        createdBy: area.createdBy || '',
        createdAt: area.createdAt || '',
        updatedBy: area.updatedBy || '',
        updatedAt: area.updatedAt || '',
      });
    }
    dispatch(SelectEditingMaskedArea(null));
    dispatch(SelectMaskedArea(null));
  };

  // Define required fields
  const requiredFields = ['name', 'colorArea', 'restrictedStatus'];

  // Validation function
  const isFormValid = () => {
    return requiredFields.every(
      (field) => formData[field as keyof AreaFormData]?.toString().trim() !== '',
    );
  };

  const handleSave = async () => {
    if (!isFormValid()) return;

    try {
      // Update the unsaved area in Redux store
      dispatch(EditUnsavedMaskedArea(formData));
      
      // Mark as saved in Redux (this is local state management)
      dispatch(SaveMaskedArea(formData.id));
      
      handleClose();
    } catch (error) {
      console.error('Error saving masked area: ', error);
    }
  };

  const handleCancel = () => {
    if (formData.id) {
      dispatch(RevertMaskedArea(formData.id));
    }
    handleClose();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    
    const fieldName = (id || name) as keyof AreaFormData;
    
    setFormData(prev => ({ 
      ...prev, 
      [fieldName]: value 
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
  if (!area) {
    return (
      <Box
        sx={{
          height: '80vh',
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
        height: '80vh',
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
          Edit Masked Area Details
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
                    onClick={() => setFormData(prev => ({ ...prev, colorArea: color }))}
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      backgroundColor: color,
                      border:
                        formData.colorArea === color
                          ? '3px solid #000'
                          : '2px solid rgba(0,0,0,0.2)',
                      transition: 'all 0.25s ease',
                      boxShadow:
                        formData.colorArea === color
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
                    backgroundColor: formData.colorArea,
                    border: '1px solid #aaa',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formData.colorArea}
                </Typography>
              </Box>
            </Grid>

            {/* Restriction Status */}
            <Grid size={12}>
              <CustomFormLabel htmlFor="area-restriction">Area Restriction</CustomFormLabel>
              <CustomSelect
                id="restrictedStatus"
                name="restrictedStatus"
                value={formData.restrictedStatus}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                required
              >
                {restrictedStatus.map((status) => (
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
          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={!isFormValid()}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AreaDetailList;