import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  addFloorplanDevice,
  AddUnsavedDevice,
  GetUnsavedFloorplanDevices,
  EditUnsavedDevice,
  fetchFloorplanDevices,
  FloorplanDeviceType,
} from 'src/store/apps/crud/floorplanDevice';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import { CCTVType, fetchAccessCCTV } from 'src/store/apps/crud/accessCCTV';
import { fetchAccessControls, AccessControlType } from 'src/store/apps/crud/accessControl';
import { fetchBleReaders, bleReaderType } from 'src/store/apps/crud/bleReader';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { DeviceType } from 'src/types/crud/input';
import { ApplicationType, fetchApplications } from 'src/store/apps/crud/application';
import { BleNodeType, fetchNodes } from 'src/store/apps/crud/bleNode';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';

interface FormType {
  type?: string;
  device?: FloorplanDeviceType;
}

const AddEditDeviceLayout = ({ type, device }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
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
  const dispatch: AppDispatch = useDispatch();
  const appData: ApplicationType[] = useSelector(
    (state: RootState) => state.applicationReducer.applications,
  );
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
    dispatch(fetchFloorplanDevices());
    // dispatch(GetUnsavedFloorplanDevices());
    dispatch(fetchApplications());
    dispatch(fetchAccessCCTV());
    dispatch(fetchAccessControls());
    dispatch(fetchBleReaders());
    dispatch(fetchMaskedAreas());
    dispatch(fetchFloorplan());
    dispatch(fetchFloors());
    dispatch(fetchNodes());
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
      posPxX: formData.posX / scales,
      posPxY: formData.posY / scales,
    }));
  }, [formData.posX, formData.posY, scales]);

  const [unsavedNodes, setUnsavedNodes] = useState<BleNodeType[]>([]);

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
  };

  const handleSave = async () => {
    try {
      if (type === 'add') {
        await dispatch(AddUnsavedDevice(formData));
      } else if (type === 'edit') {
        await dispatch(EditUnsavedDevice(formData));
      }

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
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    console.log('value', value);
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };
  useEffect(() => {
    console.log('formData', formData);
  }, [formData]);

  return (
    <>
      {type === 'edit' && (
        <IconButton color="primary" size="small" onClick={handleClickOpen}>
          <IconPencil size={20} />
        </IconButton>
      )}
      {type === 'add' && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<IconPlus size={20} />}
          onClick={handleClickOpen}
        >
          Add Device
        </Button>
      )}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Device' : 'Edit Device'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Device Information
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="device-name" required>
                Device Name
              </CustomFormLabel>
              <CustomTextField
                id="deviceName"
                placeholder={formData.name}
                onChange={handleInputChange}
                variant="outlined"
                fullWidth
              />
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
              {formData.floorplanId && (
                <>
                  <CustomFormLabel htmlFor="masked-area-id">Masked Area</CustomFormLabel>
                  <CustomSelect
                    name="floorplanMaskedAreaId"
                    value={formData.floorplanMaskedAreaId || ''}
                    onChange={handleInputChange}
                    fullWidth
                    variant="outlined"
                  >
                    {maskedAreaData.map((maskedArea) => (
                      <MenuItem key={maskedArea.id} value={maskedArea.id}>
                        {maskedArea.name}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </>
              )}
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
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
              <CustomFormLabel htmlFor="device-type">Device Type</CustomFormLabel>
              <CustomSelect
                name="type"
                value={formData.type || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
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
              {formData.type === 'Cctv' && (
                <>
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
                </>
              )}
              {formData.type === 'BleReader' && (
                <>
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
                </>
              )}
              {formData.type === 'AccessDoor' && (
                <>
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
                </>
              )}
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Device Position
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="pos-x">Position X</CustomFormLabel>
              <CustomTextField
                id="posX"
                placeholder={formData.posX}
                onChange={handleInputChange}
                variant="outlined"
                fullWidth
              />
              <CustomFormLabel htmlFor="pos-px-x">Position Pixel X</CustomFormLabel>
              <CustomTextField
                id="posPxX"
                placeholder={formData.posPxX}
                onChange={handleInputChange}
                variant="outlined"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="pos-y">Position Y</CustomFormLabel>
              <CustomTextField
                id="posY"
                placeholder={formData.posY}
                onChange={handleInputChange}
                variant="outlined"
                fullWidth
              />
              <CustomFormLabel htmlFor="pos-px-y">Position Pixel Y</CustomFormLabel>
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
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddEditDeviceLayout;
