import {
  Button,
  Box,
  Grid2 as Grid,
  MenuItem,
  SelectChangeEvent,
  Typography,
  Divider,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  EditUnsavedMaskedArea,
  fetchMaskedAreas,
  MaskedAreaType,
  SelectEditingMaskedArea,
  SelectMaskedArea,
  RevertMaskedArea,
  SaveMaskedArea,
  GetUnsavedMaskedArea,
} from 'src/store/apps/crud/maskedArea';
import { restrictedStatus } from 'src/types/crud/input';
import isEqual from 'lodash/isEqual';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';

const AreaDetailList = () => {
  const [open, setOpen] = useState(false);
  const area = useSelector((state: RootState) => state.maskedAreaReducer.editingMaskedArea);
  const [formData, setFormData] = useState({
    id: area?.id || '',
    name: area?.name || '',
    colorArea: area?.colorArea || '',
    areaShape: area?.areaShape || '',
    restrictedStatus:
      restrictedStatus.find((s) => s.value === (area?.restrictedStatus || '').toLowerCase())
        ?.value || '',
    wideArea: area?.wideArea || 0,
    positionPxX: area?.positionPxX || 0,
    positionPxY: area?.positionPxY || 0,
    engineAreaId: area?.engineAreaId || '',
    floorId: area?.floorId || '',
    floorplanId: area?.floorplanId || '',
    createdBy: area?.createdBy || '',
    createdAt: area?.createdAt || '',
    updatedBy: area?.updatedBy || '',
    updatedAt: area?.updatedAt || '',
  });

  useEffect(() => {
    if (area) {
      console.log('Area data changed:', area);
      const newFormData = {
        id: area.id || '',
        name: formData.name || '',
        colorArea: formData.colorArea || '',
        areaShape: area.areaShape || '',
        restrictedStatus: formData.restrictedStatus || '',
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
      console.log('Current Form Data:', formData);
      console.log('New Form Data:', newFormData);
      if (!isEqual(formData, newFormData)) {
        setFormData(newFormData);
      }
    }
  }, [area]);

  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    // dispatch(fetchMaskedAreas());
    console.log('Masked Areas fetched', area);
  }, [dispatch]);

  const handleClose = () => {
    setOpen(false);
    setFormData({
      id: area?.id || '',
      name: area?.name || '',
      colorArea: area?.colorArea || '',
      areaShape: area?.areaShape || '',
      restrictedStatus: area?.restrictedStatus || '',
      wideArea: area?.wideArea || 0,
      positionPxX: area?.positionPxX || 0,
      positionPxY: area?.positionPxY || 0,
      engineAreaId: area?.engineAreaId || '',
      floorId: area?.floorId || '',
      floorplanId: area?.floorplanId || '',
      createdBy: area?.createdBy || '',
      createdAt: area?.createdAt || '',
      updatedBy: area?.updatedBy || '',
      updatedAt: area?.updatedAt || '',
    });
    dispatch(SelectEditingMaskedArea(null));
    dispatch(SelectMaskedArea(null));
  };

  // Define required fields
  const requiredFields = ['name', 'colorArea', 'restrictedStatus'];

  // Validation function
  const isFormValid = () => {
    return requiredFields.every(
      (field) => formData[field as keyof typeof formData]?.toString().trim() !== '',
    );
  };

  const handleSave = async () => {
    try {
      await dispatch(EditUnsavedMaskedArea(formData));
      await dispatch(SaveMaskedArea(formData.id));
      console.log(formData);
      console.log('Masked Area saved successfully!');
      // await dispatch(GetUnsavedMaskedArea());
      handleClose();
    } catch (error) {
      console.log('Error saving device: ', error);
    }
  };

  const handleCancel = () => {
    dispatch(RevertMaskedArea(formData.id));
    handleClose();
  };

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    setFormData((prev) => ({ ...prev, [id || name]: value }));
    // await dispatch(EditUnsavedMaskedArea(formData));
  };

  return (
    <Box display="flex" flexDirection="column" height="84vh">
      <Box display="flex" flexDirection="column" height="100vh">
        <Box p={3} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" fontWeight={700} mb={2}>
            Edit Masked Area Details
          </Typography>
        </Box>
        <Box flex="1" overflow="hidden">
          <Scrollbar
            sx={{ height: { lg: 'calc(100vh - 300px)' }, width: '100%', maxHeight: 'fit-content' }}
          >
            <Box pl={3} pr={1}>
              <Grid container spacing={1}>
                <Grid size={12}>
                  <CustomFormLabel htmlFor="area-name" required>
                    Area Name
                  </CustomFormLabel>
                  <CustomTextField
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
                <Grid size={12}>
                  <CustomFormLabel htmlFor="area-shape" required>
                    Area Shape
                  </CustomFormLabel>
                  <CustomTextField
                    id="areaShape"
                    value={formData.areaShape}
                    onChange={handleInputChange}
                    variant="outlined"
                    fullWidth
                    disabled
                  />
                </Grid>
                <Grid size={12}>
                  <Grid size={12}>
                    <CustomFormLabel htmlFor="area-color" required>
                      Area Color
                    </CustomFormLabel>
                    <input
                      type="color"
                      id="colorArea"
                      value={formData.colorArea}
                      onChange={(e) => {
                        const hexColor = e.target.value; // Get the selected color in hex format
                        setFormData((prev) => ({ ...prev, colorArea: hexColor })); // Update formData
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
                    <CustomFormLabel htmlFor="area-restriction">Area Restriction</CustomFormLabel>
                    <CustomSelect
                      id="restrictedStatus"
                      name="restrictedStatus"
                      value={formData.restrictedStatus || ''}
                      onChange={handleInputChange}
                      fullWidth
                      variant="outlined"
                      required
                    >
                      {restrictedStatus.map(
                        (status) => (
                          console.log(status),
                          (
                            <MenuItem
                              key={status.value}
                              value={status.value}
                              disabled={status.disabled || false}
                            >
                              {status.label}
                            </MenuItem>
                          )
                        ),
                      )}
                    </CustomSelect>
                  </Grid>
                  <Grid size={12}>
                    <CustomFormLabel htmlFor="nodes" required>
                      Area Nodes
                    </CustomFormLabel>
                    <Box
                      sx={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '10px',
                        marginTop: '10px',
                      }}
                    >
                      {formData.areaShape && (
                        <>
                          {JSON.parse(formData.areaShape).map((node: any, index: number) => (
                            <Box
                              key={node.id || index}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '5px 0',
                                borderBottom: '1px solid #eee',
                              }}
                            >
                              <Typography variant="body2">
                                Node {index + 1}: (x: {node.x}, y: {node.y})
                              </Typography>
                            </Box>
                          ))}
                        </>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          </Scrollbar>
        </Box>
      </Box>
      <Box
        p={2}
        sx={{
          position: 'fixed',
          bottom: '0',
          left: '10',
          width: '260px',
          height: '80px',
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
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

export default AreaDetailList;
