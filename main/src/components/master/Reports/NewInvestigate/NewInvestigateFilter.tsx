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

export interface InvestigateFilterState {
  person: PersonOption | null;
  from: string;
  to: string;
}

interface NewInvestigateFilterProps {
  onSearch: (filter: InvestigateFilterState) => void;
  isLoading?: boolean;
}

const NewInvestigateFilter: React.FC<NewInvestigateFilterProps> = ({ onSearch, isLoading }) => {
  const { data: members = [] } = useAllMembers();
  const { data: visitors = [] } = useAllVisitor();

  // Combine members and visitors into autocomplete options
  const personOptions = useMemo<PersonOption[]>(() => {
    const memberOpts: PersonOption[] = members.map((m) => ({
      id:  m.id || m.personId || '',
      name: m.name || 'Unknown Member',
      identityId: m.identityId || m.id || '-',
      type: 'Member',
      avatarUrl: m.faceImage || undefined,
    }));

    const visitorOpts: PersonOption[] = visitors.map((v) => ({
      id:  v.id || v.personId || '',
      name: v.name || 'Unknown Visitor',
      identityId: v.identityId || v.id || '-',
      type: 'Visitor',
      avatarUrl: v.faceImage || undefined,
    }));

    const combined = [...memberOpts, ...visitorOpts];

    // Fallback default options if API is empty/loading
    if (combined.length === 0) {
      return [
        {
          id: '75a72602-fa2a-4073-856b-3657dcb9287a',
          name: 'Dion',
          identityId: '12312312',
          type: 'Member',
        },
        {
          id: 'v-12345',
          name: 'Weldon Levitt',
          identityId: 'wlevitt',
          type: 'Visitor',
        },
      ];
    }

    return combined;
  }, [members, visitors]);

  // Initial Filter State
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
  const [fromDate, setFromDate] = useState<string>(
    dayjs().startOf('day').format('YYYY-MM-DDTHH:mm')
  );
  const [toDate, setToDate] = useState<string>(
    dayjs().endOf('day').format('YYYY-MM-DDTHH:mm')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      person: selectedPerson,
      from: fromDate,
      to: toDate,
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
          <Grid size={{ xs: 12, md: 4.5 }}>
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

                return (
                  <Box component="li" key={key || option.id} {...otherProps}>
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
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              fontSize: '10px',
                              bgcolor: '#E8F2FE',
                              color: '#1877F2',
                              fontWeight: 700,
                            }}
                          >
                            {selectedPerson?.name ? selectedPerson.name.substring(0, 2).toUpperCase() : 'DI'}
                          </Avatar>
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

          {/* From Date */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

          {/* To Date */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

          {/* Submit Button */}
          <Grid size={{ xs: 12, md: 1.5 }} sx={{ alignSelf: 'flex-end' }}>
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
