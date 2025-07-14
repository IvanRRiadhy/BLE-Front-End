import React, { useEffect, useRef, useState } from 'react';
import { Text, Circle, Shape, Group } from 'react-konva';
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchVisitor, visitorType } from 'src/store/apps/crud/visitor';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { Html } from 'react-konva-utils';
import BeaconDetailPopup from '../Popup/BeaconDetailPopup';
import TrackingDetailPopup from '../Popup/TrackingDetailPopup';

type BeaconRendererProps = {
  id: string;
  x: number;
  y: number;
  area: string;
  floorplan: string;
  time: string;
};

const BASE_URL = 'http://192.168.1.116:5000';

const BeaconRenderer: React.FC<BeaconRendererProps> = ({ id, x, y, area, floorplan, time }) => {
  const groupRef = useRef<any>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch();
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [detailDialogOpen, setdetailDialogOpen] = useState(false);
  const [openTrackDetail, setOpenTrackDetail] = useState(false);

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

  const radius = 7.5;
  const triangleHeight = 8;

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
    setdetailDialogOpen((prev) => !prev);
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const tooltipEl = tooltipRef.current;
      const groupNode = groupRef.current;
      const stage = groupNode?.getStage();
      const pointer = stage?.getPointerPosition();

      const isClickInsideGroup = (() => {
        if (!pointer || !groupNode) return false;
        const box = groupNode.getClientRect();
        return (
          pointer.x >= box.x &&
          pointer.x <= box.x + box.width &&
          pointer.y >= box.y &&
          pointer.y <= box.y + box.height
        );
      })();

      const clickedTooltip = tooltipEl?.contains(event.target as Node);

      // Close if click is NOT on group AND NOT on tooltip
      if (!isClickInsideGroup && !clickedTooltip) {
        setdetailDialogOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
          y={y - triangleHeight - radius - 25}
          text={label}
          fontSize={10}
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
          strokeWidth={1}
          shadowBlur={3}
        />

        {/* Face Image */}
        {imageObj && (
          <Shape
            sceneFunc={(ctx) => {
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
      {detailDialogOpen && (
        <Html>
          <BeaconDetailPopup
          bleNumber={id}
            memberDetail={isMember ? person as memberType : undefined}
            visitorDetail={isVisitor ? person as visitorType : undefined}
            detailDialogOpen={detailDialogOpen}
            setDetailDialogOpen={setdetailDialogOpen}
            setOpenTrackDetail={setOpenTrackDetail}
            area={area}
            floorplan={floorplan}
            time={time}
          />
          <TrackingDetailPopup
            bleNumber={id}
            person={isMember ? person as memberType : person as visitorType}
            personId={person?.id || ''}
            openTrackDetail={openTrackDetail}
            setOpenTrackDetail={setOpenTrackDetail}
          />
          {/* <Box
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
            <Typography mb={2}>
              {area || '-'} | {floorplan || '-'}
            </Typography>

          </Box> */}
        </Html>
      )}
    </>
  );
};

export default BeaconRenderer;
