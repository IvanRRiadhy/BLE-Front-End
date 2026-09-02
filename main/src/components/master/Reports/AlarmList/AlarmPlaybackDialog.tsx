import { BASE_URL } from 'src/utils/axios';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  useTheme,
  Chip,
} from '@mui/material';

import { Stage, Layer, Image as KonvaImage, Circle, Line, Shape } from 'react-konva';
import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react';

import BeaconRenderer from 'src/components/dashboards/monitoring/Renderer/BeaconRenderer';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllSecuritys } from 'src/hooks/useSecurityGuard';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';

import { AlarmPlaybackDataType } from 'src/store/apps/crud/alarmPlayback';
import { uniqueId } from 'lodash';

const MIN_DELAY = 500;
const MAX_DELAY = 1000;

type Props = {
  open: boolean;
  onClose: () => void;
  data: AlarmPlaybackDataType | null;
};

const phaseRowColors: Record<string, { light: string; dark: string }> = {
  'pre-alarm': {
    light: 'rgba(25, 118, 210, 0.15)', // light blue
    dark: 'rgba(25, 118, 210, 0.35)',
  },
  'during-alarm': {
    light: 'rgba(244, 67, 54, 0.18)', // light red/orange
    dark: 'rgba(244, 67, 54, 0.40)',
  },
  'post-alarm': {
    light: 'rgba(76, 175, 80, 0.15)', // light green
    dark: 'rgba(76, 175, 80, 0.35)',
  },
};

const phaseColor = (phase: string) => {
  switch (phase) {
    case 'pre':
      return '#1976d2';
    case 'during':
      return '#f44336';
    case 'post':
      return '#4caf50';
    default:
      return '#9e9e9e';
  }
};

const AlarmPlaybackDialog = ({ open, onClose, data }: Props) => {
  const theme = useTheme();

  const { data: membersData = [] } = useAllMembers();
  const { data: visitorsData = [] } = useAllVisitor();
  const { data: securityData = [] } = useAllSecuritys();
  const { data: maskedAreas = [] } = useAllMaskedAreas();

  const areaMap = useMemo(() => {
    const map = new Map<string, string>();
    maskedAreas.forEach((area) => {
      if (area.id) map.set(area.id, area.name);
      if (area.name) map.set(area.name, area.name);
    });
    return map;
  }, [maskedAreas]);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const activeRowRef = useRef<HTMLTableRowElement | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const scrollCooldownRef = useRef<NodeJS.Timeout | null>(null);

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 });

  const [animatedPosition, setAnimatedPosition] = useState<{ x: number; y: number } | null>(null);

  const maxWidth = 900;
  const maxHeight = 350;
  const minHeight = 200;

  const scale = Math.min(maxWidth / imageDimensions.width, maxHeight / imageDimensions.height);

  const stageWidth = imageDimensions.width * scale;
  const stageHeight = imageDimensions.height * scale;

  const frames = useMemo(() => {
    if (!data) return [];
    return [...data.frames].sort((a, b) => a.sequence - b.sequence);
  }, [data]);

  useEffect(() => {
    if (!data?.meta.floorplanImage) return;

    const img = new window.Image();
    img.src = `${data.meta.floorplanImage}`;

    img.onload = () => {
      setImageObj(img);
      setImageDimensions({
        width: img.width,
        height: img.height,
      });
    };
  }, [data]);

  useEffect(() => {
    if (frames.length > 0) {
      const first = frames[0];
      setAnimatedPosition({
        x: first.x * scale,
        y: first.y * scale,
      });
    }
  }, [frames, scale]);

  const animateToPosition = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number,
    onComplete: () => void,
  ) => {
    const startTime = performance.now();

    const step = (now: number) => {
      if (!isPlaying) return;

      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;

      setAnimatedPosition({ x, y });

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        onComplete();
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  };

  const startPlayback = (index: number) => {
    if (!isPlaying) return;

    const nextIdx = index + 1;

    if (nextIdx >= frames.length) {
      setIsPlaying(false);
      return;
    }

    const current = frames[index];
    const next = frames[nextIdx];

    const duration = Math.min( Math.max(dayjs(next.time).diff(dayjs(current.time), 'millisecond'), MIN_DELAY), MAX_DELAY);

    animateToPosition(
      current.x * scale,
      current.y * scale,
      next.x * scale,
      next.y * scale,
      duration,
      () => {
        setSelectedIndex(nextIdx);
        startPlayback(nextIdx);
      },
    );
  };

  const jumpToIndex = (index: number) => {
    const frame = frames[index];
    if (!frame) return;

    setSelectedIndex(index);

    setAnimatedPosition({
      x: frame.x * scale,
      y: frame.y * scale,
    });
  };

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      startPlayback(selectedIndex);
    }
  }, [isPlaying]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsUserScrolling(true);

      if (scrollCooldownRef.current) {
        clearTimeout(scrollCooldownRef.current);
      }

      scrollCooldownRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 2000);
    };

    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isUserScrolling) return;

    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: isPlaying ? 'auto' : 'smooth',
        block: 'center',
      });
    }
  }, [selectedIndex]);

  const handlePause = () => {
    setIsPlaying(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const resetReplay = () => {
    setIsPlaying(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setSelectedIndex(0);

    if (frames.length > 0) {
      const first = frames[0];

      setAnimatedPosition({
        x: first.x * scale,
        y: first.y * scale,
      });
    }
  };

  useEffect(() => {
    if (!open) resetReplay();
  }, [open]);

  const current = frames[selectedIndex];
  const prev = selectedIndex > 0 ? frames[selectedIndex - 1] : null;
  const next = selectedIndex < frames.length - 1 ? frames[selectedIndex + 1] : null;

  const currentPos = current ? { x: current.x * scale, y: current.y * scale } : null;
  const prevPos = prev ? { x: prev.x * scale, y: prev.y * scale } : null;
  const nextPos = next ? { x: next.x * scale, y: next.y * scale } : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography fontWeight={600}>
          {data?.meta.personName} — Alarm Playback — {data?.meta.floorplanName}
        </Typography>
        {data && (
          <Chip
            label={data.meta.category}
            sx={{
              backgroundColor: '#d32f2f',
              color: '#fff',
              fontWeight: 600,
            }}
          />
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 200px)',
        }}
      >
        {/* Alarm Info */}
        {/* {data && (
          <Box mb={2}>
            <Typography variant="body2">
              Alarm Time: {dayjs(data.meta.alarmTime).format('YYYY-MM-DD HH:mm:ss')}
            </Typography>

            <Typography variant="body2">
              Category: {data.meta.category} — Action: {data.meta.action}
            </Typography>

            <Typography variant="body2">Duration: {data.meta.timeRange.totalDuration}</Typography>

            <Typography variant="body2">
              Frames: {data.summary.totalFrames} | Pre: {data.summary.preAlarmFrames} | During:{' '}
              {data.summary.duringAlarmFrames} | Post: {data.summary.postAlarmFrames}
            </Typography>
          </Box>
        )} */}

        {/* FLOORPLAN */}
        <Box
          sx={{
            border: '2px solid #000',
            height: 350,
            mb: 2,
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Stage
            width={stageWidth || maxWidth}
            height={stageHeight || minHeight}
            x={stageWidth / 2 - (animatedPosition?.x || 0) * 1.5}
            y={stageHeight / 2 - (animatedPosition?.y || 0) * 1.5}
            scaleX={1.5}
            scaleY={1.5}
          >
            <Layer>
              {imageObj && <KonvaImage image={imageObj} width={stageWidth} height={stageHeight} />}

              {/* prev → current */}
              {prevPos && currentPos && (
                <Line
                  points={[prevPos.x, prevPos.y, currentPos.x, currentPos.y]}
                  stroke="#1976d2"
                  strokeWidth={2}
                  dash={[6, 6]}
                />
              )}

              {/* current → next */}
              {nextPos && currentPos && (
                <Line
                  points={[currentPos.x, currentPos.y, nextPos.x, nextPos.y]}
                  stroke="#1976d2"
                  strokeWidth={2}
                  dash={[6, 6]}
                />
              )}

              {/* Previous point (X mark) */}
              {prevPos && (
                <Shape
                  sceneFunc={(ctx, shape) => {
                    ctx.beginPath();
                    ctx.moveTo(prevPos.x - 5, prevPos.y - 5);
                    ctx.lineTo(prevPos.x + 5, prevPos.y + 5);
                    ctx.moveTo(prevPos.x + 5, prevPos.y - 5);
                    ctx.lineTo(prevPos.x - 5, prevPos.y + 5);
                    ctx.strokeShape(shape);
                  }}
                  stroke="#f44336"
                  strokeWidth={2}
                />
              )}

              {/* Current point marker */}
              {currentPos && (
                <Circle
                  x={currentPos.x}
                  y={currentPos.y}
                  radius={6}
                  stroke="#4caf50"
                  strokeWidth={2}
                  fill="#4caf50"
                />
              )}

              {/* Next point (O mark) */}
              {nextPos && (
                <Circle x={nextPos.x} y={nextPos.y} radius={5} stroke="#1976d2" strokeWidth={2} />
              )}
              {animatedPosition && current && (() => {
                const cardId = data?.meta.cardId;
                const beaconId = data?.meta.beaconId;
                const person = [...membersData, ...visitorsData, ...securityData].find(
                  (p) =>
                    (cardId && (p.id === cardId || ('bleCardNumber' in p && p.bleCardNumber === cardId))) ||
                    (beaconId && (p.id === beaconId || ('bleCardNumber' in p && p.bleCardNumber === beaconId))),
                );
                const isVisitor = visitorsData.some(
                  (v) =>
                    (cardId && (v.id === cardId || v.bleCardNumber === cardId)) ||
                    (beaconId && (v.id === beaconId || v.bleCardNumber === beaconId)),
                );
                const isMember = membersData.some(
                  (m) =>
                    (cardId && (m.id === cardId || m.bleCardNumber === cardId)) ||
                    (beaconId && (m.id === beaconId || m.bleCardNumber === beaconId)),
                );
                const isSecurity = securityData.some(
                  (s) =>
                    (cardId && (s.id === cardId || s.bleCardNumber === cardId)) ||
                    (beaconId && (s.id === beaconId || s.bleCardNumber === beaconId)),
                );
                const label = person?.name || data?.meta.personName || '';

                return (
                  <BeaconRenderer
                    id={cardId || beaconId || 'alarm-beacon'}
                    x={animatedPosition.x}
                    y={animatedPosition.y}
                    beaconSize={1}
                    area={areaMap.get(current.areaId) || current.areaId || ''}
                    floorplan={data?.meta.floorplanName || ''}
                    time={current.time}
                    clickable={false}
                    label={label}
                    isSecurity={isSecurity}
                    isMember={isMember}
                    isVisitor={isVisitor}
                    isFollowed={true}
                  />
                );
              })()}
            </Layer>
          </Stage>
        </Box>

        {/* CONTROLS */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<IconPlayerPlayFilled size={18} />}
              onClick={() => setIsPlaying(true)}
              disabled={isPlaying}
            >
              Play
            </Button>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<IconPlayerPauseFilled size={18} />}
              onClick={handlePause}
              disabled={!isPlaying}
            >
              Pause
            </Button>
          </Box>
          {data && (
            <Box display="flex" gap={4}>
              <Typography variant="body2">
                <strong>Alarm Time:</strong>{' '}
                {dayjs(data.meta.alarmTime).format('YYYY-MM-DD HH:mm:ss')}
              </Typography>

              <Typography variant="body2">
                <strong>Duration:</strong> {data.meta.timeRange.totalDuration}
              </Typography>
            </Box>
          )}
        </Box>

        {/* TABLE */}
        <TableContainer
          ref={tableContainerRef}
          component={Paper}
          sx={{ height: 300, overflow: 'auto' }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Area</TableCell>
                <TableCell>Phase</TableCell>
                <TableCell>Restricted</TableCell>
                {/* <TableCell>Source</TableCell> */}
              </TableRow>
            </TableHead>

            <TableBody>
              {frames.map((f, i) => {
                const isSelected = i === selectedIndex;
                const areaDisplayName = areaMap.get(f.areaId) || f.areaId;

                return (
                  <TableRow
                    key={i}
                    ref={isSelected ? activeRowRef : undefined}
                    // hover
                    onClick={() => {
                      handlePause();
                      jumpToIndex(i);
                    }}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: (() => {
                        const colors = phaseRowColors[f.phase] ?? {
                          light: 'inherit',
                          dark: 'inherit',
                        };
                        return isSelected ? colors.dark : colors.light;
                      })(),
                      '&:hover': {
                        backgroundColor: (() => {
                          const colors = phaseRowColors[f.phase] ?? {
                            light: 'inherit',
                            dark: 'inherit',
                          };
                          return isSelected ? colors.dark : colors.dark;
                        })(),
                      },
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <TableCell>{dayjs(f.time).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                    <TableCell>{areaDisplayName}</TableCell>
                    <TableCell>{f.phase}</TableCell>
                    <TableCell>{f.restricted ? 'Yes' : 'No'}</TableCell>
                    {/* <TableCell>{f.source}</TableCell> */}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => {
            resetReplay();
            onClose();
          }}
          variant="outlined"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlarmPlaybackDialog;
