import React, { useEffect, useState } from 'react';
import { Text, Circle, Shape, Group, Rect } from 'react-konva';
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchVisitor, visitorType } from 'src/store/apps/crud/visitor';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { Box, Typography, Paper } from '@mui/material';
import { Html } from 'react-konva-utils';

type BeaconRendererProps = {
  id: string;
  x: number;
  y: number;
};

const BASE_URL = 'http://192.168.1.116:5000';

const BeaconRenderer: React.FC<BeaconRendererProps> = ({ id, x, y }) => {
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

  const radius = 9;
  const triangleHeight = 10;

  const person = [...membersData, ...visitorsData].find((p) => p.bleCardNumber === id);
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

  return (
    <>
      <Group onClick={handleClick}>
        <Text
          x={x - 55}
          y={y - triangleHeight - radius - 30}
          text={label}
          fontSize={14}
          fill="#1976d2"
          fontStyle="bold"
          width={120}
          align="center"
        />

        {/* Background circle */}
        <Circle
          x={x}
          y={y - triangleHeight - radius}
          radius={radius + 2}
          fill="#1976d2"
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
          fill="#1976d2"
          shadowBlur={2}
        />
      </Group>

      {/* Tooltip Box */}
      {showBox && (
        <Html>
          <div
            style={{
              position: 'absolute',
              top: y - triangleHeight - radius * 2 - 60,
              left: x + radius + 10,
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              color: '#333',
              zIndex: 1000,
              pointerEvents: 'auto',
            }}
          >
            <div>
              <strong>Name:</strong> {person?.name || '-'}
            </div>
            <div>
              <strong>BLE:</strong> {person?.bleCardNumber || '-'}
            </div>
          </div>
        </Html>
      )}
    </>
  );
};

export default BeaconRenderer;
