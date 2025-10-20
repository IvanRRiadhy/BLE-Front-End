import { BASE_URL } from 'src/utils/axios';
import React, { useEffect, useState } from 'react';
import { Text, Circle, Shape, Group } from 'react-konva';
import { RootState, useSelector } from 'src/store/Store';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import Konva from 'konva';

interface TrackingPositionMarkerProps {
  id?: string;
  x: number;
  y: number;
  visitorId?: string;
  memberId?: string;
  markerColor?: string;
}

const TrackingPositionMarker: React.FC<TrackingPositionMarkerProps> = ({
  id,
  x,
  y,
  visitorId,
  memberId,
  markerColor,
}) => {
  const nodeRef = React.useRef<Konva.Circle>(null);
  const membersData = useSelector(
    (state: RootState) => state.memberReducer.memberAll,
  ) as memberType[];
  const visitorsData = useSelector(
    (state: RootState) => state.visitorReducer.visitorAll,
  ) as VisitorType[];

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  const person = memberId
    ? membersData.find((m) => m.id === memberId)
    : visitorId
    ? visitorsData.find((v) => v.id === visitorId)
    : null;

  const isMember = Boolean(memberId);
  const label = person?.name ?? 'Unknown';
  const imageUrl = person?.faceImage ? `${BASE_URL}${person.faceImage}` : '';

  const radius = 8;
  const triangleHeight = 8;
  const fillColor = markerColor || (isMember ? '#1976d2' : '#f50057');

  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      img.onload = () => setImageObj(img);
    }
    // console.log(imageUrl, person);
    // console.log("Position", x, y);
  }, [imageUrl]);
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    // Safely wait until node is actually in a layer
    const waitUntilReady = () => {
      if (!node.getLayer()) {
        requestAnimationFrame(waitUntilReady);
        return;
      }

      const startPulse = () => {
        if (!node.getLayer()) return; // ensure still valid
        const tween = new Konva.Tween({
          node,
          radius: radius * 4,
          opacity: 0,
          duration: 1.6,
          easing: Konva.Easings.EaseInOut,
          onFinish: () => {
            // Reset state
            node.radius(radius);
            node.opacity(0.4);
            tween.destroy();

            // Restart after next frame
            requestAnimationFrame(startPulse);
          },
        });
        tween.play();
      };

      startPulse();
    };

    waitUntilReady();
  }, [x, y, radius]);

  return (
    <Group name="tracking-marker">
      {/* Blinking red pulse */}
      <Circle
        ref={nodeRef}
        x={x}
        y={y - triangleHeight - radius}
        radius={radius}
        fill={fillColor}
        shadowColor={fillColor}
        shadowBlur={15}
      />

      {/* Background circle */}
      <Circle
        x={x}
        y={y - triangleHeight - radius}
        radius={radius + 2}
        fill={fillColor}
        shadowColor={fillColor}
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
        fill={fillColor}
        shadowColor={fillColor}
        shadowBlur={2}
      />
    </Group>
  );
};

export default TrackingPositionMarker;
