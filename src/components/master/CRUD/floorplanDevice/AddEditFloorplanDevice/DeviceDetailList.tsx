import {
  Button,
  Box,
  Grid2 as Grid,
  MenuItem,
  SelectChangeEvent,
  Typography,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
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
  SaveDeviceToSavedLayer,
  CancelDeviceEditing,
  DrawingDevicePath,
  selectDevicePath,
  RemovePathPairFromUnsaved,
  StartEditingDevice,
  SaveAllDevicesToSavedLayer,
  CancelAllDevicesEditing,
} from 'src/store/apps/crud/floorplanDevice';
import { useMaskedAreaList } from 'src/hooks/useMaskedArea';
import { useAllUnassignedCCTV } from 'src/hooks/useCCTV';
import { useAllReaders, useAllUnassignedReaders } from 'src/hooks/useReader';
import { DeviceType, readerType } from 'src/types/crud/input';
import { isEqual } from 'lodash';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import { Delete, Settings } from '@mui/icons-material';
import CustomSwitch from 'src/components/forms/theme-elements/CustomSwitch';
import AddEditBleReader from 'src/components/master/CRUD/bleReader/AddEditBleReader';

// Define form data type for better type safety
interface DeviceFormData {
  id: string;
  name: string;
  type: string;
  floorplanId: string;
  accessCctvId: string | null;
  readerId: string | null;
  accessControlId: string | null;
  // readerType: 'Indoor' | 'Outdoor';
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
  const savedDevices = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.savedFloorplanDevices,
  );
  const selectedPathId = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.selectDevicePath,
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

  // Form state
  const [formData, setFormData] = useState<DeviceFormData>({
    id: '',
    name: '',
    type: '',
    floorplanId: '',
    accessCctvId: null,
    readerId: null,
    accessControlId: null,
    // readerType: 'Indoor',
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
  const currentDevice = savedDevices.find((d) => d.id === device?.id) || null;
  console.log("Current Device", currentDevice)
  const [otherReader, setOtherReader] = useState<FloorplanDeviceType[]>([]);
  const currentReader = bleReaderData.find((r) => r.id === formData.readerId) || null;
  const availableBleReaderOptions = React.useMemo(() => {
    const rawOptions = [
      // ...(currentReader ? [currentReader] : []),
      ...(currentDevice?.reader ? [currentDevice.reader] : []),
      ...allUnassignedReaders,
    ];
    const seen = new Set<string>();
    return rawOptions.filter((r) => {
      if (!r || !r.id) return false;
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [currentReader, currentDevice?.reader, allUnassignedReaders]);

  // When device is selected for editing, initialize form
  useEffect(() => {
    if (device && device.id) {
      // Make sure we have the latest from unsaved layer
      const latestDevice = unsavedDevices.find((d) => d.id === device.id) || device;

      const newFormData: DeviceFormData = {
        id: latestDevice.id || '',
        name: latestDevice.name || '',
        type: latestDevice.type || '',
        floorplanId: latestDevice.floorplanId || '',
        accessCctvId: latestDevice.accessCctvId || null,
        readerId: latestDevice.readerId || null,
        accessControlId: latestDevice.accessControlId || null,
        // readerType: latestDevice.readerType || 'Indoor',
        posX: latestDevice.posX || 0,
        posY: latestDevice.posY || 0,
        posPxX: latestDevice.posPxX || 0,
        posPxY: latestDevice.posPxY || 0,
        floorplanMaskedAreaId: latestDevice.floorplanMaskedAreaId || '',
        applicationId: latestDevice.applicationId || localStorage.getItem('applicationId') || '',
        deviceStatus: latestDevice.deviceStatus || '',
        createdBy: latestDevice.createdBy || '',
        createdAt: latestDevice.createdAt || '',
        updatedBy: latestDevice.updatedBy || '',
        updatedAt: latestDevice.updatedAt || '',
      };

      if (!isEqual(formData, newFormData)) {
        setFormData(newFormData);
      }
    }
  }, [device, unsavedDevices]);

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

  // Create path destinations list
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
      const latestDevice = unsavedDevices.find((d) => d.id === device.id) || device;
      setFormData({
        id: latestDevice.id || '',
        name: latestDevice.name || '',
        type: latestDevice.type || '',
        floorplanId: latestDevice.floorplanId || '',
        accessCctvId: latestDevice.accessCctvId || null,
        readerId: latestDevice.readerId || null,
        accessControlId: latestDevice.accessControlId || null,
        // readerType: latestDevice.readerType || 'Indoor',
        posX: latestDevice.posX || 0,
        posY: latestDevice.posY || 0,
        posPxX: latestDevice.posPxX || 0,
        posPxY: latestDevice.posPxY || 0,
        floorplanMaskedAreaId: latestDevice.floorplanMaskedAreaId || '',
        applicationId: latestDevice.applicationId || localStorage.getItem('applicationId') || '',
        deviceStatus: latestDevice.deviceStatus || '',
        createdBy: latestDevice.createdBy || '',
        createdAt: latestDevice.createdAt || '',
        updatedBy: latestDevice.updatedBy || '',
        updatedAt: latestDevice.updatedAt || '',
      });
    }
    dispatch(SelectEditingFloorplanDevice(null));
    dispatch(SelectFloorplanDevice(null));
  };

  const handleSave = async () => {
    if (!isFormValid()) return;
    console.log('Saving device with data:', JSON.stringify(formData, null, 2));
    try {
      // First update the unsaved device with form data
      const updatedDevice = {
        ...device,
        ...formData,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin', // You might want to get this from auth context
      };
      // console.log('Updated device to save:', JSON.stringify(updatedDevice, null, 2));
      // Save to saved layer
      dispatch(SaveAllDevicesToSavedLayer());

      handleClose();
    } catch (error) {
      console.error('Error saving device:', error);
    }
  };

  const handleCancel = () => {
    if (formData.id) {
      // Cancel editing - this reverts unsaved device to saved layer
      dispatch(CancelAllDevicesEditing());
    }
    handleClose();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id, checked } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string; checked?: boolean };

    const fieldName = (id || name) as keyof DeviceFormData;

    // Determine the new value based on the field type
    let newValue: any;
    
    if (fieldName === 'deviceStatus') {
      // For checkbox, the value is boolean (checked) or string ('Active'/'Inactive')
      // We store 'Active' or 'Inactive' to match the expected type
      newValue = checked ? 'active' : 'nonactive';
    } else {
      // For other fields, use the value from the event
      newValue = value;
    }
    
    const newFormData = {
      ...formData,
      [fieldName]: newValue,
    };

    setFormData(newFormData);

    // Also update the unsaved device immediately
    if (device) {
      const updatedDevice = {
        ...device,
        ...newFormData,
      };
      dispatch(EditUnsavedDevice(updatedDevice));
    }
  };

  const handleDeletePath = (pathId: string) => {
    if (!device?.id) return;

    // Dispatch the action to remove the path pair
    dispatch(RemovePathPairFromUnsaved(pathId));
  };

  const handleRowClick = (pathId: string) => {
    // Dispatch the action to select the path
    dispatch(selectDevicePath(pathId));
  };

  // If no device is selected for editing, don't render the component
  if (!device) {
    return (
      <Box
        sx={{
          height: '90vh',
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
        height: '90vh',
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
          Details
        </Typography>
        <Tooltip
          title={formData.deviceStatus?.toLowerCase() === 'active' ? 'Turn Off Device' : 'Turn On Device'}
        >
          <FormControlLabel
            control={
              <CustomSwitch
                id="deviceStatus"
                checked={formData.deviceStatus?.toLowerCase() === 'active'}
                onChange={handleInputChange}
              />
            }
            label={formData.deviceStatus?.toLowerCase() === 'active' ? 'Active' : 'Inactive'}
          />
        </Tooltip>
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

            {/* <Grid size={12}>
              <CustomFormLabel htmlFor="reader-type">Type</CustomFormLabel>
              <CustomSelect
                name="readerType"
                value={formData.readerType}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                required
              >
                {readerType.map((type) => (
                  <MenuItem key={type.value} value={type.value} disabled={type.disabled || false}>
                    {type.label}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid> */}

            <Grid size={12}>
              <CustomFormLabel htmlFor="device-type">Device Type</CustomFormLabel>
              <CustomSelect
                name="type"
                value={formData.type}
                onChange={(e: SelectChangeEvent) => {
                  const newValue = e.target.value;
                  setFormData((prev) => ({ ...prev, type: newValue }));

                  // Update unsaved device
                  if (device) {
                    const updatedDevice = {
                      ...device,
                      type: newValue,
                    };
                    dispatch(EditUnsavedDevice(updatedDevice));
                  }
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
                    const newFormData = {
                      ...formData,
                      accessCctvId: newVal?.id ?? null,
                    };
                    setFormData(newFormData);

                    if (device) {
                      const updatedDevice = {
                        ...device,
                        accessCctvId: newVal?.id ?? null,
                      };
                      dispatch(EditUnsavedDevice(updatedDevice));
                    }
                  }}
                  getOptionLabel={(o) => o?.name ?? ''}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                />
              </Grid>
            )}

            {/* BLE Reader Selection (only for BleReader type) */}
            {formData.type === 'BleReader' && (
              <Grid size={12}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CustomFormLabel htmlFor="reader-id" sx={{ mt: 0 }}>
                    BLE Reader
                  </CustomFormLabel>
                  {formData.readerId && currentReader && (
                    <AddEditBleReader
                      type="edit"
                      bleReader={currentReader}
                      trigger={(onClick) => (
                        <Tooltip title="Edit BLE Reader Settings" arrow>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={onClick}
                            sx={{ mt: 1 }}
                          >
                            <Settings fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    />
                  )}
                </Box>
                <CustomAutocomplete
                  label="BLE Reader"
                  options={availableBleReaderOptions}
                  value={availableBleReaderOptions.find((x) => x.id === formData.readerId) || null}
                  onChange={(newVal) => {
                    const newFormData = {
                      ...formData,
                      readerId: newVal?.id ?? null,
                    };
                    setFormData(newFormData);

                    if (device) {
                      const updatedDevice = {
                        ...device,
                        readerId: newVal?.id ?? null,
                      };
                      dispatch(EditUnsavedDevice(updatedDevice));
                    }
                  }}
                  getOptionLabel={(opt) => opt?.name ?? ''}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                />
              </Grid>
            )}

            {/* Add Pathing (only when there are other BLE readers) */}
            {formData.type === 'BleReader' && otherReader.length > 0 && (
              <Grid size={12} mt={1}>
                <Button variant="contained" color="secondary" fullWidth onClick={handleAddPathing}>
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
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Table>
                      <TableHead sx={{ bgcolor: 'background.paper' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Destination Reader</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pathDestinations.map((p, index) => (
                          <TableRow
                            key={p.id}
                            onClick={() => handleRowClick(p.id)}
                            hover
                            selected={selectedPathId === p.id}
                            sx={{
                              cursor: 'pointer',
                              '&.Mui-selected': {
                                backgroundColor: 'primary.light',
                                '&:hover': {
                                  backgroundColor: 'primary.light',
                                },
                              },
                            }}
                          >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <Grid container alignItems="center" justifyContent="space-between">
                                {p.targetDeviceName}
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePath(p.id);
                                  }}
                                  sx={{ padding: '4px' }}
                                  title="Delete path"
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Grid>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
          bgcolor: 'background.paper',
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
