import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  List,
  Typography,
} from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import SidebarListItem from './SidebarListItem';
import { fetchTrackingTrans, trackingTransType } from 'src/store/apps/crud/trackingTrans';
import { fetchAlarm, AlarmType } from 'src/store/apps/crud/alarmRecordTracking';
import { fetchBleReaders, bleReaderType } from 'src/store/apps/crud/bleReader';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { useTranslation } from 'react-i18next';

interface SidebarListProps {
  filterType: string;
}

type ListType = {
  id: string;
  device: string;
  target: string;
  floor: string;
  area: string;
  alarmType?: string;
  time: string;
  status?: string;
  type?: string;
};

const SidebarList = ({ filterType }: SidebarListProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ListType | null>(null);
  const Alarm = [
    {
      id: 'A1',
      device: 'Camera 1',
      target: 'Person 1',
      floor: 'Floor 1',
      area: 'Area 1',
      alarmType: 'Wrong Access',
      time: '2025-01-15T15:00:00Z',
      status: 'Cleared',
    },
    {
      id: 'A2',
      device: 'Gate 1',
      target: 'Person 2',
      floor: 'Floor 1',
      area: 'Area 2',
      alarmType: 'Wrong Room',
      time: '2025-01-15T15:00:30Z',
      status: 'Cleared',
    },
    {
      id: 'A3',
      device: 'Gate 2',
      target: 'Person 1',
      floor: 'Floor 2',
      area: 'Area 1',
      alarmType: 'Wrong Room',
      time: '2025-01-15T15:10:20Z',
      status: 'Pending',
    },
    {
      id: 'A4',
      device: 'Gate 3',
      target: 'Person 3',
      floor: 'Floor 2',
      area: 'Area 4',
      alarmType: 'Blacklist Person',
      time: '2025-01-15T15:40:12Z',
      status: 'Dispatched',
    },
    {
      id: 'A5',
      device: 'Gate 3',
      target: 'Person 2',
      floor: 'Floor 1',
      area: 'Area 3',
      alarmType: 'Wrong Access',
      time: '2025-01-15T15:42:33Z',
      status: 'Active',
    },
    {
      id: 'A6',
      device: 'Camera 3',
      target: 'Person 4',
      floor: 'Floor 3',
      area: 'Area 3',
      alarmType: 'Unidentified Person',
      time: '2025-01-15T15:47:53Z',
      status: 'Active',
    },
  ];
  const TrackingList = [
    {
      id: 'T1',
      device: 'Camera 1',
      target: 'Person 1',
      floor: 'Floor 1',
      area: 'Area 3',
      time: '2025-01-15T15:00:00Z',
    },
    {
      id: 'T2',
      device: 'Camera 2',
      target: 'Person 2',
      floor: 'Floor 2',
      area: 'Area 1',
      time: '2025-01-15T15:15:00Z',
    },
    {
      id: 'T3',
      device: 'Reader 2',
      target: 'Person 1',
      floor: 'Floor 1',
      area: 'Area 3',
      time: '2025-01-15T15:15:30Z',
    },
    {
      id: 'T4',
      device: 'Reader 4',
      target: 'Person 5',
      floor: 'Floor 3',
      area: 'Area 1',
      time: '2025-01-15T15:35:00Z',
    },
    {
      id: 'T5',
      device: 'Camera 4',
      target: 'Person 5',
      floor: 'Floor 3',
      area: 'Area 2',
      time: '2025-01-15T15:38:21Z',
    },
  ];
  const [list, setList] = useState<ListType[]>([]);

  const trackTrans: trackingTransType[] = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTrans,
  );
  const alarmRecord: AlarmType[] = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackings,
  );

  const bleReaders: bleReaderType[] = useSelector(
    (state: RootState) => state.bleReaderReducer.bleReaders,
  );
  const floorplanData: MaskedAreaType[] = useSelector(
    (state: RootState) => state.maskedAreaReducer.maskedAreas,
  );

  useEffect(() => {
    dispatch(fetchTrackingTrans());
    dispatch(fetchAlarm());
    dispatch(fetchBleReaders());
  }, [dispatch]);
  useEffect(() => {
    const transformedTrackTrans: ListType[] = trackTrans.map((item) => ({
      id: item.id,
      device: getBleReaderName(item.readerId),
      target: item.reader.name,
      floor: getFloorName(item.floorplanMaskedAreaId),
      area: item.floorplanMaskedArea.name,
      time: item.transTime,
    }));
    const transformedAlarm: ListType[] = alarmRecord.map((item) => ({
      id: item.id,
      device: item.reader.name,
      target: item.visitor.name,
      floor: item.floorplanMaskedArea.floorId,
      area: item.floorplanMaskedArea.name,
      alarmType: item.alarmRecordStatus,
      status: item.actionStatus,
      time: item.timestamp,
    }));
    let updatedList: ListType[] = [
      ...transformedAlarm.map((item) => ({ ...item, type: 'Alarm' })),
      ...transformedTrackTrans.map((item) => ({ ...item, type: 'Tracking' })),
      // ...TrackingList.map((item) => ({ ...item, type: 'Tracking' })),
    ];
    console.log('Tracking Trans: ', transformedTrackTrans);
    // Filter the list based on the filterType prop
    if (filterType !== '' && filterType !== 'All') {
      updatedList = updatedList.filter((item) => item.type === filterType);
    }
    updatedList.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    setList(updatedList);
  }, [filterType, trackTrans, alarmRecord]);

  const handleItemClick = (item: ListType) => {
    setSelectedItem(item);
    setOpenModal(true);
  };

  const getBleReaderName = (readerId: string) => {
    const bleReader = bleReaders.find((ble: bleReaderType) => ble.id === readerId);
    return bleReader ? bleReader.name : 'Unknown Department';
  };
  const getFloorName = (floorId: string) => {
    const floor = floorplanData.find((fl: MaskedAreaType) => fl.id === floorId);
    return floor ? floor.name : 'Unknown Floor';
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )}`;
  };

  return (
    <>
      <List>
        <Scrollbar sx={{ height: { lg: 'calc(100vh - 100px)', md: '100vh' }, maxHeight: '800px' }}>
          {list.map((item) => (
            <SidebarListItem key={item.id} item={item} onItemClick={() => handleItemClick(item)} />
          ))}
        </Scrollbar>
      </List>
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        {selectedItem && (
          <>
            <DialogTitle
              sx={{ fontSize: '1rem', padding: '16px 16px' }}
              bgcolor={selectedItem.type === 'Alarm' ? 'error.main' : 'secondary.main'}
              color="white"
            >
              {selectedItem.device}
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ padding: '8px 16px', marginLeft: '8px' }}>
              <Box>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  Target: {selectedItem.target}{' '}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Time: {formatTime(selectedItem.time)}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Floor: {selectedItem.floor}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Area: {selectedItem.area}
                </Typography>
                {selectedItem.type === 'Alarm' && (
                  <Typography variant="body1" gutterBottom>
                    Alarm Type: {selectedItem.alarmType}
                  </Typography>
                )}
                {selectedItem.type === 'Alarm' && (
                  <Typography variant="body1" gutterBottom>
                    Status: {selectedItem.status}
                  </Typography>
                )}
              </Box>
            </DialogContent>

            <DialogActions sx={{ padding: '8px 16px' }}>
              <Button onClick={() => setOpenModal(false)} size="small" variant="outlined">
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default SidebarList;
