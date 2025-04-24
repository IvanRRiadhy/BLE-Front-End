import React, { useEffect, useRef, useState } from 'react';
import { AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import { Box, FormLabel, Typography } from '@mui/material';
import Gates from './gate';
import { fetchFloorplans } from 'src/store/apps/tracking/FloorPlanSlice';
import { floorplanType } from 'src/types/tracking/floorplan';
import ZoomControls from 'src/components/shared/ZoomControls';

const Tracking: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const activeFloorplan = useSelector((state) =>
    state.floorplanReducer2.floorplanContent.toString(),
  );

  useEffect(() => {
    dispatch(fetchFloorplans());
  }, [dispatch]);
  useEffect(() => {
    setScale(1);
    setMinScale(0.5);
    setTranslate({ x: 0, y: 0 });
  }, [activeFloorplan]);

  const filterFloors = (floors: floorplanType[], fSearch: string) => {
    if (fSearch !== '')
      return floors.filter((t: any) =>
        t.name.toLocaleLowerCase().concat(' ').includes(fSearch.toLocaleLowerCase()),
      );
    return floors;
  };

  const floors = useSelector((state) =>
    filterFloors(state.floorplanReducer2.floorplans, state.floorplanReducer.floorplanSearch),
  );
  const activeFloorData = floors.find((floor) => floor.id === activeFloorplan);
  const activeGateways = (activeFloorData as floorplanType | null)?.gateways ?? [];

  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (activeFloorData?.imagesrc) {
      const img = new Image();
      img.src = activeFloorData.imagesrc;
      img.onload = () => {
        console.log('Image Loaded:', img.width, img.height); // Debug image dimensions

        setImgSize({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        console.error('Failed to load image:', activeFloorData.imagesrc); // Debug image loading error
      };
    }
  }, [activeFloorData]);

  //const MIN_SCALE = 1; // Minimum scale to prevent the image from becoming too small
  const MAX_SCALE = 2; // Maximum scale to prevent the image from becoming too large
  const [minScale, setMinScale] = useState(0.5);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isGateDragging, setIsGateDragging] = useState(false); // Track gate dragging
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && imgSize && imgSize.width > 1 && imgSize.height > 1) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        const widthRatio = containerWidth / imgSize.width;
        const heightRatio = containerHeight / imgSize.height;

        // Calculate minScale based on the larger ratio
        setMinScale(Math.min(widthRatio, heightRatio));

        //console.log('Container Dimensions:', containerWidth, containerHeight); // Debug container dimensions
        //console.log('Image Dimensions:', imgSize.width, imgSize.height); // Debug image dimensions
        //console.log('Calculated Min Scale:', minScale); // Debug min scale

        // Adjust the current scale if it's below the new minimum scale
        setScale((prevScale) => Math.max(prevScale, minScale));
      }
    };

    window.addEventListener('resize', handleResize);

    // Only call handleResize if imgSize is valid
    if (imgSize && imgSize.width > 1 && imgSize.height > 1) {
      handleResize();
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [imgSize]);

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

      const widthRatio = containerWidth / imgSize.width;
      const heightRatio = containerHeight / imgSize.height;
      const minScale = Math.min(widthRatio, heightRatio);

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
        x: Math.min(0, Math.max(minX, offsetX)),
        y: Math.min(0, Math.max(minY, offsetY)),
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
    const minScale = Math.min(widthRatio, heightRatio);

    const scaleChangeFactor = newScale / scale;

    // Calculate center positions
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // Calculate translate values to keep zoom centered
    const offsetX = centerX - (centerX - translate.x) * scaleChangeFactor;
    const offsetY = centerY - (centerY - translate.y) * scaleChangeFactor;

    const scaledWidth = imgSize.width * newScale;
    const scaledHeight = imgSize.height * newScale;

    const minX = Math.min(0, containerWidth - scaledWidth);
    const minY = Math.min(0, containerHeight - scaledHeight);

    setScale(newScale);
    setTranslate({
      x: Math.min(0, Math.max(minX, offsetX)),
      y: Math.min(0, Math.max(minY, offsetY)),
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
      const minScale = Math.min(widthRatio, heightRatio);

      //console.log('Resetting scale to minScale:', minScale); // Debug scale reset
      setScale(minScale);
    }
  }, [imgSize]); // Reset scale when imgSize changes

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: event.clientX - translate.x, y: event.clientY - translate.y };
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !imgSize || isGateDragging) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const scaledWidth = imgSize.width * scale;
    const scaledHeight = imgSize.height * scale;

    const minX = Math.min(0, containerWidth - scaledWidth); // Left boundary
    const maxX = 0; // Right boundary
    const minY = Math.min(0, containerHeight - scaledHeight); // Top boundary
    const maxY = 0; // Bottom boundary

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
      sx={{
        position: 'relative',
        width: '100%',
        height: { lg: 'calc(100vh - 250px)', sm: '100vh' }, // Adjust based on header/footer size
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // Allow scrolling
      }}
    >
      {/* ------------------------------------------- */}
      {/* Header Part */}
      {/* ------------------------------------------- */}
      <Box
        p={3}
        sx={{
          backgroundColor: activeFloorData ? `${activeFloorData.color}.light` : 'white',
        }}
        width="100%"
      >
        <FormLabel htmlFor="outlined-multiline-static">
          <Typography
            variant="h3"
            mb={1}
            fontWeight={800}
            sx={{ color: activeFloorData ? `${activeFloorData.color}.main` : 'text.primary' }}
          >
            {activeFloorData ? activeFloorData.name : 'Select a Floor'}
          </Typography>
        </FormLabel>
      </Box>

      {/* Zoomable Content */}
      <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
        {activeFloorData ? (
          <>
            <ZoomControls
              scale={scale}
              setScale={setScale}
              applyZoom={applyZoom}
              minScale={minScale}
              maxScale={MAX_SCALE}
            />
            <Box
              ref={containerRef}
              //onWheel={handleZoom}
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
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
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
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
              >
                <Gates
                  width={imgSize?.width ?? 0}
                  height={imgSize?.height ?? 0}
                  imageSrc={activeFloorData?.imagesrc}
                  setIsDragging={setIsGateDragging} // <-- Pass state to disable dragging
                  activeGateways={activeGateways}
                />
              </Box>
            </Box>
          </>
        ) : (
          <></>
        )}
      </Box>
    </Box>
  );
};

export default Tracking;
