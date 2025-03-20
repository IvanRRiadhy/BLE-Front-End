'use client';
import {
  Grid2 as Grid,
  Button,
  Typography,
  IconButton,
  SelectChangeEvent,
  MenuItem,
  Box,
} from '@mui/material';
import CustomFormLabel from '../theme-elements/CustomFormLabel';
import CustomTextField from '../theme-elements/CustomTextField';
import { useSelector, useDispatch, AppDispatch } from 'src/store/Store';
import { gatesType } from 'src/types/tracking/gate';
import {
  fetchGates,
  UpdateGate,
  SelectGate,
  SetEditGate,
  SaveGate,
  RevertGate,
} from 'src/store/apps/tracking/GatesSlice';
import {
  bleReaderType,
  fetchBleReaders,
  UpdateBleReader,
  SetEditBleReader,
  RevertBleReader,
  SelectBleReader,
} from 'src/store/apps/crud/bleReader';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';
import React, { useEffect, useState } from 'react';
import AddGateway from 'src/components/master/gateway/AddGateway';
import IconClose from 'src/assets/images/frontend-pages/icons/icon-close.svg';
import CustomSelect from '../theme-elements/CustomSelect';
import AddEditBleReader from 'src/components/master/CRUD/bleReader/AddEditBleReader';

const GatewayLayout = () => {
  const dispatch: AppDispatch = useDispatch();
  const bleReaderDetails: bleReaderType | null | undefined = useSelector(
    (state) => state.bleReaderReducer.selectedBleReader,
  );
  const brandData: BrandType[] = useSelector((state) => state.brandReducer.brands);
  const [formData, setFormData] = React.useState<bleReaderType>(
    bleReaderDetails || {
      id: '',
      brandId: '',
      name: '',
      mac: '',
      ip: '',
      locationX: 0,
      locationY: 0,
      locationPxX: 0,
      locationPxY: 0,
      engineReaderId: '',
      createdBy: '',
      createdAt: '',
      updatedBy: '',
      updatedAt: '',
    },
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    dispatch(fetchGates());
    dispatch(fetchBleReaders());
    dispatch(fetchBrands());
  }, [dispatch]);

  useEffect(() => {
    if (bleReaderDetails) {
      setFormData(
        bleReaderDetails || {
          id: '',
          brandId: '',
          name: '',
          mac: '',
          ip: '',
          locationX: 0,
          locationY: 0,
          locationPxX: 0,
          locationPxY: 0,
          engineReaderId: '',
          createdBy: '',
          createdAt: '',
          updatedBy: '',
          updatedAt: '',
        },
      );
    }
  }, [bleReaderDetails]);

  if (!bleReaderDetails) {
    return (
      <div>
        <Typography variant="h6" mb={0} mt={5} align="center">
          Please select a Gateway
        </Typography>
        <Typography variant="h6" mb={0} mt={3} align="center">
          Or
        </Typography>
        <Grid mt={3} size={20} display="flex" justifyContent="center">
          <AddEditBleReader type="add" />
        </Grid>
      </div>
    ); // or some other loading indicator
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  // const handleSave = () => {
  //   console.log('formValues: ', formValues);
  //   dispatch(SaveGate());
  //   dispatch(UpdateGate(bleReaderDetails.id, formValues));
  //   setFormValues({
  //     id: bleReaderDetails.id || '',
  //     name: bleReaderDetails.name || '',
  //     posX: bleReaderDetails.locationPxX || 0,
  //     posY: bleReaderDetails.locationPxY || 0,
  //     ip: bleReaderDetails.ip || '',
  //     mac: bleReaderDetails.mac || '',
  //   });
  //   setIsEditing(false);
  //   dispatch(SetEditGate(GatewayDetails.id, false));
  //   dispatch(SelectGate(0));
  // };

  // const handleUpdateClick = () => {
  //   setIsEditing(true);
  //   dispatch(SetEditGate(GatewayDetails.id, true));
  // };
  // const handleCancelClick = () => {
  //   dispatch(RevertGate(GatewayDetails.id));
  //   setFormValues({
  //     id: GatewayDetails.id || '',
  //     name: GatewayDetails.name || '',
  //     posX: GatewayDetails.posX || 0,
  //     posY: GatewayDetails.posY || 0,
  //     color: GatewayDetails.color || '',
  //   });
  //   setIsEditing(false);
  //   dispatch(SetEditGate(GatewayDetails.id, false));
  // };

  const getBrandName = (brandID: string) => {
    const brand = brandData.find((b: BrandType) => b.id === brandID);
    return brand ? brand.name : 'Unknown Brand';
  };

  return (
    <div>
      <Grid
        container
        alignItems="center"
        justifyContent="space-between"
        sx={{
          position: 'relative',
          padding: '16px',
          borderBottom: '1px solid #ddd',
          backgroundColor: 'white',
          zIndex: 1000,
        }}
      >
        <Typography variant="h6" pl={1} sx={{ flex: 1 }}>
          {bleReaderDetails.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddEditBleReader type="edit" bleReader={bleReaderDetails} />

          <IconButton
            onClick={() => dispatch(SelectBleReader(''))}
            sx={{
              padding: 0, // Prevent extra spacing
            }}
          >
            <img src={IconClose} alt={IconClose} />
          </IconButton>
        </Box>
      </Grid>
      <Grid
        container
        sx={{
          width: '240px',
          minWidth: '240px',
          maxWidth: '240px',
        }}
        p={1}
        px={3}
      >
        {/* ------------------------------------------------------------------------------------------------ */}
        {/* Basic Layout */}
        {/* ------------------------------------------------------------------------------------------------ */}
        <Grid container>
          {/* 1 */}
          <Grid display="flex" alignItems="center" size={12}>
            <CustomFormLabel htmlFor="ble-name" sx={{ mt: 1 }}>
              Ble Reader Name
            </CustomFormLabel>
          </Grid>
          <Grid size={12}>
            <CustomTextField
              id="name"
              value={bleReaderDetails.name}
              //placeholder={bleReaderDetails.name}
              //onChange={handleInputChange}
              fullWidth
              disabled={!isEditing}
            />
          </Grid>
          {/* 2 */}
          <Grid display="flex" alignItems="center" size={12}>
            <CustomFormLabel htmlFor="ble-mac" sx={{ mt: 1 }}>
              Ble Reader Mac
            </CustomFormLabel>
          </Grid>
          <Grid size={12}>
            <CustomTextField
              id="mac"
              value={bleReaderDetails.mac}
              //placeholder={bleReaderDetails.mac}
              //onChange={handleInputChange}
              fullWidth
              disabled={!isEditing}
            />
          </Grid>
          {/* 3 */}
          <Grid display="flex" alignItems="center" size={12}>
            <CustomFormLabel htmlFor="ble-ip" sx={{ mt: 1 }}>
              Ble Reader IP
            </CustomFormLabel>
          </Grid>
          <Grid size={12}>
            <CustomTextField
              id="ip"
              value={bleReaderDetails.ip}
              //placeholder={bleReaderDetails.ip}
              //onChange={handleInputChange}
              fullWidth
              disabled={!isEditing}
            />
          </Grid>
          <Grid display="flex" alignItems="center" size={12}>
            <CustomFormLabel htmlFor="brand-id" sx={{ mt: 1 }}>
              Brand
            </CustomFormLabel>
          </Grid>
          <Grid size={12}>
            <CustomTextField
              id="brandId"
              value={getBrandName(bleReaderDetails.brandId)}
              //placeholder={String(bleReaderDetails.locationPxY)}
              //onChange={handleInputChange}
              fullWidth
              disabled={!isEditing}
            />
            {/* 2 */}
            <Grid container alignItems="center" spacing={1}>
              <Grid size={12}>
                <CustomFormLabel sx={{ mr: 2, mb: 0 }}>Position</CustomFormLabel>
              </Grid>
              <Grid>
                {/* X-axis Field */}
                <Typography sx={{ mr: 0 }} align="center">
                  X
                </Typography>
                <CustomTextField
                  id="locationPxX"
                  value={bleReaderDetails.locationPxX}
                  //placeholder={String(bleReaderDetails.locationPxX)}
                  //onChange={handleInputChange}
                  sx={{ width: '80px' }} // Adjust width as needed
                  disabled={!isEditing}
                />
              </Grid>
              <Grid>
                {/* Y-axis Field */}
                <Typography sx={{ mr: 0 }} align="center">
                  Y
                </Typography>
                <CustomTextField
                  id="locationPxY"
                  value={bleReaderDetails.locationPxY}
                  //placeholder={String(bleReaderDetails.locationPxY)}
                  //onChange={handleInputChange}
                  sx={{ width: '80px' }} // Adjust width as needed
                  disabled={!isEditing}
                />
              </Grid>
            </Grid>
          </Grid>
          {/* Buttons */}
        </Grid>
      </Grid>
    </div>
  );
};

export default GatewayLayout;
