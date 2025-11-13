import { BASE_URL } from 'src/utils/axios';
import React, { useEffect, useRef, useState } from 'react';
import { AppDispatch, useDispatch, useSelector, RootState } from 'src/store/Store';
import { Box, Switch, FormControlLabel, FormLabel, Divider, Typography } from '@mui/material';
import ZoomControls from 'src/components/shared/ZoomControls';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import {
  fetchStayOnAreaAlarms,
  fetchStayOnAreaAlarmsAll,
  StayOnAreaAlarmType,
} from 'src/store/apps/alarmsetting/stayonarea';
import EditStayOnAreaRenderer from './EditStayOnAreaRenderer';
import MouseDoubleClickIcon from 'src/assets/images/svgs/mouse-double-click-icon.svg';
import MouseLeftClickIcon from 'src/assets/images/svgs/mouse-left-click-icon.svg';
import MouseRightClickIcon from 'src/assets/images/svgs/mouse-right-click-icon.svg';
import ShiftButtonIcon from 'src/assets/images/svgs/shift-button-icon.svg';
import { defaultStayOnAreaFilter } from 'src/store/apps/defaultForm';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useStayOnAreaAlarms } from 'src/hooks/AlarmSetting/useStayOnArea';

const EditStayOnAreaFloorView = () => {
  const dispatch: AppDispatch = useDispatch();
  const { data: floorplans = [] } = useAllFloorplans();
  const { data: maskedAreas = [] } = useAllMaskedAreas();
  const stayOnAreaData = useSelector(
    (state: RootState) => state.StayOnAreaReducer.selectedStayOnAreaAlarm,
  );
  const activeFloorPlan = floorplans.find(
    (fp: FloorplanType) => fp.id === stayOnAreaData?.floorplanId,
  );
  const { data: stayOnAreaAlarms } = useStayOnAreaAlarms({
    ...defaultStayOnAreaFilter,
    filters: { FloorplanId: activeFloorPlan?.id }, // Dynamic filter
  });

  const stayOnAreaAlarmData = stayOnAreaAlarms?.data || [];
  const otherStayOnArea = stayOnAreaAlarmData.filter((alarm) => alarm.id !== stayOnAreaData?.id);
  const filteredArea = maskedAreas.filter(
    (area: MaskedAreaType) => area.floorplanId === activeFloorPlan?.id,
  );
  const drawStayOnArea = useSelector(
    (state: RootState) => state.StayOnAreaReducer.drawingStayOnArea,
  );
  const [showArea, setShowArea] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1); // Initial scale set to 1
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  //const MIN_SCALE = 1; // Minimum scale to prevent the image from becoming too small
  const MAX_SCALE = 2; // Maximum scale to prevent the image from becoming too large
  const [minScale] = useState(0.5);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [cursor, setCursor] = useState('grab');
  const [isDragging, setIsDragging] = useState('');
  const dragStart = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false); // State to track mouse hover
  const floorplanImage = activeFloorPlan?.floorplanImage
    ? activeFloorPlan.floorplanImage.startsWith('/Uploads/') // Check if the URL is already absolute
      ? `${BASE_URL}${activeFloorPlan.floorplanImage}`
      : activeFloorPlan.floorplanImage // Prepend BASE_URL for relative paths
    : undefined; // Fallback to default image if not available
  useEffect(() => {
    if (floorplanImage) {
      const img = new Image();
      img.src = floorplanImage;
      img.onload = () => {
        setImage(img);
        setImgSize({ width: img.width, height: img.height });
        // console.log(imgSize);
        // Center the image when it is loaded
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;

          // Dynamically calculate the scale to fit the image within the container

          // setScale(finalScale); // Set the initial scale

          // Calculate the initial translate values to center the image
          const offsetX = containerWidth / 4;
          const offsetY = containerHeight / 4;

          setTranslate({ x: offsetX, y: offsetY });
        }
      };
      img.onerror = () => {
        console.error('Failed to load image:', floorplanImage);
      };
    }
  }, [activeFloorPlan]);

  useEffect(() => {
    dispatch(fetchFloorplan());
    dispatch(fetchMaskedAreas());
    dispatch(
      fetchStayOnAreaAlarms({
        ...defaultStayOnAreaFilter,
        Length: 0,
        filters: { FloorplanId: activeFloorPlan?.id },
      }),
    );
  }, [dispatch]);

  const calculateImageDimensions = (
    containerWidth: number,
    containerHeight: number,
    imageWidth: number,
    imageHeight: number,
  ) => {
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = imageWidth / imageHeight;

    if (imageRatio > containerRatio) {
      // Image is wider than the container
      return {
        width: containerWidth,
        height: containerWidth / imageRatio,
        originalWidth: imageWidth,
        originalHeight: imageHeight,
      };
    } else {
      // Image is taller than the container
      return {
        width: containerHeight * imageRatio,
        height: containerHeight,
        originalWidth: imageWidth,
        originalHeight: imageHeight,
      };
    }
  };

  const handleZoom = (event: React.WheelEvent) => {
    event.preventDefault(); // Prevent default scrolling behavior
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

      const newScale = Math.min(Math.max(scale + delta, minScale), MAX_SCALE);

      //console.log('New Scale:', newScale); // Debug new scale
      const scaledWidth = imgSize.width * newScale;
      const scaledHeight = imgSize.height * newScale;

      // Calculate translation to keep zoom centered at mouse position
      const offsetX = mouseX - (mouseX - translate.x) * (newScale / scale);
      const offsetY = mouseY - (mouseY - translate.y) * (newScale / scale);

      const minX = Math.min(0, containerWidth - scaledWidth);
      const minY = Math.min(0, containerHeight - scaledHeight);
      // console.log('Unsaved Devices:', unsavedDevices);
      // Update the scale
      setScale(newScale);
      setTranslate({
        x: Math.max(minX, offsetX),
        y: Math.max(minY, offsetY),
      });
      //console.log('New Scale:', newScale);
      //console.log('New Translate:', translate);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      handleZoom(event as unknown as React.WheelEvent);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleZoom]);

  useEffect(() => {
    if (containerRef.current && imgSize && imgSize.width > 1 && imgSize.height > 1) {
      // const containerWidth = containerRef.current.clientWidth;
      // const containerHeight = containerRef.current.clientHeight;

      // const widthRatio = containerWidth / imgSize.width;
      // const heightRatio = containerHeight / imgSize.height;
      // setMinScale(Math.min(widthRatio, heightRatio));

      //console.log('Resetting scale to minScale:', minScale); // Debug scale reset
      setScale(minScale);
    }
  }, [imgSize]); // Reset scale when imgSize changes

  const handleMouseDown = (event: React.MouseEvent) => {
    if (cursor === 'grab') setCursor('grabbing');
    setIsPanning(true);
    dragStart.current = { x: event.clientX - translate.x, y: event.clientY - translate.y };

    // if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isPanning || !containerRef.current || !imgSize) return;
    let pannable = true;
    if (cursor === 'move') pannable = false;
    if (isDragging) pannable = false;
    // console.log('pannable: ', pannable);
    if (pannable) {
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
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (cursor === 'grabbing') setCursor('grab'); // Reset cursor
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
        cursor: cursor,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          width: 260,
          backgroundColor: 'rgba(37, 31, 31, 0.47)', // darker semi-trans card
          borderRadius: 2,
          boxShadow: 3,
          p: 2,
          color: 'white',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        {drawStayOnArea ? (
          <>
            <Box mt={1} display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <img src={MouseLeftClickIcon} alt="Left Click" style={{ width: 28, height: 28 }} />
              </Box>
              <FormLabel sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>
                Add 3 Points to create a new Area
              </FormLabel>
            </Box>

            <Box mt={2} mb={2} display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <img
                  src={MouseRightClickIcon}
                  alt="Right Click"
                  style={{ width: 28, height: 28 }}
                />
              </Box>
              <FormLabel sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>
                Cancel Add
              </FormLabel>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />
          </>
        ) : (
          <>
            {/* Create Node */}

            <Box display="flex" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1} mr={2}>
                <img src={MouseDoubleClickIcon} alt="Double Click" width={28} />
                <Typography variant="body2" fontWeight={600}>
                  or
                </Typography>
                <img src={ShiftButtonIcon} alt="Shift" width={28} />
                <Typography variant="body2" fontWeight={600}>
                  +
                </Typography>
                <img src={MouseLeftClickIcon} alt="Left Click" width={28} />
              </Box>
              <Typography variant="body2" fontWeight={600}>
                Create Node
              </Typography>
            </Box>

            {/* Delete Node */}
            <Box display="flex" alignItems="center" mb={2}>
              <img
                src={MouseRightClickIcon}
                alt="Right Click"
                width={28}
                style={{ marginRight: 12 }}
              />
              <Typography variant="body2" fontWeight={600}>
                Delete Node
              </Typography>
            </Box>
          </>
        )}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />

        {/* Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={showArea}
              onChange={() => setShowArea((prev) => !prev)}
              color="primary"
            />
          }
          label="Show Areas"
          sx={{ color: 'white' }}
        />
      </Box>

      {/* Sticky Overlay Toggle */}
      {/* <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          width: '240px',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 2,
          boxShadow: 2,
          p: 1,
        }}
      ></Box> */}
      {/* Zoomable Content */}
      <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
        {isHovered &&
          !isPanning && ( // Only show ZoomControls when hovered
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
            //transform: `scale(${scale})`,
            transformOrigin: 'center', // Zoom to the center
            // cursor: isPanning ? 'grabbing' : 'grab', // Change cursor on drag
          }}
        >
          <Box
            // onMouseEnter={() => {
            //   if (!isPanning) {
            //     document.body.style.cursor = 'grab'; // Ensure cursor resets when re-entering
            //   }
            // }}
            // onMouseLeave={() => {
            //   handleMouseUp(); // Ensure drag stops if mouse leaves container
            //   document.body.style.cursor = ''; // Reset when leaving
            // }}
            sx={{
              position: 'relative',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              // zIndex: 2,
              width: `100%`,
              height: `100%`,
              minWidth: '100%',
              minHeight: '100%',
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {/* Render the image */}
            {image && imgSize && containerRef.current && (
              <>
                <EditStayOnAreaRenderer
                  {...calculateImageDimensions(
                    containerRef.current.clientWidth,
                    containerRef.current.clientHeight,
                    imgSize.width,
                    imgSize.height,
                  )}
                  imageSrc={floorplanImage}
                  scale={activeFloorPlan?.meterPerPx || 1}
                  setIsDragging={setIsDragging}
                  setCursor={setCursor}
                  activeStayOnArea={stayOnAreaData as StayOnAreaAlarmType}
                  otherStayOnAreas={otherStayOnArea}
                  areas={filteredArea}
                  showAreas={showArea}
                />
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EditStayOnAreaFloorView;
