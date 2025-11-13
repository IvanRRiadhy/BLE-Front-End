import {
  Button,
  Box,
  Grid2 as Grid,
  MenuItem,
  Typography,
  Divider,
  Tooltip,
  IconButton,
  SelectChangeEvent,
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
import { 

  useAddBoundaryAlarm,
  useEditBoundaryAlarm
} from 'src/hooks/AlarmSetting/useBoundary';

// Import external hooks for building/floor data
import { useAllBuilding as useAllBuildings } from 'src/hooks/useBuilding';
import { useAllFloors as useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans as useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas as useAllMaskedAreas } from 'src/hooks/useMaskedArea';

// Import Redux actions for form state management
import {
  DrawBoundary,
  SetSelectedBoundaryAlarm,
  UpdateSelectedBoundaryAlarm,
} from 'src/store/apps/alarmsetting/boundary';

const BoundaryDetailList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Use React Query hooks for data fetching
  const { data: buildings = [] } = useAllBuildings();
  const { data: floors = [] } = useAllFloors();
  const { data: floorplans = [] } = useAllFloorplans();
  const { data: maskedAreas = [] } = useAllMaskedAreas();

  // Use React Query mutations
  const { mutate: addAlarm, isPending: isAdding } = useAddBoundaryAlarm();
  const { mutate: editAlarm, isPending: isEditing } = useEditBoundaryAlarm();

  const boundary = useSelector((state: RootState) => state.BoundaryReducer.selectedBoundaryAlarm);

  const filteredMaskedAreas = maskedAreas.filter(
    (ma) => ma.floorplanId === boundary?.floorplanId,
  );

  const handleCancel = () => {
    dispatch(SetSelectedBoundaryAlarm(null));
    navigate('/alarmsetting/boundary');
  };

  const handleSave = async () => {
    if (!boundary) return;

    const saveOperation = boundary.id.startsWith('Boundary-') 
      ? addAlarm 
      : editAlarm;

    saveOperation(boundary, {
      onSuccess: () => {
        console.log('Boundary Saved!');
        toast.success('Data Saved');
        handleClose();
      },
      onError: (error) => {
        toast.error('Saving Data Unsuccessful');
        console.error('Error saving boundary alarm:', error);
      },
    });
  };

  const handleClose = () => {
    navigate('/alarmsetting/boundary');
  };

  // Define required fields
  const requiredFields = ['name', 'color', 'areaShape'];

  // Validation function
  const isFormValid = () => {
    if (boundary === null) return false;
    return requiredFields.every(
      (field) => boundary[field as keyof typeof boundary]?.toString().trim() !== '',
    );
  };

  const findFloorId = (fpId: string) => {
    const floor = floorplans.find((f) => f.id === fpId);
    return floor?.floorId;
  };

  const saving = isAdding || isEditing;

  return (
    <Box
      sx={{
        height: '80vh',
        display: 'grid',
        minHeight: 0,
        gridTemplateRows: 'auto 1fr auto',
        overflow: 'hidden',
        bgColor: 'background.default',
        borderColor: 'divider',
      }}
    >
      <Box p={3} px={2} display="flex" justifyContent="flex-start" alignItems="center">
        <Typography variant="h5" mb={2} fontWeight={700} textAlign="left">
          Alarm Details
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ minHeight: 600, overflow: 'auto' }}>
        <Box pl={3} pr={1}>
          <Grid container spacing={1}>
            <Grid size={12}>
              <CustomFormLabel>Boundary Alarm Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={boundary?.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(UpdateSelectedBoundaryAlarm({ name: e.target.value }));
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
                value={boundary?.remarks || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(UpdateSelectedBoundaryAlarm({ remarks: e.target.value }));
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
                value={boundary?.floorplanId ?? ''}
                onChange={(fpId) => {
                  dispatch(
                    UpdateSelectedBoundaryAlarm({
                      floorplanId: fpId,
                      floorId: findFloorId(fpId),
                    }),
                  );
                }}
              />
            </Grid>
            {boundary?.floorplanId && (
              <Grid size={12}>
                {boundary?.areaShape === '' && (
                  <Box mt={2} textAlign="center">
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        console.log('boundary: ', boundary.id);
                        dispatch(DrawBoundary(boundary.id));
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
              <CustomFormLabel htmlFor="area-color" >
                Area Color
              </CustomFormLabel>
              <input
                type="color"
                id="color"
                value={boundary?.color || '#000000'}
                onChange={(e) => {
                  const hexColor = e.target.value;
                  dispatch(UpdateSelectedBoundaryAlarm({ color: hexColor }));
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
            <Grid size={12}>
              <CustomFormLabel>Direction</CustomFormLabel>
              <CustomSelect
                id="boundaryType"
                value={boundary?.boundaryType ?? 0}
                onChange={(e: SelectChangeEvent<number>) => {
                  const value = Number(e.target.value);
                  dispatch(UpdateSelectedBoundaryAlarm({ boundaryType: value }));
                }}
                variant="outlined"
                fullWidth
                disabled={saving}
              >
                <MenuItem value={1}>A to B</MenuItem>
                <MenuItem value={2}>B to A</MenuItem>
                <MenuItem value={0}>Both Direction</MenuItem>
              </CustomSelect>
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
          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={!isFormValid() || saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default BoundaryDetailList;