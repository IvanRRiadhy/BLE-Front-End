import React, { use, useEffect, useRef, useState } from 'react';
import { AppDispatch, useDispatch, useSelector, AppState } from 'src/store/Store';
import { Box, FormControlLabel, FormLabel, Switch, Typography, useTheme } from '@mui/material';
// import { fetchFloorplans } from 'src/store/apps/tracking/FloorPlanSlice';
import { floorplanType } from 'src/types/tracking/floorplan';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import FloorplanHouse from 'src/assets/images/masters/Floorplan/Floorplan-House.png';
import ZoomControls from 'src/components/shared/ZoomControls';
import DeviceRenderer from './Renderer/DeviceRenderer';
import { floorType, fetchFloors } from 'src/store/apps/crud/floor';
import { FloorplanType, fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchFloorplanDevices, FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { original } from '@reduxjs/toolkit';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';

const BASE_URL = 'http://192.168.1.116:5000';
const FloorView: React.FC<{
  activeFloorplan: string;
  zoomable: boolean;
  containerWidth: number; // New prop
  containerHeight: number; // New prop
}> = ({ activeFloorplan, zoomable, containerWidth, containerHeight }) => {
  const dispatch: AppDispatch = useDispatch();
    useEffect(() => {
    dispatch(fetchFloorplan());
    dispatch(fetchFloors());
    dispatch(fetchFloorplanDevices());
    dispatch(fetchMaskedAreas());
  }, [dispatch]);
  // console.log('testing', useSelector((state: AppState) => state.floorReducer.floors));
  const containerRef = useRef<HTMLDivElement>(null);
  const floor = useSelector((state: AppState) => state.floorReducer.floors);
  const floorplans = useSelector(
    (state: AppState) => state.floorplanReducer.floorplans,
  );
const actFloorplan = floorplans.find(
  (floorplan: FloorplanType) => floorplan.id === activeFloorplan,
);
  const activeFloorData = floor.find(
    (floor: floorType) => floor.id === actFloorplan?.floorId,
  );

      const Areas: MaskedAreaType[] = useSelector(
        (state: AppState) => state.maskedAreaReducer.maskedAreas,
      );
      const filteredArea = Areas.filter(
      (area) => area.floorplanId === activeFloorplan,
    );
    const [showArea, setShowArea] = useState(true);

  useEffect(() => {
    // console.log('FloorChanged:', floor);
  },[floor]);
  useEffect(() => {
    // console.log('Active Floorplan:', floorplans);
  }, [actFloorplan]);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1); // Initial scale set to 1
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  //const MIN_SCALE = 1; // Minimum scale to prevent the image from becoming too small
  const MAX_SCALE = 2; // Maximum scale to prevent the image from becoming too large
  const [minScale, setMinScale] = useState(0.5);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false); // State to track mouse hover
  const floorplanImage = activeFloorData?.floorImage
    ? activeFloorData.floorImage.startsWith('/Uploads/') // Check if the URL is already absolute
      ? `${BASE_URL}${activeFloorData.floorImage}`
      : activeFloorData.floorImage // Prepend BASE_URL for relative paths
    : FloorplanHouse; // Fallback to default image if not available

  const devices = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.floorplanDevices,
  );
  const [filteredDevices, setFilteredDevices] = useState<FloorplanDeviceType[]>([]);
  useEffect(() => {
    const filteredDevices = devices.filter(
      (device: FloorplanDeviceType) => device.floorplanId === activeFloorplan,
    );
    setFilteredDevices(filteredDevices);
    // console.log('Filtered Devices:', devices);
  }, [devices, activeFloorplan]);

  useEffect(() => {
    // console.log('floors:', floor);
    // console.log('activeFloorData:', activeFloorData);
    // console.log('activeFloorplan:', floorplans);
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
  }, [activeFloorData,floor]);

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

      const widthRatio = containerWidth / imgSize.width;
      const heightRatio = containerHeight / imgSize.height;
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

  const applyZoom = (newScale: number) => {
    if (!containerRef.current || !imgSize) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const widthRatio = containerWidth / imgSize.width;
    const heightRatio = containerHeight / imgSize.height;
    // setMinScale(Math.min(widthRatio, heightRatio));

    const scaleChangeFactor = newScale / scale;

    // Calculate center positions
    const imgCenterX = imgSize.width / 2;
    const imgCenterY = imgSize.height / 2;
    const centerX = imgCenterX * scale + translate.x;
    const centerY = containerHeight * scale + translate.y;

    // Calculate translate values to keep zoom centered
    const offsetX = centerX - (centerX - translate.x) * scaleChangeFactor;
    const offsetY = centerY - (centerY - translate.y) * scaleChangeFactor;

    const scaledWidth = imgSize.width * newScale;
    const scaledHeight = imgSize.height * newScale;

    const minX = Math.min(0, containerWidth - scaledWidth);
    const minY = Math.min(0, containerHeight - scaledHeight);

    setScale(newScale);
    setTranslate({
      x: Math.max(minX, Math.min(0, offsetX)),
      y: Math.max(minY, Math.min(0, offsetY)),
    });
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
    if (containerRef.current && imgSize && imgSize.width > 1 && imgSize.height > 1) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const widthRatio = containerWidth / imgSize.width;
      const heightRatio = containerHeight / imgSize.height;
      // setMinScale(Math.min(widthRatio, heightRatio));

      //console.log('Resetting scale to minScale:', minScale); // Debug scale reset
      setScale(minScale);
    }
  }, [imgSize]); // Reset scale when imgSize changes

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
    const maxX = scaledWidth; // Right boundary
    const minY = Math.min(-scaledHeight, containerHeight - scaledHeight); // Top boundary
    const maxY = scaledHeight; // Bottom boundary

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
            //transform: `scale(${scale})`,
            transformOrigin: 'center', // Zoom to the center
            cursor: isDragging ? 'grabbing' : 'grab', // Change cursor on drag
          }}
        >
          <Box
            onMouseEnter={() => {
              if (!isDragging) {
                document.body.style.cursor = 'grab'; // Ensure cursor resets when re-entering
              }
            }}
            onMouseLeave={() => {
              handleMouseUp(); // Ensure drag stops if mouse leaves container
              document.body.style.cursor = ''; // Reset when leaving
            }}
            sx={{
              position: 'relative',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
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
              // <KonvaImage
              //   image={image}
              //   {...calculateImageDimensions(
              //     containerRef.current.clientWidth,
              //     containerRef.current.clientHeight,
              //     imgSize.width,
              //     imgSize.height,
              //   )}
              // />
              <DeviceRenderer
                {...calculateImageDimensions(
                  containerRef.current.clientWidth,
                  containerRef.current.clientHeight,
                  imgSize.width,
                  imgSize.height,
                )}
                devices={filteredDevices}
                imageSrc={floorplanImage}
                scale={scale}
                                  areas = {filteredArea}
                  showAreas={showArea}
                  topic={activeFloorplan.toUpperCase()}
              />
            )}
            {/* </Layer>
            </Stage> */}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FloorView;
