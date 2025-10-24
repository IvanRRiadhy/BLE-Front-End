import { useMediaQuery, Box, Drawer, Container, Theme, Button } from '@mui/material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import NavListing from './NavListing/NavListing';
import Logo from '../../shared/logo/Logo';
import { useSelector, useDispatch } from 'src/store/Store';
import { toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice';
import SidebarItems from '../../vertical/sidebar/SidebarItems';
import { RootState } from 'src/store/Store';
import TimeDisplay from './TimeDisplay';
import DashboardFilter from './DashboardFilter';
import { useEffect } from 'react';
import { fetchAlarmSetting, fetchAlarmSettingsDT } from 'src/store/apps/alarmsetting/alarmSettings';
import { fetchDailyReport } from 'src/store/apps/crud/analytics';

const Navigation = () => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const customizer = useSelector((state: RootState) => state.customizer);
  const dispatch = useDispatch();
  const isMain = useSelector((state: RootState) => state.customizer.isMainMenu);

  useEffect(() => {
    dispatch(fetchAlarmSetting());
  }, [dispatch]);

  const handleScreenshot = async () => {
    const res = await dispatch(
      fetchDailyReport({
        from: '2025-07-01T00:00:00Z',
        to: '2025-10-24T23:59:59Z',
        floorplanMaskedAreaId: null,
        operatorName: null,
        visitorId: null,
        buildingId: 'bb785baf-f0b4-4f12-86c7-6dcec0c0a160',
        floorId: null,
      }),
    );
    console.log('Daily Report Data:', res.payload);
    // const element = document.querySelector('.page-wrapper'); // FullLayout wrapper for MainView
    // if (!element) return;

    // // Take screenshot of main view only
    // const canvas = await html2canvas(element as HTMLElement, { scale: 2 });
    // const imgData = canvas.toDataURL('image/png');

    // // Create A4 PDF
    // const pdf = new jsPDF('p', 'mm', 'a4');
    // const pdfWidth = pdf.internal.pageSize.getWidth();
    // const pdfHeight = pdf.internal.pageSize.getHeight();

    // const imgWidth = pdfWidth;
    // const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // let position = 0;
    // if (imgHeight < pdfHeight) {
    //   // Center vertically if smaller
    //   position = (pdfHeight - imgHeight) / 2;
    // }

    // pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    // pdf.save('dashboard.pdf');
  };

  if (lgUp) {
    return (
      <Box
        sx={{
          position: 'sticky',
          top: customizer.TopbarHeight,
          width: '100%',
          zIndex: 100, // Ensures it's above other content
          backgroundColor: 'background.paper',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}
        py={2}
      >
        {/* ------------------------------------------- */}
        {/* Sidebar for desktop */}
        {/* ------------------------------------------- */}
        <Container
          sx={{
            maxWidth: customizer.isLayout === 'boxed' ? 'lg' : '100%!important',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <NavListing />

            {/* Right section */}
            <Box display="flex" alignItems="center" sx={{ gap: 2 }}>
              {/* Fixed button group */}
              {isMain && (
                <Box display="flex" alignItems="center" sx={{ gap: 1 }}>
                  <DashboardFilter />
                  <Button variant="outlined" size="small" onClick={handleScreenshot}>
                    Screenshot
                  </Button>
                </Box>
              )}

              {/* Let TimeDisplay take space but not affect the button group */}
              <Box sx={{ flexShrink: 0 }}>
                <TimeDisplay />
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Drawer
      anchor="left"
      open={customizer.isMobileSidebar}
      onClose={() => dispatch(toggleMobileSidebar())}
      variant="temporary"
      PaperProps={{
        sx: {
          width: customizer.SidebarWidth,
          border: '0 !important',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      {/* ------------------------------------------- */}
      {/* Logo */}
      {/* ------------------------------------------- */}
      <Box px={2}>
        <Logo />
      </Box>
      {/* ------------------------------------------- */}
      {/* Sidebar For Mobile */}
      {/* ------------------------------------------- */}
      <SidebarItems />
    </Drawer>
  );
};

export default Navigation;
