import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
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
import { useTranslation } from 'react-i18next';
import { fetchMemberDT, memberType } from 'src/store/apps/crud/member';
import { fetchVisitorDT, VisitorType } from 'src/store/apps/crud/visitor';
import { SetSelectedBeacon } from 'src/store/apps/tracking/Beacon';

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
const filter = {
  draw: 1,
  start: 0,
  length: 999,
  sortColumn: '',
  sortDir: 'asc',
  SearchValue: '',
};

const SidebarList = ({ filterType }: SidebarListProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ListType | null>(null);
  const [list, setList] = useState<ListType[]>([]);

  const trackTrans: trackingTransType[] = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTrans,
  );
  // console.log(trackTrans);
  const alarmRecord: AlarmType[] = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackings,
  );
  const memberList: memberType[] = useSelector((state: RootState) => state.memberReducer.members);
  const visitorList: VisitorType[] = useSelector(
    (state: RootState) => state.visitorReducer.visitors,
  );

  const getName = (bleNumber: string) => {
    const member = memberList.find((member) => member.bleCardNumber === bleNumber);
    if (member) {
      return member.name;
    }
    const visitor = visitorList.find((visitor) => visitor.bleCardNumber === bleNumber);
    if (visitor) {
      return visitor.name;
    }
    return 'Unknown';
  };

  useEffect(() => {
    dispatch(fetchTrackingTrans());
    dispatch(fetchAlarm());
    dispatch(fetchVisitorDT(filter));
    dispatch(fetchMemberDT(filter));
  }, [dispatch]);
  useEffect(() => {
    const transformedTrackTrans: ListType[] = trackTrans.map((item) => ({
      id: item.id,
      device: item.reader?.name ?? 'Unknown Device',
      target: item.cardId,
      floor: item.floorplanMaskedArea?.floor?.name ?? 'Floor 2',
      area: item.floorplanMaskedArea?.name ?? 'Unknown Area',
      time: item.transTime,
    }));
    const transformedAlarm: ListType[] = alarmRecord.map((item) => ({
      id: item.id,
      device: item.reader?.name ?? 'Unknown Device', // Provide a default value
      target: item.visitor?.name ?? 'Unknown Visitor', // Provide a default value
      floor: item.floorplanMaskedArea?.floor?.name ?? 'Floor 2', // Provide a default value
      area: item.floorplanMaskedArea?.name ?? 'Unknown Area', // Provide a default value
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
  const handleOpenDetails = (cardNumber: string, area: string, floorplan: string, time: string) => {
    dispatch(SetSelectedBeacon({ active: true, id: cardNumber, area, floorplan, time }));
    setOpenModal(false);
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
              <Button
                onClick={() =>
                  handleOpenDetails(
                    'BC572913EA8B',
                    selectedItem.area,
                    selectedItem.floor,
                    selectedItem.time,
                  )
                }
                size="small"
                variant="contained"
              >
                Person Details
              </Button>
              <Button
                color="error"
                onClick={() => setOpenModal(false)}
                size="small"
                variant="outlined"
              >
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
