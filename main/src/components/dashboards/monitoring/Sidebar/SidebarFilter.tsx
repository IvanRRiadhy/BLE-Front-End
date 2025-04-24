import React from 'react';
import { Box, IconButton, Menu, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { MoreHorizOutlined } from '@mui/icons-material';

type SidebarFilterProps = {
  setFilterType: (filterType: string) => void;
};

const SidebarFilter = ({ setFilterType }: SidebarFilterProps) => {
  const [selectedFilter, setSelectedFilter] = React.useState('All');

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    const filterType = event.target.value as string;
    setSelectedFilter(filterType); // Update local state
    setFilterType(filterType); // Call parent function to update filter type
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 2,
        border: '1px solid #ccc',
        borderRadius: '4px',
      }}
    >
      <Select
        value={selectedFilter}
        onChange={handleFilterChange}
        sx={{
          flex: 1,
          '& .MuiSelect-select': {
            padding: '8px',
          },
        }}
      >
        <MenuItem value="All">View All</MenuItem>
        <MenuItem value="Alarm">Alarm</MenuItem>
        <MenuItem value="Tracking">Tracking</MenuItem>
      </Select>
      <IconButton
        color="primary"
        sx={{
          padding: '8px',
        }}
      >
        <MoreHorizOutlined />
      </IconButton>
    </Box>
  );
};

export default SidebarFilter;
