import { Button, Box, Grid2 as Grid, MenuItem, SelectChangeEvent, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  EditUnsavedDevice,
  FloorplanDeviceType,
  SelectEditingFloorplanDevice,
  SelectFloorplanDevice,
  RevertDevice,
  SaveDevice,
  DrawingDevicePath,
} from 'src/store/apps/crud/floorplanDevice';
import { useMaskedAreaList } from 'src/hooks/useMaskedArea';
import { useAllUnassignedCCTV } from 'src/hooks/useCCTV';
import { useAllReaders, useAllUnassignedReaders } from 'src/hooks/useReader';
import { DeviceType } from 'src/types/crud/input';
import { isEqual } from 'lodash';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';

// Define form data type for better type safety
interface DeviceFormData {
  id: string;
  name: string;
  type: string;
  floorplanId: string;
  accessCctvId: string | null;
  readerId: string | null;
  accessControlId: string | null;
  posX: number;
  posY: number;
  posPxX: number;
  posPxY: number;
  floorplanMaskedAreaId: string;
  applicationId: string;
  deviceStatus: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

const DeviceDetailList = () => {
  const dispatch: AppDispatch = useDispatch();

  // Redux state for UI management
  const device = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );
  const activeFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  const unsavedDevices = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.unsavedFloorplanDevices,
  );
  const drawingPath = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.drawingDevicePath,
  );

  // React Query hooks for data fetching
  const { data: maskedAreaResponse } = useMaskedAreaList({
    Draw: 1,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc' as const,
    SearchValue: '',
    filters: {
      FloorplanId: activeFloorplan?.id ? [activeFloorplan.id] : [],
      FloorId: [],
    },
  });

  const { data: CCTVData = [] } = useAllUnassignedCCTV();
  const { data: bleReaderData = [] } = useAllReaders();
  const { data: allUnassignedReaders = [] } = useAllUnassignedReaders();

  // console.log('bleReaderData', bleReaderData);

  // Form state
  const [formData, setFormData] = useState<DeviceFormData>({
    id: '',
    name: '',
    type: '',
    floorplanId: '',
    accessCctvId: null,
    readerId: null,
    accessControlId: null,
    posX: 0,
    posY: 0,
    posPxX: 0,
    posPxY: 0,
    floorplanMaskedAreaId: '',
    applicationId: localStorage.getItem('applicationId') || '',
    deviceStatus: '',
    createdBy: '',
    createdAt: '',
    updatedBy: '',
    updatedAt: '',
  });

  const [otherReader, setOtherReader] = useState<FloorplanDeviceType[]>([]);
  const currentReader = bleReaderData.find((r) => r.id === formData.readerId) || null;
  const availableBleReaderOptions = [
    ...(currentReader ? [currentReader] : []),
    ...allUnassignedReaders.filter((r) => r.id !== formData.readerId),
  ];
  // Update form data when device changes
  useEffect(() => {
    if (device) {
      const newFormData: DeviceFormData = {
        id: device.id || '',
        name: device.name || '',
        type: device.type || '',
        floorplanId: device.floorplanId || '',
        accessCctvId: device.accessCctvId || null,
        readerId: device.readerId || null,
        accessControlId: device.accessControlId || null,
        posX: device.posX || 0,
        posY: device.posY || 0,
        posPxX: device.posPxX || 0,
        posPxY: device.posPxY || 0,
        floorplanMaskedAreaId: device.floorplanMaskedAreaId || '',
        applicationId: device.applicationId || localStorage.getItem('applicationId') || '',
        deviceStatus: device.deviceStatus || '',
        createdBy: device.createdBy || '',
        createdAt: device.createdAt || '',
        updatedBy: device.updatedBy || '',
        updatedAt: device.updatedAt || '',
      };

      if (!isEqual(formData, newFormData)) {
        setFormData(newFormData);
      }
    }
  }, [device]); // Remove formData from dependencies to avoid infinite loops

  // Update other readers when floorplan changes
  useEffect(() => {
    if (activeFloorplan?.id) {
      const otherReaderData = unsavedDevices.filter(
        (reader: FloorplanDeviceType) =>
          reader.floorplanId === activeFloorplan.id &&
          reader.id !== formData.id &&
          reader.type === 'BleReader',
      );
      setOtherReader(otherReaderData);
    }
  }, [activeFloorplan?.id, formData.id, unsavedDevices]);
  const pathDestinations = React.useMemo(() => {
    if (!device?.devicePath?.length) return [];

    return device.devicePath.map((pathObj) => {
      const lastNode = pathObj.paths[pathObj.paths.length - 1];
      const targetDeviceId = lastNode?.deviceId;

      // find BLE reader by deviceId
      const targetReader = otherReader.find((d) => d.id === targetDeviceId);

      return {
        id: pathObj.id,
        targetDeviceId,
        targetDeviceName: targetReader?.name ?? '(Unknown Reader)',
      };
    });
  }, [device?.devicePath, otherReader]);

  // Filter out already-registered items (but include the one belonging to the current device)
  const usedCCTVIds = unsavedDevices
    .filter((d: FloorplanDeviceType) => d.type === 'Cctv' && d.id !== formData.id)
    .map((d: FloorplanDeviceType) => d.accessCctvId);

  const usedBleReaderIds = unsavedDevices
    .filter((d: FloorplanDeviceType) => d.type === 'BleReader' && d.id !== formData.id)
    .map((d: FloorplanDeviceType) => d.readerId);

  // Since we're using unassigned hooks, we only need to filter by unsaved devices
  const availableCCTVs = CCTVData.filter(
    (cctv) => !usedCCTVIds.includes(cctv.id) || cctv.id === formData.accessCctvId,
  );

  const availableBleReaders = bleReaderData.filter(
    (reader) => !usedBleReaderIds.includes(reader.id) || reader.id === formData.readerId,
  );

  // Derived data
  const maskedAreaData = maskedAreaResponse?.data || [];

  // Define required fields
  const requiredFields = ['name', 'type', 'floorplanMaskedAreaId'];

  // Validation function
  const isFormValid = () => {
    return requiredFields.every(
      (field) => formData[field as keyof DeviceFormData]?.toString().trim() !== '',
    );
  };

  const handleAddPathing = () => {
    if (!device) return;
    dispatch(DrawingDevicePath(device.id));
  };

  const handleClose = () => {
    // Reset to current device data or empty form
    if (device) {
      setFormData({
        id: device.id || '',
        name: device.name || '',
        type: device.type || '',
        floorplanId: device.floorplanId || '',
        accessCctvId: device.accessCctvId || null,
        readerId: device.readerId || null,
        accessControlId: device.accessControlId || null,
        posX: device.posX || 0,
        posY: device.posY || 0,
        posPxX: device.posPxX || 0,
        posPxY: device.posPxY || 0,
        floorplanMaskedAreaId: device.floorplanMaskedAreaId || '',
        applicationId: device.applicationId || localStorage.getItem('applicationId') || '',
        deviceStatus: device.deviceStatus || '',
        createdBy: device.createdBy || '',
        createdAt: device.createdAt || '',
        updatedBy: device.updatedBy || '',
        updatedAt: device.updatedAt || '',
      });
    }
    dispatch(SelectEditingFloorplanDevice(null));
    dispatch(SelectFloorplanDevice(null));
  };

  const handleSave = async () => {
    if (!isFormValid()) return;
    console.log('Saving device with data:', JSON.stringify(formData, null, 2));
    try {
      // Update the unsaved device in Redux store
      dispatch(EditUnsavedDevice(formData));

      // Mark as saved in Redux (local state management)
      dispatch(SaveDevice(formData.id));

      // Calculate testNodes for BleReader (if applicable)
      // if (formData.type === 'BleReader') {
      //   const newTestNodes: any[] = [];
      //   otherReader.forEach((otherReader) => {
      //     if (otherReader.id !== formData.id) {
      //       const distance = Math.sqrt(
      //         Math.pow(otherReader.posX - formData.posX, 2) +
      //           Math.pow(otherReader.posY - formData.posY, 2),
      //       );

      //       newTestNodes.push({
      //         id: `${formData.id}-${otherReader.id}`,
      //         startPos: `(${formData.posX}, ${formData.posY})`,
      //         endPos: `(${otherReader.posX}, ${otherReader.posY})`,
      //         distance,
      //       });
      //     }
      //   });
      //   // You can store newTestNodes in state if needed
      //   console.log('Test nodes created:', newTestNodes);
      // }

      handleClose();
    } catch (error) {
      console.error('Error saving device:', error);
    }
  };

  const handleCancel = () => {
    if (formData.id) {
      dispatch(RevertDevice(formData.id));
    }
    handleClose();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };

    const fieldName = (id || name) as keyof DeviceFormData;

    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // If no device is selected for editing, don't render the component
  if (!device) {
    return (
      <Box
        sx={{
          height: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No device selected for editing
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '80vh',
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
          Edit Device Details
        </Typography>
      </Box>

      {/* Form Content */}
      <Box sx={{ minHeight: 0, overflow: 'auto', mb: 2 }}>
        <Box pl={3} pr={1}>
          <Grid container spacing={1}>
            {/* Device Name */}
            <Grid size={12}>
              <CustomFormLabel htmlFor="device-name">Device Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                variant="outlined"
                fullWidth
                required
                placeholder="Enter device name"
              />
            </Grid>

            {/* Masked Area */}
            <Grid size={12}>
              <CustomFormLabel htmlFor="masked-area-id">Masked Area</CustomFormLabel>
              <CustomSelect
                name="floorplanMaskedAreaId"
                value={formData.floorplanMaskedAreaId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                required
                disabled
              >
                {maskedAreaData.map((maskedArea) => (
                  <MenuItem key={maskedArea.id} value={maskedArea.id}>
                    {maskedArea.name}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>

            {/* Device Type */}
            <Grid size={12}>
              <CustomFormLabel htmlFor="device-type">Device Type</CustomFormLabel>
              <CustomSelect
                name="type"
                value={formData.type}
                onChange={(e: SelectChangeEvent) => {
                  // Update both Redux and local state
                  dispatch(EditUnsavedDevice({ ...formData, type: e.target.value }));
                  handleInputChange(e);
                }}
                fullWidth
                variant="outlined"
                required
              >
                {DeviceType.map((deviceType) => (
                  <MenuItem
                    key={deviceType.value}
                    value={deviceType.value}
                    disabled={deviceType.disabled || false}
                  >
                    {deviceType.label}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>

            {/* CCTV Selection (only for Cctv type) */}
            {formData.type === 'Cctv' && (
              <Grid size={12}>
                <CustomFormLabel htmlFor="access-cctv-id">Access CCTV</CustomFormLabel>
                <CustomAutocomplete
                  label="Access CCTV"
                  options={availableCCTVs}
                  value={availableCCTVs.find((x) => x.id === formData.accessCctvId) || null}
                  onChange={(newVal) => {
                    setFormData((prev) => ({
                      ...prev,
                      accessCctvId: newVal?.id ?? null,
                    }));
                  }}
                  getOptionLabel={(o) => o?.name ?? ''}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                />
              </Grid>
            )}

            {/* BLE Reader Selection (only for BleReader type) */}
            {formData.type === 'BleReader' && (
              <Grid size={12}>
                <CustomFormLabel htmlFor="reader-id">BLE Reader</CustomFormLabel>
                <CustomAutocomplete
                  label="BLE Reader"
                  options={availableBleReaderOptions}
                  value={availableBleReaderOptions.find((x) => x.id === formData.readerId) || null}
                  onChange={(newVal) => {
                    setFormData((prev) => ({
                      ...prev,
                      readerId: newVal?.id ?? null,
                    }));
                  }}
                  getOptionLabel={(opt) => opt?.name ?? ''}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                />
              </Grid>
            )}

            {/* Position Fields (read-only) */}
            {/* <Grid size={6}>
              <CustomFormLabel htmlFor="pos-x">Position X</CustomFormLabel>
              <CustomTextField
                id="posX"
                value={formData.posX}
                variant="outlined"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={6}>
              <CustomFormLabel htmlFor="pos-y">Position Y</CustomFormLabel>
              <CustomTextField
                id="posY"
                value={formData.posY}
                variant="outlined"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={6}>
              <CustomFormLabel htmlFor="pos-px-x">Pos Pixel X</CustomFormLabel>
              <CustomTextField
                id="posPxX"
                value={formData.posPxX}
                variant="outlined"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={6}>
              <CustomFormLabel htmlFor="pos-px-y">Pos Pixel Y</CustomFormLabel>
              <CustomTextField
                id="posPxY"
                value={formData.posPxY}
                variant="outlined"
                fullWidth
                disabled
              />
            </Grid> */}
            {/* Add Pathing (only when there are other BLE readers) */}
            {formData.type === 'BleReader' && otherReader.length > 0 && (
              <Grid size={12} mt={1}>
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  onClick={() => {
                    handleAddPathing();
                  }}
                >
                  Add Pathing
                </Button>
              </Grid>
            )}
            {/* ===== PATH LIST TABLE ===== */}
            {formData.type === 'BleReader' &&
              device?.devicePath &&
              device.devicePath.length > 0 && (
                <Grid size={12} mt={2}>
                  <Typography variant="h6" fontWeight={600} mb={1}>
                    Connected Paths
                  </Typography>

                  <Box
                    sx={{
                      border: '1px solid #DDD',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th
                            style={{
                              padding: '8px',
                              borderBottom: '1px solid #DDD',
                              textAlign: 'left',
                            }}
                          >
                            #
                          </th>
                          <th
                            style={{
                              padding: '8px',
                              borderBottom: '1px solid #DDD',
                              textAlign: 'left',
                            }}
                          >
                            Destination Reader
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {pathDestinations.map((p, index) => (
                          <tr key={p.id}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #EEE' }}>
                              {index + 1}
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #EEE' }}>
                              {p.targetDeviceName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Grid>
              )}
          </Grid>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box
        p={2}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fafafa',
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

export default DeviceDetailList;
