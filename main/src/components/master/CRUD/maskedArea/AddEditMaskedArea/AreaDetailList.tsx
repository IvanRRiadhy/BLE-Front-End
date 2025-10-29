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
import Scrollbar from 'src/components/custom-scroll/Scrollbar';

const AreaDetailList = () => {
  // const [open, setOpen] = useState(false);
  const area = useSelector((state: RootState) => state.maskedAreaReducer.editingMaskedArea);
  const [formData, setFormData] = useState({
    id: area?.id || '',
    name: area?.name || '',
    colorArea: area?.colorArea || '',
    areaShape: area?.areaShape || '',
    restrictedStatus:
      restrictedStatus.find((s) => s.value === (area?.restrictedStatus || ''))?.value || '',
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
      // console.log('Area data changed:', area);
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
      // console.log('Current Form Data:', formData);
      // console.log('New Form Data:', newFormData);
      if (!isEqual(formData, newFormData)) {
        setFormData(newFormData);
      }
    }
  }, [area]);

  const dispatch: AppDispatch = useDispatch();

  const handleClose = () => {
    // setOpen(false);
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
      // console.log(formData);
      // console.log('Masked Area saved successfully!', formData);
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
    <Box
      sx={{
        height: '80vh',
        display: 'grid',
        minHeight: 0,
        gridTemplateRows: 'auto 1fr auto',
        overflow: 'hidden',
        bgColor: 'background.paper',
        borderColor: 'divider',
      }}
    >
      <Box p={3} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Edit Masked Area Details
        </Typography>
      </Box>
      <Box sx={{ minHeight: 0, overflow: 'auto' }}>
        <Box pl={3} pr={1}>
          <Grid container spacing={1}>
            <Grid size={12}>
              <CustomFormLabel htmlFor="area-name">Area Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                variant="outlined"
                fullWidth
              />
            </Grid>
            {/* <Grid size={12}>
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
                </Grid> */}
            <Grid size={12}>
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
                  {[
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
                  ].map((color) => (
                    <Box
                      key={color}
                      onClick={() => setFormData((prev) => ({ ...prev, colorArea: color }))}
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

                {/* Optional: show selected color hex */}
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
                  {restrictedStatus.map((status) => (
                    // console.log(status),
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
              {/* <Grid size={12}>
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
                                Node{index + 1}: ID: {node.id}, (x: {node.x}, y: {node.y}) (x_px:{' '}
                                {node.x_px}, y_px: {node.y_px})
                              </Typography>
                            </Box>
                          ))}
                        </>
                      )}
                    </Box>
                  </Grid> */}
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

export default AreaDetailList;
