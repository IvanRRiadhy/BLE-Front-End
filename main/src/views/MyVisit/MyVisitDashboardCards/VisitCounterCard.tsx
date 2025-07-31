import {
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  IconButton,
  Menu,
  Button,
  Box,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { IconChevronDown } from '@tabler/icons-react';

type Props = {
  invitations: {
    time: string;
  }[];
  title?: string;
};

const VisitCounterCard = ({ invitations, title = 'Remaining Invitations' }: Props) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'nextMonth' | 'year' | 'custom'>(
    'week',
  );
  const labelForRange = (value: typeof range): string => {
    switch (value) {
      case 'day':
        return 'This Day';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'nextMonth':
        return 'Next Month';
      case 'year':
        return 'This Year';
      case 'custom':
        return 'Custom';
      default:
        return '';
    }
  };
  const open = Boolean(anchorEl);

  const handleOpenFilter = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseFilter = () => {
    setAnchorEl(null);
  };
  useEffect(() => {
    if (range === 'week' && startDate === null && endDate === null) {
      const now = dayjs();
      setStartDate(now.startOf('week'));
      setEndDate(now.endOf('week'));
    }
  }, []);

  const handleRangeChange = (_: React.MouseEvent<HTMLElement>, newRange: typeof range | null) => {
    if (!newRange) return;

    setRange(newRange);
    const now = dayjs();

    switch (newRange) {
      case 'day':
        setStartDate(now.startOf('day'));
        setEndDate(now.endOf('day'));
        break;
      case 'week':
        setStartDate(now.startOf('week'));
        setEndDate(now.endOf('week'));
        break;
      case 'month':
        setStartDate(now.startOf('month'));
        setEndDate(now.endOf('month'));
        break;
      case 'nextMonth':
        setStartDate(now.add(1, 'month').startOf('month'));
        setEndDate(now.add(1, 'month').endOf('month'));
        break;
      case 'year':
        setStartDate(now);
        setEndDate(now.endOf('year'));
        break;
      case 'custom':
        setStartDate(null);
        setEndDate(null);
        break;
    }
  };

  const filteredInvites = invitations.filter((inv) => {
    const inviteTime = dayjs(inv.time);
    if (startDate && inviteTime.isBefore(startDate, 'minute')) return false;
    if (endDate && inviteTime.isAfter(endDate, 'minute')) return false;
    return true;
  });

  return (
    <Card>
      <CardContent sx={{ position: 'relative', height: 277.5, px: 2, py: 1 }}>
        {/* Title + Filter button at top */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{title}</Typography>
          <Button
            size="small"
            onClick={handleOpenFilter}
            endIcon={<IconChevronDown size={14} />}
            sx={{ textTransform: 'none', fontSize: '0.8rem', minWidth: 'unset', px: 1 }}
          >
            {range === 'custom' ? 'Custom' : labelForRange(range)}
          </Button>
        </Stack>

        {/* Centered big number */}
        <Box
          sx={{
            position: 'absolute',
            top: '60%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h1" sx={{ fontSize: '7.5rem' }} color='primary'>
            {filteredInvites.length}
          </Typography>
        </Box>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseFilter}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box px={2} py={2} width={290}>
          {/* <Typography variant="subtitle2" gutterBottom>
              Quick Range
            </Typography> */}
          <ToggleButtonGroup
            value={range}
            exclusive
            onChange={handleRangeChange}
            fullWidth
            size="small"
            sx={{ mb: 2, flexWrap: 'wrap' }}
          >
            <ToggleButton value="day">This Day</ToggleButton>
            <ToggleButton value="week">This Week</ToggleButton>
            <ToggleButton value="month">This Month</ToggleButton>
            <ToggleButton value="nextMonth">Next Month</ToggleButton>
            <ToggleButton value="year">This Year</ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
          </ToggleButtonGroup>

          {range === 'custom' && (
            <Stack spacing={2}>
              <TextField
                type="datetime-local"
                label="Start"
                InputLabelProps={{ shrink: true }}
                value={startDate ? startDate.format('YYYY-MM-DDTHH:mm') : ''}
                onChange={(e) => setStartDate(dayjs(e.target.value))}
                fullWidth
              />
              <TextField
                type="datetime-local"
                label="End"
                InputLabelProps={{ shrink: true }}
                value={endDate ? endDate.format('YYYY-MM-DDTHH:mm') : ''}
                onChange={(e) => setEndDate(dayjs(e.target.value))}
                fullWidth
              />
            </Stack>
          )}

          <Button
            onClick={() => {
              const now = dayjs();
              setStartDate(now.startOf('week'));
              setEndDate(now.endOf('week'));
              setRange('week');
              handleCloseFilter();
            }}
            variant="outlined"
            fullWidth
            sx={{ mt: 2 }}
          >
            Clear Filter
          </Button>
        </Box>
      </Menu>
    </Card>
  );
};

export default VisitCounterCard;
