import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  IconRotate,
  IconCircleDot,
  IconAlertTriangle,
  IconBuilding,
  IconMapPin,
} from '@tabler/icons-react';
import { TimelineEvent, TimelineEventType } from './movementAnalysisUtils';

interface EventTimelineListProps {
  events: TimelineEvent[];
  currentTimestamp?: string;
  onSeek: (pointIndex: number, timestamp: string, eventId?: string, eventType?: string) => void;
  isFullscreen?: boolean;
}

export const EventTimelineList: React.FC<EventTimelineListProps> = ({
  events,
  currentTimestamp,
  onSeek,
  isFullscreen = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [filterType, setFilterType] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events;
    return events.filter((e) => e.type === filterType);
  }, [events, filterType]);

  // Find the event closest to current playback time for subtle highlight
  const activeEventId = useMemo(() => {
    if (!currentTimestamp || events.length === 0) return null;
    const currentMs = new Date(currentTimestamp).getTime();
    let closestId = null;
    let minDiff = Infinity;
    events.forEach((e) => {
      const eMs = new Date(e.time).getTime();
      const diff = Math.abs(currentMs - eMs);
      if (diff < minDiff && diff < 30000) {
        // Within 30 sec
        minDiff = diff;
        closestId = e.id;
      }
    });
    return closestId;
  }, [events, currentTimestamp]);

  const renderEventIcon = (type: TimelineEventType) => {
    switch (type) {
      case 'moving':
        return (
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              bgcolor: 'rgba(24, 119, 242, 0.12)',
              color: '#1877F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconRotate size={15} />
          </Box>
        );
      case 'stopped':
        return (
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              bgcolor: 'rgba(14, 165, 233, 0.15)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconCircleDot size={15} />
          </Box>
        );
      case 'incident':
        return (
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              bgcolor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconAlertTriangle size={15} />
          </Box>
        );
      case 'floor_change':
      default:
        return (
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              bgcolor: 'rgba(168, 85, 247, 0.15)',
              color: '#a855f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconBuilding size={15} />
          </Box>
        );
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        bgcolor: isDark ? 'background.paper' : '#ffffff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with Type Filter */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.25}>
        <Typography variant="subtitle1" fontWeight={700} color="text.primary">
          Event Timeline
        </Typography>

        <Select
          size="small"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          sx={{
            height: 30,
            fontSize: '0.78rem',
            borderRadius: '8px',
            bgcolor: isDark ? 'grey.800' : '#f8fafc',
          }}
        >
          <MenuItem value="all" sx={{ fontSize: '0.78rem' }}>
            All Events ({events.length})
          </MenuItem>
          <MenuItem value="moving" sx={{ fontSize: '0.78rem' }}>
            Moving Only
          </MenuItem>
          <MenuItem value="stopped" sx={{ fontSize: '0.78rem' }}>
            Stops / Dwells
          </MenuItem>
          <MenuItem value="floor_change" sx={{ fontSize: '0.78rem' }}>
            Floor Changes
          </MenuItem>
          <MenuItem value="incident" sx={{ fontSize: '0.78rem' }}>
            Incidents
          </MenuItem>
        </Select>
      </Box>

      {/* Events List */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          pr: 0.5,
          maxHeight: isFullscreen ? 210 : 160,
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
            borderRadius: '4px',
          },
        }}
      >
        {filteredEvents.length === 0 ? (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <Typography variant="caption" color="text.secondary">
              No events found for this filter
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0.75}>
            {filteredEvents.map((evt) => {
              const isActive = evt.id === activeEventId;
              const isIncident = evt.type === 'incident';

              return (
                <Box
                  key={evt.id}
                  onClick={() => onSeek(evt.pointIndex, evt.time, evt.id, evt.type)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 0.85,
                    px: 1.25,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: isActive
                      ? '#1877F2'
                      : isIncident
                      ? 'rgba(239, 68, 68, 0.3)'
                      : isDark
                      ? 'rgba(255,255,255,0.05)'
                      : '#f1f5f9',
                    bgcolor: isActive
                      ? 'rgba(24, 119, 242, 0.08)'
                      : isIncident
                      ? 'rgba(239, 68, 68, 0.04)'
                      : isDark
                      ? 'rgba(255,255,255,0.02)'
                      : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#edf4ff',
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  {/* Left: Time & Icon */}
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        minWidth: 54,
                      }}
                    >
                      {evt.timeLabel}
                    </Typography>

                    {renderEventIcon(evt.type)}

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={isIncident ? 700 : 600}
                        fontSize="0.8rem"
                        color={isIncident ? 'error.main' : 'text.primary'}
                        noWrap
                      >
                        {typeof evt.title === 'string'
                          ? evt.title
                          : typeof evt.title === 'object' && evt.title !== null
                          ? (evt.title as any).investigationResult ||
                            (evt.title as any).alarmStatus ||
                            (evt.title as any).actionStatus ||
                            'Incident Detected'
                          : String(evt.title || '')}
                      </Typography>
                      {evt.subtitle && (
                        <Typography variant="caption" color="text.secondary" fontSize="0.7rem" noWrap display="block">
                          {typeof evt.subtitle === 'string'
                            ? evt.subtitle
                            : typeof evt.subtitle === 'object' && evt.subtitle !== null
                            ? (evt.subtitle as any).timelineSummary ||
                              (evt.subtitle as any).actionStatus ||
                              'Security Alert'
                            : String(evt.subtitle)}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  {/* Right: Area badge & seek button */}
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, ml: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        maxWidth: 110,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'text.secondary',
                        fontWeight: 500,
                        fontSize: '0.72rem',
                      }}
                      title={evt.area}
                    >
                      {evt.area}
                    </Typography>

                    <Tooltip title="Jump to this moment">
                      <IconButton size="small" sx={{ p: 0.25, color: 'text.secondary' }}>
                        <IconMapPin size={15} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
};
