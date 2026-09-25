import { CssBaseline, ThemeProvider, Box, CircularProgress, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'src/store/Store';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { RouterProvider } from 'react-router';
import router from './routes/Router';
import { RootState } from './store/Store';
import usePreventWindowClose from './hooks/usePreventWindowClose';
import { getActiveFeatures, useLicenseInfo } from './hooks/useInfo';
import { setActiveFeatures } from './store/apps/session';
import AboutPage from './views/About/aboutPage';
import { getAccessToken } from './utils/axios';

function App() {
  const theme = ThemeSettings();
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();

  // Fetch license info on initialization
  const { data: licenseData, isLoading: isLicenseLoading } = useLicenseInfo();

  const isLoggedIn =
    typeof window !== 'undefined' &&
    (!!getAccessToken() || !!localStorage.getItem('levelPriority'));
  const { data: featureData } = getActiveFeatures(isLoggedIn && !!licenseData?.isValid);

  useEffect(() => {
    if (featureData?.activeFeatures) {
      dispatch(setActiveFeatures(featureData.activeFeatures));
    }
  }, [featureData, dispatch, isLoggedIn]);

  // Global browser close preventer
  // usePreventWindowClose(true);

  // Loading state while verifying system license
  if (isLicenseLoading) {
    return (
      <ThemeProvider theme={theme}>
        <RTL direction={settings.activeDir}>
          <CssBaseline />
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh" gap={2}>
            <CircularProgress size={48} />
            <Typography variant="h6" color="textSecondary">
              Verifying system license...
            </Typography>
          </Box>
        </RTL>
      </ThemeProvider>
    );
  }

  // If license is invalid, lock user to About page without any navbar or router navigation
  if (licenseData && !licenseData.isValid) {
    return (
      <ThemeProvider theme={theme}>
        <RTL direction={settings.activeDir}>
          <CssBaseline />
          <Box sx={{ minHeight: '100vh', p: { xs: 2, md: 4 }, bgcolor: 'background.default' }}>
            <AboutPage isLicenseLocked={true} />
          </Box>
        </RTL>
      </ThemeProvider>
    );
  }

  // If isValid === true => continue to the URL or go to Login Page via router
  return (
    <ThemeProvider theme={theme}>
      <RTL direction={settings.activeDir}>
        <CssBaseline />
        <RouterProvider router={router} />
      </RTL>
    </ThemeProvider>
  );
}

export default App;
