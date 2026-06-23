import { BASE_URL } from 'src/utils/axios';
import React, { useEffect, useRef, useState } from 'react';
import { AppDispatch, useDispatch, useSelector, RootState } from 'src/store/Store';
import { Box } from '@mui/material';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import TrackingPositionRenderer from './TrackingPositionRenderer';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';

interface TrackingPositionFloorViewProps {
  floorplanId: string;
  positionPxX: number;
  positionPxY: number;
  visitorId?: string;
  memberId?: string;
  markerColor?: string;
}

const TrackingPositionFloorView: React.FC<TrackingPositionFloorViewProps> = ({
  floorplanId,
  positionPxX,
  positionPxY,
  visitorId,
  memberId,
  markerColor,
}) => {
  // const dispatch: AppDispatch = useDispatch();
  const floorplans = useAllFloorplans().data ?? [];
  const maskedAreas = useAllMaskedAreas().data ?? [];

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);

  const activeFloorplan = floorplans.find((f: FloorplanType) => f.id === floorplanId);
  const filteredAreas = maskedAreas.filter((a: MaskedAreaType) => a.floorplanId === floorplanId);

  const floorplanImage = activeFloorplan?.floorplanImage
    ? activeFloorplan.floorplanImage.startsWith('/Uploads/')
      ? `${BASE_URL}${activeFloorplan.floorplanImage}`
      : activeFloorplan.floorplanImage
    : '';

  // Load resources
  // useEffect(() => {
  //   dispatch(fetchFloorplan());
  //   // dispatch(fetchMaskedAreas());
  // }, [dispatch]);

  useEffect(() => {
    if (floorplanImage) {
      const image = new Image();
      image.src = floorplanImage;
      image.onload = () => {
        setImg(image);
        setImgSize({ width: image.width, height: image.height });
      };
    }
  }, [floorplanImage]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {img && imgSize && (
        <TrackingPositionRenderer
          width={imgSize.width}
          height={imgSize.height}
          originalWidth={imgSize.width}
          originalHeight={imgSize.height}
          imageSrc={floorplanImage}
          maskedAreas={filteredAreas}
          positionPxX={positionPxX}
          positionPxY={positionPxY}
          visitorId={visitorId}
          memberId={memberId}
          markerColor={markerColor}
        />
      )}
    </Box>
  );
};

export default TrackingPositionFloorView;
