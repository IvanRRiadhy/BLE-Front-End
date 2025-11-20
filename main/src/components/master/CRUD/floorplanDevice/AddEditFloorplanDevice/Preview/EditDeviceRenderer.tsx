import {
  Button,
  darken,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  FloorplanDeviceType,
  RevertDevice,
  SelectEditingFloorplanDevice,
  SelectFloorplanDevice,
  editDevicePosition,
} from 'src/store/apps/crud/floorplanDevice';

import borderFaceRecog from 'src/assets/images/svgs/devices/FACE READER ICON.png';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import borderGateway from 'src/assets/images/svgs/devices/BLE GATEWAY ICON.png';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';

type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};

const EditDeviceRenderer: React.FC<{
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  imageSrc?: string;
  scale: number;
  devices?: FloorplanDeviceType[];
  activeDevice?: FloorplanDeviceType | null;
  setIsDragging: (isDragging: string) => void;
  areas: MaskedAreaType[];
  showAreas: boolean;
  showEffectiveArea: boolean;
}> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  scale,
  devices,
  activeDevice,
  setIsDragging,
  areas,
  showAreas,
  showEffectiveArea,
}) => {
  const dispatch = useDispatch();
  const editingDevice = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );

  // types for Konva images require CanvasImageSource | undefined
  const [bgImage, setBgImage] = useState<CanvasImageSource | undefined>(undefined);
  const loadIcon = (src: string) => {
    const [img, setImg] = useState<CanvasImageSource | undefined>(undefined);
    useEffect(() => {
      const i = new window.Image();
      i.src = src;
      i.onload = () => setImg(i);
    }, [src]);
    return img;
  };

  const iconCCTV = loadIcon(CCTVSVG);
  const iconGateway = loadIcon(borderGateway);
  const iconFaceRecog = loadIcon(borderFaceRecog);
  const iconUnknown = loadIcon(UnknownDevice);

  // heatmap colored image produced from offscreen canvas
  const [heatmapImage, setHeatmapImage] = useState<CanvasImageSource | undefined>(undefined);

  // load background image
  useEffect(() => {
    if (!imageSrc) {
      setBgImage(undefined);
      return;
    }
    const img = new window.Image();
    img.src = imageSrc;
    img.onload = () => setBgImage(img);
  }, [imageSrc]);

  const setPointsFromNodes = (nodes: Nodes[]): number[] =>
    nodes.flatMap((n) => [(n.x_px / originalWidth) * width, (n.y_px / originalHeight) * height]);

  function isPointInPolygon(point: { x: number; y: number }, polygon: Nodes[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x_px,
        yi = polygon[i].y_px;
      const xj = polygon[j].x_px,
        yj = polygon[j].y_px;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 0.00001) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  const handleDragEnd = (e: any, device: FloorplanDeviceType) => {
    const newPosX = ((e.target.x() + 18) / width) * originalWidth;
    const newPosY = ((e.target.y() + 18) / height) * originalHeight;

    const intersectedArea = areas.find(
      (a) => a.nodes && isPointInPolygon({ x: newPosX, y: newPosY }, a.nodes),
    );

    const newDevice = {
      ...device,
      floorplanMaskedAreaId: intersectedArea ? intersectedArea.id : '',
      posX: newPosX * scale,
      posY: newPosY * scale,
      posPxX: newPosX,
      posPxY: newPosY,
    };

    dispatch(editDevicePosition(newDevice));
    setIsDragging('');
  };

  // confirm dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);

  const getRadius = useCallback(() => 5 / scale, [scale]);

  // convert intensity (0..1) to jet colormap RGB
  const jetColorMap = useCallback((v: number) => {
    // clamp
    const t = Math.max(0, Math.min(1, v));
    // classic "jet" approximation
    const fourValue = 4 * t;
    const r = Math.min(
      255,
      Math.max(0, Math.floor(255 * Math.min(fourValue - 1.5, -fourValue + 4.5))),
    );
    const g = Math.min(
      255,
      Math.max(0, Math.floor(255 * Math.min(fourValue - 0.5, -fourValue + 3.5))),
    );
    const b = Math.min(
      255,
      Math.max(0, Math.floor(255 * Math.min(fourValue + 0.5, -fourValue + 2.5))),
    );
    return { r, g, b };
  }, []);

  // create heatmap image from devices + areas
  useEffect(() => {
    // create offscreen canvas
    if (!width || !height) return;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw intensity blobs per-area (so we can clip by polygon)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const radius = getRadius();

    // helper draw single intensity circle (white->transparent)
    const drawIntensityCircle = (cx: number, cy: number, r: number) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,1.0)');
      g.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    // We want additive stacking of intensities -> use 'lighter'
    ctx.globalCompositeOperation = 'lighter';

    // Draw for each area: clip then draw only devices inside that area
    areas.forEach((area) => {
      const points = (area.nodes && setPointsFromNodes(area.nodes)) || [];
      if (!points.length) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
      ctx.closePath();
      ctx.clip();

      // draw devices that belong to the area
      devices
        ?.filter((d) => d.floorplanMaskedAreaId === area.id)
        .forEach((d) => {
          const x = (d.posPxX / originalWidth) * width;
          const y = (d.posPxY / originalHeight) * height;
          drawIntensityCircle(x, y, radius);
        });

      ctx.restore();
    });

    // Draw devices that are outside any area
    devices
      ?.filter((d) => !d.floorplanMaskedAreaId)
      .forEach((d) => {
        const x = (d.posPxX / originalWidth) * width;
        const y = (d.posPxY / originalHeight) * height;
        drawIntensityCircle(x, y, radius);
      });

    // Now we have an additive grayscale intensity map in the canvas's RGBA channels.
    // Map grayscale to jet colormap per-pixel.
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert each pixel intensity to jet RGB
    // We'll use the red channel as intensity (since we drew white->transparent)
    for (let i = 0; i < data.length; i += 4) {
      // intensity in [0..255]
      const intensity = data[i]; // red channel (white)
      const v = intensity / 255; // 0..1

      if (v <= 0.001) {
        // keep transparent / black background
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0; // make pixel fully transparent
      } else {
        const { r, g, b } = jetColorMap(v);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        // alpha scale with intensity (so stronger = more opaque)
        data[i + 3] = Math.min(255, Math.floor(200 * v + 55)); // not fully transparent at low v
      }
    }

    // apply mapped image
    ctx.putImageData(imageData, 0, 0);

    // Create HTMLImageElement from canvas
    const outImg = new window.Image();
    outImg.src = canvas.toDataURL('image/png');
    outImg.onload = () => {
      setHeatmapImage(outImg);
    };

    // cleanup - allow GC
    return () => {
      // nothing special
    };
  }, [devices, areas, width, height, originalWidth, originalHeight, scale, getRadius, jetColorMap]);

  // render device icons (icons above heatmap)
  const renderDeviceIcon = (device: FloorplanDeviceType) => {
    const isActive = activeDevice?.id === device.id;
    const isEditing = editingDevice?.id === device.id;

    let icon: CanvasImageSource | undefined = iconUnknown;
    switch (device.type) {
      case 'Cctv':
        icon = iconCCTV;
        break;
      case 'BleReader':
        icon = iconGateway;
        break;
      case 'AccessDoor':
        icon = iconFaceRecog;
        break;
      default:
        icon = iconUnknown;
    }

    const x = (device.posPxX / originalWidth) * width;
    const y = (device.posPxY / originalHeight) * height;

    const handleClick = () => {
      if (isActive) return;
      if (editingDevice) {
        setPendingDeviceId(device.id);
        setConfirmDialogOpen(true);
        return;
      }
      dispatch(SelectFloorplanDevice(device.id));
    };

    return (
      <KonvaImage
        key={device.id}
        image={icon || undefined}
        x={x - 18}
        y={y - 18}
        width={36}
        height={36}
        onClick={handleClick}
        draggable={isEditing}
        onMouseDown={() => setIsDragging(device.id)}
        onDragEnd={(e) => handleDragEnd(e, device)}
        stroke={isActive ? 'lightgreen' : 'transparent'}
        strokeWidth={isActive ? 5 : 0}
      />
    );
  };

  return (
    <>
      <Stage width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Background layer (image + area outlines) */}
        <Layer>
          {bgImage && <KonvaImage image={bgImage} width={width} height={height} />}
          {showAreas &&
            areas.map((area) => (
              <Line
                key={area.id}
                points={setPointsFromNodes(area.nodes ?? [])}
                stroke={darken(area.colorArea, 0.5)}
                strokeWidth={5}
                closed
                fill={area.colorArea}
                opacity={0.5}
                globalCompositeOperation="source-over"
              />
            ))}
        </Layer>

        {/* Heatmap layer - single colored image produced by offscreen canvas */}
        <Layer>
          {(heatmapImage && showEffectiveArea) && (
            <KonvaImage
              image={heatmapImage}
              x={0}
              y={0}
              width={width}
              height={height}
              opacity={0.95}
              listening={false}
            />
          )}
        </Layer>

        {/* Icons layer */}
        <Layer>{devices?.map((d) => renderDeviceIcon(d))}</Layer>
      </Stage>

      {/* Confirm dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are still in editing mode. Any editing progress will be cancelled. Proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              dispatch(RevertDevice(editingDevice?.id || ''));
              if (pendingDeviceId) {
                dispatch(SelectFloorplanDevice(pendingDeviceId));
                dispatch(SelectEditingFloorplanDevice(null));
              }
              setConfirmDialogOpen(false);
              setPendingDeviceId(null);
            }}
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditDeviceRenderer;
