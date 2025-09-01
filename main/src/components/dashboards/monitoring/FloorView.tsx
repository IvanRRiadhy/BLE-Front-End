import { BASE_URL } from 'src/utils/axios';
import React, { use, useEffect, useRef, useState } from 'react';
import { AppDispatch, useDispatch, useSelector, RootState } from 'src/store/Store';
import {
  Box,
  Button,
  Dialog,
  FormControlLabel,
  Grid2 as Grid,
  Switch,
  Typography,
} from '@mui/material';
// import { fetchFloorplans } from 'src/store/apps/tracking/FloorPlanSlice';
import ZoomControls from 'src/components/shared/ZoomControls';
import DeviceRenderer from './Renderer/DeviceRenderer';
import { floorType, fetchFloors } from 'src/store/apps/crud/floor';
import { FloorplanType, fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchFloorplanDevices, FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { RefreshTrigger, SetSelectedBeacon } from 'src/store/apps/tracking/Beacon';
import axiosServices from 'src/utils/axios';
import { AlarmType } from 'src/store/apps/tracking/Alarm';
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchVisitor, VisitorType } from 'src/store/apps/crud/visitor';
import BeaconDetailPopup from './Popup/BeaconDetailPopup';
import TrackingDetailPopup from './Popup/TrackingDetailPopup';

const ALARM_URL = 'http://192.168.1.116:3300';
const FloorView: React.FC<{
  activeFloorplan: string;
  zoomable: boolean;
  containerWidth: number;
  containerHeight: number;
  activeMaskedArea?: string;
  screenSettings: { scale: number; translateX: number; translateY: number };
}> = ({ activeFloorplan, activeMaskedArea, zoomable, screenSettings }) => {
  const dispatch: AppDispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchFloorplan());
    dispatch(fetchFloors());
    dispatch(fetchFloorplanDevices());
    dispatch(fetchMaskedAreas());
    dispatch(fetchMembers());
    dispatch(fetchVisitor());
  }, [dispatch]);

  //DUMMY
  const [dummyAlarm, setDummyAlarm] = useState<AlarmType>();
  const memberList = useSelector((state: RootState) => state.memberReducer.members);
  const visitorList = useSelector((state: RootState) => state.visitorReducer.visitors);
  const [open, setOpen] = useState(false);

  // console.log('testing', useSelector((state: RootState) => state.floorReducer.floors));
  const containerRef = useRef<HTMLDivElement>(null);
  const floor = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplans = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const actFloorplan = floorplans.find(
    (floorplan: FloorplanType) => floorplan.id === activeFloorplan,
  );
  const activeFloorData = floor.find((floor: floorType) => floor.id === actFloorplan?.floorId);

  const Areas: MaskedAreaType[] = useSelector(
    (state: RootState) => state.maskedAreaReducer.maskedAreaAll,
  );
  const filteredArea = Areas.filter((area) => area.floorplanId === activeFloorplan);
  const [showArea, setShowArea] = useState(true);
  const [showGates, setShowGates] = useState(true);
  const [focusArea, setFocusArea] = useState<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  useEffect(() => {
    // console.log('FloorChanged:', floor);
  }, [floor]);
  useEffect(() => {
    // console.log('Active Floorplan:', floorplans);
  }, [actFloorplan]);

  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(screenSettings.scale); // Initial scale set to 1
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  //const MIN_SCALE = 1; // Minimum scale to prevent the image from becoming too small
  const MAX_SCALE = 4; // Maximum scale to prevent the image from becoming too large
  const [minScale] = useState(0.5);
  const [translate, setTranslate] = useState({
    x: screenSettings.translateX,
    y: screenSettings.translateY,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false); // State to track mouse hover
  const floorplanImage = activeFloorData?.floorImage
    ? activeFloorData.floorImage.startsWith('/Uploads/') // Check if the URL is already absolute
      ? `${BASE_URL}${activeFloorData.floorImage}`
      : activeFloorData.floorImage // Prepend BASE_URL for relative paths
    : 'No Active Floorplan'; // Fallback to default image if not available

  const devices = useSelector((state: RootState) => state.floorplanDeviceReducer.floorplanDeviceAll);
  const [filteredDevices, setFilteredDevices] = useState<FloorplanDeviceType[]>([]);

  //Popup State
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [openTrackDetail, setOpenTrackDetail] = useState(false);
  const trackingBeacon = useSelector((state: RootState) => state.BeaconReducer.trackingBeacon);
  const selectedBeacon = useSelector((state: RootState) => state.BeaconReducer.selectedBeacon);

  const handleSelectBeacon = (info: {
    id: string;
    area: string;
    floorplan: string;
    time: string;
  }) => {
    dispatch(SetSelectedBeacon({active: true, ...info}));
  };
  useEffect(() => {
    if(selectedBeacon.active){
      setDetailDialogOpen(true);
    }
  },[selectedBeacon])

  useEffect(() => {
    const filteredDevices = devices.filter(
      (device: FloorplanDeviceType) => device.floorplanId === activeFloorplan,
    );
    setFilteredDevices(filteredDevices);
  }, [devices, activeFloorplan]);

  useEffect(() => {
    dispatch(RefreshTrigger());

    if (floorplanImage) {
      const img = new Image();
      img.src = floorplanImage;
      img.onload = () => {
        setImage(img);
        setImgSize({ width: img.width, height: img.height });
        // Center the image when it is loaded
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;


          // Calculate the initial translate values to center the image
          const offsetX = containerWidth / 2;
          const offsetY = containerHeight / 2;

          setTranslate({
            x: screenSettings?.translateX || offsetX,
            y: screenSettings?.translateY || offsetY,
          });
          console.log(screenSettings);
          // setTranslate({ x: offsetX, y: offsetY });
        }
      };
      img.onerror = () => {
        console.error('Failed to load image:', floorplanImage);
      };
    }
  }, [activeFloorData, floor]);

  const calculateImageDimensions = (
    containerWidth: number,
    containerHeight: number,
    imageWidth: number,
    imageHeight: number,
  ) => {
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = imageWidth / imageHeight;
    // console.log('image original size:', imageWidth, imageHeight);
    if (imageRatio > containerRatio) {
      // Image is wider than the container
      return {
        width: containerWidth,
        height: containerWidth / imageRatio,
        scaleX: imageWidth / containerWidth,
        scaleY: imageHeight / (containerWidth / imageRatio),
        originalWidth: imageWidth,
        originalHeight: imageHeight,
      };
    } else {
      // Image is taller than the container
      return {
        width: containerHeight * imageRatio,
        height: containerHeight,
        scaleX: imageWidth / (containerHeight * imageRatio),
        scaleY: imageHeight / containerHeight,
        originalWidth: imageWidth,
        originalHeight: imageHeight,
      };
    }
  };

  const handleZoom = (event: React.WheelEvent) => {
    event.preventDefault(); // Prevent default scrolling behavior
    if (!zoomable) return; // Prevent zooming if zoomable is false
    if (containerRef.current && imgSize && imgSize.width > 1 && imgSize.height > 1) {
      const delta = event.deltaY * -0.001; // Adjust zoom sensitivity
      const rect = containerRef.current.getBoundingClientRect();
      if (!imgSize || !containerRef.current) return;

      // Mouse position relative to the container
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      // Calculate the new scale
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      // setMinScale(Math.min(widthRatio, heightRatio));
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;

      const newScale = Math.min(Math.max(scale + delta, minScale), MAX_SCALE);
      const scaleRatio = newScale / scale;
      //console.log('New Scale:', newScale); // Debug new scale
      const scaledWidth = imgSize.width * newScale;
      const scaledHeight = imgSize.height * newScale;
      const newTranslateX = translate.x - dx * (scaleRatio - 1);
      const newTranslateY = translate.y - dy * (scaleRatio - 1);

      // Calculate translation to keep zoom centered at mouse position
      const offsetX = mouseX - (mouseX - translate.x) * (newScale / scale);
      const offsetY = mouseY - (mouseY - translate.y) * (newScale / scale);
      console.log('MouseX:', mouseX);
      console.log('MouseY:', mouseY);
      console.log('translate:', translate);
      console.log('Scale: ', newScale, scale);

      const minX = Math.min(0, containerWidth - scaledWidth);
      const minY = Math.min(0, containerHeight - scaledHeight);

      // Update the scale
      setScale(newScale);
      setTranslate({
        x: Math.max(minX, newTranslateX),
        y: Math.max(minY, newTranslateY),
      });
      console.log('OffsetX:', offsetX);
      console.log('OffsetY:', offsetY);
    }
  };

  const getClipPathFromFocusArea = (
    focusArea: { minX: number; maxX: number; minY: number; maxY: number } | null,
    imgWidth: number,
    imgHeight: number,
    originalWidth: number,
    originalHeight: number,
    padding = 15,
  ) => {
    if (!focusArea) return undefined;
    const scaleX = originalWidth / imgWidth;
    const scaleY = originalHeight / imgHeight;
    // console.log('Focus Area:', focusArea);
    // console.log('Image Size:', imgWidth, imgHeight, scaleX, scaleY);
    const top = Math.max(focusArea.minY / scaleY - padding, 0);
    const left = Math.max(focusArea.minX / scaleX - padding, 0);
    const bottom = Math.max(imgHeight - (focusArea.maxY / scaleY + padding), 0);
    const right = Math.max(imgWidth - (focusArea.maxX / scaleX + padding), 0);
    // console.log('top:', top, 'left:', left, 'bottom:', bottom, 'right:', right);
    return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault(); // Now it works without errors
      handleZoom(event as unknown as React.WheelEvent);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleZoom]);


  useEffect(() => {
    if (!activeMaskedArea) {
      setFocusArea(null);
      return;
    }

    const targetArea = filteredArea.find((a) => a.id === activeMaskedArea);
    if (!targetArea || !targetArea.areaShape) return;

    try {
      const shape: { x_px: number; y_px: number }[] = JSON.parse(targetArea.areaShape);
      if (!shape.length) return;

      const xList = shape.map((p) => p.x_px);
      const yList = shape.map((p) => p.y_px);

      const minX = Math.min(...xList);
      const maxX = Math.max(...xList);
      const minY = Math.min(...yList);
      const maxY = Math.max(...yList);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      // console.log("Area Shape: ", targetArea.areaShape);
      // console.log('Focus Area:', { minX, maxX, minY, maxY, centerX, centerY });
      const newFocus = { minX, maxX, minY, maxY, centerX, centerY };

      // Hindari setState jika data tidak berubah
      const isSame =
        focusArea &&
        focusArea.minX === newFocus.minX &&
        focusArea.maxX === newFocus.maxX &&
        focusArea.minY === newFocus.minY &&
        focusArea.maxY === newFocus.maxY &&
        focusArea.centerX === newFocus.centerX &&
        focusArea.centerY === newFocus.centerY;

      if (!isSame) setFocusArea(newFocus);
    } catch (err) {
      console.error('Invalid areaShape JSON:', targetArea.areaShape);
    }
  }, [activeMaskedArea, filteredArea, focusArea]);

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: event.clientX - translate.x, y: event.clientY - translate.y };

    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !imgSize || !zoomable) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const scaledWidth = imgSize.width * scale;
    const scaledHeight = imgSize.height * scale;

    const minX = Math.min(-scaledWidth, containerWidth - scaledWidth); // Left boundary
    const maxX = containerWidth; // Right boundary
    const minY = Math.min(-scaledHeight, containerHeight - scaledHeight); // Top boundary
    const maxY = containerHeight; // Bottom boundary

    const newX = event.clientX - dragStart.current.x;
    const newY = event.clientY - dragStart.current.y;

    setTranslate({
      x: Math.min(maxX, Math.max(minX, newX)), // Clamp X
      y: Math.min(maxY, Math.max(minY, newY)), // Clamp Y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (containerRef.current) containerRef.current.style.cursor = 'grab'; // Reset cursor
  };

  if (floorplanImage === 'No Active Floorplan') {
    return (
      <Grid
        container
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Grid size={{ xs: 12 }}>
          <Typography variant="h4" fontStyle="bold" fontWeight={900} mt={0.5}>
            Monitoring Dashboard
          </Typography>
          <Typography variant="h6" fontStyle="bold" fontWeight={900} mt={0.5}>
            Please select a Grid
          </Typography>
        </Grid>
      </Grid>
    );
  }

  const handleFetchDummyBeacon = async () => {
    try {
      const response = await axiosServices.get(`${ALARM_URL}/dummy-beacon`);
      console.log('Dummy Beacon Data:', response.data);
      setDummyAlarm(response.data);
      setOpen(true);
    } catch (error) {
      console.error('Error fetching dummy beacon:', error);
    }
  };

  const getName = (bleNuber: string) => {
    let name = '';
    name =
      memberList.find((member: memberType) => member.bleCardNumber === bleNuber)?.name ??
      visitorList.find((visitor: VisitorType) => visitor.bleCardNumber === bleNuber)?.name ??
      'Unknown Person';
    return name;
  };

  const handleClose = () => {
    setOpen(false);
    setDummyAlarm(undefined);
  };

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)} // Show ZoomControls on mouse enter
      onMouseLeave={() => setIsHovered(false)} // Hide ZoomControls on mouse leave
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // Allow scrolling
        // cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Sticky Overlay Toggle */}
      {isHovered && !isDragging && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            width: 'fit-content',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 2,
            boxShadow: 2,
            p: 1,
            display: 'flex',
            flexDirection: 'column', // Stack children vertically
            gap: 1,
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={showArea}
                onChange={() => setShowArea((prev) => !prev)}
                color="primary"
              />
            }
            label="Show Areas"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showGates}
                onChange={() => setShowGates((prev) => !prev)}
                color="primary"
              />
            }
            label="Show Gateways"
          />
          <Button variant="contained" color="primary" onClick={handleFetchDummyBeacon}>
            Alarm Trigger
          </Button>
        </Box>
      )}
      {/* Zoomable Content */}
      <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
        {isHovered &&
          !isDragging &&
          zoomable && ( // Only show ZoomControls when hovered
            <ZoomControls
              scale={scale}
              setScale={setScale}
              applyZoom={(newScale) => setScale(newScale)}
              minScale={0.5}
              maxScale={2}
            />
          )}
        <Box
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          //onWheelCapture={handleZoom}
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: '100vw',
            height: '100%',
            maxHeight: 'calc(100vh -200px)',
            display: 'flex',
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            // transform: `scale(${scale})`,
            // transformOrigin: 'center', // Zoom to the center
            cursor: isDragging ? 'grabbing' : 'grab', // Change cursor on drag
          }}
        >
          {/* <Stage
              width={containerRef.current ? containerRef.current.clientWidth : 800}
              height={containerRef.current ? containerRef.current.clientHeight : 600}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <Layer> */}
          {/* Render the image */}
          {image &&
            imgSize &&
            containerRef.current &&
            (() => {
              // Get calculated dimensions
              const dims = calculateImageDimensions(
                containerRef.current.clientWidth,
                containerRef.current.clientHeight,
                imgSize.width,
                imgSize.height,
              );
              const clipPath = getClipPathFromFocusArea(
                focusArea,
                dims.width,
                dims.height,
                dims.originalWidth,
                dims.originalHeight,
              );

              return (
                <Box
                  onMouseEnter={() => {
                    if (!isDragging) {
                      document.body.style.cursor = 'grab';
                    }
                  }}
                  onMouseLeave={() => {
                    handleMouseUp();
                    document.body.style.cursor = '';
                  }}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: dims.width,
                    height: dims.height,
                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    overflow: 'hidden',
                    ...(clipPath && {
                      clipPath,
                      WebkitClipPath: clipPath, // Safari support
                    }),
                  }}
                >
                  <DeviceRenderer
                    {...dims}
                    devices={filteredDevices}
                    imageSrc={floorplanImage}
                    scale={scale}
                    areas={filteredArea}
                    showAreas={showArea}
                    showGates={showGates}
                    topic={`tracking/${activeFloorplan.toUpperCase()}`}
                    onSelectBeacon={handleSelectBeacon}
                    detailDialogOpen={detailDialogOpen}
                    setDetailDialogOpen={setDetailDialogOpen}
                    openTrackDetail={openTrackDetail}
                    setOpenTrackDetail={setOpenTrackDetail}
                    selectedBeaconId={selectedBeacon?.id ?? null}
                  />
                </Box>
              );
            })()}
          {/* </Layer>
            </Stage> */}
        </Box>
      </Box>
      {dummyAlarm && (
        <Dialog
          open={open}
          onClose={handleClose}
          PaperProps={{
            sx: {
              backgroundColor: 'transparent', // transparent outer shell
              boxShadow: 'none',
              overflow: 'visible',
            },
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(to bottom, #c62828, #b71c1c)',
              color: 'white',
              borderRadius: 4,
              px: 6, // lebih lebar horizontal padding
              pt: 4,
              pb: 8,
              minWidth: { xs: '90vw', sm: 480, md: 600 }, // responsive minWidth
              maxWidth: '90vw',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* Optional Icon */}
            {/* <VolumeUpIcon sx={{ fontSize: 32, mb: 1 }} /> */}

            <Typography variant="h2" fontWeight="bold" letterSpacing={3} mb={2}>
              ALARM TRIGGERED
            </Typography>

            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                display: 'inline-block',
                px: 3,
                py: 1,
                borderRadius: '24px',
                mb: 2,
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              🔔 Triggered by{' '}
              <Box component="span" fontWeight="bold" fontSize="1.125rem">
                {getName(dummyAlarm?.beaconId)}
              </Box>
            </Box>

      <Typography variant="h6" mb={3}>
        Card ID:{' '}
        <Box component="span" fontWeight="bold" fontSize="1.1rem">
          {dummyAlarm?.beaconId}
        </Box>
      </Typography>
      <Typography variant="h6" mb={3}>
        Area:{' '}
        <Box component="span" fontWeight="bold" fontSize="1.1rem">
          {dummyAlarm?.maskedAreaName}
        </Box>{' '}
        |{' '}
        <Box component="span" fontWeight="bold" fontSize="1.1rem">
          {dummyAlarm?.floorplanName}
        </Box>
      </Typography>

            {/* White pill-shaped button bar */}
            <Box
              sx={{
                position: 'absolute',
                bottom: '-24px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'white',
                borderRadius: '40px',
                px: 5,
                py: 1.5,
                boxShadow: 2,
              }}
            >
              <Button
                onClick={handleClose}
                variant="text"
                sx={{
                  backgroundColor: '#fff',
                  color: 'red',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  textTransform: 'none',
                  borderRadius: '20px',
                  px: 5,
                  '&:hover': {
                    backgroundColor: '#b71c1c',
                    color: 'white',
                  },
                }}
              >
                Disarm
              </Button>
            </Box>
          </Box>
        </Dialog>
      )}
      {selectedBeacon &&
        (() => {
          const member = memberList.find((m) => m.bleCardNumber === selectedBeacon.id);
          const visitor = visitorList.find((v) => v.bleCardNumber === selectedBeacon.id);
          const person = member || visitor;

          return (
            <>
              <BeaconDetailPopup
                bleNumber={selectedBeacon.id}
                memberDetail={member}
                visitorDetail={visitor}
                detailDialogOpen={detailDialogOpen}
                setDetailDialogOpen={setDetailDialogOpen}
                setOpenTrackDetail={setOpenTrackDetail}
                area={selectedBeacon.area}
                floorplan={selectedBeacon.floorplan}
                time={selectedBeacon.time}
              />
              {person && (
                <TrackingDetailPopup
                  bleNumber={selectedBeacon.id}
                  person={person}
                  personId={person.id}
                  openTrackDetail={openTrackDetail}
                  setOpenTrackDetail={setOpenTrackDetail}
                />
              )}
            </>
          );
        })()}
    </Box>
  );
};

export default FloorView;
