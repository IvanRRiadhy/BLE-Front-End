import {
  Box,
  Button,
  List,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'src/store/Store';
import { setMonitorSidebar } from 'src/store/customizer/CustomizerSlice';
import { setActiveLayout, LayoutSet } from 'src/store/apps/monitoring/layout';

const Toolbar = () => {
  const dispatch: AppDispatch = useDispatch();

  // Redux: Layouts and active layout
  const layouts = useSelector((state: RootState) => state.layoutReducer.layouts ?? []);
  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);
  const activeLayout = layouts.find((l) => l.id === activeLayoutId) ?? null;

  // Local: fullscreen + datetime
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  // 🕒 Format date and update every second
  const formatDateTime = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(now)
      .replace(/\./g, ':');
  };

  useEffect(() => {
    setCurrentDateTime(formatDateTime());
    const interval = setInterval(() => setCurrentDateTime(formatDateTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 🖥 Fullscreen handler
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = (enable: boolean) => {
    const element = document.documentElement;
    if (enable && !document.fullscreenElement) {
      dispatch(setMonitorSidebar(false));
      element.requestFullscreen?.();
      (element as any).webkitRequestFullscreen?.();
      (element as any).msRequestFullscreen?.();
    } else if (!enable && document.fullscreenElement) {
      dispatch(setMonitorSidebar(true));
      document.exitFullscreen?.();
      (document as any).webkitExitFullscreen?.();
      (document as any).msExitFullscreen?.();
    }
  };

  // 🧭 Handle layout selection
  const handleLayoutChange = (event: SelectChangeEvent<string>) => {
    const layoutId = event.target.value;
    dispatch(setActiveLayout(layoutId));
  };

  return (
    <Box>
      <List
        sx={{
          p: 0,
          display: 'flex',
          gap: '20px',
          zIndex: 100,
          alignItems: 'center',
        }}
      >
        {/* 🧱 Layout Selector */}
        <Typography variant="h5" fontStyle="bold" fontWeight={900}>
          Layout :
        </Typography>

        <Select
          value={activeLayoutId ?? ''}
          onChange={handleLayoutChange}
          variant="outlined"
          size="small"
          sx={{ minWidth: '220px', fontWeight: 'bold' }}
          displayEmpty
        >
          <MenuItem value="" disabled>
            -- Select Layout --
          </MenuItem>
          {layouts.map((layout: LayoutSet) => (
            <MenuItem key={layout.id} value={layout.id}>
              {layout.name || 'Unnamed Layout'}
            </MenuItem>
          ))}
        </Select>

        {/* 🧭 Fullscreen Controls */}
        <Button
          color="success"
          variant={isFullscreen ? 'contained' : 'text'}
          onClick={() => toggleFullscreen(true)}
        >
          Max
        </Button>
        <Button
          color="error"
          variant={!isFullscreen ? 'contained' : 'text'}
          onClick={() => toggleFullscreen(false)}
        >
          Min
        </Button>

        <Button>Capture</Button>

        {/* 🕒 Clock */}
        <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end' }}>
          <Typography variant="body1" fontWeight="bold">
            {currentDateTime}
          </Typography>
        </Box>
      </List>
    </Box>
  );
};

export default Toolbar;
