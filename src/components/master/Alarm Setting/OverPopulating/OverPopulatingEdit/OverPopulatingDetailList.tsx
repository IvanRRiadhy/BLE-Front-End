import {
  Button,
  Box,
  Grid2 as Grid,
  MenuItem,
  Typography,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import React, { useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import FloorplanSelect from 'src/components/shared/FloorplanSelect';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';

// Import React Query hooks
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import {
  useAddOverPopulatingAlarm,
  useEditOverPopulatingAlarm,
} from 'src/hooks/AlarmSetting/useOverPopulate';

// Import Redux actions (for form state management)
import {
  DrawOverPopulating,
  SetSelectedOverPopulatingAlarm,
  UpdateSelectedOverPopulatingAlarm,
} from 'src/store/apps/alarmsetting/overpopulating';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';

const OverPopulatingDetailList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Use React Query hooks for data fetching
  const { data: buildings = [] } = useAllBuilding();
  const { data: floors = [] } = useAllFloors();
  const { data: floorplans = [] } = useAllFloorplans();
  const { data: maskedAreas = [] } = useAllMaskedAreas();

  // Use React Query mutations
  const { mutate: addAlarm, isPending: isAdding } = useAddOverPopulatingAlarm();
  const { mutate: editAlarm, isPending: isEditing } = useEditOverPopulatingAlarm();

  const overPopulateData = useSelector(
    (state: RootState) => state.OverPopulatingReducer.selectedOverPopulatingAlarm,
  );

  const filteredMaskedAreas = maskedAreas.filter(
    (ma: MaskedAreaType) => ma.floorplanId === overPopulateData?.floorplanId,
  );

  const handleCancel = () => {
    dispatch(SetSelectedOverPopulatingAlarm(null));
    navigate('/alarmsetting/overpopulating');
  };

  const handleSave = async () => {
    if (!overPopulateData) return;
    setIsSaving(true);

    const saveOperation = overPopulateData.id.startsWith('OverPopulating-') ? addAlarm : editAlarm;

    saveOperation(overPopulateData, {
      onSuccess: () => {
        console.log('OverPopulating Saved!');
        toast.success('Data Saved');
        handleClose();
      },
      onError: (error) => {
        toast.error('Saving Data Unsuccessful');
        console.error('Error saving over-populating alarm:', error);
      },
      onSettled: () => {
        setIsSaving(false);
      },
    });
  };

  const handleClose = () => {
    navigate('/alarmsetting/overpopulating');
  };

  // Define required fields
  const requiredFields = ['name', 'color', 'areaShape', 'maxCapacity'];

  // Validation function
  const isFormValid = () => {
    if (overPopulateData === null) return false;
    return requiredFields.every((field) => {
      const value = overPopulateData[field as keyof typeof overPopulateData];
      if (field === 'maxCapacity') {
        return value !== undefined && value !== null && Number(value) > 0;
      }
      return value?.toString().trim() !== '';
    });
  };

  const findFloorId = (fpId: string) => {
    const floor = floorplans.find((f) => f.id === fpId);
    return floor?.floorId;
  };

  const saving = isSaving || isAdding || isEditing;

  return (
    <Box
      sx={{
        height: '90vh',
        display: 'grid',
        minHeight: 0,
        gridTemplateRows: 'auto 1fr auto',
        overflow: 'hidden',
        bgColor: 'background.default',
        borderColor: 'divider',
      }}
    >
      <Box
        p={3}
        px={2}
        display="flex"
        justifyContent="flex-start"
        alignItems="center"
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="h5" fontWeight={700} textAlign="left">
          Details
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ minHeight: 600, overflow: 'auto' }}>
        <Box pl={3} pr={1}>
          <Grid container spacing={1}>
            <Grid size={12}>
              <CustomFormLabel>OverPopulating Alarm Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={overPopulateData?.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(UpdateSelectedOverPopulatingAlarm({ name: e.target.value }));
                }}
                variant="outlined"
                fullWidth
                required
                disabled={saving}
              />
            </Grid>
            <Grid size={12}>
              <CustomFormLabel>Details</CustomFormLabel>
              <CustomTextField
                id="remarks"
                value={overPopulateData?.remarks || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(UpdateSelectedOverPopulatingAlarm({ remarks: e.target.value }));
                }}
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                disabled={saving}
              />
            </Grid>
            <Grid size={12}>
              <CustomFormLabel>Floorplan</CustomFormLabel>
              <FloorplanSelect
                buildings={buildings}
                floors={floors}
                floorplans={floorplans}
                value={overPopulateData?.floorplanId ?? ''}
                onChange={(fpId) => {
                  dispatch(
                    UpdateSelectedOverPopulatingAlarm({
                      floorplanId: fpId,
                      floorId: findFloorId(fpId),
                    }),
                  );
                }}
                // disabled={saving}
              />
            </Grid>
            {overPopulateData?.floorplanId && (
              <Grid size={12}>
                <Box display="flex" alignItems="center">
                  <CustomFormLabel>Masked Area (Optional)</CustomFormLabel>
                  <Tooltip title="Use Area for OverPopulating">
                    <IconButton size="small" sx={{ color: 'text.secondary', p: 0.5 }}>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: '1px solid',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          lineHeight: 1,
                        }}
                      >
                        ?
                      </Typography>
                    </IconButton>
                  </Tooltip>
                </Box>
                <CustomSelect
                  id="areaShape"
                  value={
                    filteredMaskedAreas.find((ma) => ma.areaShape === overPopulateData?.areaShape)
                      ?.id || ''
                  }
                  onChange={(e: React.ChangeEvent<{ value: unknown }>) => {
                    const selectedId = e.target.value as string;
                    const selectedArea = filteredMaskedAreas.find((ma) => ma.id === selectedId);

                    if (selectedArea) {
                      dispatch(
                        UpdateSelectedOverPopulatingAlarm({
                          areaShape: selectedArea.areaShape,
                          nodes: selectedArea.nodes,
                        }),
                      );
                    }
                  }}
                  variant="outlined"
                  fullWidth
                  disabled={saving}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {filteredMaskedAreas.map((ma: MaskedAreaType) => (
                    <MenuItem key={ma.id} value={ma.id}>
                      {ma.name}
                    </MenuItem>
                  ))}
                </CustomSelect>

                {overPopulateData?.areaShape === '' && (
                  <Box mt={2} textAlign="center">
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      ----- OR -----
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        console.log('overPopulateData: ', overPopulateData.id);
                        dispatch(DrawOverPopulating(overPopulateData.id));
                      }}
                      disabled={saving}
                    >
                      Create New Area
                    </Button>
                  </Box>
                )}
              </Grid>
            )}

            <Grid size={12}>
              <CustomFormLabel htmlFor="area-color">Area Color</CustomFormLabel>
              <input
                type="color"
                id="color"
                value={overPopulateData?.color || '#000000'}
                onChange={(e) => {
                  const hexColor = e.target.value;
                  dispatch(UpdateSelectedOverPopulatingAlarm({ color: hexColor }));
                }}
                style={{
                  width: '100%',
                  height: '40px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '5px',
                  boxSizing: 'border-box',
                }}
                disabled={saving}
              />
            </Grid>
            <Grid size={12} mb={2}>
              <CustomFormLabel>Area Max Capacity</CustomFormLabel>
              <CustomTextField
                id="maxCapacity"
                value={overPopulateData?.maxCapacity || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  const parsedValue = value.replace(/\D/g, '');
                  dispatch(UpdateSelectedOverPopulatingAlarm({ maxCapacity: Number(parsedValue) }));
                }}
                variant="outlined"
                fullWidth
                required
                inputProps={{
                  inputMode: 'numeric',
                }}
                disabled={saving}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Box
        p={2}
        bottom={0}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fafafa',
          m: 0,
        }}
      >
        <Box display="flex" justifyContent="space-between">
          <Button variant="outlined" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!isFormValid() || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default OverPopulatingDetailList;
