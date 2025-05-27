import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, MenuItem, Divider, Grid2 as Grid } from '@mui/material';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';

interface NodePopupProps {
  node: { id: string; name: string; posX: number; posY: number; details: string } | null;
  onClose: () => void;
  onEdit: (nodeId: string, name: string) => void;
  onDelete: (nodeId: string) => void;
  onCreateConnection?: (nodeId: string, e: any) => void; // New prop for creating a connection
}

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

  const popupRef = useRef<HTMLDivElement>(null); // Ref for the popup box
  // Validate and parse node.details
  const parseTimeDetails = (details: string) => {
    const timeRangeRegex = /^(\d{2}):(\d{2}) - (\d{2}):(\d{2})$/; // Matches "HH:mm - HH:mm"
    const match = details.match(timeRangeRegex);

    if (match) {
      const [, startHour, startMinute, endHour, endMinute] = match;
      return { startHour, startMinute, endHour, endMinute };
    }

    // Return default values if details don't match the format
    return { startHour: '00', startMinute: '00', endHour: '23', endMinute: '50' };
  };

  const [formData, setFormData] = useState(() => parseTimeDetails(node.details || ''));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.MuiPopover-root')
      ) {
        onClose(); // Close the popup
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const popupStyle = {
    position: 'absolute' as const,
    width: '600px',
    top: node.posY + 60, // Position below the node
    left: node.posX + 20, // Position slightly to the right of the node
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    padding: '10px',
    zIndex: 1000,
  };

  const handleInputChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const { name, value } = e.target as { name: string; value: string };
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Generate options for hours (0–23) and minutes (0, 10, 20, ..., 50)
  const hourOptions = Array.from({ length: 24 }, (_, index) => index.toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 6 }, (_, index) =>
    (index * 10).toString().padStart(2, '0'),
  );

  // Combine hours and minutes into a full time string
  const getTimeString = (hour: string, minute: string) => {
    if (!hour || !minute) return '';
    return `${hour}:${minute}`;
  };

  const startTime = getTimeString(formData.startHour, formData.startMinute);
  const endTime = getTimeString(formData.endHour, formData.endMinute);

  return (
    <Box ref={popupRef} sx={popupStyle}>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
        Time Rage
      </Typography>
      <Divider />
      <Grid container spacing={1} mb={0}>
        {/* Start Time */}
        <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
          <CustomFormLabel>Start Time</CustomFormLabel>
          <Grid container spacing={1}>
            <Grid container sx={{ flex: 1 }}>
              <CustomSelect
                name="startHour"
                value={formData.startHour}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 200, // Set the maximum height of the dropdown menu
                      width: 100, // Adjust the width of the dropdown menu
                    },
                  },
                }}
              >
                {hourOptions.map((hour, index) => (
                  <MenuItem key={index} value={hour} onMouseDown={(e: any) => e.stopPropagation()}>
                    {hour}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
            <Grid container sx={{ flex: 1 }}>
              <CustomSelect
                name="startMinute"
                value={formData.startMinute}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 200, // Set the maximum height of the dropdown menu
                      width: 100, // Adjust the width of the dropdown menu
                    },
                  },
                }}
              >
                {minuteOptions.map((minute, index) => (
                  <MenuItem
                    key={index}
                    value={minute}
                    onMouseDown={(e: any) => e.stopPropagation()}
                  >
                    {minute}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          </Grid>
        </Grid>
        {/* End Time */}
        <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
          <CustomFormLabel>End Time</CustomFormLabel>
          <Grid container spacing={1}>
            <Grid container sx={{ flex: 1 }}>
              <CustomSelect
                name="endHour"
                value={formData.endHour}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 200, // Set the maximum height of the dropdown menu
                      width: 100, // Adjust the width of the dropdown menu
                    },
                  },
                }}
              >
                {hourOptions
                  .filter((hour) => getTimeString(hour, formData.endMinute) > startTime)
                  .map((hour, index) => (
                    <MenuItem
                      key={index}
                      value={hour}
                      onMouseDown={(e: any) => e.stopPropagation()}
                    >
                      {hour}
                    </MenuItem>
                  ))}
              </CustomSelect>
            </Grid>
            <Grid container sx={{ flex: 1 }}>
              <CustomSelect
                name="endMinute"
                value={formData.endMinute}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 200, // Set the maximum height of the dropdown menu
                      width: 100, // Adjust the width of the dropdown menu
                    },
                  },
                }}
              >
                {minuteOptions
                  .filter((minute) => getTimeString(formData.endHour, minute) > startTime)
                  .map((minute, index) => (
                    <MenuItem
                      key={index}
                      value={minute}
                      onMouseDown={(e: any) => e.stopPropagation()}
                    >
                      {minute}
                    </MenuItem>
                  ))}
              </CustomSelect>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      {/* Display Time Range */}
      {startTime && endTime && (
        <Typography variant="body2" sx={{ marginTop: '10px', color: 'gray' }}>
          Selected Time Range: {startTime} - {endTime}
        </Typography>
      )}
      <Box sx={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <Button
          variant="contained"
          size="small"
          onClick={() => onEdit(node.id, `${startTime} - ${endTime}`)}
          disabled={!startTime || !endTime} // Disable if range is incomplete
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
