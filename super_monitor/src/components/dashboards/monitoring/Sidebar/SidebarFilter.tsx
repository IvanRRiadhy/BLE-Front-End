import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { MoreHorizOutlined } from '@mui/icons-material';

type SidebarFilterProps = {
  filterType: string[];
  setFilterType: (filterType: string[]) => void;
    personFilter: {
    Visitor: boolean;
    Member: boolean;
    Security: boolean;
    FocusedPersonOnly: boolean;
  };

  setPersonFilter: (filter: any) => void;

};

const TOGGLE_COLORS: Record<string, string> = {
  Tracking: 'linear-gradient(45deg, #355CFF, #00CFFF)',
  Alarm: 'linear-gradient(45deg, #D32F2F, #FF5252)',
};

const TOGGLE_OUTLINE_COLORS: Record<string, string> = {
  Tracking: '#355CFF',
  Alarm: '#D32F2F',
};

const SidebarFilter = ({ filterType, setFilterType, personFilter, setPersonFilter }: SidebarFilterProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // const [personFilter, setPersonFilter] = useState({
  //   Visitor: true,
  //   Member: true,
  //   Security: true,
  //   FocusedPersonOnly: false,
  // });

const handleFilterChange = (_: React.MouseEvent<HTMLElement>, newValues: string[]) => {
  if (newValues.length === 0) {
    const other = filterType[0] === 'Tracking' ? 'Alarm' : 'Tracking';
    setFilterType([other]);
    return;
  }

  setFilterType(newValues);
};

  const openMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const closeMenu = () => {
    setAnchorEl(null);
  };

  const handleCheckboxChange = (key: string) => {
    if (key === 'FocusedPersonOnly') {
      const newValue = !personFilter.FocusedPersonOnly;

      setPersonFilter({
        Visitor: !newValue,
        Member: !newValue,
        Security: !newValue,
        FocusedPersonOnly: newValue,
      });

      return;
    }

    const updated = {
      ...personFilter,
      [key]: !personFilter[key as keyof typeof personFilter],
      FocusedPersonOnly: false,
    };

    setPersonFilter(updated);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        padding: 1,
        border: '1px solid #ccc',
        borderRadius: '4px',
      }}
    >
      {/* Tracking / Alarm */}
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

            '&.Mui-selected': {
              color: '#fff',
            },

            '&.Mui-selected[value="Tracking"]': {
              background: TOGGLE_COLORS.Tracking,
            },

            '&.Mui-selected[value="Alarm"]': {
              background: TOGGLE_COLORS.Alarm,
            },

            '&:not(.Mui-selected)[value="Tracking"]': {
              color: TOGGLE_OUTLINE_COLORS.Tracking,
              borderColor: TOGGLE_OUTLINE_COLORS.Tracking,
            },

            '&:not(.Mui-selected)[value="Alarm"]': {
              color: TOGGLE_OUTLINE_COLORS.Alarm,
              borderColor: TOGGLE_OUTLINE_COLORS.Alarm,
            },
          },
        }}
      >
        <ToggleButton value="Tracking">Tracking</ToggleButton>
        <ToggleButton value="Alarm">Alarm</ToggleButton>
      </ToggleButtonGroup>

      {/* FILTER BUTTON */}
      <Button
        variant="outlined"
        size="small"
        startIcon={<MoreHorizOutlined />}
        onClick={openMenu}
      >
        Filters
      </Button>

      {/* MENU */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        {['Visitor', 'Member', 'Security'].map((type) => (
          <MenuItem key={type}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={personFilter[type as keyof typeof personFilter]}
                  onChange={() => handleCheckboxChange(type)}
                />
              }
              label={type}
            />
          </MenuItem>
        ))}

        <MenuItem>
          <FormControlLabel
            control={
              <Checkbox
                checked={personFilter.FocusedPersonOnly}
                onChange={() => handleCheckboxChange('FocusedPersonOnly')}
              />
            }
            label="FocusedPersonOnly"
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default SidebarFilter;