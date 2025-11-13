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
import React, { useEffect, useState } from 'react';
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
  useAddGeoFencingAlarm,
  useEditGeoFencingAlarm
} from 'src/hooks/AlarmSetting/useGeofence';

// Import Redux actions (for form state management)
import {
  DrawGeoFence,
  SaveSelectedGeoFencingAlarm,
  SetSelectedGeoFencingAlarm,
  UpdateSelectedGeoFencingAlarm,
} from 'src/store/apps/alarmsetting/geofencing';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { FloorplanType } from 'src/store/apps/crud/floorplan';

const GeoFencingDetailList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Use React Query hooks for data fetching
  const { data: buildings = [] } = useAllBuilding();
  const { data: floors = [] } = useAllFloors();
  const { data: floorplans = [] } = useAllFloorplans();
  const { data: maskedAreas = [] } = useAllMaskedAreas();

  // Use React Query mutations
  const { mutate: addAlarm, isPending: isAdding } = useAddGeoFencingAlarm();
  const { mutate: editAlarm, isPending: isEditing } = useEditGeoFencingAlarm();

  const geoFenceData = useSelector(
    (state: RootState) => state.GeoFencingReducer.selectedGeoFencingAlarm,
  );

  const filteredMaskedAreas = maskedAreas.filter(
    (ma) => ma.floorplanId === geoFenceData?.floorplanId,
  );

  const handleCancel = () => {
    dispatch(SetSelectedGeoFencingAlarm(null));
    navigate('/alarmsetting/geofencing');
  };

  const handleSave = async () => {
    if (!geoFenceData) return;
    setIsSaving(true);

    const saveOperation = geoFenceData.id.startsWith('GeoFence-') 
      ? addAlarm 
      : editAlarm;

    saveOperation(geoFenceData, {
      onSuccess: () => {
        console.log('GeoFence Saved!');
        toast.success('Data Saved');
        handleClose();
      },
      onError: (error: any) => {
        toast.error('Saving Data Unsuccessful');
        console.error('Error saving geo fence:', error);
      },
      onSettled: () => {
        setIsSaving(false);
      }
    });
  };

  const handleClose = () => {
    navigate('/alarmsetting/geofencing');
  };

  // Define required fields
  const requiredFields = ['name', 'color', 'areaShape'];

  // Validation function
  const isFormValid = () => {
    if (geoFenceData === null) return false;
    return requiredFields.every(
      (field) => geoFenceData[field as keyof typeof geoFenceData]?.toString().trim() !== '',
    );
  };

  const findFloorId = (fpId: string) => {
    const floor = floorplans.find((f: FloorplanType) => f.id === fpId);
    return floor?.floorId;
  }

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
              <CustomFormLabel>GeoFence Alarm Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={geoFenceData?.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(UpdateSelectedGeoFencingAlarm({ name: e.target.value }));
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
                value={geoFenceData?.remarks || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(UpdateSelectedGeoFencingAlarm({ remarks: e.target.value }));
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
                value={geoFenceData?.floorplanId ?? ''}
                onChange={(fpId) => {
                  dispatch(UpdateSelectedGeoFencingAlarm({ 
                    floorplanId: fpId, 
                    floorId: findFloorId(fpId) 
                  }));
                }}
                // disabled={saving}
              />
            </Grid>
            {geoFenceData?.floorplanId && (
              <Grid size={12}>
                <Box display="flex" alignItems="center">
                  <CustomFormLabel>Masked Area (Optional)</CustomFormLabel>
                  <Tooltip title="Use Area for GeoFence">
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
                    filteredMaskedAreas.find((ma: MaskedAreaType) => ma.areaShape === geoFenceData?.areaShape)
                      ?.id || ''
                  }
                  onChange={(e: React.ChangeEvent<{ value: unknown }>) => {
                    const selectedId = e.target.value as string;
                    const selectedArea = filteredMaskedAreas.find((ma: MaskedAreaType) => ma.id === selectedId);

                    if (selectedArea) {
                      dispatch(
                        UpdateSelectedGeoFencingAlarm({
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

                {geoFenceData?.areaShape === '' && (
                  <Box mt={2} textAlign="center">
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      ----- OR -----
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        console.log("geoFenceData: ", geoFenceData.id);
                        dispatch(DrawGeoFence(geoFenceData.id));
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
                value={geoFenceData?.color || '#000000'}
                onChange={(e) => {
                  const hexColor = e.target.value;
                  dispatch(UpdateSelectedGeoFencingAlarm({ color: hexColor }));
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

export default GeoFencingDetailList;