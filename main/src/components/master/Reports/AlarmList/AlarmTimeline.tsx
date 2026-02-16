import { Box, Typography } from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import BlockIcon from '@mui/icons-material/Block';
import AlarmIcon from '@mui/icons-material/NotificationImportant';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { AlarmTimelineType } from 'src/store/apps/crud/alarmTrigger';

interface Props {
  timelineData: AlarmTimelineType | null;
}

const getStageConfig = (stage: string) => {
  switch (stage) {
    case 'triggered':
      return {
        icon: <AlarmIcon />,
        sx: { bgcolor: '#f44336', color: '#fff' },
      };

    case 'acknowledged':
      return {
        icon: <CheckCircleIcon />,
        sx: { bgcolor: '#f44336', color: '#fff' },
      };

    case 'dispatched':
      return {
        icon: <DirectionsRunIcon />,
        sx: { bgcolor: '#ff9800', color: '#fff' },
      };

    case 'accepted':
      return {
        icon: <CheckCircleIcon />,
        sx: { bgcolor: '#ff9800', color: '#fff' },
      };

    case 'arrived':
      return {
        icon: <DirectionsRunIcon />,
        sx: { bgcolor: '#ffc107', color: '#fff' },
      };

    case 'done_investigated':
      return {
        icon: <CheckCircleIcon />,
        sx: { bgcolor: '#ffc107', color: '#fff' },
      };

    case 'resolved':
      return {
        icon: <CheckCircleIcon />,
        sx: { bgcolor: '#4caf50', color: '#fff' },
      };

    case 'waiting':
      return {
        icon: <AccessTimeIcon />,
        sx: { bgcolor: '#ffc107', color: '#000' },
      };

    case 'postpone_investigation':
      return {
        icon: <AccessTimeIcon />,
        sx: { bgcolor: '#ff9800', color: '#fff' },
      };

    case 'cancelled':
      return {
        icon: <BlockIcon />,
        sx: { bgcolor: '#9e9e9e', color: '#fff' },
      };
    case 'ongoing':
      return {
        icon: <MoreHorizIcon />,
        sx: {
          bgcolor: 'transparent',
          color: '#9e9e9e',
          border: '2px solid rgba(0,0,0,0.2)',
          opacity: 0.4,
          filter: 'grayscale(40%)',
        },
      };
    default:
      return {
        icon: <AccessTimeIcon />,
        sx: { bgcolor: '#bdbdbd', color: '#fff' },
      };
  }
};

const formatStageLabel = (stage: string) => {
  return stage.replace(/_/g, ' ').toUpperCase();
};

const AlarmTimelineProgress = ({ timelineData }: Props) => {
  const [selectedStage, setSelectedStage] = useState<number>(0);
  const finalStages = ['resolved', 'cancelled'];

  const isFinal =
    timelineData?.timeline?.length &&
    finalStages.includes(timelineData.timeline[timelineData.timeline.length - 1].stage);

  useEffect(() => {
    if (timelineData?.timeline?.length) {
      setSelectedStage(timelineData.timeline.length - 1);
    }
  }, [timelineData]);

  if (!timelineData?.timeline?.length) return null;
  const timelineWithActive = !isFinal
    ? [
        ...timelineData.timeline,
        {
          stage: 'ongoing',
          timestamp: null,
          description: 'Alarm is still active',
          durationFormatted: '',
        },
      ]
    : timelineData.timeline;
  return (
    <Box sx={{ mt: 3 }}>
      <Timeline
        position="right"
        sx={{
          '& .MuiTimelineItem-root:before': {
            flex: 0,
            padding: 0,
          },
        }}
      >
        {timelineWithActive.map((item, index) => {
          const isOngoing = item.stage === 'ongoing';
          const isSelected = selectedStage === index && !isOngoing;
          const config = getStageConfig(item.stage);

          return (
            <TimelineItem
              key={index}
              onClick={!isOngoing ? () => setSelectedStage(index) : undefined}
              sx={{
                cursor: isOngoing ? 'default' : 'pointer',
                opacity: isOngoing ? 0.5 : 1,
              }}
            >
              {/* 🔹 LEFT SIDE (Timestamp) */}
              <TimelineOppositeContent
                sx={{
                  flex: 0.25,
                  pt: 2,
                  fontSize: '0.75rem',
                  color: isOngoing ? 'rgba(0,0,0,0.3)' : 'text.secondary',
                }}
              >
                {item.timestamp ? dayjs(item.timestamp).format('DD MMM YYYY HH:mm:ss') : 'TBA'}
              </TimelineOppositeContent>

              {/* 🔹 ICON SECTION */}
              <TimelineSeparator>
                <TimelineDot
                  sx={{
                    ...config.sx,
                    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {config.icon}
                </TimelineDot>

                {index < timelineWithActive.length - 1 && (
                  <TimelineConnector
                    sx={{
                      borderLeftWidth: 3,
                      boxShadow: '0 0 4px rgba(46,125,50,0.4)',
                      borderLeftStyle:
                        !isFinal && index === timelineWithActive.length - 2 ? 'dashed' : 'solid',
                      borderColor:
                        !isFinal && index === timelineWithActive.length - 2
                          ? 'rgba(0,0,0,0.3)' // grey future
                          : 'linear-gradient(to bottom, #2e7d32, #4caf50)', // green completed
                    }}
                  />
                )}
              </TimelineSeparator>

              {/* 🔹 RIGHT SIDE (Content) */}
              <TimelineContent sx={{ pb: 4 }}>
                <Typography
                  fontWeight={700}
                  sx={{
                    color: isOngoing ? 'rgba(0,0,0,0.4)' : 'inherit',
                  }}
                >
                  {formatStageLabel(item.stage)}
                </Typography>

                {isSelected && (
                  <>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {item.description}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Duration: {item.durationFormatted}
                    </Typography>
                  </>
                )}
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </Box>
  );
};

export default AlarmTimelineProgress;
