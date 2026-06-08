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
  CircularProgress,
} from '@mui/material';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'src/store/Store';
import { fetchBuildings, BuildingType } from 'src/store/apps/crud/building';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import { fetchTrackingTransDT, trackingTransType } from 'src/store/apps/crud/trackingTrans';
import BeaconRenderer from './BeaconRenderer';
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { GetFilter } from 'src/store/apps/crud/trackingTrans';
import { RootState } from 'src/store/Store';

type VisitorTrackingHistoryPopupProps = {
  open: boolean;
  onClose: () => void;
  visitor: VisitorType;
};

const VisitorTrackingHistoryPopup = ({ open, onClose, visitor }: VisitorTrackingHistoryPopupProps) => {
  const dispatch = useDispatch();
  const theme = useTheme();

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [activeFloorImage, setActiveFloorImage] = useState<string | null>(null);
  const [floorplanName, setFloorplanName] = useState<string>('');
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 });
  const [animatedPosition, setAnimatedPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const animationFrameRef = useRef<number | null>(null);

  const floorplanData: FloorplanType[] = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const buildingData: BuildingType[] = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const trackingTrans: trackingTransType[] = useSelector((state: RootState) => state.trackingTransReducer.trackingTrans);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    dispatch(fetchBuildings());
    dispatch(fetchFloorplan());

    const filter: GetFilter = {
      Draw: 1,
      Start: 0,
      Length: 1000,
      SortColumn: 'TransTime',
      SortDir: 'desc',
      SearchValue: '',
      dateFilters: {
        // TransTime: {
        //   DateFrom: visitor.visitorPeriodStart,
        //   DateTo: visitor.visitorPeriodEnd,
        // },
      },
      filters: {
        VisitorId: [visitor.id],
      },
    };

    dispatch(fetchTrackingTransDT(filter))
      .unwrap()
      .finally(() => setLoading(false));
  }, [dispatch, visitor, open]);

  // sort by time descending
  const filteredTracking = [...trackingTrans]
    .filter((t) => t.visitorId === visitor.id)
    .sort((a, b) => dayjs(b.transTime).valueOf() - dayjs(a.transTime).valueOf());

  // preselect newest
  useEffect(() => {
    if (filteredTracking.length > 0) {
      handleRowClick(filteredTracking[0].id);
    }
  }, [filteredTracking.length]);

  const handleRowClick = (id: string) => {
    setSelectedRowId(id);
    const track = filteredTracking.find((t) => t.id === id);
    if (!track) return;

    const floorplan = floorplanData.find(
      (f) => f.id.toLowerCase() === track.floorplanMaskedArea?.floorplanId?.toLowerCase(),
    );

    setActiveFloorImage(floorplan?.floorplanImage ?? null);
    setFloorplanName(floorplan?.name ?? '');
    setAnimatedPosition({ x: track.coordinatePxX * scale, y: track.coordinatePxY * scale });
  };

  useEffect(() => {
    if (activeFloorImage) {
      const img = new window.Image();
      img.src = `${BASE_URL}${activeFloorImage}`;
      img.onload = () => {
        setImageObj(img);
        setImageDimensions({ width: img.width, height: img.height });
      };
    }
  }, [activeFloorImage]);

  const maxWidth = 900;
  const maxHeight = 350;
  const minHeight = 200;
  const scale = Math.min(maxWidth / imageDimensions.width, maxHeight / imageDimensions.height);
  const stageWidth = imageDimensions.width * scale;
  const stageHeight = imageDimensions.height * scale;

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

      if (t < 1) requestAnimationFrame(step);
      else onComplete();
    };

    requestAnimationFrame(step);
  };

  const startPlayback = (currentId?: string) => {
    if (!isPlaying) return;

    const currentIdx = filteredTracking.findIndex((t) => t.id === (currentId ?? selectedRowId));
    const nextIdx = currentIdx - 1;

    if (nextIdx < 0) {
      setIsPlaying(false);
      return;
    }

    const current = filteredTracking[currentIdx];
    const next = filteredTracking[nextIdx];

    const durationMs = Math.max(dayjs(next.transTime).diff(dayjs(current.transTime), 'millisecond'), 500);

    animateToPosition(
      current.coordinatePxX * scale,
      current.coordinatePxY * scale,
      next.coordinatePxX * scale,
      next.coordinatePxY * scale,
      durationMs,
      () => {
        setSelectedRowId(next.id);
        startPlayback(next.id);
      },
    );
  };

  useEffect(() => {
    if (isPlaying && filteredTracking.length > 0) {
      const startId = selectedRowId || filteredTracking[0].id;
      const startTrack = filteredTracking.find((t) => t.id === startId)!;
      setAnimatedPosition({
        x: startTrack.coordinatePxX * scale,
        y: startTrack.coordinatePxY * scale,
      });
      startPlayback(startId);
    }
  }, [isPlaying]);

  const handlePause = () => setIsPlaying(false);

  const TrackingRow = ({ track, isSelected, onClick }: { track: trackingTransType; isSelected: boolean; onClick: () => void }) => {
    const theme = useTheme();
    const floorplan = floorplanData.find(
      (f) => f.id.toLowerCase() === track.floorplanMaskedArea?.floorplanId?.toLowerCase(),
    );
    const building = buildingData.find((b) => b.id === floorplan?.floor?.buildingId);

    return (
      <TableRow
        hover
        onClick={onClick}
        sx={{
          cursor: 'pointer',
          backgroundColor: track.alarmStatus === 'Restricted'
            ? theme.palette.error.light
            : isSelected
            ? theme.palette.primary.light
            : 'inherit',
        }}
      >
        <TableCell>{floorplan?.name || '-'}</TableCell>
        <TableCell>{floorplan?.floor?.name || '-'}</TableCell>
        <TableCell>{building?.name || '-'}</TableCell>
        <TableCell>{track.alarmStatus === 'Restricted' ? 'Yes' : 'No'}</TableCell>
        <TableCell>{dayjs(track.transTime).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
      </TableRow>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>
        <Typography fontWeight={600}>
          {visitor.name} — Tracking History ({floorplanName})
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 200px)',
          p: 0,
        }}
      >
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Floorplan Preview */}
            <Box
              sx={{
                border: '2px solid #000',
                height: stageHeight > 0 ? stageHeight : minHeight,
                mb: 2,
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Stage
                width={stageWidth}
                height={stageHeight}
                x={stageWidth / 2 - (animatedPosition?.x || 0) * 1.5}
                y={stageHeight / 2 - (animatedPosition?.y || 0) * 1.5}
                scaleX={1.5}
                scaleY={1.5}
              >
                <Layer>
                  {selectedRowId && imageObj && (() => {
                    const track = filteredTracking.find((t) => t.id === selectedRowId);
                    if (!track) return null;
                    const floorplan = floorplanData.find(
                      (f) => f.id.toLowerCase() === track.floorplanMaskedArea?.floorplanId?.toLowerCase(),
                    );
                    return (
                      <>
                        <KonvaImage image={imageObj} width={stageWidth} height={stageHeight} />
                        <BeaconRenderer
                          id={track.cardId}
                          x={animatedPosition?.x || track.coordinatePxX * scale}
                          y={animatedPosition?.y || track.coordinatePxY * scale}
                          area={track.floorplanMaskedArea?.name || '-'}
                          floorplan={floorplan?.name || '-'}
                          time={track.transTime}
                          clickable={false}
                        />
                      </>
                    );
                  })()}
                </Layer>
              </Stage>
            </Box>

            {/* Controls */}
            <Box display="flex" gap={2} px={2} mb={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setIsPlaying(true)}
                startIcon={<IconPlayerPlayFilled size={18} />}
                disabled={isPlaying || filteredTracking.length === 0}
              >
                Play
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handlePause}
                startIcon={<IconPlayerPauseFilled size={18} />}
                disabled={!isPlaying}
              >
                Pause
              </Button>
            </Box>

            {/* Table */}
            <TableContainer component={Paper} sx={{ flexGrow: 1, border: '1px solid #000' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Floorplan</strong></TableCell>
                    <TableCell><strong>Floor</strong></TableCell>
                    <TableCell><strong>Building</strong></TableCell>
                    <TableCell><strong>Restricted?</strong></TableCell>
                    <TableCell><strong>Time</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTracking.map((track) => (
                    <TrackingRow
                      key={track.id}
                      track={track}
                      isSelected={selectedRowId === track.id}
                      onClick={() => handleRowClick(track.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VisitorTrackingHistoryPopup;
