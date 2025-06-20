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
  EditUnsavedDevice,
  fetchFloorplanDevices,
  FloorplanDeviceType,
  SelectEditingFloorplanDevice,
  SelectFloorplanDevice,
  RevertDevice,
  SaveDevice,
} from 'src/store/apps/crud/floorplanDevice';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import { CCTVType, fetchAccessCCTV } from 'src/store/apps/crud/accessCCTV';
import { fetchAccessControls, AccessControlType } from 'src/store/apps/crud/accessControl';
import { fetchBleReaders, bleReaderType } from 'src/store/apps/crud/bleReader';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { DeviceType } from 'src/types/crud/input';
import { ApplicationType, fetchApplications } from 'src/store/apps/crud/application';
import { BleNodeType, fetchNodes } from 'src/store/apps/crud/bleNode';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { isEqual } from 'lodash';

const DeviceDetailList = () => {
  const [open, setOpen] = useState(false);
  const device = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );
  const [formData, setFormData] = useState({
    id: device?.id || '',
    name: device?.name || '',
    type: device?.type || '',
    floorplanId: device?.floorplanId || '',
    accessCctvId: device?.accessCctvId || '',
    readerId: device?.readerId || '',
    accessControlId: device?.accessControlId || '',
    posX: device?.posX || 0,
    posY: device?.posY || 0,
    posPxX: device?.posPxX || 0,
    posPxY: device?.posPxY || 0,
    floorplanMaskedAreaId: device?.floorplanMaskedAreaId || '',
    applicationId: device?.applicationId || '',
    deviceStatus: device?.deviceStatus || '',
    createdBy: device?.createdBy || '',
    createdAt: device?.createdAt || '',
    updatedBy: device?.updatedBy || '',
    updatedAt: device?.updatedAt || '',
  });
  useEffect(() => {
    // console.log('device', device);
    if(device){
      const newFormData = {
            id: device?.id || '',
      name: formData.name || '',
      type: formData.type || '',
      floorplanId: formData.floorplanId || '',
      accessCctvId: formData.accessCctvId || '',
      readerId: formData.readerId || '',
      accessControlId: formData.accessControlId || '',
      posX: device?.posX || 0,
      posY: device?.posY || 0,
      posPxX: device?.posPxX || 0,
      posPxY: device?.posPxY || 0,
      floorplanMaskedAreaId: device?.floorplanMaskedAreaId || '',
      applicationId: formData.applicationId || '',
      deviceStatus: formData.deviceStatus || '',
      createdBy: formData.createdBy || '',
      createdAt: formData.createdAt || '',
      updatedBy: formData.updatedBy || '',
      updatedAt: formData.updatedAt || '',
      }
      console.log('newFormData', newFormData);
    if(!isEqual(formData, newFormData)){
      setFormData(newFormData);
    }
        };
    // console.log('formData', formData);
  }, [device]);

  const dispatch: AppDispatch = useDispatch();
  const floorplanData: FloorplanType[] = useSelector(
    (state: RootState) => state.floorplanReducer.floorplans,
  );
  // const maskedAreaData: MaskedAreaType[] = useSelector((state: RootState) =>
  //   state.maskedAreaReducer.maskedAreas.filter((area) => area.floorplanId === formData.floorplanId),
  // );
  const maskedAreaData: MaskedAreaType[] = useSelector(
    (state: RootState) => state.maskedAreaReducer.maskedAreas,
  );

  const CCTVData: CCTVType[] = useSelector((state: RootState) => state.CCTVReducer.cctvs);
  const accessControlData: AccessControlType[] = useSelector(
    (state: RootState) => state.accessControlReducer.accessControls,
  );
  const bleReaderData: bleReaderType[] = useSelector(
    (state: RootState) => state.bleReaderReducer.bleReaders,
  );
  const bleNodeData = useSelector((state: RootState) => state.bleNodeReducer.bleNodes);
  const [testNode, setTestNode] = useState<BleNodeType[]>([]);
  const floorData: floorType[] = useSelector((state: RootState) => state.floorReducer.floors);
  const [selectedFloor, setSelectedFloor] = useState<floorType>();
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorplanType>();
  const unsavedDevices = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.unsavedFloorplanDevices,
  );
  const [otherReader, setOtherReader] = useState<FloorplanDeviceType[]>([]); // State to hold other devices
  const [scales, setScale] = useState<number>(1);
  useEffect(() => {
    // dispatch(fetchFloorplanDevices());
    // dispatch(GetUnsavedFloorplanDevices());
    dispatch(fetchApplications());
    dispatch(fetchAccessCCTV());
    dispatch(fetchAccessControls());
    dispatch(fetchBleReaders());
    dispatch(fetchMaskedAreas());
    dispatch(fetchFloorplan());
    dispatch(fetchFloors());
    // dispatch(fetchNodes());
  }, [dispatch]);

  useEffect(() => {
    const selectedFloorplanData = floorplanData.find(
      (floorplan) => floorplan.id === formData.floorplanId,
    );
    const selectedFloorData = floorData.find((floor) => floor.id === selectedFloorPlan?.floorId);
    setSelectedFloor(selectedFloorData);
    setSelectedFloorPlan(selectedFloorplanData);
    if (selectedFloorData) {
      setScale(selectedFloorData.meterPerPx || 1); // Set the scale based on the selected floor's scale
    }
    if (selectedFloorplanData) {
      const otherReaderData = unsavedDevices.filter(
        (reader) =>
          reader.floorplanId === selectedFloorplanData.id &&
          reader.id !== formData.id &&
          reader.type === 'BleReader',
      );
      setOtherReader(otherReaderData);
    }
  }, [formData.floorplanId]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      posX: formData.posPxX * scales,
      posY: formData.posPxY * scales,
    }));
  }, [formData.posPxX, formData.posPxY, scales]);

  const [unsavedNodes, setUnsavedNodes] = useState<BleNodeType[]>([]);
  // Define required fields
  const requiredFields = ['name', 'type', 'floorplanMaskedAreaId'];

  // Validation function
  const isFormValid = () => {
    return requiredFields.every(
      (field) => formData[field as keyof typeof formData]?.toString().trim() !== '',
    );
  };

  const handleClickOpen = () => {
    console.log('bleNodeData', bleNodeData);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      id: device?.id || '',
      name: device?.name || '',
      type: device?.type || '',
      floorplanId: device?.floorplanId || '',
      accessCctvId: device?.accessCctvId || '',
      readerId: device?.readerId || '',
      accessControlId: device?.accessControlId || '',
      posX: device?.posX || 0,
      posY: device?.posY || 0,
      posPxX: device?.posPxX || 0,
      posPxY: device?.posPxY || 0,
      floorplanMaskedAreaId: device?.floorplanMaskedAreaId || '',
      applicationId: device?.applicationId || '',
      deviceStatus: device?.deviceStatus || '',
      createdBy: device?.createdBy || '',
      createdAt: device?.createdAt || '',
      updatedBy: device?.updatedBy || '',
      updatedAt: device?.updatedAt || '',
    });
    dispatch(SelectEditingFloorplanDevice(null)); // Reset the selected device in the store
    dispatch(SelectFloorplanDevice(null)); // Reset the selected device in the store
  };

  const handleSave = async () => {
    try {
      await dispatch(EditUnsavedDevice(formData));
      await dispatch(SaveDevice(formData.id)); // Save the device

      if (formData.type === 'BleReader') {
        // Calculate testNodes
        const newTestNodes: any[] = [];
        otherReader.forEach((otherReader) => {
          if (otherReader.id !== formData.id) {
            const distance = Math.sqrt(
              Math.pow(otherReader.posX - formData.posX, 2) +
                Math.pow(otherReader.posY - formData.posY, 2),
            );

            newTestNodes.push({
              id: `${formData.id}-${otherReader.id}`, // Unique ID for the testNode
              startPos: `(${formData.posX}, ${formData.posY})`,
              endPos: `(${otherReader.posX}, ${otherReader.posY})`,
              distance,
            });
          }
        });

        setTestNode(newTestNodes); // Update the testNode state
        console.log('Test nodes created:', newTestNodes);
      }
      console.log('Device saved successfully');
      handleClose();
    } catch (error) {
      console.error('Error saving device:', error);
    }
  };

  const handleCancel = () => {
    dispatch(RevertDevice(formData.id)); // Revert the unsaved device to its original state
    handleClose();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };
  return (
    <Box display={'flex'} flexDirection="column" height="84vh">
      <Box display="flex" flexDirection="column" height="100vh">
        <Box p={3} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" fontWeight={700} mb={2}>
            Edit Device Details
          </Typography>
        </Box>
        <Box flex="1" overflow="hidden">
          <Scrollbar
            sx={{ height: { lg: 'calc(100vh - 300px)' }, width: '100%', maxHeight: 'fit-content' }}
          >
            <Box pl={3} pr={1}>
            <Grid container spacing={1}>
              <Grid size={12}>
                <CustomFormLabel htmlFor="device-name">Device Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  variant="outlined"
                  fullWidth
                  required
                />
              </Grid>
              {/* <Grid size={12}>
              <CustomFormLabel htmlFor="floorplan-id">Floor Plan</CustomFormLabel>
              <CustomSelect
                name="floorplanId"
                value={formData.floorplanId || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {floorplanData.map((floorplan) => (
                  <MenuItem key={floorplan.id} value={floorplan.id}>
                    {floorplan.name}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid> */}
              <Grid size={12}>
                <CustomFormLabel htmlFor="masked-area-id">Masked Area</CustomFormLabel>
                <CustomSelect
                  name="floorplanMaskedAreaId"
                  value={formData.floorplanMaskedAreaId || ''}
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
              <CustomFormLabel htmlFor="app-id">Application</CustomFormLabel>
              <CustomSelect
                name="applicationId"
                value={formData.applicationId || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {appData.map((app) => (
                  <MenuItem key={app.id} value={app.id}>
                    {app.applicationName}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid> */}
              <Grid size={12}>
                <CustomFormLabel htmlFor="device-type">Device Type</CustomFormLabel>
                <CustomSelect
                  name="type"
                  value={formData.type || ''}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  required
                >
                  {DeviceType.map((device) => (
                    <MenuItem
                      key={device.value}
                      value={device.value}
                      disabled={device.disabled || false}
                    >
                      {device.label}
                    </MenuItem>
                  ))}
                </CustomSelect>
              </Grid>
              {formData.type === 'Cctv' && (
                <Grid size={12}>
                  <CustomFormLabel htmlFor="access-cctv-id">Access CCTV</CustomFormLabel>
                  <CustomSelect
                    name="accessCctvId"
                    value={formData.accessCctvId || ''}
                    onChange={handleInputChange}
                    fullWidth
                    variant="outlined"
                  >
                    {CCTVData.map((cctv) => (
                      <MenuItem key={cctv.id} value={cctv.id}>
                        {cctv.name}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </Grid>
              )}
              {formData.type === 'AccessDoor' && (
                <Grid size={12}>
                  <CustomFormLabel htmlFor="access-control-id">Access Control</CustomFormLabel>
                  <CustomSelect
                    name="accessControlId"
                    value={formData.accessControlId || ''}
                    onChange={handleInputChange}
                    fullWidth
                    variant="outlined"
                  >
                    {accessControlData.map((accessControl) => (
                      <MenuItem key={accessControl.id} value={accessControl.id}>
                        {accessControl.name}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </Grid>
              )}
              {formData.type === 'BleReader' && (
                <Grid size={12}>
                  <CustomFormLabel htmlFor="reader-id">BLE Reader</CustomFormLabel>
                  <CustomSelect
                    name="readerId"
                    value={formData.readerId || ''}
                    onChange={handleInputChange}
                    fullWidth
                    variant="outlined"
                  >
                    {bleReaderData.map((bleReader) => (
                      <MenuItem key={bleReader.id} value={bleReader.id}>
                        {bleReader.name}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </Grid>
              )}
              <Grid size={6}>
                <CustomFormLabel htmlFor="pos-x">Position X</CustomFormLabel>
                <CustomTextField
                  id="posX"
                  value={formData.posX}
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  variant="outlined"
                  fullWidth
                  disabled
                />
              </Grid>
              <Grid size={6}>
                <CustomFormLabel htmlFor="pos-px-x">Pos Pixel X</CustomFormLabel>
                <CustomTextField
                  id="posPxX"
                  placeholder={formData.posPxX}
                  onChange={handleInputChange}
                  variant="outlined"
                  fullWidth
                  disabled
                />
              </Grid>
              <Grid size={6}>
                <CustomFormLabel htmlFor="pos-px-y">Pos Pixel Y</CustomFormLabel>
                <CustomTextField
                  id="posPxY"
                  placeholder={formData.posPxY}
                  onChange={handleInputChange}
                  variant="outlined"
                  fullWidth
                  disabled
                />
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

export default DeviceDetailList;
