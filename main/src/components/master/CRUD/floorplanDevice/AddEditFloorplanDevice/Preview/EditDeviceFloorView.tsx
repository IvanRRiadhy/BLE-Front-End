import React, { useEffect, useRef, useState } from 'react';
import { AppDispatch, useDispatch, useSelector, AppState } from 'src/store/Store';
import { Box, FormLabel, Typography, useTheme, Switch, FormControlLabel } from '@mui/material';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import {
  fetchFloorplanDevices,
  FloorplanDeviceType,
  SelectFloorplanDevice,
} from 'src/store/apps/crud/floorplanDevice';
import ZoomControls from 'src/components/shared/ZoomControls';
import EditDeviceRenderer from './EditDeviceRenderer';
import FloorplanHouse from 'src/assets/images/masters/Floorplan/Floorplan-House.png';
import { Layer, Stage, Image as KonvaImage } from 'react-konva';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';

const BASE_URL = 'http://192.168.1.116:5000'; // Adjust this to your actual base URL
const EditDeviceFloorView: React.FC<{
  zoomable: boolean;
}> = ({ zoomable }) => {
  const dispatch: AppDispatch = useDispatch();
  //   const floors = useSelector((state: AppState) => state.floorReducer.floors);
  const activeFloorPlan = useSelector(
    (state: AppState) => state.floorplanReducer.selectedFloorplan,
  );
  const activeFloorData = activeFloorPlan?.floor;
  const activeDevice = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.selectedFloorplanDevice,
  );
  const unsavedDevices = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.unsavedFloorplanDevices,
  );
  const editingDevice = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );
    const Areas: MaskedAreaType[] = useSelector(
      (state: AppState) => state.maskedAreaReducer.maskedAreas,
    );
    const filteredArea = Areas.filter(
    (area) => area.floorplanId === activeFloorPlan?.id,
  );
  // const filteredUnsavedDevices = unsavedDevices.filter(
  //   (device) => device.floorplanId === activeFloorPlan?.id,
  // );
  const [showArea, setShowArea] = useState(true);

  const [filteredUnsavedDevices, setFilteredUnsavedDevices] = useState<FloorplanDeviceType[]>([]);

  useEffect(() => {
    // console.log('Unsaved Devices:', unsavedDevices);
    // console.log('Active Floor Plan:', activeFloorPlan?.id);
    const filteredDevices = unsavedDevices.filter(
      (device: FloorplanDeviceType) => device.floorplanId === activeFloorPlan?.id,
    );
    setFilteredUnsavedDevices(filteredDevices);
  }, [unsavedDevices, activeFloorPlan]);  

  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1); // Initial scale set to 1
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  //const MIN_SCALE = 1; // Minimum scale to prevent the image from becoming too small
  const MAX_SCALE = 2; // Maximum scale to prevent the image from becoming too large
  const [minScale, setMinScale] = useState(0.5);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState('');
  const dragStart = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false); // State to track mouse hover
  const floorplanImage = activeFloorData?.floorImage
    ? activeFloorData.floorImage.startsWith('/Uploads/') // Check if the URL is already absolute
      ? `${BASE_URL}${activeFloorData.floorImage}`
      : activeFloorData.floorImage // Prepend BASE_URL for relative paths
    : FloorplanHouse; // Fallback to default image if not available
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
          const widthRatio = containerWidth / img.width;
          const heightRatio = containerHeight / img.height;
          const calculatedScale = Math.min(widthRatio, heightRatio);

          // Ensure the scale doesn't make the image smaller than the container
          const finalScale = Math.max(calculatedScale, 1); // Use 1 as the minimum scale

          // setScale(finalScale); // Set the initial scale

          // Calculate the initial translate values to center the image
          const offsetX = containerWidth / 4;
          const offsetY = containerHeight / 4;

          // console.log('Container Width:', containerWidth);
          // console.log('Container Height:', containerHeight);
          // console.log('Image Width:', img.width);
          // console.log('Image Height:', img.height);
          // console.log('Min Scale:', minScale);
          // console.log('OffsetX:', offsetX);
          // console.log('OffsetY:', offsetY);
          setTranslate({ x: offsetX, y: offsetY });
        }
      };
      img.onerror = () => {
        console.error('Failed to load image:', floorplanImage);
      };
    }
  }, [activeFloorData]);

  useEffect(() => {
    dispatch(fetchFloorplan());
    dispatch(fetchFloors());
    dispatch(fetchFloorplanDevices());
    dispatch(fetchMaskedAreas());
  }, [dispatch]);
  // useEffect(() => {
  //   const handleResize = () => {
  //     if (containerRef.current && imgSize && imgSize.width > 1 && imgSize.height > 1) {
  //       const containerWidth = containerRef.current.clientWidth;
  //       const containerHeight = containerRef.current.clientHeight;

  //       const widthRatio = containerWidth / imgSize.width;
  //       const heightRatio = containerHeight / imgSize.height;

  //       // Calculate minScale based on the larger ratio
  //       const minScale = Math.min(widthRatio, heightRatio);

  //       // Adjust the current scale if it's below the new minimum scale
  //       setScale((prevScale) => Math.max(prevScale, minScale));
  //     }
  //   };

  //   window.addEventListener('resize', handleResize);

  //   // Only call handleResize if imgSize is valid
  //   if (imgSize && imgSize.width > 1 && imgSize.height > 1) {
  //     handleResize();
  //   }

  //   return () => window.removeEventListener('resize', handleResize);
  // }, [imgSize]);

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
      };
    } else {
      // Image is taller than the container
      return {
        width: containerHeight * imageRatio,
        height: containerHeight,
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

      // const widthRatio = containerWidth / imgSize.width;
      // const heightRatio = containerHeight / imgSize.height;
      // setMinScale(Math.min(widthRatio, heightRatio));

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
    setIsPanning(true);
    dragStart.current = { x: event.clientX - translate.x, y: event.clientY - translate.y };

    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isPanning || !containerRef.current || !imgSize || !zoomable) return;
    let pannable = true;

    if (editingDevice && isDragging === editingDevice?.id) {
      pannable = false;
    }
    if (pannable) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const scaledWidth = imgSize.width * scale;
      const scaledHeight = imgSize.height * scale;

      const minX = Math.min(-scaledWidth, containerWidth - scaledWidth); // Left boundary
      const maxX = scaledWidth; // Right boundary
      const minY = Math.min(-scaledHeight, containerHeight - scaledHeight); // Top boundary
      const maxY = scaledHeight; // Bottom boundary

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
    if (containerRef.current) containerRef.current.style.cursor = 'grab'; // Reset cursor
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
        cursor: isPanning ? 'grabbing' : 'grab',
      }}
    >
      {/* Sticky Overlay Toggle */}
      <Box
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
      </Box>
      {/* Zoomable Content */}
      <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
        {isHovered &&
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
            {/* <Stage
              width={containerRef.current ? containerRef.current.clientWidth : 800}
              height={containerRef.current ? containerRef.current.clientHeight : 600}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <Layer> */}
            {/* Render the image */}
            {image && imgSize && containerRef.current && (
              <>
                <EditDeviceRenderer
                  {...calculateImageDimensions(
                    containerRef.current.clientWidth,
                    containerRef.current.clientHeight,
                    imgSize.width,
                    imgSize.height,
                  )}
                  imageSrc={floorplanImage}
                  scale={scale}
                  devices={filteredUnsavedDevices}
                  activeDevice={activeDevice}
                  setIsDragging={setIsDragging}
                  areas = {filteredArea}
                  showAreas={showArea}
                />
              </>
            )}
            {/* </Layer>
            </Stage> */}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EditDeviceFloorView;
