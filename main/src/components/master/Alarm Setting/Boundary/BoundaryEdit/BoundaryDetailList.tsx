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
  addBoundaryAlarm,
  DrawBoundary,
  editBoundaryAlarm,
  fetchBoundaryAlarms,
  SaveSelectedBoundaryAlarm,
  SetSelectedBoundaryAlarm,
  UpdateSelectedBoundaryAlarm,
} from 'src/store/apps/alarmsetting/boundary';
import FloorplanSelect from 'src/components/shared/FloorplanSelect';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { defaultBoundaryFilter } from 'src/store/apps/defaultForm';

const BoundaryDetailList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    dispatch(fetchBuildings());
    dispatch(fetchFloors());
    dispatch(fetchFloorplan());
    dispatch(fetchMaskedAreas());
  }, [dispatch]);

  const overPopulateData = useSelector(
    (state: RootState) => state.BoundaryReducer.selectedBoundaryAlarm,
  );

  const buildings = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const floors = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplans = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const maskedAreas = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);

  const filteredMaskedAreas = maskedAreas.filter(
    (ma: MaskedAreaType) => ma.floorplanId === overPopulateData?.floorplanId,
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Handle input change logic here
  };

  const handleCancel = () => {
    dispatch(SetSelectedBoundaryAlarm(null));
    navigate('/alarmsetting/boundary');
  };

  const handleSave = async () => {
    if (!overPopulateData) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      Object.entries(overPopulateData).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          formData.append(key, value ? '1' : '0'); // ✅ convert bool → "1"/"0"
        } else if (value !== undefined && value !== null) {
          formData.append(key, value as any);
        }
      });
      let result;
      if (overPopulateData.id.startsWith('Boundary-')) {
        result = await dispatch(addBoundaryAlarm(overPopulateData));
      } else {
        result = await dispatch(editBoundaryAlarm(overPopulateData));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchBoundaryAlarms(defaultBoundaryFilter));
        console.log('Boundary Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving alarm:', error);
    } finally {
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    }
  };

  const handleClose = () => {
    // setFormData({} as OrganizationType);
    navigate('/alarmsetting/overpopulating');
  };

  // Define required fields
  const requiredFields = ['name', 'color', 'areaShape'];

  // Validation function
  const isFormValid = () => {
    if (overPopulateData === null) return false;
    return requiredFields.every(
      (field) => overPopulateData[field as keyof typeof overPopulateData]?.toString().trim() !== '',
    );
  };

  const findFloorId = (fpId: string) => {
    const floor = floorplans.find((f: FloorplanType) => f.id === fpId);
    return floor?.floorId;
  };

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
                value={overPopulateData?.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(UpdateSelectedBoundaryAlarm({ name: e.target.value }));
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
                value={overPopulateData?.remarks || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(UpdateSelectedBoundaryAlarm({ remarks: e.target.value }));
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
                value={overPopulateData?.floorplanId ?? ''} // or wherever you store floorplanId
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
            {overPopulateData?.floorplanId && (
              <Grid size={12}>
                {overPopulateData?.areaShape === '' && (
                  <Box mt={2} textAlign="center">
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        console.log('overPopulateData: ', overPopulateData.id);
                        dispatch(DrawBoundary(overPopulateData.id));
                      }}
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
                value={overPopulateData?.color || '#000000'} // Default to black if no color is set
                onChange={(e) => {
                  const hexColor = e.target.value; // Get the selected color in hex format
                  dispatch(UpdateSelectedBoundaryAlarm({ color: hexColor })); // Update Redux state
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
            <Grid size={12}>
              <CustomFormLabel>Direction</CustomFormLabel>
              <CustomSelect
                id="direction"
                value={overPopulateData?.direction || '0'} // default Both Direction
                onChange={(e: SelectChangeEvent<string>) => {
                  const value = e.target.value;
                  dispatch(UpdateSelectedBoundaryAlarm({ direction: value }));
                }}
                variant="outlined"
                fullWidth
              >
                <MenuItem value="1">A to B</MenuItem>
                <MenuItem value="2">B to A</MenuItem>
                <MenuItem value="0">Both Direction</MenuItem>
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

export default BoundaryDetailList;
