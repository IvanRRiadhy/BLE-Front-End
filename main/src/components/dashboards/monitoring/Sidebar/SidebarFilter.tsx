import React from 'react';
import {
  Box,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { MoreHorizOutlined } from '@mui/icons-material';

type SidebarFilterProps = {
  filterType: string[];
  setFilterType: (filterType: string[]) => void;
};

const TOGGLE_COLORS: Record<string, string> = {
  Tracking: 'linear-gradient(45deg, #355CFF, #00CFFF)', // blue
  Alarm: 'linear-gradient(45deg, #D32F2F, #FF5252)', // red
  Blacklist: 'linear-gradient(45deg, #000000, #434343)', // black
};

const TOGGLE_OUTLINE_COLORS: Record<string, string> = {
  Tracking: '#355CFF',
  Alarm: '#D32F2F',
  Blacklist: '#000000',
};

const SidebarFilter = ({ filterType, setFilterType }: SidebarFilterProps) => {
  const handleFilterChange = (_: React.MouseEvent<HTMLElement>, newValues: string[]) => {
    // 🚫 Prevent empty selection (at least one must stay active)
    if (newValues.length === 0) {
      return;
    }

    // 🔒 If Blacklist was active and user clicks another button
    if (filterType.includes('Blacklist')) {
      const withoutBlacklist = newValues.filter((v) => v !== 'Blacklist');

      // If user tries to deselect Blacklist alone → block
      if (withoutBlacklist.length === 0) {
        return;
      }

      setFilterType(withoutBlacklist);
      return;
    }

    // 🔒 If user selects Blacklist → make it exclusive
    if (newValues.includes('Blacklist')) {
      setFilterType(['Blacklist']);
      return;
    }

    // ✅ Normal Tracking / Alarm multi-select
    setFilterType(newValues);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 1,
        border: '1px solid #ccc',
        borderRadius: '4px',
      }}
    >
      <ToggleButtonGroup
        value={filterType}
        onChange={handleFilterChange}
        fullWidth
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            py: 1,
            fontWeight: 500,
            textTransform: 'none',
            borderWidth: 2,

            /* ================= ACTIVE ================= */
            '&.Mui-selected': {
              color: '#fff',
            },

            '&.Mui-selected[value="Tracking"]': {
              background: TOGGLE_COLORS.Tracking,
              // borderColor: TOGGLE_OUTLINE_COLORS.Tracking,
            },

            '&.Mui-selected[value="Alarm"]': {
              background: TOGGLE_COLORS.Alarm,
              // borderColor: TOGGLE_OUTLINE_COLORS.Alarm,
            },

            '&.Mui-selected[value="Blacklist"]': {
              background: TOGGLE_COLORS.Blacklist,
              // borderColor: TOGGLE_OUTLINE_COLORS.Blacklist,
            },

            /* ================= INACTIVE ================= */
            '&:not(.Mui-selected)[value="Tracking"]': {
              color: TOGGLE_OUTLINE_COLORS.Tracking,
              borderColor: TOGGLE_OUTLINE_COLORS.Tracking,
              backgroundColor: 'transparent',
            },

            '&:not(.Mui-selected)[value="Alarm"]': {
              color: TOGGLE_OUTLINE_COLORS.Alarm,
              borderColor: TOGGLE_OUTLINE_COLORS.Alarm,
              backgroundColor: 'transparent',
            },

            '&:not(.Mui-selected)[value="Blacklist"]': {
              color: TOGGLE_OUTLINE_COLORS.Blacklist,
              borderColor: TOGGLE_OUTLINE_COLORS.Blacklist,
              backgroundColor: 'transparent',
            },

            /* ================= HOVER ================= */
            '&:not(.Mui-selected):hover': {
              backgroundColor: 'rgba(0,0,0,0.04)',
            },

            '&.Mui-selected:hover': {
              opacity: 0.9,
            },
          },
        }}
      >
        <ToggleButton value="Tracking">Tracking</ToggleButton>
        <ToggleButton value="Alarm">Alarm</ToggleButton>
        {/* <ToggleButton value="Blacklist">Blacklist</ToggleButton> */}
      </ToggleButtonGroup>
    </Box>
  );
};

export default SidebarFilter;
