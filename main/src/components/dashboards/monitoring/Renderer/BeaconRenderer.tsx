import React, { useEffect, useRef, useState } from 'react';
import { Text, Circle, Shape, Group, Rect } from 'react-konva';
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchVisitor, visitorType } from 'src/store/apps/crud/visitor';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { Box, Typography, Paper } from '@mui/material';
import { Html } from 'react-konva-utils';
import { width } from '@mui/system';

type BeaconRendererProps = {
  id: string;
  x: number;
  y: number;
  area: string;
  floorplan: string;
};

const BASE_URL = 'http://192.168.1.116:5000';

const BeaconRenderer: React.FC<BeaconRendererProps> = ({ id, x, y, area, floorplan }) => {
  const groupRef = useRef<any>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch();
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [showBox, setShowBox] = useState(false);

  useEffect(() => {
    dispatch(fetchMembers());
    dispatch(fetchVisitor());
  }, [dispatch]);

  const membersData = useSelector(
    (state: RootState) => state.memberReducer.members,
  ) as memberType[];
  const visitorsData = useSelector(
    (state: RootState) => state.visitorReducer.visitors,
  ) as visitorType[];

  const radius = 15;
  const triangleHeight = 12;

  const person = [...membersData, ...visitorsData].find((p) => p.bleCardNumber === id);
  const isVisitor = visitorsData.some((v) => v.bleCardNumber === id);
  const isMember = membersData.some((m) => m.bleCardNumber === id);
  const label = person?.name || id;
  const imageUrl = person?.faceImage ? `${BASE_URL}${person.faceImage}` : '';

  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      img.onload = () => setImageObj(img);
    }
  }, [imageUrl]);

  const handleClick = () => {
    setShowBox((prev) => !prev);
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const stage = groupRef.current?.getStage?.();
      const clickedOnCanvas = stage?.content?.contains(event.target as Node);
      const clickedOnTooltip = tooltipRef.current?.contains(event.target as Node);

      if (!clickedOnCanvas || !groupRef.current?.getClientRect().width) return;

      const shape = groupRef.current;
      const pointer = stage?.getPointerPosition();
      const shapeBox = shape.getClientRect();

      const isInside =
        pointer &&
        pointer.x >= shapeBox.x &&
        pointer.x <= shapeBox.x + shapeBox.width &&
        pointer.y >= shapeBox.y &&
        pointer.y <= shapeBox.y + shapeBox.height;

      if (!isInside && !clickedOnTooltip) {
        setShowBox(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <Group
        ref={groupRef}
        onClick={(e) => {
          e.cancelBubble = true; // Prevent propagation
          handleClick();
        }}
      >
        <Text
          x={x - 55}
          y={y - triangleHeight - radius - 35}
          text={label}
          fontSize={14}
          fill={isMember ? '#1976d2' : '#f50057'}
          fontStyle="bold"
          width={120}
          align="center"
        />

        {/* Background circle */}
        <Circle
          x={x}
          y={y - triangleHeight - radius}
          radius={radius + 2}
          fill={isMember ? '#1976d2' : '#f50057'}
          stroke="#fff"
          strokeWidth={3}
          shadowBlur={3}
        />

        {/* Face Image */}
        {imageObj && (
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath();
              ctx.arc(radius, radius, radius, 0, Math.PI * 2, false);
              ctx.closePath();
              ctx.clip();
              ctx.drawImage(imageObj, 0, 0, radius * 2, radius * 2);
              // Circular border
            }}
            x={x - radius}
            y={y - triangleHeight - radius * 2}
            width={radius * 2}
            height={radius * 2}
            shadowBlur={3}
          />
        )}

        {/* Triangle pointer */}
        <Shape
          x={x}
          y={y - triangleHeight}
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.moveTo(0, triangleHeight);
            context.lineTo(radius * 0.7, 0);
            context.quadraticCurveTo(0, 5, -radius * 0.7, 0);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          fill={isMember ? '#1976d2' : '#f50057'}
          shadowBlur={2}
        />
      </Group>

      {/* Tooltip Box */}
      {showBox && (
        <Html>
          <Box
            style={{
              width: 300,
              position: 'absolute',
              top: y - triangleHeight - radius * 2 - 60,
              left: x + radius + 10,
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 13,
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              color: '#333',
              zIndex: 1000,
              pointerEvents: 'auto',
            }}
          >
            <Typography mt={1} fontWeight={600}>
              Name :
            </Typography>
            <Typography mb={2}>{person?.name || '-'}</Typography>
            <Typography fontWeight={600}>BLE :</Typography>
            <Typography mb={2}>{person?.bleCardNumber || '-'}</Typography>
            <Typography fontWeight={600}>Area :</Typography>
            <Typography mb={2}>{area || '-'} | {floorplan || '-'}</Typography>
            {/* <Typography fontWeight={600}>Floor :</Typography>
            <Typography mb={2}>{floorplan || '-'}</Typography> */}
          </Box>
        </Html>
      )}
    </>
  );
};

export default BeaconRenderer;
