import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  Menu,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { IconChevronDown } from '@tabler/icons-react';
dayjs.extend(isSameOrBefore);
type Props = {
  trackingData: { time: string; isAlarm: boolean }[];
  title?: string;
};

const VisitFrequencyCard = ({ trackingData, title = 'Tracking Count by Date' }: Props) => {
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('week');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpenFilter = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseFilter = () => {
    setAnchorEl(null);
  };

  const handleRangeChange = (_: React.MouseEvent<HTMLElement>, newRange: typeof range | null) => {
    if (!newRange) return;

    setRange(newRange);
    const now = dayjs();
    switch (newRange) {
      case 'day':
        setStartDate(now.startOf('day'));
        setEndDate(now);
        break;
      case 'week':
        setStartDate(now.startOf('week'));
        setEndDate(now);
        break;
      case 'month':
        setStartDate(now.startOf('month'));
        setEndDate(now);
        break;
      case 'year':
        setStartDate(now.startOf('year'));
        setEndDate(now);
        break;
      case 'custom':
        setStartDate(null);
        setEndDate(null);
        break;
    }
  };

  useEffect(() => {
    if (range === 'week' && startDate === null && endDate === null) {
      const now = dayjs();
      setStartDate(now.startOf('week'));
      setEndDate(now.endOf('week'));
    }
  }, []);

  const filteredTracking = trackingData.filter((item) => {
    const t = dayjs(item.time);
    if (startDate && t.isBefore(startDate, 'day')) return false;
    if (endDate && t.isAfter(endDate, 'day')) return false;
    return true;
  });

  type CountPerDay = Record<string, { alarm: number; normal: number }>;

  const countMap: CountPerDay = {};
  filteredTracking.forEach((item) => {
    const date = dayjs(item.time).format('YYYY-MM-DD');
    if (!countMap[date]) {
      countMap[date] = { alarm: 0, normal: 0 };
    }
    if (item.isAlarm) {
      countMap[date].alarm += 1;
    } else {
      countMap[date].normal += 1;
    }
  });

  // Generate full list of dates between startDate and endDate
  const generateDateRange = (start: Dayjs, end: Dayjs) => {
    const range: string[] = [];
    let current = start.startOf('day');
    while (current.isSameOrBefore(end, 'day')) {
      range.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
    return range;
  };

  const fullDates = startDate && endDate ? generateDateRange(startDate, endDate) : [];

  const chartData = fullDates.map((date) => ({
    date,
    normal: countMap[date]?.normal || 0,
    alarm: countMap[date]?.alarm || 0,
  }));
  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0}>
          <Typography variant="h6">{title}</Typography>
          <Button
            size="small"
            onClick={handleOpenFilter}
            endIcon={<IconChevronDown size={14} />}
            sx={{ textTransform: 'none', fontSize: '0.8rem', minWidth: 'unset', px: 1 }}
          >
            {range === 'custom'
              ? 'Custom'
              : {
                  day: 'This Day',
                  week: 'This Week',
                  month: 'This Month',
                  year: 'This Year',
                }[range]}
          </Button>
        </Stack>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleCloseFilter}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Box px={2} py={2} width={280}>
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
                  size="small"
                />
                <TextField
                  type="datetime-local"
                  label="End"
                  InputLabelProps={{ shrink: true }}
                  value={endDate ? endDate.format('YYYY-MM-DDTHH:mm') : ''}
                  onChange={(e) => setEndDate(dayjs(e.target.value))}
                  fullWidth
                  size="small"
                />
              </Stack>
            )}
          </Box>
        </Menu>

        {chartData.length === 0 ? (
          <Box
            sx={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <Typography variant="body2" color="textSecondary">
              No tracking data available
            </Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: 200 - 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 120, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis />
                <Tooltip />
                <Legend layout="vertical" verticalAlign="middle" align="right" />

                {/* Normal tracking */}
                <Bar dataKey="normal" fill="#8884d8" name="Tracking Count" stackId="overlay" />

                {/* Alarm tracking */}
                <Bar dataKey="alarm" fill="#ff4d4f" name="Alarm Count" stackId="overlay" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default VisitFrequencyCard;
