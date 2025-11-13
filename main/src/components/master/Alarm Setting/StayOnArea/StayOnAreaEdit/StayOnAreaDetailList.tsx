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
import { 
  useAddStayOnAreaAlarm,
  useEditStayOnAreaAlarm
} from 'src/hooks/AlarmSetting/useStayOnArea';

// Import building/floor hooks from their respective locations
import { useAllBuilding as useBuildingsHook } from 'src/hooks/useBuilding';
import { useAllFloors as useFloorsHook } from 'src/hooks/useFloor';
import { useAllFloorplans as useFloorplansHook } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas as useMaskedAreasHook } from 'src/hooks/useMaskedArea';

// Import Redux actions for form state management
import {
  DrawStayOnArea,
  SetSelectedStayOnAreaAlarm,
  UpdateSelectedStayOnAreaAlarm,
} from 'src/store/apps/alarmsetting/stayonarea';

const StayOnAreaDetailList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Use React Query hooks for data fetching
  const { data: buildings = [] } = useBuildingsHook();
  const { data: floors = [] } = useFloorsHook();
  const { data: floorplans = [] } = useFloorplansHook();
  const { data: maskedAreas = [] } = useMaskedAreasHook();

  // Use React Query mutations
  const { mutate: addAlarm, isPending: isAdding } = useAddStayOnAreaAlarm();
  const { mutate: editAlarm, isPending: isEditing } = useEditStayOnAreaAlarm();

  const stayOnAreaData = useSelector(
    (state: RootState) => state.StayOnAreaReducer.selectedStayOnAreaAlarm,
  );

  const filteredMaskedAreas = maskedAreas.filter(
    (ma) => ma.floorplanId === stayOnAreaData?.floorplanId,
  );

  const handleCancel = () => {
    dispatch(SetSelectedStayOnAreaAlarm(null));
    navigate('/alarmsetting/stayonarea');
  };

  const handleSave = async () => {
    if (!stayOnAreaData) return;
    setIsSaving(true);

    const saveOperation = stayOnAreaData.id.startsWith('StayOnArea-') 
      ? addAlarm 
      : editAlarm;

    saveOperation(stayOnAreaData, {
      onSuccess: () => {
        console.log('StayOnArea Saved!');
        toast.success('Data Saved');
        handleClose();
      },
      onError: (error) => {
        toast.error('Saving Data Unsuccessful');
        console.error('Error saving stay on area alarm:', error);
      },
      onSettled: () => {
        setIsSaving(false);
      }
    });
  };

  const handleClose = () => {
    navigate('/alarmsetting/stayonarea');
  };

  // Define required fields
  const requiredFields = ['name', 'color', 'areaShape', 'maxDuration'];

  // Validation function
  const isFormValid = () => {
    if (stayOnAreaData === null) return false;
    return requiredFields.every(
      (field) => stayOnAreaData[field as keyof typeof stayOnAreaData]?.toString().trim() !== '',
    );
  };

  const findFloorId = (fpId: string) => {
    const floor = floorplans.find((f) => f.id === fpId);
    return floor?.floorId;
  };

  const saving = isSaving || isAdding || isEditing;

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
        <Typography variant="h5" fontWeight={700} textAlign="left">
          Details
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ minHeight: 600, overflow: 'auto' }}>
        <Box pl={3} pr={1}>
          <Grid container spacing={1}>
            <Grid size={12}>
              <CustomFormLabel>Stay On Area Alarm Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={stayOnAreaData?.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(UpdateSelectedStayOnAreaAlarm({ name: e.target.value }));
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
                value={stayOnAreaData?.remarks || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(UpdateSelectedStayOnAreaAlarm({ remarks: e.target.value }));
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
                value={stayOnAreaData?.floorplanId ?? ''}
                onChange={(fpId) => {
                  dispatch(
                    UpdateSelectedStayOnAreaAlarm({
                      floorplanId: fpId,
                      floorId: findFloorId(fpId),
                    }),
                  );
                }}
              />
            </Grid>
            {stayOnAreaData?.floorplanId && (
              <Grid size={12}>
                <Box display="flex" alignItems="center">
                  <CustomFormLabel>Masked Area (Optional)</CustomFormLabel>
                  <Tooltip title="Use Area for StayOnArea">
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
                    filteredMaskedAreas.find((ma) => ma.areaShape === stayOnAreaData?.areaShape)
                      ?.id || ''
                  }
                  onChange={(e: React.ChangeEvent<{ value: unknown }>) => {
                    const selectedId = e.target.value as string;
                    const selectedArea = filteredMaskedAreas.find((ma) => ma.id === selectedId);

                    if (selectedArea) {
                      dispatch(
                        UpdateSelectedStayOnAreaAlarm({
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
                  {filteredMaskedAreas.map((ma) => (
                    <MenuItem key={ma.id} value={ma.id}>
                      {ma.name}
                    </MenuItem>
                  ))}
                </CustomSelect>

                {stayOnAreaData?.areaShape === '' && (
                  <Box mt={2} textAlign="center">
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      ----- OR -----
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        console.log('stayOnAreaData: ', stayOnAreaData.id);
                        dispatch(DrawStayOnArea(stayOnAreaData.id));
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
              <CustomFormLabel htmlFor="area-color">
                Area Color
              </CustomFormLabel>
              <input
                type="color"
                id="color"
                value={stayOnAreaData?.color || '#000000'}
                onChange={(e) => {
                  const hexColor = e.target.value;
                  dispatch(UpdateSelectedStayOnAreaAlarm({ color: hexColor }));
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
              <CustomFormLabel>Area Max Duration (minutes)</CustomFormLabel>
              <CustomTextField
                id="maxDuration"
                value={stayOnAreaData?.maxDuration || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  const parsedValue = value.replace(/\D/g, '');
                  dispatch(UpdateSelectedStayOnAreaAlarm({ maxDuration: Number(parsedValue) }));
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

export default StayOnAreaDetailList;