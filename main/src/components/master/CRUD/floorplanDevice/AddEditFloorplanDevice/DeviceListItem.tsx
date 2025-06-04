import React from 'react';

import { useSelector } from 'src/store/Store';
import {
  ListItemText,
  Box,
  Avatar,
  ListItemButton,
  Typography,
  Stack,
  ListItemAvatar,
  useTheme,
  Checkbox,
  IconButton,
} from '@mui/material';

import { IconTrash, IconPencil } from '@tabler/icons-react';

import AccessDoor from 'src/assets/images/masters/Devices/AccessDoor.png';
import FaceRecog from 'src/assets/images/svgs/devices/FACE RECOGNITION FIX.svg';
import CCTV from 'src/assets/images/masters/Devices/CCTV.png';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import Gateway from 'src/assets/images/masters/Devices/Gateway.png';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';

import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import AddEditDeviceLayout from './AddEditDeviceLayout';

type Props = {
  onListClick: (event: React.MouseEvent<HTMLElement>) => void;
  onEditClick: (event: React.MouseEvent<HTMLElement>) => void;
  onDeleteClick: (event: React.MouseEvent<HTMLElement>) => void;
  device?: FloorplanDeviceType;
  active: any;
};

const DeviceListItem = ({ onListClick, onEditClick, onDeleteClick, device, active }: Props) => {
  const customizer = useSelector((state) => state.customizer);
  const br = `${customizer.borderRadius}px`;

  const theme = useTheme();

  // Map device types to their corresponding icons
  const iconMap: { [key: string]: string } = {
    Cctv: CCTVSVG, // Path to CCTV icon
    BleReader: GatewaySVG, // Path to Gateway icon
    AccessDoor: FaceRecog, // Path to AccessDoor icon
  };

  // Get the icon based on the device type
  const iconDevice = device?.type ? iconMap[device.type] : UnknownDevice;

  return (
    <ListItemButton
      sx={{ mb: 1 }}
      selected={active}
      onClick={(event) => {
        // Prevent triggering onClick if the event originated from a child element
        if (event.target instanceof HTMLElement && event.target.closest('.interactive')) {
          return;
        }
        onListClick(event);
      }}
    >
      <ListItemAvatar>
        <Avatar alt={device?.name || 'Device'} src={iconDevice} />
      </ListItemAvatar>
      <ListItemText>
        <Stack direction="row" gap="10px" alignItems="center">
          <Box mr="auto">
            <Typography variant="subtitle1" fontWeight={600} sx={{ maxWidth: '150px' }}>
              {device?.name}
            </Typography>
            <Typography variant="body2" noWrap color="text.secondary">
              {device?.type}
            </Typography>
          </Box>
        </Stack>
      </ListItemText>
      {active && (
        <>
          <IconButton
            className="interactive"
            color="error"
            size="small"
            onClick={(event) => {
              event.stopPropagation(); // Prevent triggering onListClick
              onDeleteClick(event);
            }}
          >
            <IconTrash size={16} />
          </IconButton>
          <IconButton
            className="interactive"
            color="primary"
            size="small"
            onClick={(event) => {
              event.stopPropagation(); // Prevent triggering onListClick
              onEditClick(event);
            }}
          >
            <IconPencil size={16} />
          </IconButton>
        </>
      )}
    </ListItemButton>
  );
};

export default DeviceListItem;
