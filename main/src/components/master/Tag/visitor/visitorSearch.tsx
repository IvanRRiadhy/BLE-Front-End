import React, { useState } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  Stack,
  Button,
  Fab,
  InputAdornment,
  FormControl,
  FormLabel,
} from '@mui/material';

import { SearchVisitor } from 'src/store/apps/crud/visitor';
import { IconMenu2, IconSearch } from '@tabler/icons-react';
import { RootState, useDispatch } from 'src/store/Store';
import { useSelector } from 'react-redux';
type Props = {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

const VisitorSearch = ({ onClick }: Props) => {
  const dispatch = useDispatch();
  const searchTerm = useSelector((state: RootState) => state.visitorReducer.visitorSearch);
  const [selectedRange, setSelectedRange] = useState('any');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const predefinedRanges = [
    { label: 'Any', value: 'any' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last_7_days' },
    { label: 'Last 30 Days', value: 'last_30_days' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <Box display="flex" flexDirection="column" gap={1} p={2}>
      {/* Search Bar */}
      <Fab
        onClick={onClick}
        color="primary"
        size="small"
        sx={{ mr: 1, flexShrink: '0', display: { xs: 'block', lineHeight: '10px', lg: 'none' } }}
      >
        <IconMenu2 width="16" />
      </Fab>
      <TextField
        id="outlined-basic"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconSearch size={'16'} />
            </InputAdornment>
          ),
        }}
        fullWidth
        size="small"
        value={searchTerm}
        placeholder="Search by Name, Card Number, ID"
        variant="outlined"
        onChange={(e) => dispatch(SearchVisitor(e.target.value))}
      />

      {/* Time Range Dropdown */}
      <FormControl fullWidth size="small">
        <FormLabel sx={{ mb: 1 }}>Time Range</FormLabel>
        <Select value={selectedRange} onChange={(e) => setSelectedRange(e.target.value)}>
          {predefinedRanges.map((range) => (
            <MenuItem key={range.value} value={range.value}>
              {range.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Custom Date & Time Range */}
      {selectedRange === 'custom' && (
        <Stack direction="column" spacing={2}>
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth size="small">
              <FormLabel sx={{ mb: 1 }}>From</FormLabel>
              <TextField
                type="datetime-local"
                size="small"
                fullWidth
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </FormControl>

            <FormControl fullWidth size="small">
              <FormLabel sx={{ mb: 1 }}>To</FormLabel>
              <TextField
                type="datetime-local"
                size="small"
                fullWidth
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </FormControl>
          </Stack>
        </Stack>
      )}

      <Button variant="contained" color="primary" size="small" sx={{ mt: 1 }}>
        Filter
      </Button>
    </Box>
  );
};

export default VisitorSearch;
