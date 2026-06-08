import { TextField, Popover, Typography, Box, Grid, Button } from '@mui/material';
import { DateTimePicker, renderTimeViewClock } from '@mui/x-date-pickers';
import { TimeClock } from '@mui/x-date-pickers/TimeClock';
import dayjs, { Dayjs } from 'dayjs';
import { useState } from 'react';

type inputType = "time" | "date" | "dateRange";

const CustomClockInput = ({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: inputType[];
  value: Dayjs | null;
  onChange: (val: Dayjs | null) => void;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <TextField
        label={label}
        value={value?.format('HH:mm') ?? ''}
        onClick={handleOpen}
        fullWidth
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box p={2}>
          <DateTimePicker
            value={value}
            onChange={(val) => {
              onChange(val);
            }}
            ampm={false}
            viewRenderers={{
              hours: renderTimeViewClock,
              minutes: renderTimeViewClock,
              seconds: renderTimeViewClock,
            }}
            />
          {/* <TimeClock
            ampm={false}
            value={value}
            onChange={(val) => {
              onChange(val);
            }}
            showViewSwitcher
          /> */}
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button onClick={handleClose}>Done</Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default CustomClockInput;
