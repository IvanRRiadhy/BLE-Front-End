import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Grid2 as Grid,
  TextField,
  Button,
  Autocomplete,
  Avatar,
  Typography,
  Stack,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import { IconSearch, IconCalendar, IconUser } from '@tabler/icons-react';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import dayjs from 'dayjs';

export interface PersonOption {
  id: string;
  name: string;
  identityId: string;
  type: 'Member' | 'Visitor';
  avatarUrl?: string;
}

export type TimeRangeKey = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface InvestigateFilterState {
  person: PersonOption | null;
  timeRange: TimeRangeKey;
  from: string | null;
  to: string | null;
}

interface NewInvestigateFilterProps {
  onSearch: (filter: InvestigateFilterState) => void;
  isLoading?: boolean;
}

const NewInvestigateFilter: React.FC<NewInvestigateFilterProps> = ({ onSearch, isLoading }) => {
  const { data: members = [] } = useAllMembers();
  const { data: visitors = [] } = useAllVisitor();
  // console.log("Members: ", members.length);
  // console.log("Visitors: ", visitors.length);
  // Combine members and visitors into autocomplete options
  const personOptions = useMemo<PersonOption[]>(() => {
    const memberOpts: PersonOption[] = members.map((m: any) => ({
      id:  m.id || m.personId || '',
      name: m.name || 'Unknown Member',
      identityId: m.identityId || m.id || '-',
      type: 'Member',
      avatarUrl: m.faceImageUrl || m.faceImage || undefined,
    }));

    const visitorOpts: PersonOption[] = visitors.map((v: any) => ({
      id:  v.id || v.personId || '',
      name: v.name || 'Unknown Visitor',
      identityId: v.identityId || v.id || '-',
      type: 'Visitor',
      avatarUrl: v.faceImageUrl || v.faceImage || undefined,
    }));

    const combined = [...memberOpts, ...visitorOpts];
    // console.log("Combined: ", combined);
    // Fallback default options if API is empty/loading
    if (combined.length === 0) {
      return [
        {
          id: '75a72602-fa2a-4073-856b-3657dcb9287a',
          name: 'Person A',
          identityId: '12312312',
          type: 'Member',
        },
      ];
    }

    return combined;
  }, [members, visitors]);

  // Initial Filter State
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('daily');
  const [fromDate, setFromDate] = useState<string>(
    dayjs().startOf('day').format('YYYY-MM-DDTHH:mm')
  );
  const [toDate, setToDate] = useState<string>(
    dayjs().endOf('day').format('YYYY-MM-DDTHH:mm')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let computedFrom: string | null = null;
    let computedTo: string | null = null;

    if (timeRange === 'custom') {
      computedFrom = fromDate ? dayjs(fromDate).toISOString() : null;
      computedTo = toDate ? dayjs(toDate).toISOString() : null;
    } else if (timeRange === 'daily') {
      computedFrom = dayjs().startOf('day').toISOString();
      computedTo = dayjs().endOf('day').toISOString();
    } else if (timeRange === 'weekly') {
      computedFrom = dayjs().startOf('week').toISOString();
      computedTo = dayjs().endOf('week').toISOString();
    } else if (timeRange === 'monthly') {
      computedFrom = dayjs().startOf('month').toISOString();
      computedTo = dayjs().endOf('month').toISOString();
    }

    onSearch({
      person: selectedPerson,
      timeRange,
      from: computedFrom,
      to: computedTo,
    });
  };

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        p: 2.5,
        bgcolor: 'background.paper',
        mb: 3,
      }}
    >
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2} alignItems="center">
          {/* Person Autocomplete */}
          <Grid size={{ xs: 12, md: timeRange === 'custom' ? 4 : 6 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">
              Person
            </Typography>
            <Autocomplete
              options={personOptions}
              getOptionLabel={(option) => `${option.name} (${option.identityId})`}
              value={selectedPerson}
              onChange={(_, newValue) => setSelectedPerson(newValue)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props as any;
                const initials = option.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();
                // console.log("Option: ", option, key);
                return (
                  <Box component="li" key={option.id || key} {...otherProps}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        src={option.avatarUrl}
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: '12px',
                          bgcolor: option.type === 'Member' ? '#E8F2FE' : '#FEF3D6',
                          color: option.type === 'Member' ? '#1877F2' : '#B06000',
                          fontWeight: 700,
                        }}
                      >
                        {initials}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {option.name} ({option.identityId})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.type}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select or search person..."
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          {selectedPerson ? (
                            <Avatar
                              src={selectedPerson.avatarUrl}
                              sx={{
                                width: 24,
                                height: 24,
                                fontSize: '10px',
                                bgcolor: selectedPerson.type === 'Member' ? '#E8F2FE' : '#FEF3D6',
                                color: selectedPerson.type === 'Member' ? '#1877F2' : '#B06000',
                                fontWeight: 700,
                              }}
                            >
                              {selectedPerson.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                            </Avatar>
                          ) : (
                            <IconUser size={18} color="#9e9e9e" />
                          )}
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                  }}
                />
              )}
            />
          </Grid>

          {/* Time Range Select */}
          <Grid size={{ xs: 12, sm: 6, md: timeRange === 'custom' ? 2 : 4 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">
              Time Range
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            >
              <MenuItem value="daily">Today</MenuItem>
              <MenuItem value="weekly">This Week</MenuItem>
              <MenuItem value="monthly">This Month</MenuItem>
              <MenuItem value="custom">Custom Range</MenuItem>
            </TextField>
          </Grid>

          {/* From & To Date (Only visible when timeRange === 'custom') */}
          {timeRange === 'custom' && (
            <>
              <Grid size={{ xs: 12, sm: 6, md: 2.25 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">
                  From Date
                </Typography>
                <TextField
                  type="datetime-local"
                  size="small"
                  fullWidth
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.25 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">
                  To Date
                </Typography>
                <TextField
                  type="datetime-local"
                  size="small"
                  fullWidth
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                  }}
                />
              </Grid>
            </>
          )}

          {/* Submit Button */}
          <Grid size={{ xs: 12, md: timeRange === 'custom' ? 1.5 : 2 }} sx={{ alignSelf: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isLoading || !selectedPerson}
              sx={{
                height: 40,
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: '#1877F2',
                '&:hover': { bgcolor: '#1166D8' },
              }}
            >
              Investigate
            </Button>
          </Grid>
        </Grid>
      </form>
    </Card>
  );
};

export default NewInvestigateFilter;
