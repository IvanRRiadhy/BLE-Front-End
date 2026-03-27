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
import { useDispatch, useSelector } from 'src/store/Store';
import {
  fetchTimeGroupDT,
  TimeBlockType,
  TimeGroupType,
  UpdateSelectedTimeGroup,
  CancelNewTimeGroup,
  saveNewTimeGroup,
  editTimeGroup,
  addTimeBlock,
} from 'src/store/apps/crud/timeGroup';
import { defaultTimeGroupFilter } from 'src/store/apps/defaultForm';
import { useAddTimeGroup, useEditTimeGroup, useAddTimeBlock } from 'src/hooks/useTimeGroup';
import toast from 'react-hot-toast';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

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
  const theme = useTheme();

  const isNewTimeGroup = useSelector((s: any) => s.TimeGroupReducer.isNewTimeGroup);
  const selectedTimeGroup = useSelector((s: any) => s.TimeGroupReducer.selectedTimeGroup);

  const [selectedCells, setSelectedCells] = useState<Record<string, boolean>>({});
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'add' | 'remove'>('add');

  const addTG = useAddTimeGroup();
  const editTG = useEditTimeGroup();
  const addBlock = useAddTimeBlock();

  // 24 slots
  const timeSlots = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00');

  // Group slots into 4-hour chunks
  const timeGroups = Array.from({ length: 6 }, (_, i) => {
    const start = i * 4;
    return { indices: [start, start + 1, start + 2, start + 3] };
  });

  // ---------------- Helpers ----------------
const makeBlock = (
  dayIndex: number,
  startHour: number,
  endHour: number,
  existingBlocks: TimeBlockType[],
): TimeBlockType => {

  const startLocal = dayjs(`1970-01-01T${startHour.toString().padStart(2,"0")}:00:00`);
  const endLocal = dayjs(`1970-01-01T${(endHour-1).toString().padStart(2,"0")}:59:59.999`);

  const startUTC = startLocal.utc();
  const endUTC = endLocal.utc();

  const startTime = startUTC.format("HH:mm:ss");
  const endTime = endUTC.format("HH:mm:ss.SSS");

  const match = existingBlocks.find(
    (b) =>
      daysOfWeek.indexOf(b.dayOfWeek) === dayIndex &&
      b.startTime === startTime &&
      b.endTime === endTime,
  );

  return {
    id: match ? match.id : `block-${dayIndex}-${startHour}`,
    dayOfWeek: daysOfWeek[dayIndex],
    startTime,
    endTime,
  };
};

  const convertCellsToBlocks = useCallback(
    (cells: Record<string, boolean>, existingBlocks: TimeBlockType[] = []): TimeBlockType[] => {
      const blocks: TimeBlockType[] = [];
      const dayGroups: Record<number, number[]> = {};

      Object.keys(cells).forEach((cellId) => {
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
            blocks.push(makeBlock(d, start, sorted[i - 1] + 1, existingBlocks));
            start = sorted[i];
          }
        }
        blocks.push(makeBlock(d, start, sorted[sorted.length - 1] + 1, existingBlocks));
      });

      return blocks;
    },
    [timeSlots],
  );

  const syncSelection = useCallback(
    (cells: Record<string, boolean>) => {
      const existing = selectedTimeGroup?.timeBlocks ?? [];
      const blocks = convertCellsToBlocks(cells, existing);
      onSelectionChange(blocks);
      dispatch(UpdateSelectedTimeGroup({ timeBlocks: blocks }));
    },
    [convertCellsToBlocks, onSelectionChange, dispatch, selectedTimeGroup],
  );

  // ---------------- Init from props ----------------
useEffect(() => {
  if (!initialData.length) {
    setSelectedCells({});
    return;
  }

  const newSelected: Record<string, boolean> = {};

  initialData.forEach((block) => {
    const dayIndex = daysOfWeek.indexOf(block.dayOfWeek);

    const startLocal = dayjs.utc(`1970-01-01T${block.startTime}`).local();
    const endLocal = dayjs.utc(`1970-01-01T${block.endTime}`).local();

    const startHour = startLocal.hour();
    const endHour = endLocal.hour() + 1;

    for (let h = startHour; h < endHour; h++) {
      newSelected[`${dayIndex}-${h}`] = true;
    }
  });

  setSelectedCells(newSelected);
}, [initialData]);

  // ---------------- Mouse events ----------------
  const handleCellClick = useCallback(
    (dayIndex: number, timeIndex: number) => {
      const cellId = `${dayIndex}-${timeIndex}`;
      setSelectedCells((prev) => {
        const updated = { ...prev };
        if (selectionMode === 'add') updated[cellId] = true;
        else delete updated[cellId];
        syncSelection(updated);
        return updated;
      });
    },
    [selectionMode, syncSelection],
  );

  const handleMouseDown = (dayIndex: number, timeIndex: number) => {
    setIsSelecting(true);
    handleCellClick(dayIndex, timeIndex);
  };

  const handleMouseEnter = (dayIndex: number, timeIndex: number) => {
    if (isSelecting) handleCellClick(dayIndex, timeIndex);
  };

  useEffect(() => {
    const stop = () => setIsSelecting(false);
    document.addEventListener('mouseup', stop);
    document.addEventListener('mouseleave', stop);
    return () => {
      document.removeEventListener('mouseup', stop);
      document.removeEventListener('mouseleave', stop);
    };
  }, []);

  // ---------------- Bulk selection ----------------
  const totalCells = daysOfWeek.length * timeSlots.length;
  const isAllSelected = Object.keys(selectedCells).length === totalCells;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedCells({});
      syncSelection({});
    } else {
      const newSelected: Record<string, boolean> = {};
      daysOfWeek.forEach((_, d) => timeSlots.forEach((_, h) => (newSelected[`${d}-${h}`] = true)));
      setSelectedCells(newSelected);
      syncSelection(newSelected);
    }
  };

  const handleClearAll = () => {
    setSelectedCells({});
    syncSelection({});
  };

  const handleSelectAllDay = (dayIndex: number) => {
    setSelectedCells((prev) => {
      const updated = { ...prev };
      timeSlots.forEach((_, h) => (updated[`${dayIndex}-${h}`] = true));
      syncSelection(updated);
      return updated;
    });
  };

  const handleClearDay = (dayIndex: number) => {
    setSelectedCells((prev) => {
      const updated = { ...prev };
      timeSlots.forEach((_, h) => delete updated[`${dayIndex}-${h}`]);
      syncSelection(updated);
      return updated;
    });
  };

  // ---------------- Save & Cancel ----------------

  const handleSave = async () => {
    if (!selectedTimeGroup) return;

    const normalizedBlocks = selectedTimeGroup.timeBlocks.map((b: TimeBlockType) => ({
      dayOfWeek: b.dayOfWeek.toLowerCase(),
      startTime: b.startTime, 
      endTime: b.endTime,
      // id: b.id.startsWith('block-') ? '' : b.id, // remove temp id
    }));
    console.log(normalizedBlocks);
    try {
      if (isNewTimeGroup) {
        // --------------------------------------
        // CREATE NEW TIME GROUP (same as old saveNewTimeGroup)
        // --------------------------------------
        await addTG.mutateAsync({
          ...selectedTimeGroup,
          timeBlocks: normalizedBlocks,
        });

        toast.success('Time group created successfully');
      } else {
        // --------------------------------------
        // EDIT EXISTING TIME GROUP
        // --------------------------------------

        // 1. Identify brand new blocks that must be created separately
        const newBlocks = selectedTimeGroup.timeBlocks.filter((b: TimeBlockType) =>
          b.id.startsWith('block-'),
        );

        // 2. Prepare payload for editing main group
        const editPayload = {
          id: selectedTimeGroup.id,
          name: selectedTimeGroup.name,
          description: selectedTimeGroup.description,
          cardAccessIds: selectedTimeGroup.cardAccessIds,
          timeBlocks: normalizedBlocks, // without temp ids
        };

        // First update the group (same as old editTimeGroup)
        await editTG.mutateAsync(editPayload);

        // 3. Add new time blocks (same as old addTimeBlock)
        for (const b of newBlocks) {
          const addPayload = {
            dayOfWeek: b.dayOfWeek.toLowerCase(),
            startTime: b.startTime,
            endTime: b.endTime,
            TimeGroupId: selectedTimeGroup.id,
          };

          await addBlock.mutateAsync(addPayload);
        }

        toast.success('Time group updated successfully');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error('Failed to save time group');
    }
  };

  const handleCancel = () => {
    dispatch(CancelNewTimeGroup());
  };

  // ---------------- Render ----------------
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
          <Button variant="contained" onClick={handleSave} size="small">
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
          maxHeight: '625px',
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
