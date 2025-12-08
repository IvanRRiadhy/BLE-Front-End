import { useEffect, useMemo, useRef, useState } from 'react';
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
import { fetchBeacon } from 'src/store/apps/tracking/Beacon';
import { fetchMemberDT, fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchVisitor, fetchVisitorDT, VisitorType } from 'src/store/apps/crud/visitor';
import { SetSelectedBeacon } from 'src/store/apps/tracking/Beacon';
import { fetchAlarmTriggerDT } from 'src/store/apps/crud/alarmTrigger';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';

interface SidebarListProps {
  filterType: string; // '', 'All', 'Tracking', 'Alarm'
}

type ListType = {
  id: string;
  device: string;
  target: string;
  dmac: string;
  floor: string;
  area: string;
  alarmType?: string;
  time: string;
  status?: string;
  type: 'Alarm' | 'Tracking';
};


const SidebarList = ({ filterType }: SidebarListProps) => {
  const dispatch = useDispatch();

  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ListType | null>(null);
  const [list, setList] = useState<ListType[]>([]);

  // const memberList: memberType[] = useSelector((s: RootState) => s.memberReducer.memberAll);
  // const visitorList: VisitorType[] = useSelector((s: RootState) => s.visitorReducer.visitorAll);
  const {data: memberList = []} = useAllMembers();
  const {data: visitorList = []} = useAllVisitor();
  const beaconsByTopic = useSelector((s: RootState) => s.BeaconReducer.beaconsByTopic || {});
  const alarmTriggers = useSelector((s: RootState) => s.alarmTriggerReducer.alarmTriggers || []);

  const getName = (bleNumber: string) => {
    const m = memberList.find((x) => x.bleCardNumber === bleNumber);
    if (m) return m.name;
    const v = visitorList.find((x) => x.bleCardNumber === bleNumber);
    if (v) return v.name;
    return  'Unknown';
  };

  const prevAreaByBeaconRef = useRef<Record<string, string>>({});
  const seenIdsRef = useRef<Set<string>>(new Set());
  // const unsubscribersRef = useRef<Array<() => void>>([]);

  const alarmKey = (a: any) => {
    const t = a.triggerTime ? new Date(a.triggerTime).getTime() : 0;
    if (a.id) return `alarm-${a.id}`;
    return `alarm-${a.beaconId || 'unk'}-${a.firstGatewayId || 'na'}-${t}`;
  };
  const trackingKey = (b: any) => {
    const t = b.time ? new Date(b.time).getTime() : 0;
    const beaconId = b.beaconId || b.cardId || b.id || 'unk';
    const area = b.maskedAreaName || b.areaName || b.maskedAreaId || 'na';
    return `trk-${beaconId}-${area}-${t}`;
  };

  // useEffect(() => {
  //   dispatch(fetchVisitor());
  //   dispatch(fetchMembers());
  // }, [dispatch]);

  useEffect(() => {
    const rowsToAppend: ListType[] = [];

    for (const a of alarmTriggers) {
      const id = alarmKey(a);
      if (!seenIdsRef.current.has(id)) {
        rowsToAppend.push({
          id,
          device: 'Alarm',
          target: getName(a.beaconId),
          dmac: a.beaconId,
          floor: a.floorplan?.name || 'Unknown Floor',
          area: 'Unknown Area',
          alarmType: a.isInRestrictedArea ? 'Restricted' : undefined,
          status: a.isActive ? 'Active' : 'Inactive',
          time: a.triggerTime || new Date().toISOString(),
          type: 'Alarm',
        });
        console.log('[Sidebar] Append Alarm:', id);
      }
    }

    Object.entries(beaconsByTopic).forEach(([, beacons]) => {
      (beacons || []).forEach((b: any) => {
        const beaconId = b.beaconId || b.cardId || b.id || '';
        if (!beaconId) return;
        // console.log("beaconID :",beaconId)
        const areaNow = b.maskedAreaName || b.areaName || '';
        if (!areaNow) return;

        const prevArea = prevAreaByBeaconRef.current[beaconId];
        if (prevArea !== areaNow) {
          prevAreaByBeaconRef.current[beaconId] = areaNow;

          const id = trackingKey(b);
          if (!seenIdsRef.current.has(id)) {
            rowsToAppend.push({
              id,
              device: 'Tracking Event',
              target: getName(beaconId),
              dmac: beaconId,
              floor: b.floorplanName || 'Unknown Floor',
              area: areaNow,
              time: b.time || new Date().toISOString(),
              type: 'Tracking',
            });
            console.log('[Sidebar] Append Tracking (area-enter):', id);
          }
        }
      });
    });

    if (rowsToAppend.length === 0) return;

    setList((prev) => {
      const merged = [...prev];
      for (const row of rowsToAppend) {
        if (!seenIdsRef.current.has(row.id)) {
          seenIdsRef.current.add(row.id);
          merged.push(row);
        }
      }

      let filtered = merged;
      if (filterType && filterType !== 'All') {
        filtered = filtered.filter((x) => x.type === filterType);
      }

      filtered.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      return filtered;
    });
  }, [alarmTriggers, beaconsByTopic, filterType]);

  const handleItemClick = (item: ListType) => {
    setSelectedItem(item);
    setOpenModal(true);
  };

  const handleOpenDetails = (cardNumber: string, area: string, floorplan: string, time: string) => {
    console.log('🟡 handleOpenDetails called', cardNumber);
    dispatch(SetSelectedBeacon({ active: true, id: cardNumber, area, floorplan, time }));
    setOpenModal(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { hour12: false });
  };

  return (
    <>
      <List>
        <Scrollbar sx={{ height: { lg: 'calc(100vh - 270px)', md: '100vh' }, maxHeight: '800px' }}>
          {list.map((item) => (
            <SidebarListItem key={item.id} item={item} onItemClick={() => handleItemClick(item)} />
          ))}
        </Scrollbar>
      </List>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        {selectedItem && (
          <>
            <DialogTitle
              sx={{ fontSize: '1rem', p: '16px' }}
              bgcolor={selectedItem.type === 'Alarm' ? 'error.main' : 'secondary.main'}
              color="white"
            >
              {selectedItem.device}
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: '8px 16px', ml: '8px' }}>
              <Box>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  Target: {selectedItem.target}
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
                  <>
                    <Typography variant="body1" gutterBottom>
                      Alarm Type: {selectedItem.alarmType || '-'}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      Status: {selectedItem.status || '-'}
                    </Typography>
                  </>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: '8px 16px' }}>
              <Button
                onClick={() =>
                  handleOpenDetails(
                    selectedItem.dmac,
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
