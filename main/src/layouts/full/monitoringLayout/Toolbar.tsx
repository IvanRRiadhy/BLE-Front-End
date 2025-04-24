import { Box, Button, List, MenuItem, Select, SelectChangeEvent, Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import { useDispatch, AppDispatch, useSelector, AppState } from 'src/store/Store';
import { setMonitorSidebar } from 'src/store/customizer/CustomizerSlice';
import { setGrid } from 'src/store/apps/monitoring/layout';

const Toolbar = () => {
  const [currentDateTime, setCurrentDateTime] = useState<string>(''); // Initialize with the current time in Indonesian format
  const selectedGrid = useSelector((state: AppState) => state.layoutReducer.grid); // Get the current grid value from the store
  const dispatch: AppDispatch = useDispatch();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const handleChange = (event: SelectChangeEvent<string>) => {
    dispatch(setGrid(parseInt(event.target.value.charAt(0)))); // Dispatch the selected grid value
  };
  const grid = useSelector((state: AppState) => state.layoutReducer.grid); // Get the current grid value from the store
  const toggleFullscreen = (isMax: boolean) => {
    const element = document.documentElement; // Target the entire document for fullscreen
    if (isMax && !document.fullscreenElement) {
      dispatch(setMonitorSidebar(false)); // Hide the sidebar
      // Enter fullscreen mode
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen(); // Safari
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen(); // IE/Edge
      }
    }
    if (!isMax && document.fullscreenElement) {
      dispatch(setMonitorSidebar(true)); // Hide the sidebar
      // Exit fullscreen mode
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen(); // Safari
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen(); // IE/Edge
      }
    }
    // console.log(isFullscreen);
    // const header = document.querySelector('header'); // Assuming the header is a <header> element
    // if (header) {
    //   header.style.display = isFullscreen ? 'block' : 'none'; // Hide or show the header
    // }
  };
  // Function to format date and time with colons
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
      hour12: false, // Use 24-hour format
    })
      .format(now)
      .replace(/\./g, ':'); // Replace dots with colons
  };

  // Update date and time every second
  useEffect(() => {
    setCurrentDateTime(formatDateTime()); // Set initial time immediately
    const interval = setInterval(() => {
      setCurrentDateTime(formatDateTime());
    }, 1000);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement); // Update state based on fullscreenElement
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    document.addEventListener('msfullscreenchange', handleFullscreenChange); // IE/Edge

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <Box>
      <List
        sx={{
          p: 0,
          display: 'flex', // Flex layout for horizontal alignment
          gap: '20px', // Space between items
          zIndex: '100',
          alignItems: 'center', // Align items vertically
        }}
      >
        <Typography variant="h5" fontStyle="bold" fontWeight={900} mt={0.5}>
          Grid :
        </Typography>
        {/* Dropdown for Grid Selection */}
        <Select
          value={selectedGrid.toString()} // Convert number to string for Select value
          onChange={handleChange}
          variant="outlined"
          size="small"
          sx={{
            minWidth: '100px', // Adjust width as needed
            fontWeight: 'bold',
            marginRight: '20px',
          }}
        >
          <MenuItem value="1">1 Grid</MenuItem>
          <MenuItem value="2">2 Grid</MenuItem>
          <MenuItem value="3">3 Grid</MenuItem>
          <MenuItem value="4">4 Grid</MenuItem>
          <MenuItem value="5">5 Grid</MenuItem>
          <MenuItem value="6">6 Grid</MenuItem>
        </Select>
        <Button>Refresh</Button>
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

        {/* Right Section: Date and Time */}
        <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end' }}>
          {' '}
          {/* Push this section to the far right */}
          <Typography variant="body1" fontWeight="bold">
            {currentDateTime}
          </Typography>
        </Box>
      </List>
    </Box>
  );
};

export default Toolbar;
