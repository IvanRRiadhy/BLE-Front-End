import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Select,
  Typography,
  TextField,
  Autocomplete,
  CircularProgress,
  createFilterOptions,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'src/store/Store';
import { setActiveLayout, setScreenDisplay } from 'src/store/apps/monitoring/layout';
import { fetchVisitor, VisitorType } from 'src/store/apps/crud/visitor';
import { publishMQTT } from 'src/store/apps/tracking/MQTT';
import TimeDisplay from '../horizontal/navbar/TimeDisplay';
import { uniqueId } from 'lodash';
import { useAllVisitor } from 'src/hooks/useVisitor';

const Toolbar = () => {
  const dispatch: AppDispatch = useDispatch();
  const appId = localStorage.getItem('applicationId') || '';
  const layouts = useSelector((state: RootState) => state.layoutReducer.layouts ?? []);
  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);
  const activeLayout = layouts.find((l: any) => l.id === activeLayoutId) ?? null;

  // const [visitorList, setVisitorList] = useState<VisitorType[]>([]);
  const {data: visitorList = [], isLoading: loading} = useAllVisitor();
  const filteredVisitorList = visitorList.filter((v: VisitorType) => v.bleCardNumber && v.bleCardNumber.trim() !== '');
  // const [loading, setLoading] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorType | null>(null);


  // 🟢 When a visitor is chosen → Follow them
  const handleFollowVisitor = (visitor: VisitorType) => {
    if (!activeLayoutId || !activeLayout) {
      console.warn('No active layout found.');
      return;
    }

    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) {
      console.warn('No screens available in active layout.');
      return;
    }

    const bleNumber = visitor.bleCardNumber;
    const topic = `people_tracking/${appId.toUpperCase()}/highlight/card/${bleNumber}`;
    const payload = 'Start';

    // ✅ Publish Start message
    publishMQTT(topic, payload);
    console.log(
      `Following visitor ${visitor.name} (${bleNumber}) on layout ${activeLayoutId}, screen ${firstScreen.id}`,
    );

    // ✅ Switch first screen into Follow Mode
    dispatch(
      setScreenDisplay({
        layoutId: activeLayoutId,
        screenId: firstScreen.id,
        display: {
          displayType: 3, // Follow Mode
          displayOutput: bleNumber,
        },
      }),
    );

    setSelectedVisitor(null); // clear search
  };


  const filter = useMemo(() => createFilterOptions<VisitorType>({
    stringify: (option) => `${option.name} ${option.bleCardNumber}`,
  }), []);

  return (
    <Box sx={{ width: '100%', px: 2, py: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        {/* Left group */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight={900}>
            Layout :
          </Typography>

          <Select
            value={activeLayoutId ?? ''}
            onChange={(e) => dispatch(setActiveLayout(e.target.value))}
            variant="outlined"
            size="small"
            sx={{ minWidth: '220px', fontWeight: 'bold' }}
            displayEmpty
          >
            <MenuItem value="" disabled>
              -- Select Layout --
            </MenuItem>
            {layouts.map((layout) => (
              <MenuItem key={layout.id} value={layout.id}>
                {layout.name || 'Unnamed Layout'}
              </MenuItem>
            ))}
          </Select>

          <Button color="success" variant="text">
            Max
          </Button>
          <Button color="error" variant="text">
            Min
          </Button>

          {/* 🔍 Visitor Search Autocomplete and Download Logs Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Autocomplete
              value={selectedVisitor}
              onChange={(e, newValue) => {
                if (newValue) handleFollowVisitor(newValue);
              }}
              options={filteredVisitorList}
              loading={loading}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={filter}
              sx={{ width: 300 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Visitor"
                  variant="outlined"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                    </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id || uniqueId()}>
                  <Box>
                    <Typography fontWeight={700}>{option.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.bleCardNumber}
                    </Typography>
                  </Box>
                </li>
              )}
            />
          </Box>
        </Box>

        {/* Right side clock */}
        {/* <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <TimeDisplay />
        </Box> */}
      </Box>
    </Box>
  );
};

export default Toolbar;