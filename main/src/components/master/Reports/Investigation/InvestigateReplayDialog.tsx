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
} from '@mui/material';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Shape } from 'react-konva';
import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react';
import InvestigationBeaconRenderer from './InvestigationBeaconRenderer';

type PointType = {
  x: number;
  y: number;
  time: string;
  area: string;
  personName: string;
  personId: string;
};

type SessionReplayProps = {
  open: boolean;
  onClose: () => void;
  personName: string;
  floorplanImage: string;
  floorplanName: string;
  points: PointType[];
};

const MIN_DELAY = 500;
const MAX_DELAY = 1000;

const InvestigateReplayDialog = ({
  open,
  onClose,
  personName,
  floorplanImage,
  floorplanName,
  points,
}: SessionReplayProps) => {
  const theme = useTheme();
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const activeRowRef = useRef<HTMLTableRowElement | null>(null);

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 });

  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  const [animatedPosition, setAnimatedPosition] = useState<{ x: number; y: number } | null>(null);

  const maxWidth = 900;
  const maxHeight = 350;
  const minHeight = 200;

  const scale = Math.min(maxWidth / imageDimensions.width, maxHeight / imageDimensions.height);
  const stageWidth = imageDimensions.width * scale;
  const stageHeight = imageDimensions.height * scale;

  const sortedPoints = useMemo(() => {
    return [...points].sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf());
  }, [points]);

  useEffect(() => {
    if (!floorplanImage) return;

    const img = new window.Image();
    img.src = `${floorplanImage}`;

    img.onload = () => {
      setImageObj(img);
      setImageDimensions({
        width: img.width,
        height: img.height,
      });
    };
  }, [floorplanImage]);

  useEffect(() => {
    if (sortedPoints.length > 0) {
      const p = sortedPoints[0];
      setAnimatedPosition({
        x: p.x * scale,
        y: p.y * scale,
      });
    }
  }, [points, scale]);

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

    if (nextIdx >= sortedPoints.length) {
      setIsPlaying(false);
      return;
    }

    const current = sortedPoints[index];
    const next = sortedPoints[nextIdx];

    const durationMs = Math.min(Math.max(
      dayjs(next.time).diff(dayjs(current.time), 'millisecond'),
      MIN_DELAY,
    ), MAX_DELAY);

    animateToPosition(
      current.x * scale,
      current.y * scale,
      next.x * scale,
      next.y * scale,
      durationMs,
      () => {
        setSelectedIndex(nextIdx);
        startPlayback(nextIdx);
      },
    );
  };

  const jumpToIndex = (index: number) => {
    const point = sortedPoints[index];
    if (!point) return;

    setSelectedIndex(index);

    setAnimatedPosition({
      x: point.x * scale,
      y: point.y * scale,
    });
  };

  useEffect(() => {
    if (isPlaying && sortedPoints.length > 0) {
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
      }, 2000); // 2s cooldown
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
  }, [selectedIndex, isUserScrolling]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

    if (sortedPoints.length > 0) {
      const first = sortedPoints[0];

      setAnimatedPosition({
        x: first.x * scale,
        y: first.y * scale,
      });
    }
  };
  useEffect(() => {
    if (!open) {
      resetReplay();
    }
  }, [open]);

  const selectedPoint = sortedPoints[selectedIndex];
  const prevPoint = selectedIndex > 0 ? sortedPoints[selectedIndex - 1] : null;
  const nextPoint =
    selectedIndex < sortedPoints.length - 1 ? sortedPoints[selectedIndex + 1] : null;
  const currentPoint = sortedPoints[selectedIndex];

  const currentPos = currentPoint ? { x: currentPoint.x * scale, y: currentPoint.y * scale } : null;
  const prevPos = prevPoint ? { x: prevPoint.x * scale, y: prevPoint.y * scale } : null;

  const nextPos = nextPoint ? { x: nextPoint.x * scale, y: nextPoint.y * scale } : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Typography fontWeight={600}>
          {personName} — Replay — {floorplanName}
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 200px)',
        }}
      >
        {/* FLOORPLAN */}
        <Box
          sx={{
            border: '2px solid #000',
            height: 350, // height: stageHeight > 0 ? stageHeight : minHeight,
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
              {animatedPosition && (
                <InvestigationBeaconRenderer
                  id={selectedPoint.personId} // or bleCardNumber if you have it
                  x={animatedPosition.x}
                  y={animatedPosition.y}
                  area={selectedPoint.area}
                  floorplan={floorplanName}
                  time={selectedPoint.time}
                  clickable={false}
                />
              )}
            </Layer>
          </Stage>
        </Box>

        {/* PLAY CONTROLS */}
        <Box display="flex" gap={2} mb={2}>
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

        {/* TABLE */}
        <TableContainer
          ref={tableContainerRef}
          component={Paper}
          sx={{
            height: 300,
            overflow: 'auto',
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Area</strong>
                </TableCell>
                <TableCell>
                  <strong>Time</strong>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedPoints.map((p, i) => {
                const isSelected = i === selectedIndex;

                return (
                  <TableRow
                    key={i}
                    ref={isSelected ? activeRowRef : undefined}
                    hover
                    onClick={() => {
                      handlePause(); // stop playback
                      jumpToIndex(i);
                    }}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? theme.palette.primary.light : 'inherit',
                    }}
                  >
                    <TableCell>{p.area}</TableCell>
                    <TableCell>{dayjs(p.time).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
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

export default InvestigateReplayDialog;
