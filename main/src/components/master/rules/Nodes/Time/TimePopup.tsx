import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Divider,
  Grid2 as Grid,
  FormControlLabel,
  Checkbox,
  Stack,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { TimePicker, DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

interface NodePopupProps {
  node: { id: string; name: string; posX: number; posY: number; details: string } | null;
  onClose: () => void;
  onEdit: (nodeId: string, name: string) => void;
  onDelete: (nodeId: string) => void;
  onCreateConnection?: (nodeId: string, e: any) => void; // New prop for creating a connection
}
type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MemberNodePopup: React.FC<NodePopupProps> = ({
  node,
  onClose,
  onEdit,
  onDelete,
  onCreateConnection,
}) => {
  if (!node || !node.id || !node.name || node.posX === undefined || node.posY === undefined) {
    return null;
  }

  const [inputDisplayed, setInputDisplayed] = useState({
    monthly: false,
    weekly: false,
    daily: true, // Default to daily
  });
  const handleInputDisplayChange = (type: 'monthly' | 'weekly' | 'daily') => {
    setInputDisplayed((prev) => {
      const newState = {
        ...prev,
        [type]: !prev[type],
      };

      // Reset time values if daily is being unchecked
      if (type === 'daily' && prev.daily) {
        setFormData((prev: typeof formData) => ({
          ...prev,
          startTime: dayjs('2024-01-01T00:00'),
          endTime: dayjs('2024-01-01T23:59'),
        }));
      }

      return newState;
    });
  };

  const getShortDayName = (day: DayOfWeek): string => day.slice(0, 3);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupDimensions, setPopupDimensions] = useState({ width: 200, height: 150 });

  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      setPopupDimensions({ width: rect.width, height: rect.height });
    }
  }, [popupRef]);
  // Validate and parse node.details
  const parseTimeDetails = (details: string) => {
    try {
      const parsed = JSON.parse(details);

      // Set the frequency checkboxes
      if (parsed.inputDisplayed) {
        setInputDisplayed((prev) => ({
          ...prev,
          monthly: parsed.inputDisplayed.includes('monthly'),
          weekly: parsed.inputDisplayed.includes('weekly'),
          daily: parsed.inputDisplayed.includes('daily'),
        }));
      }

      const result: any = {
        startTime: dayjs('2024-01-01T00:00'),
        endTime: dayjs('2024-01-01T23:50'),
        selectedDays: [] as DayOfWeek[],
        startDate: dayjs().startOf('month'),
        endDate: dayjs().endOf('month'),
      };

      // Parse monthly range if it exists
      if (parsed.monthlyRange) {
        const [startDate, endDate] = parsed.monthlyRange.split(' - ');
        result.startDate = dayjs(startDate, 'DD/MM/YYYY');
        result.endDate = dayjs(endDate, 'DD/MM/YYYY');
      }

      // Parse weekly range if it exists
      if (parsed.weeklyRange) {
        result.selectedDays = parsed.weeklyRange;
      }

      // Parse time range if it exists
      if (parsed.timeRange) {
        const timeRangeRegex = /^(\d{2}:\d{2}) - (\d{2}:\d{2})$/;
        const match = parsed.timeRange.match(timeRangeRegex);

        if (match) {
          const [, startTime, endTime] = match;
          result.startTime = dayjs(`2024-01-01T${startTime}`);
          result.endTime = dayjs(`2024-01-01T${endTime}`);
        }
      }

      return result;
    } catch {
      return {
        startTime: dayjs('2024-01-01T00:00'),
        endTime: dayjs('2024-01-01T23:50'),
        selectedDays: [] as DayOfWeek[],
        startDate: dayjs().startOf('month'),
        endDate: dayjs().endOf('month'),
      };
    }
  };

  const [formData, setFormData] = useState(() => ({
    ...parseTimeDetails(node.details || ''),
  }));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.MuiPopover-root') && // Time picker popup
        !(event.target as HTMLElement).closest('.MuiDialog-root') && // Dialog background
        !(event.target as HTMLElement).closest('.MuiPopper-root') && // Clock popper
        !(event.target as HTMLElement).closest('.MuiPickersPopper-root') // Time picker popper
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const canvas = document.querySelector('.konvajs-content') as HTMLElement;
  const canvasWidth = canvas?.offsetWidth - 315 || 800;
  const canvasHeight = canvas?.offsetHeight || 600;

  useEffect(() => {
    let top = Math.max(node.posY + 60, 15);
    let left = Math.max(node.posX + 20, 15);
    if (top + popupDimensions.height > canvasHeight)
      top = canvasHeight - popupDimensions.height - 10;
    if (left + popupDimensions.width > canvasWidth) left = canvasWidth - popupDimensions.width - 10;
    setPosition({ x: left, y: top });
  }, [node.posX, node.posY, canvasHeight, canvasWidth, popupDimensions]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      let newX = Math.max(
        0,
        Math.min(e.clientX - dragStart.x, canvasWidth - popupDimensions.width),
      );
      let newY = Math.max(
        0,
        Math.min(e.clientY - dragStart.y, canvasHeight - popupDimensions.height),
      );
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const popupStyle = {
    position: 'absolute' as const,
    width: '600px',
    top: position.y, // Position below the node
    left: position.x, // Position slightly to the right of the node
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    padding: '10px',
    zIndex: 1000,
  };

  const handleInputChange = (type: 'startTime' | 'endTime', newValue: dayjs.Dayjs | null) => {
    if (newValue) {
      setFormData((prev: typeof formData) => ({
        ...prev,
        [type]: newValue,
      }));
    }
  };

  const handleDateChange = (type: 'startDate' | 'endDate', newValue: dayjs.Dayjs | null) => {
    if (newValue) {
      setFormData((prev: typeof formData) => {
        const newState: typeof formData = { ...prev, [type]: newValue };

        // If endDate is before startDate, adjust endDate
        if (type === 'startDate' && newValue && prev.endDate && newValue.isAfter(prev.endDate)) {
          newState.endDate = newValue;
        }

        return newState;
      });
    }
  };

  // const startTime = getTimeString(formData.startHour, formData.startMinute);
  // const endTime = getTimeString(formData.endHour, formData.endMinute);

  return (
    <Box ref={popupRef} sx={popupStyle}>
      <Box
        className="drag-handle"
        sx={{
          height: '30px',
          marginBottom: '10px',
          cursor: 'grab',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          '&:active': { cursor: 'grabbing' },
        }}
        onMouseDown={handleMouseDown}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 'bold', userSelect: 'none', pointerEvents: 'none' }}
        >
          Time Details
        </Typography>
      </Box>
      <Divider />
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ my: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={inputDisplayed.monthly}
              onChange={() => handleInputDisplayChange('monthly')}
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ userSelect: 'none' }}>
              Monthly
            </Typography>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={inputDisplayed.weekly}
              onChange={() => handleInputDisplayChange('weekly')}
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ userSelect: 'none' }}>
              Weekly
            </Typography>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={inputDisplayed.daily}
              onChange={() => handleInputDisplayChange('daily')}
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ userSelect: 'none' }}>
              Daily
            </Typography>
          }
        />
      </Stack>
      <Divider />
      {/* Only show when monthly is selected */}
      {inputDisplayed.monthly && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={1} mb={2} mt={2}>
            {/* Start Date */}
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel>Start Date</CustomFormLabel>
              <DatePicker
                value={formData.startDate}
                onChange={(newValue) => handleDateChange('startDate', newValue)}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    sx: {
                      '& .MuiInputBase-input': {
                        padding: '8px 14px',
                      },
                    },
                  },
                }}
              />
            </Grid>

            {/* End Date */}
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel>End Date</CustomFormLabel>
              <DatePicker
                value={formData.endDate}
                onChange={(newValue) => handleDateChange('endDate', newValue)}
                format="DD/MM/YYYY"
                minDate={formData.startDate}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    sx: {
                      '& .MuiInputBase-input': {
                        padding: '8px 14px',
                      },
                    },
                  },
                }}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      )}

      {/* Only show when weekly is selected */}
{inputDisplayed.weekly && (
  <Grid container spacing={1} mb={2} mt={2}>
    <Grid size={12} direction={'column'}>
      <CustomFormLabel>Select Days</CustomFormLabel>
      <ToggleButtonGroup
        value={formData.selectedDays}
        onChange={(_, newDays) => {
          const sortedDays = DAYS_OF_WEEK.filter(day => newDays.includes(day));
          setFormData((prev: typeof formData) => ({
            ...prev,
            selectedDays: sortedDays
          }));
        }}
        aria-label="days of week"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          gap: 1,
          '& .MuiToggleButton-root': {
            borderRadius: '50% !important',
            minWidth: '40px',
            width: '40px',
            height: '40px',
            padding: 0,
            border: '1px solid',
            borderColor: 'primary.main',
            color: 'primary.main',
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
                color: 'white',
              },
            },
            '&:hover': {
              backgroundColor: 'primary.lighter',
              borderColor: 'primary.main',
            },
          }
        }}
      >
        {DAYS_OF_WEEK.map(day => (
          <ToggleButton
            key={day}
            value={day}
            aria-label={day}
            sx={{
              fontWeight: 'bold',
              margin: 2.5
            }}
          >
            {day[0]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Grid>
  </Grid>
)}
      {/* Only show when daily is selected */}
      {inputDisplayed.daily && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={1} mb={0}>
            {/* Start Time */}
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel>Start Time</CustomFormLabel>
              <TimePicker
                value={formData.startTime}
                onChange={(newValue) => handleInputChange('startTime', newValue)}
                format="HH:mm"
                ampm={false}
                views={['hours', 'minutes']}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: {
                      '& .MuiInputBase-input': {
                        padding: '8px 14px',
                      },
                    },
                  },
                }}
              />
            </Grid>

            {/* End Time */}
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel>End Time</CustomFormLabel>
              <TimePicker
                value={formData.endTime}
                onChange={(newValue) => handleInputChange('endTime', newValue)}
                format="HH:mm"
                ampm={false}
                views={['hours', 'minutes']}
                minTime={formData.startTime}
                shouldDisableTime={(value) => {
                  if (!formData.startTime || !value) return false;
                  return value.isBefore(formData.startTime);
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: {
                      '& .MuiInputBase-input': {
                        padding: '8px 14px',
                      },
                    },
                  },
                }}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      )}

      {/* Display Time Range */}
      {formData.startTime && formData.endTime && (
        <Box sx={{ marginTop: '10px', display: 'flex', gap: 2 }}>
          {inputDisplayed.monthly && formData.startDate && formData.endDate && (
            <Typography
              variant="body2"
              sx={{
                color: 'gray',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              Selected Date Range: {formData.startDate.format('DD/MM')} -{' '}
              {formData.endDate.format('DD/MM')}
            </Typography>
          )}
          {inputDisplayed.weekly && formData.selectedDays.length > 0 && (
            <Typography
              variant="body2"
              sx={{
                color: 'gray',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              Selected Days:{' '}
              {formData.selectedDays.map((day: DayOfWeek) => getShortDayName(day)).join(', ')}
            </Typography>
          )}
          {inputDisplayed.daily && formData.startTime && formData.endTime && (
            <Typography
              variant="body2"
              sx={{
                color: 'gray',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              Selected Time Range: {formData.startTime.format('HH:mm')} -{' '}
              {formData.endTime.format('HH:mm')}
            </Typography>
          )}
        </Box>
      )}
      <Box sx={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <Button
          variant="contained"
          size="small"
          onClick={() =>
            onEdit(
              node.id,
              JSON.stringify({
                monthlyRange: inputDisplayed.monthly
                  ? `${formData.startDate.format('DD/MM/YYYY')} - ${formData.endDate.format(
                      'DD/MM/YYYY',
                    )}`
                  : null,
                weeklyRange: inputDisplayed.weekly ? formData.selectedDays : null,
                timeRange:
                  inputDisplayed.daily && formData.startTime && formData.endTime
                    ? `${formData.startTime.format('HH:mm')} - ${formData.endTime.format('HH:mm')}`
                    : null,
                inputDisplayed: Object.entries(inputDisplayed)
                  .filter(([_, value]) => value)
                  .map(([key]) => key),
              }),
            )
          }
          disabled={
            (inputDisplayed.monthly && (!formData.startDate || !formData.endDate)) ||
            (inputDisplayed.weekly && formData.selectedDays.length === 0) ||
            (inputDisplayed.daily && (!formData.startTime || !formData.endTime))
          }
        >
          Save
        </Button>
        <Button variant="outlined" size="small" onClick={onClose}>
          Close
        </Button>
        <Button variant="outlined" color="error" size="small" onClick={() => onDelete(node.id)}>
          Delete
        </Button>
        {onCreateConnection && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const stage = (document.querySelector('.konvajs-content') as any).__konvaNode;
              onCreateConnection(node.id, stage); // Call the function to create a connection
              onClose(); // Close the popup after creating the connection
            }}
          >
            Create Connection
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default MemberNodePopup;
