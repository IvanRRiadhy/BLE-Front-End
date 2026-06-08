import {
  Button,
  Box,
  Grid2 as Grid,
  MenuItem,
  SelectChangeEvent,
  Typography,
  Switch,
  FormControlLabel,
  Autocomplete,
  TextField,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
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
  SaveEditingArea,
  MaskedAreaLabelType,
} from 'src/store/apps/crud/maskedArea';
import { restrictedStatus } from 'src/types/crud/input';
import isEqual from 'lodash/isEqual';
import { useCreateMaskedAreaLabel, useMaskedAreaLabels } from 'src/hooks/useMaskedAreaLabel';
import toast from 'react-hot-toast';
import CustomSwitch from 'src/components/forms/theme-elements/CustomSwitch';

// Define the form data type for better type safety
interface AreaFormData {
  id: string;
  name: string;
  colorArea: string;
  areaShape: string;
  restrictedStatus: string;
  // labels: MaskedAreaLabelType[];
  labelIds?: string[];
  // wideArea: number;
  // positionPxX: number;
  // positionPxY: number;
  // engineAreaId: string;
  isAssemblyPoint: boolean;
  floorId: string;
  floorplanId: string;
  allowFloorChange: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

const CREATE_OPTION = {
  id: '__create__',
  labelName: '➕ Create new label',
};

const AreaDetailList = () => {
  const theme = useTheme();
  const dispatch: AppDispatch = useDispatch();
  const area = useSelector((state: RootState) => state.maskedAreaReducer.editingMaskedArea);
  const { data: labels } = useMaskedAreaLabels();

  //   const labelMap = React.useMemo(() => {
  //   return new Map((labels || []).map(l => [l.id, l]));
  // }, [labels]);

  // Initialize form data with area data or defaults
  const [formData, setFormData] = useState<AreaFormData>({
    id: '',
    name: '',
    colorArea: '#363636',
    areaShape: '',
    restrictedStatus: '',
    // labels: [],
    labelIds: [],
    // wideArea: 0,
    // positionPxX: 0,
    // positionPxY: 0,
    // engineAreaId: '',
    isAssemblyPoint: false,
    floorId: '',
    floorplanId: '',
    allowFloorChange: false,
    createdBy: '',
    createdAt: '',
    updatedBy: '',
    updatedAt: '',
  });

  const [showErrorBorder, setShowErrorBorder] = useState(false);

  // Update form data when area changes - optimized version
  useEffect(() => {
    if (area) {
      const newFormData: AreaFormData = {
        id: area.id || '',
        name: area.name || '',
        colorArea: area.colorArea || '#363636',
        areaShape: area.areaShape || '',
        restrictedStatus: area.restrictedStatus || '',
        // labels: area.labels || [],
        labelIds: area.labels?.map((l) => l.id) || area.labelIds || [],
        // wideArea: area.wideArea || 0,
        // positionPxX: area.positionPxX || 0,
        // positionPxY: area.positionPxY || 0,
        // engineAreaId: area.engineAreaId || '',
        isAssemblyPoint: area.isAssemblyPoint || false,
        floorId: area.floorId || '',
        floorplanId: area.floorplanId || '',
        allowFloorChange: area.allowFloorChange || false,
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
  }, [area?.id]); // Remove formData from dependencies to avoid infinite loops

  const handleClose = () => {
    // Reset to current area data or empty form
    if (area) {
      setFormData({
        id: area.id || '',
        name: area.name || '',
        colorArea: area.colorArea || '#363636',
        areaShape: area.areaShape || '',
        restrictedStatus: area.restrictedStatus || '',
        // labels: area.labels || [],
        labelIds: area.labels?.map((l: MaskedAreaLabelType) => l.id) || area.labelIds || [],
        // wideArea: area.wideArea || 0,
        // positionPxX: area.positionPxX || 0,
        // positionPxY: area.positionPxY || 0,
        // engineAreaId: area.engineAreaId || '',
        isAssemblyPoint: area.isAssemblyPoint || false,
        floorId: area.floorId || '',
        floorplanId: area.floorplanId || '',
        allowFloorChange: area.allowFloorChange || false,
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
      // dispatch(EditUnsavedMaskedArea(formData));
      dispatch(SaveEditingArea());
      // Mark as saved in Redux (this is local state management)
      // dispatch(SaveMaskedArea(formData.id));

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

  // const selectedLabelObjects = React.useMemo(() => {
  //   if (!labels || !formData.labelIds?.length) return [];

  //   return formData.labelIds
  //     .map(id => labels.find(l => l.id === id))
  //     .filter((item): item is MaskedAreaLabelType => Boolean(item));
  // }, [formData.labelIds, labels]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };

    const fieldName = (id || name) as keyof AreaFormData;

    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    dispatch(EditUnsavedMaskedArea({ ...formData, [fieldName]: value }));
  };
  const updateField = <K extends keyof AreaFormData>(field: K, value: AreaFormData[K]) => {
    console.log('Labels: ', labels);
    console.log(`Updating field ${field} to value:`, value);
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      dispatch(EditUnsavedMaskedArea(next));
      return next;
    });
  };
  // console.log({
  //   labelIds: formData.labelIds,
  //   labels,
  //   // selectedLabelObjects
  // });

  //Create New Label
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const { mutateAsync: createLabel, isPending } = useCreateMaskedAreaLabel();

  const handleCreateLabel = async () => {
  try {
    const res = await createLabel(newLabelName);

    const newId = res?.collection?.data?.id || res?.id;

    // auto select new label
    updateField('labelIds', [...(formData.labelIds || []), newId]);

    setNewLabelName('');
    setOpenCreateDialog(false);
  } catch (err) {
    console.error(err);
    toast.error('Failed to create label');
  }
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
        height: '88vh',
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
            {/* Area Labels */}
            <Grid size={12}>
              <CustomFormLabel>Area Label</CustomFormLabel>

              <Autocomplete<MaskedAreaLabelType, true, false, false>
                multiple
                options={[CREATE_OPTION, ...(labels || [])]}
                value={(labels || []).filter((x) => formData.labelIds?.includes(x.id))}
                loading={!labels}
                onChange={(_, newValue) => {
                  const isCreate = newValue.find((v) => v.id === '__create__');

                  if (isCreate) {
                    setOpenCreateDialog(true);
                    return;
                  }

                  updateField(
                    'labelIds',
                    newValue.map((v) => v.id),
                  );
                }}
                getOptionLabel={(option) => option?.labelName ?? ''}
                isOptionEqualToValue={(option, val) => option.id === val.id}
                filterSelectedOptions
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option.labelName} {...getTagProps({ index })} key={option.id} />
                  ))
                }
                renderOption={(props, option) => {
                  if (option.id === '__create__') {
                    return (
                      <li {...props} style={{ fontWeight: 600, color: '#1976d2' }}>
                        ➕ Create new label
                      </li>
                    );
                  }

                  return <li {...props}>{option.labelName}</li>;
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search or select labels"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {!labels ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
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
                  border: '1px solid',
                  borderColor: theme.palette.divider,
                  borderRadius: 1,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f9f9f9',
                  justifyContent: 'space-between',
                }}
              >
                {colorPalette.map((color) => (
                  <Box
                    key={color}
                    onClick={() => updateField('colorArea', color)}
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      backgroundColor: color,
                      border:
                        formData.colorArea === color
                          ? `3px solid ${theme.palette.mode === 'dark' ? '#fff' : '#000'}`
                          : `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                      transition: 'all 0.25s ease',
                      boxShadow:
                        formData.colorArea === color
                          ? `0 0 0 3px ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`
                          : `0 1px 4px ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
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
              <FormControlLabel
                control={
                  <CustomSwitch
                    id="restrictedStatus"
                    checked={formData.restrictedStatus === 'Restrict'}
                    onChange={(e: any) => {
                      const isRestricted = e.target.checked;
                      const newStatus = isRestricted ? 'Restrict' : 'Non-Restrict';
                      
                      setFormData((prev) => {
                        const next = { 
                          ...prev, 
                          restrictedStatus: newStatus,
                          ...(isRestricted ? { isAssemblyPoint: false } : {})
                        };
                        dispatch(EditUnsavedMaskedArea(next));
                        return next;
                      });
                    }}
                  />
                }
                label={formData.restrictedStatus === 'Restrict' ? 'Restrict' : 'Non-Restrict'}
              />
            </Grid>
            {/* Allow Changing Floor */}
            {/* <Grid size={12}>
              <CustomFormLabel htmlFor="allow-floor-change">Allow Floor Change</CustomFormLabel>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowFloorChange}
                    onChange={(e) => updateField('allowFloorChange', e.target.checked)}
                  />
                }
                label={formData.allowFloorChange ? 'Enabled' : 'Disabled'}
              />
            </Grid> */}
            {/* Assembly Point checkbox */}
            <Grid 
              size={12}
              sx={{
                border: showErrorBorder ? '2px solid red' : '2px solid transparent',
                borderRadius: 2,
                transition: 'border 0.2s ease',
              }}
            >
              <CustomFormLabel htmlFor="isAssemblyPoint">Assembly Point</CustomFormLabel>
              <FormControlLabel
                control={
                  <CustomSwitch
                  id="isAssemblyPoint"
                    checked={formData.isAssemblyPoint}
                    onChange={(e: any) => {
                      if (e.target.checked && formData.restrictedStatus === 'Restrict') {
                        toast.error('Assembly Point cannot be Restricted');
                        setShowErrorBorder(true);
                        setTimeout(() => setShowErrorBorder(false), 2000);
                        return;
                      }
                      updateField('isAssemblyPoint', e.target.checked);
                    }}
                  />
                }
                label={formData.isAssemblyPoint ? 'Yes' : 'No'}
              />
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
          bgcolor: 'background.paper',
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
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Create New Label</DialogTitle>

        <DialogContent>
          <CustomTextField
            fullWidth
            value={newLabelName}
            onChange={(e: any) => setNewLabelName(e.target.value)}
            placeholder="Enter label name"
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AreaDetailList;
