// components/shared/TimeGridSelector.tsx
import { Box, Paper, Typography, useTheme, Button, IconButton, Chip } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import {
  IconX,
  IconSquare,
  IconSquareCheck,
  IconChecklist,
  IconSquareOff,
} from '@tabler/icons-react';
import { fetchTimeGroupDT, TimeBlockType } from 'src/store/apps/crud/timeGroup';
import { useDispatch, useSelector } from 'src/store/Store';
import { CancelNewTimeGroup, saveNewTimeGroup } from 'src/store/apps/crud/timeGroup';
import { defaultTimeGroupForm } from 'src/store/apps/defaultForm';

const daysOfWeek: TimeBlockType['dayOfWeek'][] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface TimeGridSelectorProps {
  onSelectionChange: (blocks: TimeBlockType[]) => void;
  initialData?: TimeBlockType[];
}

export const TimeGridSelector = ({
  onSelectionChange,
  initialData = [],
}: TimeGridSelectorProps) => {
  const dispatch = useDispatch();
  const isNewTimeGroup = useSelector((state: any) => state.TimeGroupReducer.isNewTimeGroup);
  const selectedTimeGroup = useSelector((state: any) => state.TimeGroupReducer.selectedTimeGroup);
  const theme = useTheme();
  const [selectedCells, setSelectedCells] = useState<Record<string, boolean>>({});
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'add' | 'remove'>('add');

  // Generate 24 hourly slots
  const timeSlots = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00');

  // Group slots into 4-hour chunks
  const timeGroups = Array.from({ length: 6 }, (_, i) => {
    const start = i * 4;
    return { indices: [start, start + 1, start + 2, start + 3] };
  });

  // ================== Init from props ==================
  useEffect(() => {
    if (initialData.length > 0) {
      const newSelected: Record<string, boolean> = {};
      initialData.forEach((block) => {
        const dayIndex = daysOfWeek.indexOf(block.dayOfWeek);

        if (!block.startTime || !block.endTime) {
          console.warn('Invalid time block:', block);
          return; // skip this block instead of crashing
        }

        const startHour = parseInt(block.startTime.split(':')[0], 10);
        const endHour = parseInt(block.endTime.split(':')[0], 10);

        for (let h = startHour; h < endHour; h++) {
          newSelected[`${dayIndex}-${h}`] = true;
        }
      });
      setSelectedCells(newSelected);
    } else {
      setSelectedCells({});
    }
  }, [initialData]);

  // ================== Mouse Events ==================
  const handleCellClick = useCallback(
    (dayIndex: number, timeIndex: number) => {
      const cellId = `${dayIndex}-${timeIndex}`;
      setSelectedCells((prev) => {
        const updated = { ...prev };
        if (selectionMode === 'add') updated[cellId] = true;
        else delete updated[cellId];
        return updated;
      });
    },
    [selectionMode],
  );

  const handleMouseDown = (dayIndex: number, timeIndex: number) => {
    setIsSelecting(true);
    handleCellClick(dayIndex, timeIndex);
  };

  const handleMouseEnter = (dayIndex: number, timeIndex: number) => {
    if (isSelecting) handleCellClick(dayIndex, timeIndex);
  };

  useEffect(() => {
    const stopSelect = () => setIsSelecting(false);
    document.addEventListener('mouseup', stopSelect);
    document.addEventListener('mouseleave', stopSelect);
    return () => {
      document.removeEventListener('mouseup', stopSelect);
      document.removeEventListener('mouseleave', stopSelect);
    };
  }, []);

  // ================== Selection Helpers ==================
  const totalCells = daysOfWeek.length * timeSlots.length;
  const isAllSelected = Object.keys(selectedCells).length === totalCells;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedCells({});
      onSelectionChange([]);
    } else {
      const newSelected: Record<string, boolean> = {};
      daysOfWeek.forEach((_, d) =>
        timeSlots.forEach((_, h) => {
          newSelected[`${d}-${h}`] = true;
        }),
      );

      const newBlocks: TimeBlockType[] = daysOfWeek.map((day) => ({
        id: `block-${day}-all`,
        dayOfWeek: day,
        startTime: '00:00:00',
        endTime: '24:00:00',
        timeGroupId: '',
      }));

      setSelectedCells(newSelected);
      onSelectionChange(newBlocks);
    }
  };

  const handleClearAll = () => {
    setSelectedCells({});
    onSelectionChange([]);
  };

  const handleSelectAllDay = (dayIndex: number) => {
    setSelectedCells((prev) => {
      const updated = { ...prev };
      timeSlots.forEach((_, h) => (updated[`${dayIndex}-${h}`] = true));
      return updated;
    });
  };

  const handleClearDay = (dayIndex: number) => {
    setSelectedCells((prev) => {
      const updated = { ...prev };
      timeSlots.forEach((_, h) => delete updated[`${dayIndex}-${h}`]);
      return updated;
    });
  };
  const handleSave = () => {
    if (selectedTimeGroup) {
      dispatch(saveNewTimeGroup(selectedTimeGroup) as any);
      dispatch(fetchTimeGroupDT({ ...defaultTimeGroupForm, Length: 999 }));
    }
  };
  const handleCancel = () => {
    dispatch(CancelNewTimeGroup());
  };

  // ================== Convert to timeBlocks ==================
  const convertSelectionToTimeBlocks = useCallback(() => {
    const blocks: TimeBlockType[] = [];
    const dayGroups: Record<number, number[]> = {};

    Object.keys(selectedCells).forEach((cellId) => {
      const [dStr, hStr] = cellId.split('-');
      const d = parseInt(dStr, 10);
      const h = parseInt(hStr, 10);
      if (!dayGroups[d]) dayGroups[d] = [];
      dayGroups[d].push(h);
    });

    Object.entries(dayGroups).forEach(([dStr, hours]) => {
      const d = parseInt(dStr, 10);
      const sorted = hours.sort((a, b) => a - b);

      let start = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) {
          blocks.push({
            id: `block-${d}-${start}`,
            dayOfWeek: daysOfWeek[d],
            startTime: `${timeSlots[start]}:00`,
            endTime: `${timeSlots[sorted[i - 1] + 1] || '24:00'}:00`,
            timeGroupId: '',
          });
          start = sorted[i];
        }
      }
      blocks.push({
        id: `block-${d}-${start}`,
        dayOfWeek: daysOfWeek[d],
        startTime: `${timeSlots[start]}:00`,
        endTime: `${timeSlots[sorted[sorted.length - 1] + 1] || '24:00'}:00`,
        timeGroupId: '',
      });
    });

    onSelectionChange(blocks);
  }, [selectedCells, timeSlots, onSelectionChange]);

  // ================== Render ==================
  return (
    <Paper elevation={1} sx={{ p: 2, overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Weekly Schedule
        </Typography>
        <Box display="flex" gap={1}>
          <Chip
            icon={
              selectionMode === 'add' ? <IconSquareCheck size={16} /> : <IconSquare size={16} />
            }
            label={selectionMode === 'add' ? 'Adding' : 'Removing'}
            onClick={() => setSelectionMode((prev) => (prev === 'add' ? 'remove' : 'add'))}
            color={selectionMode === 'add' ? 'primary' : 'default'}
            variant={selectionMode === 'add' ? 'filled' : 'outlined'}
            size="small"
          />
          <Button
            variant="outlined"
            color={isAllSelected ? 'error' : 'primary'}
            size="small"
            startIcon={isAllSelected ? <IconSquareOff size={16} /> : <IconChecklist size={16} />}
            onClick={handleToggleAll}
            sx={{ fontSize: '0.75rem' }}
          >
            {isAllSelected ? 'Remove All' : 'Select All'}
          </Button>
          <Button
            variant="contained"
            onClick={isNewTimeGroup ? handleSave : convertSelectionToTimeBlocks}
            size="small"
          >
            {isNewTimeGroup ? 'Save' : 'Apply'}
          </Button>
          {isNewTimeGroup && (
            <Button variant="outlined" color="secondary" onClick={handleCancel} size="small">
              Cancel
            </Button>
          )}

          <Button variant="outlined" color="error" onClick={handleClearAll} size="small">
            Clear
          </Button>
        </Box>
      </Box>

      {/* Grid */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          maxHeight: '550px',
          overflowY: 'auto',
          pr: 1,
          userSelect: 'none',
        }}
      >
        {/* Header row */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            position: 'sticky',
            top: 0,
            backgroundColor: 'background.paper',
            zIndex: 10,
            py: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ width: 60, flexShrink: 0, visibility: 'hidden' }} />
          {daysOfWeek.map((day, d) => (
            <Box
              key={day}
              sx={{
                flex: 1,
                minWidth: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Typography variant="body2" fontWeight="bold">
                {day}
              </Typography>
              <Box display="flex" gap={0.5}>
                <IconButton size="small" onClick={() => handleSelectAllDay(d)} sx={{ p: 0.25 }}>
                  <IconSquareCheck size={14} />
                </IconButton>
                <IconButton size="small" onClick={() => handleClearDay(d)} sx={{ p: 0.25 }}>
                  <IconX size={14} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Time rows */}
        {timeGroups.map((group, gi) => (
          <Box key={gi} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {/* Time labels */}
              <Box
                sx={{
                  width: 60,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  position: 'sticky',
                  left: 0,
                  backgroundColor: 'background.paper',
                  zIndex: 5,
                }}
              >
                {group.indices.map((h) => (
                  <Box
                    key={h}
                    sx={{
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      borderRight: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {timeSlots[h]}
                  </Box>
                ))}
              </Box>

              {/* Day columns */}
              {daysOfWeek.map((_, d) => (
                <Box
                  key={d}
                  sx={{ flex: 1, minWidth: 80, display: 'flex', flexDirection: 'column', gap: 0.5 }}
                >
                  {group.indices.map((h) => {
                    const cellId = `${d}-${h}`;
                    const isSelected = selectedCells[cellId];
                    return (
                      <Box
                        key={h}
                        sx={{
                          height: 28,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 0.5,
                          backgroundColor: isSelected
                            ? theme.palette.primary.main
                            : theme.palette.grey[100],
                          opacity: isSelected ? 0.8 : 0.6,
                          '&:hover': {
                            backgroundColor: isSelected
                              ? theme.palette.primary.dark
                              : theme.palette.grey[300],
                            cursor: 'pointer',
                          },
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleMouseDown(d, h);
                        }}
                        onMouseEnter={() => handleMouseEnter(d, h)}
                      />
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      <Box mt={1}>
        <Typography variant="caption" color="textSecondary">
          Tip: Click and drag to select multiple hours
        </Typography>
      </Box>
    </Paper>
  );
};
