import { CssBaseline, ThemeProvider } from '@mui/material';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'src/store/Store';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { RouterProvider } from 'react-router';
import router from './routes/Router';
import { RootState } from './store/Store';
import usePreventWindowClose from './hooks/usePreventWindowClose';
import { getActiveFeatures } from './hooks/useInfo';
import { setActiveFeatures } from './store/apps/session';

function App() {
  const theme = ThemeSettings();
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();

  const isLoggedIn = typeof window !== 'undefined' && (!!localStorage.getItem('response') || !!localStorage.getItem('token'));
  const { data: featureData } = getActiveFeatures(isLoggedIn);

  useEffect(() => {
    if (featureData?.activeFeatures) {
      dispatch(setActiveFeatures(featureData.activeFeatures));
    }
  }, [featureData, dispatch]);

  // Global browser close preventer
  // usePreventWindowClose(true);

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
