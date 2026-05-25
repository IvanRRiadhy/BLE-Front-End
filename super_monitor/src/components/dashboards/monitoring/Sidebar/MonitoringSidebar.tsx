// import { useMediaQuery, Box, Drawer, useTheme } from '@mui/material';
// import { useSelector, useDispatch } from 'src/store/Store';
// import { RootState } from 'src/store/Store';
// import SidebarList from './SidebarList';
// import { useState } from 'react';
// import SidebarFilter from './SidebarFilter';
// import { setMonitorSidebar } from 'src/store/customizer/CustomizerSlice';

// type PersonFilter = {
//   Visitor: boolean;
//   Member: boolean;
//   Security: boolean;
//   FocusedPersonOnly: boolean;
// };

// const MonitoringSidebar = () => {
//   const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
//   const customizer = useSelector((state: RootState) => state.customizer);   
//   const settings = useSelector((state: RootState) => state.settings);
//   const dispatch = useDispatch();
//   const theme = useTheme();
//   const toggleWidth = customizer.isMonitorSidebar
//     ? settings.SidebarWidth
//     : settings.MiniSidebarWidth;
//   const [filterType, setFilterType] = useState<string[]>(['Tracking', 'Alarm']);
//   const [personFilter, setPersonFilter] = useState<PersonFilter>({
//     Visitor: true,
//     Member: true,
//     Security: true,
//     FocusedPersonOnly: false,
//   });

//   if (lgUp) {
//     return (
//       <Box
//         sx={{
//           width: toggleWidth,
//           flexShrink: 0,
//           marginTop: `${settings.TopbarHeight}px`,
//           position: 'relative',
//         }}
//       >
//         {/* ------------------------------------------- */}
//         {/* Sidebar for desktop */}
//         {/* ------------------------------------------- */}
//         <Drawer
//           anchor="left"
//           open
//           variant="permanent"
//           PaperProps={{
//             sx: {
//               transition: theme.transitions.create('width', {
//                 duration: theme.transitions.duration.shortest,
//               }),
//               width: toggleWidth,
//               boxSizing: 'border-box',
//               marginTop: `${settings.TopbarHeight}px`,
//               //marginLeft: customizer.isCollapse ? 0 : `${customizer.SidebarWidth}px`,
//             },
//           }}
//         >
//           {/* ------------------------------------------- */}
//           {/* Sidebar Box */}
//           {/* ------------------------------------------- */}
//           <Box
//             sx={{
//               height: `calc(100% - ${settings.TopbarHeight}px)`,
//             }}
//           >
//             <SidebarFilter
//               filterType={filterType}
//               setFilterType={setFilterType}
//               personFilter={personFilter}
//               setPersonFilter={setPersonFilter}
//             />

//             <SidebarList
//               filterType={filterType}
//               personFilter={personFilter}
//             />
//           </Box>
//         </Drawer>
//       </Box>
//     );
//   }
// };

// export default MonitoringSidebar;
