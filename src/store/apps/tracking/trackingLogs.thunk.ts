import { useAllMembers } from 'src/hooks/useMember';
import { AppendTrackingLogs, TrackingLogItem } from './Beacon';
import { RootState } from 'src/store/Store';
import { useAllVisitor } from 'src/hooks/useVisitor';

const MAX_LIST_ITEMS = 100;




// export const buildTrackingLogs =
//   () => (dispatch: any, getState: () => RootState) => {

//     const state = getState();

//     const beaconsByTopic = state.BeaconReducer.beaconsByTopic;
//     const alarmTriggers = state.alarmTriggerReducer.alarmTriggers;
//     const members = state.memberReducer.memberAll;
//     const visitors = state.visitorReducer.visitorAll;

//           const getName = (bleNumber: string) => {
//     const m = members.find((x) => x.bleCardNumber === bleNumber);
//     if (m) return m.name;
//     const v = visitors.find((x) => x.bleCardNumber === bleNumber);
//     if (v) return v.name;
//     return 'Unknown';
//   };
//   const getImage = (bleNumber: string) => {
//     const m = members.find((x) => x.bleCardNumber === bleNumber);
//     if (m && m.faceImage) return m.faceImage;
//     const v = visitors.find((x) => x.bleCardNumber === bleNumber);
//     if (v && v.faceImage) return v.faceImage;
//     return '';
//   }

//     const logs: TrackingLogItem[] = [];

//     // --- alarms ---
//     alarmTriggers.forEach(a => {
//       const id = `alarm-${a.id}`;
//       logs.push({
//         id,
//         device: 'Alarm',
//         target: getName(a.beaconId),
//         image: getImage(a.beaconId),
//         dmac: a.beaconId,
//         floor: a.floorplan?.name || 'Unknown Floor',
//         area: 'Unknown Area',
//         alarmType: a.isInRestrictedArea ? 'Restricted' : undefined,
//         status: a.isActive ? 'Active' : 'Inactive',
//         time: a.triggerTime,
//         type: 'Alarm',
//       });
//     });

//     // --- tracking ---
//     Object.values(beaconsByTopic).forEach(topicBeacons => {
//       Object.values(topicBeacons).forEach((b: any) => {
//         logs.push({
//           id: `trk-${b.beaconId}-${b.maskedAreaName}-${b.time}`,
//           device: 'Tracking Event',
//           target: getName(b.beaconId),
//           image: getImage(b.beaconId),
//           dmac: b.beaconId, 
//           floor: b.floorplanName || 'Unknown Floor',
//           area: b.maskedAreaName || 'Unknown Area',
//           time: b.time,
//           type: 'Tracking',
//         });
//       });
//     });

//     dispatch(AppendTrackingLogs(logs));
//   };
