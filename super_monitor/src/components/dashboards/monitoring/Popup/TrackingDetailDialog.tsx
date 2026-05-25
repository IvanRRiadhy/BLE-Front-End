// import {
//   Box,
//   Button,
//   Dialog,
//   DialogActions,
//   DialogContent,
//   DialogTitle,
//   Typography,
// } from '@mui/material';
// import { useDispatch, useSelector, RootState } from 'src/store/Store';
// // import { ShowTrackingDetail } from 'src/store/apps/monitoring/TrackingUI';
// import { SetSelectedBeacon, ShowTrackingDetail } from 'src/store/apps/tracking/Beacon';

// const TrackingDetailDialog = () => {
//   const dispatch = useDispatch();

//   const tracking = useSelector(
//     (state: RootState) => state.BeaconReducer.showTracking
//   );

//   const open = Boolean(tracking);

//   if (!tracking) return null;

//   const formatTime = (iso: string) => {
//     const d = new Date(iso);
//     return d.toLocaleString('en-GB', { hour12: false });
//   };

//   const handleClose = () => {
//     dispatch(ShowTrackingDetail(null));
//   };

//   const handleOpenDetails = () => {
//     dispatch(
//       SetSelectedBeacon({
//         active: true,
//         id: tracking.dmac,
//         area: tracking.area,
//         floorplan: tracking.floor,
//         time: tracking.time,
//         sourceScreenId: 1,
//       })
//     );
//     handleClose();
//   };

//   return (
//     <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
//       <DialogTitle
//         sx={{
//           bgcolor: 'secondary.main',
//           color: 'white',
//         }}
//       >
//         Tracking Detail
//       </DialogTitle>

//       <DialogContent>
//         <Typography fontWeight="bold">
//           Target: {tracking.target}
//         </Typography>

//         <Typography>
//           Time: {formatTime(tracking.time)}
//         </Typography>

//         <Typography>
//           Floor: {tracking.floor}
//         </Typography>

//         <Typography>
//           Area: {tracking.area}
//         </Typography>
//       </DialogContent>

//       <DialogActions>
//         <Button onClick={handleClose}>
//           Close
//         </Button>

//         <Button
//           variant="contained"
//           onClick={handleOpenDetails}
//         >
//           Person Details
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default TrackingDetailDialog;