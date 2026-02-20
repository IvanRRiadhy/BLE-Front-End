import { BASE_URL } from 'src/utils/axios';
import React, { useEffect, useRef, useState } from 'react';
import { Text, Circle, Shape, Group } from 'react-konva';
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchVisitor, masterVisitorType, VisitorType } from 'src/store/apps/crud/visitor';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { Html } from 'react-konva-utils';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllSecuritys } from 'src/hooks/useSecurityGuard';

type BeaconRendererProps = {
  id: string;
  x: number;
  y: number;
  area: string;
  floorplan: string;
  time: string;
  clickable: boolean;
  detailDialogOpen?: boolean;
  setDetailDialogOpen?: (open: boolean) => void;
  openTrackDetail?: boolean;
  setOpenTrackDetail?: (open: boolean) => void;
  onClick?: () => void;
};

const BeaconRenderer: React.FC<BeaconRendererProps> = ({
  id,
  x,
  y,
  area,
  floorplan,
  time,
  clickable,
  detailDialogOpen,
  setDetailDialogOpen,
  openTrackDetail,
  setOpenTrackDetail,
  onClick = () => {},
}) => {
  const groupRef = useRef<any>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch();
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  // useEffect(() => {
  //   console.log('openTrackDetail', openTrackDetail);
  // }, [openTrackDetail]);

  // useEffect(() => {
  //   dispatch(fetchMembers());
  //   dispatch(fetchVisitor());
  // }, [dispatch]);

  // const membersData = useSelector(
  //   (state: RootState) => state.memberReducer.members,
  // ) as memberType[];
  // const visitorsData = useSelector(
  //   (state: RootState) => state.visitorReducer.visitors,
  // ) as VisitorType[];
  const { data: membersData = [] } = useAllMembers();
  const { data: visitorsData = [] } = useAllVisitor();
  const { data: securityData = [] } = useAllSecuritys();

  const radius = 7.5;
  const triangleHeight = 8;

  const person = [...membersData, ...visitorsData, ...securityData].find(
    (p) => p.bleCardNumber === id,
  );
  const isVisitor = visitorsData.some((v) => v.bleCardNumber === id);
  const isMember = membersData.some((m) => m.bleCardNumber === id);
  const isSecurity = securityData.some((s) => s.bleCardNumber === id);
  const label = person?.name || id;
  const imageUrl = person?.faceImage ? `${BASE_URL}${person.faceImage}` : '';

  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image();
      img.crossOrigin = '';
      img.src = imageUrl;
      console.log('Loading image for beacon:', img);
      img.onload = () => setImageObj(img);
    }
  }, [imageUrl]);

  const handleClick = () => {
    console.log('clicked', person);
    if (setDetailDialogOpen) {
      setDetailDialogOpen(!detailDialogOpen);
    }
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
      // if (!isClickInsideGroup && !clickedTooltip) {
      //   if (setDetailDialogOpen) {
      //     setDetailDialogOpen(!detailDialogOpen);
      //   }
      // }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const beaconColor = isSecurity ? '#00c853' : isMember ? '#1976d2' : '#f50057';
  // console.log('person', isSecurity, isMember, isVisitor, person);
  return (
    <>
      <Group
        name="beacon"
        ref={groupRef}
        onClick={(e) => {
          if (!clickable) return;
          e.cancelBubble = true; // Prevent propagation
          if (onClick) onClick();
        }}
      >
        <Text
          x={x - 55}
          y={y - triangleHeight - radius - 25}
          text={label}
          fontSize={10}
          fill={beaconColor}
          fontStyle="bold"
          width={120}
          align="center"
        />
        {isSecurity ? (
          <>
            {/* Green Hexagon (bottom center = anchor) */}
            <Shape
              x={x}
              y={y}
              sceneFunc={(context, shape) => {
                const hexHeight = 28; // 🔥 control size here
                const hexWidth = 24;

                context.beginPath();

                // bottom center (anchor stays SAME)
                context.moveTo(0, 0);

                context.lineTo(hexWidth / 2, -hexHeight * 0.3);
                context.lineTo(hexWidth / 2, -hexHeight * 0.7);
                context.lineTo(0, -hexHeight);
                context.lineTo(-hexWidth / 2, -hexHeight * 0.7);
                context.lineTo(-hexWidth / 2, -hexHeight * 0.3);

                context.closePath();
                context.fillStrokeShape(shape);
              }}
              fill="#00c853"
              stroke="#ffffff"
              strokeWidth={2}
              shadowBlur={6}
            />

            {/* Face image clipped inside */}
            {imageObj && (
              <Shape
                x={x - 9}
                y={y - 22}
                width={18}
                height={18}
                sceneFunc={(ctx) => {
                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(9, 9, 9, 0, Math.PI * 2);
                  ctx.closePath();
                  ctx.clip();
                  ctx.drawImage(imageObj, 0, 0, 18, 18);
                  ctx.restore();
                }}
              />
            )}
          </>
        ) : (
          <>
            {/* Background circle */}
            <Circle
              x={x}
              y={y - triangleHeight - radius}
              radius={radius + 2}
              fill={beaconColor}
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
              fill={beaconColor}
              shadowBlur={2}
            />
          </>
        )}
      </Group>
    </>
  );
};

export default BeaconRenderer;
