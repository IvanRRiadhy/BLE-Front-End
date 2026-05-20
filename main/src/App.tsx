import { CssBaseline, ThemeProvider } from '@mui/material';

import { useSelector } from 'src/store/Store';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { RouterProvider } from 'react-router';
import router from './routes/Router';
import { RootState } from './store/Store';
import usePreventWindowClose from './hooks/usePreventWindowClose';

function App() {
  const theme = ThemeSettings();
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);

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
