import {
  Button,
  Box,
  Grid2 as Grid,
  MenuItem,
  SelectChangeEvent,
  Typography,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import {
  addGeoFencingAlarm,
  DrawGeoFence,
  editGeoFencingAlarm,
  fetchGeoFencingAlarms,
  SaveSelectedGeoFencingAlarm,
  SetSelectedGeoFencingAlarm,
  UpdateSelectedGeoFencingAlarm,
} from 'src/store/apps/alarmsetting/geofencing';
import FloorplanSelect from 'src/components/shared/FloorplanSelect';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { defaultGeoFencingFilter } from 'src/store/apps/defaultForm';

const GeoFencingDetailList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    dispatch(fetchBuildings());
    dispatch(fetchFloors());
    dispatch(fetchFloorplan());
    dispatch(fetchMaskedAreas());
  }, [dispatch]);

  const geoFenceData = useSelector(
    (state: RootState) => state.GeoFencingReducer.selectedGeoFencingAlarm,
  );

  const buildings = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const floors = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplans = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const maskedAreas = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);

  const filteredMaskedAreas = maskedAreas.filter(
    (ma) => ma.floorplanId === geoFenceData?.floorplanId,
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Handle input change logic here
  };

  const handleCancel = () => {
    dispatch(SetSelectedGeoFencingAlarm(null));
    navigate('/alarmsetting/geofencing');
  };

  const handleSave = async () => {
    if (!geoFenceData) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      Object.entries(geoFenceData).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          formData.append(key, value ? '1' : '0'); // ✅ convert bool → "1"/"0"
        } else if (value !== undefined && value !== null) {
          formData.append(key, value as any);
        }
      });
      let result;
      if(geoFenceData.id.startsWith('GeoFence-')){
        result = await dispatch(addGeoFencingAlarm(geoFenceData));
      } else {
        result = await dispatch(editGeoFencingAlarm(geoFenceData));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchGeoFencingAlarms(defaultGeoFencingFilter));
        console.log('GeoFence Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving organization:', error);
    } finally {
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    }
  };

  const handleClose = () => {
    // setFormData({} as OrganizationType);
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
          Geofence Details
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
              />
            </Grid>
            <Grid size={12}>
              <CustomFormLabel>Floorplan</CustomFormLabel>
              <FloorplanSelect
                buildings={buildings}
                floors={floors}
                floorplans={floorplans}
                value={geoFenceData?.floorplanId ?? ''} // or wherever you store floorplanId
                onChange={(fpId) => {
                  dispatch(UpdateSelectedGeoFencingAlarm({ floorplanId: fpId, floorId: findFloorId(fpId) }));
                }}
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
                    filteredMaskedAreas.find((ma) => ma.areaShape === geoFenceData?.areaShape)
                      ?.id || ''
                  }
                  onChange={(e: React.ChangeEvent<{ value: unknown }>) => {
                    const selectedId = e.target.value as string;
                    const selectedArea = filteredMaskedAreas.find((ma) => ma.id === selectedId);

                    if (selectedArea) {
                      dispatch(
                        UpdateSelectedGeoFencingAlarm({
                          areaShape: selectedArea.areaShape, // ✅ set geofence's areaShape
                          nodes: selectedArea.nodes, // ✅ set geofence's nodes
                        }),
                      );
                    }
                  }}
                  variant="outlined"
                  fullWidth
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
                        dispatch(DrawGeoFence(geoFenceData.id))}}
                    >
                      Create New Area
                    </Button>
                  </Box>
                )}
              </Grid>
            )}

            <Grid size={12}>
              <CustomFormLabel htmlFor="area-color" required>
                Area Color
              </CustomFormLabel>
              <input
                type="color"
                id="color"
                value={geoFenceData?.color || '#000000'} // Default to black if no color is set
                onChange={(e) => {
                  const hexColor = e.target.value; // Get the selected color in hex format
                  dispatch(UpdateSelectedGeoFencingAlarm({ color: hexColor })); // Update Redux state
                  //   setFormData((prev) => ({ ...prev, color: hexColor })); // Update formData
                  // console.log(hexColor);
                }}
                style={{
                  width: '100%',
                  height: '40px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '5px',
                  boxSizing: 'border-box',
                }}
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

export default GeoFencingDetailList;
