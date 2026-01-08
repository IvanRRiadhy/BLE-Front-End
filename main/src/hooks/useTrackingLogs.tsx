import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useMemo } from 'react';
import { TrackingLogItem } from 'src/store/apps/tracking/Beacon';

export function useTrackingLogs(): TrackingLogItem[] {
  const beaconsByTopic = useSelector(
    (state: RootState) => state.BeaconReducer.beaconsByTopic
  );
  const alarmTriggers = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggers
  );

  const { data: members = [] } = useAllMembers();
  const { data: visitors = [] } = useAllVisitor();

  return useMemo(() => {
    const logs: TrackingLogItem[] = [];

    const getName = (ble: string) =>
      members.find(m => m.bleCardNumber === ble)?.name ||
      visitors.find(v => v.bleCardNumber === ble)?.name ||
      'Unknown';

    const getImage = (ble: string) =>
      members.find(m => m.bleCardNumber === ble)?.faceImage ||
      visitors.find(v => v.bleCardNumber === ble)?.faceImage ||
      '';

    // 🔔 ALARMS
    alarmTriggers.forEach(a => {
      logs.push({
        id: `alarm-${a.id}`,
        device: 'Alarm',
        type: 'Alarm',
        target: getName(a.beaconId),
        image: getImage(a.beaconId),
        dmac: a.beaconId,
        floor: a.floorplan?.name || 'Unknown Floor',
        area: 'Unknown Area',
        time: a.triggerTime,
        status: a.isActive ? 'Active' : 'Inactive',
        alarmType: a.isInRestrictedArea ? 'Restricted' : undefined,
      });
    });

    // 📍 TRACKING
    Object.values(beaconsByTopic).forEach(topic => {
      Object.values(topic).forEach((b: any) => {
        logs.push({
          id: `trk-${b.beaconId}-${b.time}`,
          device: 'Tracking Event',
          type: 'Tracking',
          target: getName(b.beaconId),
          image: getImage(b.beaconId),
          dmac: b.beaconId,
          floor: b.floorplanName || 'Unknown Floor',
          area: b.maskedAreaName || 'Unknown Area',
          time: b.time,
        });
      });
    });

    return logs;
  }, [beaconsByTopic, alarmTriggers, members, visitors]);
}


export function useEnrichedTrackingLogs(): TrackingLogItem[] {
  const logs = useSelector(
    (state: RootState) => state.BeaconReducer.trackingLogs
  );

  const { data: members = [] } = useAllMembers();
  const { data: visitors = [] } = useAllVisitor();

  return useMemo(() => {
    const memberMap = new Map(
      members.map(m => [m.bleCardNumber, m])
    );
    const visitorMap = new Map(
      visitors.map(v => [v.bleCardNumber, v])
    );

    return logs.map(log => {
      const m = memberMap.get(log.dmac);
      const v = visitorMap.get(log.dmac);

      return {
        ...log,
        target: m?.name || v?.name || 'Unknown',
        image: m?.faceImage || v?.faceImage || '',
      };
    });
  }, [logs, members, visitors]);
}
