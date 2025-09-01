import React, { useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Line, Label, Tag, Group } from 'react-konva';
import { useSelector, useDispatch } from 'src/store/Store';
import { fetchBeacon, RefreshBeaconState } from 'src/store/apps/tracking/Beacon';
import BeaconRenderer from './BeaconRenderer';
import FaceRecog from 'src/assets/images/svgs/devices/FACE RECOGNITION FIX.svg';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import { uniqueId } from 'lodash';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { darken } from '@mui/material';
import { setFocus } from 'src/store/apps/monitoring/layout';

type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};

const DeviceRenderer: React.FC<{
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  originalWidth: number;
  originalHeight: number;
  imageSrc?: string;
  scale: number;
  devices: FloorplanDeviceType[];
  areas: MaskedAreaType[];
  showAreas: boolean;
  showGates: boolean;
  topic: string;
  detailDialogOpen: boolean;
  setDetailDialogOpen: (open: boolean) => void;
  openTrackDetail: boolean;
  setOpenTrackDetail: (open: boolean) => void;
  selectedBeaconId: string | null;

  onSelectBeacon: (info: { id: string; area: string; floorplan: string; time: string }) => void;
}> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  devices,
  areas,
  showAreas,
  showGates,
  topic,
  detailDialogOpen,
  setDetailDialogOpen,
  openTrackDetail,
  setOpenTrackDetail,
  onSelectBeacon,
}) => {
  const dispatch = useDispatch();
  // const [scales, setScale] = useState<number>(scale);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [animatedBeacons, setAnimatedBeacons] = useState<{
    [id: string]: { x: number; y: number };
  }>({});
  const refreshTrigger = useSelector((state) => state.BeaconReducer.refreshTrigger);
  const refreshBeacons = React.useCallback(() => {
    dispatch(RefreshBeaconState());
  }, [dispatch]);
  const [lastSeenBeacons, setLastSeenBeacons] = useState<{
    [id: string]: {
      x: number;
      y: number;
      lastSeen: number;
      area: string;
      floorplan: string;
      time: string;
    };
  }>({});
  const setPointsFromNodes = (nodes: Nodes[]): number[] => {
    // console.log('Setting nodes: ', nodes.flatMap((node) => [node.x /originalWidth * width, node.y / originalHeight * height]))
    return nodes.flatMap((node) => [
      (node.x_px / originalWidth) * width,
      (node.y_px / originalHeight) * height,
    ]); // Flatten x and y into a single array
  };

  const beaconData = useSelector((state) => state.BeaconReducer.beaconsByTopic[topic]);
  useEffect(() => {
    if (imageSrc) {
      const img = new window.Image();
      img.src = imageSrc;
      img.onload = () => {
        setImage(img);
      };
    }
  }, [imageSrc]);
  const useDeviceIcon = (src: string) => {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
      const image = new window.Image();
      image.src = src;
      image.onload = () => setImg(image);
    }, [src]);
    return img;
  };

  useEffect(() => {
    const unsubscribe = dispatch(fetchBeacon(topic));
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [dispatch, topic]);

  const iconCCTV = useDeviceIcon(CCTVSVG);
  const iconGateway = useDeviceIcon(GatewaySVG);
  const iconFaceRecog = useDeviceIcon(FaceRecog);
  const iconUnknown = useDeviceIcon(UnknownDevice);

  const renderDeviceShape = (device: FloorplanDeviceType) => {
    // console.log('Rendering device:', device);
    let deviceIcon, iconWidth, iconHeight;
    switch (device.type) {
      case 'Cctv':
        deviceIcon = iconCCTV;
        iconWidth = 40;
        iconHeight = 40;
        break;
      case 'BleReader':
        deviceIcon = iconGateway;
        iconWidth = 40;
        iconHeight = 40;
        break;
      case 'AccessDoor':
        deviceIcon = iconFaceRecog;
        iconWidth = 40;
        iconHeight = 40;
        break;

      default:
        deviceIcon = iconUnknown;
        iconWidth = 40;
        iconHeight = 40;
        break;
    }

    const x = (device.posPxX / originalWidth) * width - iconWidth / 2;
    const y = (device.posPxY / originalHeight) * height - iconHeight / 2;

    return (
      deviceIcon && (
        <Group
          key={`device-${device.id}}`}
          name="device"
          onClick={(e: any) => {
            e.cancelBubble = true; // stop bubbling to area/stage
            dispatch(setFocus({ type: 'device', id: device.id }));
          }}
        >
          <Text
            x={x - 40}
            y={y - 5}
            text={device.reader?.gmac || device.id}
            fontSize={9}
            fill="#1976d2"
            fontStyle="bold"
            width={120}
            align="center"
            listening={false} // label doesn’t need events
          />
          <KonvaImage
            name="device"
            image={deviceIcon}
            x={x}
            y={y}
            width={iconWidth}
            height={iconHeight}
          />
        </Group>
      )
    );
  };

  useEffect(() => {
    if (!beaconData) return;

    setLastSeenBeacons((prev) => {
      const now = Date.now();
      const updated: typeof prev = { ...prev };

      // Mark all beacons from backend as seen now
      beaconData.forEach((beacon) => {
        if (beacon.point) {
          // console.log("beaconData : ", beacon);
          updated[beacon.beaconId] = {
            x: beacon.point.x,
            y: beacon.point.y,
            lastSeen: now,
            area: beacon.maskedAreaName,
            floorplan: beacon.floorplanName,
            time: beacon.time,
          };
        }
      });
      // Remove beacons not seen for more than 10 seconds
      Object.keys(updated).forEach((id) => {
        if (now - updated[id].lastSeen > 10000) {
          delete updated[id];
        }
      });
      // console.log("Beacon :", updated);
      return updated;
    });
  }, [beaconData]);

  useEffect(() => {
    // console.log('FloorplanID : ', topic, 'Beacons : ', beaconData);
    Object.entries(lastSeenBeacons).forEach(([beaconId, beacon]) => {
      const point = { x: beacon.x, y: beacon.y };
      const prev = animatedBeacons[beaconId] || { x: point.x, y: point.y };

      if (prev.x !== point.x || prev.y !== point.y) {
        const duration = 100;
        const startX = prev.x;
        const startY = prev.y;
        const endX = point.x;
        const endY = point.y;
        const startTime = performance.now();
        function animate(now: number) {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / duration);
          const newX = startX + (endX - startX) * t;
          const newY = startY + (endY - startY) * t;

          setAnimatedBeacons((prevState) => ({
            ...prevState,
            [beaconId]: { x: newX, y: newY },
          }));

          if (t < 1) {
            requestAnimationFrame(animate);
          }
        }
        requestAnimationFrame(animate);
      } else {
        setAnimatedBeacons((prevState) => ({
          ...prevState,
          [beaconId]: { x: point.x, y: point.y },
        }));
      }
    });
  }, [lastSeenBeacons]);

  useEffect(() => {
    if (refreshTrigger) {
      refreshBeacons();
      setLastSeenBeacons({});
      setAnimatedBeacons({});
      console.log(beaconData);
    }
  }, [refreshTrigger, refreshBeacons]);

  const [tip, setTip] = useState<{ visible: boolean; x: number; y: number; text: string }>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
  });

  return (
    <Stage
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      onMouseDown={(e) => {
        const nm = (e.target && e.target.name && e.target.name()) || '';
        // allow-list
        const keep = nm === 'area' || nm === 'device' || nm === 'beacon';
        if (!keep) {
          dispatch(setFocus({ type: '', id: '' }));
        }
      }}
    >
      <Layer>
        {image && (
          <KonvaImage
            name="background"
            image={image}
            width={width}
            height={height}
            opacity={1}
            top={0}
            left={0}
            bottom={0}
            right={0}
          />
        )}
        {/* Render areas if showAreas is true */}
        {showAreas &&
          areas.map((area) => (
            <Line
              key={area.id}
              name="area"
              points={area.nodes ? setPointsFromNodes(area.nodes) : []}
              stroke={darken(area.colorArea, 0.5)}
              strokeWidth={5}
              lineJoin="round"
              lineCap="round"
              closed
              fill={area.colorArea}
              opacity={0.5}
              onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (!stage) return;
                stage.container().style.cursor = 'pointer';
                const p = stage.getPointerPosition();
                if (!p) return;
                setTip({ visible: true, x: p.x + 10, y: p.y + 10, text: area.name });
              }}
              onMouseMove={(e) => {
                const p = e.target.getStage()?.getPointerPosition();
                if (!p) return;
                setTip((t) => ({ ...t, x: p.x, y: p.y }));
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'default';
                setTip((t) => ({ ...t, visible: false }));
              }}
              onClick={() => {
                dispatch(setFocus({ type: 'area', id: area.id }));
              }}
            />
          ))}

        {/*Render devices*/}
        {showGates && devices.map((device) => renderDeviceShape(device))}
        {/*Render beacons*/}
        {/* {Beacon.map((beacon) => renderBeacon(beacon))} */}
        {Object.entries(lastSeenBeacons).map(([beaconId, beacon]) => {
          const anim = animatedBeacons[beaconId] || beacon;
          return (
            <BeaconRenderer
              key={`beacon-${beaconId}`}
              id={beaconId}
              x={(anim.x / originalWidth) * width}
              y={(anim.y / originalHeight) * height}
              area={beacon.area}
              floorplan={beacon.floorplan}
              time={beacon.time}
              clickable
              detailDialogOpen={detailDialogOpen}
              setDetailDialogOpen={setDetailDialogOpen}
              openTrackDetail={openTrackDetail}
              setOpenTrackDetail={setOpenTrackDetail}
              onClick={() =>
                onSelectBeacon({
                  id: beaconId,
                  area: beacon.area,
                  floorplan: beacon.floorplan,
                  time: beacon.time,
                })
              }
            />
          );
        })}
      </Layer>
      {/* Top-most UI layer for tooltip */}
      <Layer listening={false}>
        {tip.visible && (
          <Label x={tip.x} y={tip.y} listening={false}>
            <Tag
              fill="rgba(0,0,0,0.8)"
              cornerRadius={4}
              pointerDirection="down"
              pointerWidth={8}
              pointerHeight={6}
              listening={false}
            />
            <Text text={tip.text} fill="#fff" fontSize={12} padding={6} listening={false} />
          </Label>
        )}
      </Layer>
    </Stage>
  );
};

export default DeviceRenderer;
