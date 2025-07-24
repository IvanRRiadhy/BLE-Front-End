import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
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
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs'; // make sure to install dayjs
// import { useTranslation } from 'react-i18next';
import { BuildingType, fetchBuildings } from 'src/store/apps/crud/building';
// import { floorType } from 'src/store/apps/crud/floor';
// import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { memberType } from 'src/store/apps/crud/member';
// import { fetchTrackingTrans, trackingTransType } from 'src/store/apps/crud/trackingTrans';
import { masterVisitorType, VisitorType } from 'src/store/apps/crud/visitor';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import BeaconRenderer from '../Renderer/BeaconRenderer';
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react';
import { dummyTrackingData } from './DummyTrackingData';

type TrackingDetailPopupProps = {
  bleNumber: string;
  person: memberType | VisitorType;
  personId: string;
  openTrackDetail: boolean;
  setOpenTrackDetail: React.Dispatch<React.SetStateAction<boolean>>;
};

type TrackType = {
  id: string;
  beacon_id: string;
  floorplan_id: string;
  pos_x: number;
  pos_y: number;
  is_in_restricted_area: number;
  first_gateway_id: string;
  second_gateway_id: string;
  area: string;
  first_distance: number;
  second_distance: number;
  timestamp: string;
  created_at: string;
};

const BASE_URL = 'http://192.168.1.116:5000';

const TrackingDetailPopup = ({
  bleNumber,
  person,
  personId,
  openTrackDetail,
  setOpenTrackDetail,
}: TrackingDetailPopupProps) => {
  const dispatch = useDispatch();
  // const theme = useTheme();
  // const { t } = useTranslation();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [floorplanName, setFloorplanName] = useState<string>('');
  const [activeFloorImage, setActiveFloorImage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(dayjs().startOf('day').format('YYYY-MM-DDTHH:mm'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 });
  // console.log(personId);
  const [isPlaying, setIsPlaying] = useState(false);
  // const playbackInterval = useRef<NodeJS.Timeout | null>(null);
  const playbackTimeout = useRef<NodeJS.Timeout | null>(null);

  const [animatedPosition, setAnimatedPosition] = useState<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [camera, setCamera] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const cameraAnimRef = useRef<number | null>(null);

  useEffect(() => {
    // dispatch(fetchTrackingTrans());
    // dispatch(fetchFloors());
    // dispatch(fetchMaskedAreas());
    dispatch(fetchBuildings());
    dispatch(fetchFloorplan());
  }, [dispatch]);

  // const trackingData: trackingTransType[] = useSelector(
  //   (state: RootState) => state.trackingTransReducer.trackingTrans,
  // );
  // const maskedAreaData: MaskedAreaType[] = useSelector(
  //   (state: RootState) => state.maskedAreaReducer.maskedAreas,
  // );
  const floorplanData: FloorplanType[] = useSelector(
    (state: RootState) => state.floorplanReducer.floorplanAll,
  );
  // const floorData: floorType[] = useSelector((state: RootState) => state.floorReducer.floors);
  const buildingData: BuildingType[] = useSelector(
    (state: RootState) => state.buildingReducer.buildingAll,
  );

  const filteredTracking = dummyTrackingData
    .filter((track) => track.beacon_id === bleNumber)
    .filter((track) => {
      const trackTime = dayjs(track.timestamp); // or track.time if that's what you use
      return trackTime.isAfter(dayjs(startDate)) && trackTime.isBefore(dayjs(endDate));
    })
    .sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf());
  // console.log("Filtered Tracking: ",dummyTrackingData);
  const handleRowClick = (id: string) => {
    setSelectedRowId(id);
    const track = filteredTracking.find((t) => t.id === id);
    if (!track) return;
    const floorplan = floorplanData.find(
      (f) => f.id.toLowerCase() === track.floorplan_id.replace(/[{}]/g, '').toLowerCase(),
    );
    // console.log(floorplan);
    const floorImage = floorplan?.floor?.floorImage ?? null;
    // console.log(floorImage);
    setActiveFloorImage(floorImage);
    setFloorplanName(floorplan?.name ?? '');
    const pos = { x: track.pos_x * scale, y: track.pos_y * scale };
    setAnimatedPosition(pos);
  };
  useEffect(() => {
    if (!selectedRowId) return;

    const track = filteredTracking.find((t) => t.id === selectedRowId);
    if (!track) return;

    const floorplan = floorplanData.find(
      (f) => f.id.toLowerCase() === track.floorplan_id.replace(/[{}]/g, '').toLowerCase(),
    );

    const floorImage = floorplan?.floor?.floorImage ?? null;
    setActiveFloorImage(floorImage);
  }, [selectedRowId, filteredTracking, floorplanData]);

  useEffect(() => {
    if (activeFloorImage) {
      // console.log('activeFloorImage', activeFloorImage);
      const img = new window.Image();
      // img.crossOrigin = 'anonymous';
      img.src = `${BASE_URL}${activeFloorImage}`;
      // console.log('Image', img);
      img.onload = () => {
        setImageObj(img);
        setImageDimensions({ width: img.width, height: img.height });
        // console.log("Image Dimensions: ",imageDimensions)
      };
    }
  }, [activeFloorImage]);

  useEffect(() => {
    if (filteredTracking.length > 0) {
      const id = filteredTracking[0].id;
      handleRowClick(id);
    }
  }, []);

  const maxWidth = 900;
  const maxHeight = 500;
  const minHeight = 400;

  const scale = Math.min(maxWidth / imageDimensions.width, maxHeight / imageDimensions.height);
  // console.log("Scale: ",scale, " = ", maxWidth, " / ", imageDimensions.width, " = ", maxHeight, " / ", imageDimensions.height);
  const stageWidth = imageDimensions.width * scale;
  const stageHeight = imageDimensions.height * scale;

  // useEffect(() => {
  //   if (isPlaying && filteredTracking.length > 0) {
  //     const currentIndex = filteredTracking.findIndex((t) => t.id === selectedRowId);

  //     playbackInterval.current = setInterval(() => {
  //       setSelectedRowId((prevId) => {
  //         const currentIdx = filteredTracking.findIndex((t) => t.id === prevId);
  //         const nextIdx = currentIdx - 1;

  //         // If already at the last (newest), stop
  //         if (nextIdx < 0) {
  //           setIsPlaying(false);
  //           clearInterval(playbackInterval.current!);
  //           return prevId;
  //         }

  //         return filteredTracking[nextIdx].id;
  //       });
  //     }, 800); // adjust speed here
  //   }

  //   return () => {
  //     if (playbackInterval.current) {
  //       clearInterval(playbackInterval.current);
  //     }
  //   };
  // }, [isPlaying]);

  const MIN_DELAY = 500;

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
      if (!isPlaying) return; // ✅ Exit early if playback is paused

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

  const startPlayback = (currentId?: string) => {
    if (!isPlaying) return; // ✅ stop immediately if paused

    const currentIdx = filteredTracking.findIndex((t) => t.id === (currentId ?? selectedRowId));
    const nextIdx = currentIdx - 1;

    if (nextIdx < 0) {
      setIsPlaying(false);
      return;
    }

    const currentTrack = filteredTracking[currentIdx];
    const nextTrack = filteredTracking[nextIdx];

    const durationMs = Math.max(
      dayjs(nextTrack.timestamp).diff(dayjs(currentTrack.timestamp), 'millisecond'),
      MIN_DELAY,
    );

    const startX = currentTrack.pos_x * scale;
    const startY = currentTrack.pos_y * scale;
    const endX = nextTrack.pos_x * scale;
    const endY = nextTrack.pos_y * scale;

    animateToPosition(startX, startY, endX, endY, durationMs, () => {
      setSelectedRowId(nextTrack.id);
      startPlayback(nextTrack.id); // proceed to next
    });
  };

  useEffect(() => {
    if (isPlaying && filteredTracking.length > 0) {
      const startId =
        selectedRowId === filteredTracking[0].id ? filteredTracking.at(-1)!.id : selectedRowId;

      const startTrack = filteredTracking.find((t) => t.id === startId)!;
      setSelectedRowId(startTrack.id);
      setAnimatedPosition({
        x: startTrack.pos_x * scale,
        y: startTrack.pos_y * scale,
      });

      startPlayback(startId as string);
    }

    return () => {
      // just clear the timeout if playing was interrupted (e.g. via pause)
      if (playbackTimeout.current) {
        clearTimeout(playbackTimeout.current);
      }
    };
  }, [isPlaying]);

  const handlePause = () => {
    setIsPlaying(false);
    if (playbackTimeout.current) {
      clearTimeout(playbackTimeout.current);
      playbackTimeout.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };
  const TrackingRow = ({
    track,
    isSelected,
    isPlaying,
    onClick,
  }: {
    track: TrackType;
    isSelected: boolean;
    isPlaying: boolean;
    onClick: () => void;
  }) => {
    const theme = useTheme();
    const rowRef = useRef<HTMLTableRowElement>(null);

    useEffect(() => {
      if (isSelected && rowRef.current) {
        rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, [isSelected]);

    const floorplan = floorplanData.find(
      (f) => f.id.toLowerCase() === track.floorplan_id.replace(/[{}]/g, '').toLowerCase(),
    );
    const floor = floorplan?.floor;
    const building = buildingData.find((b) => b.id === floor?.buildingId);

    return (
      <TableRow
        ref={rowRef}
        onClick={onClick}
        hover
        sx={{
          cursor: 'pointer',
          backgroundColor: track.is_in_restricted_area
            ? theme.palette.error.light
            : isSelected
            ? isPlaying
              ? `${theme.palette.success.light} !important`
              : `${theme.palette.primary.light} !important`
            : 'inherit',
        }}
      >
        <TableCell>{floorplan?.name || '-'}</TableCell>
        <TableCell>{floor?.name || '-'}</TableCell>
        <TableCell>{building?.name || '-'}</TableCell>
        <TableCell>{track.is_in_restricted_area ? 'Yes' : 'No'}</TableCell>
        <TableCell>{dayjs(track.timestamp).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
      </TableRow>
    );
  };

  return (
    <Dialog
      open={openTrackDetail}
      onClose={() => setOpenTrackDetail(false)}
      maxWidth="xl"
      fullWidth
    >
      <DialogTitle>
        <Typography fontWeight={600}>
          {person.name} - Tracking Detail - {floorplanName}
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 200px)', // total height (adjust as needed)
          p: 0, // optional: remove extra padding
        }}
      >
        {/* Floor Image Section (Static) */}
        <Box
          sx={{
            border: '2px solid #000',
            height: stageHeight,
            mb: 2,
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Stage
            width={stageWidth > 0 ? stageWidth : maxWidth}
            height={stageHeight > 0 ? stageHeight : minHeight}
            x={(stageWidth/2-(animatedPosition?.x || 0)*1.5)}
            y={(stageHeight/2-(animatedPosition?.y || 0)*1.5)}
            scaleX={1.5}
            scaleY={1.5}
          >
            <Layer>
              {/* Render beacons here */}
              {selectedRowId &&
                (() => {
                  const track = filteredTracking.find((t) => t.id === selectedRowId);
                  if (!track) return null;
                  if (!imageObj) return null;
                  const floorplan = floorplanData.find(
                    (f) =>
                      f.id.toLowerCase() === track.floorplan_id.replace(/[{}]/g, '').toLowerCase(),
                  );
                  return (
                    <>
                      <KonvaImage
                        image={imageObj}
                        width={stageWidth > 0 ? stageWidth : maxWidth}
                        height={stageHeight > 0 ? stageHeight : minHeight}
                      />
                      <BeaconRenderer
                        key={track.id}
                        id={track.beacon_id}
                        x={animatedPosition?.x || track.pos_x * scale}
                        y={animatedPosition?.y || track.pos_y * scale}
                        area={track.area || '-'}
                        floorplan={floorplan?.name || '-'}
                        time={track.timestamp}
                        clickable={false}
                      />
                    </>
                  );
                })()}
            </Layer>
          </Stage>
        </Box>

        {/* Filter Section (Static) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
            px: 2,
            flexShrink: 0,
          }}
        >
          {/* Left: Play + Pause Buttons */}
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                // If already at newest (top), reset to oldest before playing
                if (selectedRowId === filteredTracking[0].id) {
                  setSelectedRowId(filteredTracking.at(-1)!.id); // last item
                }
                setIsPlaying(true);
              }}
              startIcon={<IconPlayerPlayFilled size={18} />}
              disabled={
                isPlaying ||
                filteredTracking.length === 0 ||
                selectedRowId === filteredTracking[0].id
              }
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

          {/* Right: Date Filters */}
          <Box display="flex" gap={2}>
            <TextField
              label="Date Start"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Date End"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Box>

        {/* Table Section (Scrollable) */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <TableContainer
            component={Paper}
            sx={{
              flexGrow: 1, // ✅ this makes it fill remaining space
              overflow: 'auto',
              border: '1px solid #000',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Floorplan</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Floor</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Building</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Restricted?</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Time</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTracking.map((track) => {
                  const normalizedSelectedId = selectedRowId?.replace(/[{}]/g, '').toLowerCase();
                  const normalizedTrackId = track.id.replace(/[{}]/g, '').toLowerCase();
                  const isSelected = normalizedSelectedId === normalizedTrackId;

                  return (
                    <TrackingRow
                      key={track.id}
                      track={track}
                      isSelected={isSelected}
                      isPlaying={isPlaying}
                      onClick={() => handleRowClick(track.id)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpenTrackDetail(false)} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrackingDetailPopup;
