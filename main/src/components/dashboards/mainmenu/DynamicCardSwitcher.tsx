// import React, { useState, useMemo } from 'react';
// import { Box, Fade, Typography, IconButton } from '@mui/material';
// import { ChevronLeft, ChevronRight } from '@mui/icons-material';
// import DashboardCard from 'src/components/shared/DashboardCard';
// import AlarmWarning from './AlarmWarning';
// import Blacklist from './Blacklist';

// export type SwitcherType = 'Alarm' | 'Blacklist' | 'Tracking' | 'Visitor';

// interface DynamicSwitcherCardProps {
//   defaultType?: SwitcherType;
//   availableTypes: SwitcherType[];
//   componentProps?: Record<string, any>;
// }

// const DynamicSwitcherCard: React.FC<DynamicSwitcherCardProps> = ({
//   defaultType = 'Alarm',
//   availableTypes = ['Alarm', 'Blacklist'],
//   componentProps = {},
// }) => {
//   const [currentIndex, setCurrentIndex] = useState(
//     Math.max(0, availableTypes.indexOf(defaultType))
//   );
//   const currentType = availableTypes[currentIndex];

//   // ---- Navigation Handlers ----
//   const handlePrev = () => {
//     setCurrentIndex((prev) =>
//       prev === 0 ? availableTypes.length - 1 : prev - 1
//     );
//   };

//   const handleNext = () => {
//     setCurrentIndex((prev) =>
//       prev === availableTypes.length - 1 ? 0 : prev + 1
//     );
//   };

//   // ---- Render Selected Component ----
//   const renderComponent = useMemo(() => {
//     switch (currentType) {
//       case 'Alarm':
//         return <AlarmWarning {...(componentProps['Alarm'] || {})} />;
//       case 'Blacklist':
//         return <Blacklist {...(componentProps['Blacklist'] || {})} />;
//       default:
//         return (
//           <Box p={2} sx={{width: '100%'}}>
//             <Typography variant="body1" color="text.secondary">
//               {currentType} section coming soon...
//             </Typography>
//           </Box>
//         );
//     }
//   }, [currentType, componentProps]);

//   return (
//     <DashboardCard>
//       {/* ===== Header ===== */}
//       <Box
//         sx={{
//           position: 'relative',
//           mb: 2,
//           minHeight: 32,
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'space-between',
//         }}
//       >
//         {/* Title */}
//         <Typography variant="h5" fontWeight={600}>
//           {currentType}
//         </Typography>

//         {/* Top-right navigation controls */}
//         <Box
//           sx={{
//             display: 'flex',
//             alignItems: 'center',
//             gap: 1,
//             position: 'absolute',
//             top: 0,
//             right: 4,
//           }}
//         >
//           {/* Left button */}
//           <IconButton
//             onClick={handlePrev}
//             size="small"
//             disableRipple
//             sx={{
//               width: 24,
//               height: 24,
//               transition: 'opacity 0.3s ease',
//               '&:hover': { opacity: 0.8 },
//             }}
//           >
//             <ChevronLeft fontSize="small" />
//           </IconButton>

//           {/* Dots */}
//           {availableTypes.map((type, idx) => (
//             <IconButton
//               key={type}
//               onClick={() => setCurrentIndex(idx)}
//               size="small"
//               disableRipple
//               sx={{
//                 width: 14,
//                 height: 14,
//                 borderRadius: '50%',
//                 backgroundColor:
//                   idx === currentIndex ? 'primary.main' : 'rgba(0,0,0,0.2)',
//                 transition: 'all 0.3s ease',
//                 transform: idx === currentIndex ? 'scale(1.1)' : 'scale(1)',
//                 '&:hover': {
//                   backgroundColor:
//                     idx === currentIndex
//                       ? 'primary.main'
//                       : 'rgba(0,0,0,0.35)',
//                 },
//               }}
//             />
//           ))}

//           {/* Right button */}
//           <IconButton
//             onClick={handleNext}
//             size="small"
//             disableRipple
//             sx={{
//               width: 24,
//               height: 24,
//               transition: 'opacity 0.3s ease',
//               '&:hover': { opacity: 0.8 },
//             }}
//           >
//             <ChevronRight fontSize="small" />
//           </IconButton>
//         </Box>
//       </Box>

//       {/* ===== Content ===== */}
//       <Fade in key={currentType}>
//         <Box
//           sx={{
//             height: 485, // Match TrackingGraphic height
//             display: 'flex',
//             flexDirection: 'column',
//           }}
//         >
//           {renderComponent}
//         </Box>
//       </Fade>
//     </DashboardCard>
//   );
// };

// export default DynamicSwitcherCard;
