import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  Menu,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
} from '@mui/material';
import { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { IconChevronDown } from '@tabler/icons-react';

type Props = {
  invitationData: { area: string; time: string }[];
  trackingData: { area: string; time: string }[];
  title?: string;
};

const VisitAreaCard = ({ invitationData, trackingData, title = 'Most Visited Areas' }: Props) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'nextMonth' | 'year' | 'custom'>(
    'week',
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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

  // Filter data by time
  const allData = [...invitationData, ...trackingData].filter((item) => {
    const t = dayjs(item.time);
    if (startDate && t.isBefore(startDate, 'minute')) return false;
    if (endDate && t.isAfter(endDate, 'minute')) return false;
    return true;
  });

  // Count area frequencies
  const areaCountMap: Record<string, number> = {};
  allData.forEach((item) => {
    if (!item.area) return;
    areaCountMap[item.area] = (areaCountMap[item.area] || 0) + 1;
  });

  const chartData = Object.entries(areaCountMap).map(([area, count]) => ({
    name: area,
    value: count,
  }));
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

  // Generate dynamic colors
  const generateColors = (count: number): string[] => {
    const colors = [];
    const saturation = 70;
    const lightness = 50;
    for (let i = 0; i < count; i++) {
      const hue = Math.round((360 / count) * i);
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    return colors;
  };

  const colors = generateColors(chartData.length);

  return (
    <Card>
      <CardContent>
        {/* Header with Filter Button */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">{title}</Typography>
          <Button
            size="small"
            onClick={handleOpenFilter}
            endIcon={<IconChevronDown size={14} />}
            sx={{ textTransform: 'none', fontSize: '0.8rem', minWidth: 'unset', px: 1 }}
          >
            {labelForRange(range)}
          </Button>
        </Stack>

        {/* Filter menu */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleCloseFilter}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Box px={1} py={1}>
            <ToggleButtonGroup
              value={range}
              exclusive
              onChange={handleRangeChange}
              fullWidth
              size="small"
              sx={{ flexWrap: 'wrap' }}
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
              fullWidth
              variant="text"
              size="small"
              onClick={() => {
                const now = dayjs();
                setStartDate(now.startOf('week'));
                setEndDate(now.endOf('week'));
                setRange('week');
                handleCloseFilter();
              }}
              sx={{ mt: 1, fontSize: '0.75rem' }}
            >
              Reset Filter
            </Button>
          </Box>
        </Menu>

        {/* Main content: chart + legend */}
        {chartData.length === 0 ? (
          <Box
            sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" color="textSecondary">
              No Area is Visited
            </Typography>
          </Box>
        ) : (
          <Stack direction="row" spacing={2} alignItems="flex-start">
            {/* Pie chart */}
            <Box sx={{ width: 250, height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={chartData}
                    cx="40%"
                    cy="50%"
                    // innerRadius={55}
                    outerRadius={90}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            {/* Legend */}
            <Box
              sx={{
                flex: 1,
                minHeight: 190,
                maxHeight: 190,
                overflowY: 'auto',
                pr: 1,
              }}
            >
              <Stack spacing={1}>
                {chartData.map((entry, index) => (
                  <Stack key={entry.name} direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: 1,
                        bgcolor: colors[index],
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" noWrap>
                      {entry.name}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default VisitAreaCard;
