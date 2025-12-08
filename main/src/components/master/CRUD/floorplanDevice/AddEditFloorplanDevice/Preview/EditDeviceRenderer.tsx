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
import { Stage, Layer, Image as KonvaImage, Line, Circle, FastLayer } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  FloorplanDeviceType,
  RevertDevice,
  SelectEditingFloorplanDevice,
  SelectFloorplanDevice,
  editDevicePosition,
  PathsType,
  PathNodeType,
  DrawingDevicePath,
  editDevicePath,
  addDevicePathPair,
} from 'src/store/apps/crud/floorplanDevice';
import borderFaceRecog from 'src/assets/images/svgs/devices/FACE READER ICON.png';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import borderGateway from 'src/assets/images/svgs/devices/BLE GATEWAY ICON.png';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { uniqueId } from 'lodash';

type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};

interface Props {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  imageSrc?: string;
  scale: number; // meterPerPx or device scale? kept as original prop (unused for stage transform)
  devices?: FloorplanDeviceType[];
  activeDevice?: FloorplanDeviceType | null;
  setIsDragging: (isDragging: string) => void;
  areas: MaskedAreaType[];
  showAreas: boolean;
  showEffectiveArea: boolean;
  // Stage transform props (from parent)
  stageScale: number;
  stageX: number;
  stageY: number;
  stageRef?: React.RefObject<any>;
}

const EditDeviceRenderer: React.FC<Props> = ({
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
  stageScale,
  stageX,
  stageY,
  stageRef,
}) => {
  const dispatch = useDispatch();
  const editingDevice = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );
  const drawingPath = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.drawingDevicePath,
  );
  const isDrawingPath = Boolean(drawingPath);
  const editingPaths = editingDevice?.devicePath ?? [];
  const [pathNodes, setPathNodes] = useState<PathNodeType[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // bgImage and icons (CanvasImageSource)
  const [bgImage, setBgImage] = useState<HTMLImageElement | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | undefined>(undefined);
  const loadIcon = (src: string) => {
    const [img, setImg] = useState<HTMLImageElement | undefined>(undefined);
    useEffect(() => {
      const i = new window.Image();
      i.src = src;
      i.onload = () => setImg(i);
    }, [src]);
    return img as CanvasImageSource | undefined;
  };

  const iconCCTV = loadIcon(CCTVSVG);
  const iconGateway = loadIcon(borderGateway);
  const iconFaceRecog = loadIcon(borderFaceRecog);
  const iconUnknown = loadIcon(UnknownDevice);

  // heatmap colored image produced from offscreen canvas
  const [heatmapImage, setHeatmapImage] = useState<HTMLImageElement | undefined>(undefined);

  // load background image (preview first, then full)
  useEffect(() => {
    if (!imageSrc) {
      setPreviewImage(undefined);
      setBgImage(undefined);
      return;
    }

    // try to infer a preview URL param (if backend supports). If not, preview == full.
    const previewUrl = `${imageSrc}`; // adjust if you have resizing endpoint: `${imageSrc}?w=1200`

    const p = new window.Image();
    p.src = previewUrl;
    p.onload = () => {
      setPreviewImage(p);
      // start loading full res
      const full = new window.Image();
      full.src = imageSrc;
      full.onload = () => {
        setBgImage(full);
      };
      full.onerror = () => {
        // fallback use preview if full fails
        if (!bgImage) setBgImage(p);
      };
    };
    p.onerror = () => {
      // fallback to direct full image
      const f = new window.Image();
      f.src = imageSrc;
      f.onload = () => setBgImage(f);
    };
  }, [imageSrc]);

  useEffect(() => {
    // debug
    // console.log('Editing Device changed:', editingDevice);
    // console.log('Drawing Path changed:', editingPaths);
  }, [editingDevice, editingPaths]);

  // coordinate conversions (original px <-> screen)
  const pxToScreenX = (px: number) => (px / originalWidth) * width;
  const pxToScreenY = (px: number) => (px / originalHeight) * height;
  const screenToPxX = (x: number) => (x / width) * originalWidth;
  const screenToPxY = (y: number) => (y / height) * originalHeight;

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
    setIsDragging('');
    // note: Konva drag returns coordinates in stage pixels; our Stage has transforms applied (scale + x/y),
    // but device icons are positioned in screen coordinates already (we compute x,y using pxToScreenX/Y)
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
  };

  useEffect(() => {
    if (!drawingPath) {
      setPathNodes([]);
      return;
    }
    // Find starting device
    const startDev = devices?.find((d) => d.id === drawingPath);
    if (!startDev) return;
    // First node = same device
    setPathNodes([
      {
        id: crypto.randomUUID(),
        deviceId: startDev.id,
      } as PathNodeType,
    ]);
  }, [drawingPath, devices]);

  const handleCanvasClickForPath = (e: any) => {
    if (!drawingPath) return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    // pointer pos is in stage coordinates; but since we render devices using pxToScreenX/pxToScreenY
    // and Stage is transformed by stageScale/x/y, Konva pointer coordinates are already in *screen* stage pixels.
    const pxX = screenToPxX(pos.x);
    const pxY = screenToPxY(pos.y);

    // Check if clicking on some device
    const clickedDev = devices?.find((d) => {
      const dx = pxX - d.posPxX;
      const dy = pxY - d.posPxY;
      return Math.sqrt(dx * dx + dy * dy) < 40;
    });

    if (clickedDev && clickedDev.id !== drawingPath) {
      const newNodes = [
        ...pathNodes,
        {
          id: uniqueId(),
          posX: clickedDev.posX,
          posY: clickedDev.posY,
          posPxX: clickedDev.posPxX,
          posPxY: clickedDev.posPxY,
          deviceId: clickedDev.id,
        } as PathNodeType,
      ];

      // finalize - dispatch or handle as needed; original code just cleared
      setPathNodes([]);
      dispatch(DrawingDevicePath(''));
      return;
    }

    setPathNodes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        posX: pxX * scale,
        posY: pxY * scale,
        posPxX: pxX,
        posPxY: pxY,
      } as PathNodeType,
    ]);
  };

  // dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);

  const getRadius = useCallback(() => 5 / scale, [scale]);

  const jetColorMap = useCallback((v: number) => {
    const t = Math.max(0, Math.min(1, v));
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

  // create heatmap image from devices + areas (offscreen)
  useEffect(() => {
    if (!width || !height) return;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const radius = getRadius();

    const drawIntensityCircle = (cx: number, cy: number, r: number) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,1.0)');
      g.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    ctx.globalCompositeOperation = 'lighter';

    areas.forEach((area) => {
      const points = (area.nodes && setPointsFromNodes(area.nodes)) || [];
      if (!points.length) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
      ctx.closePath();
      ctx.clip();

      devices
        ?.filter((d) => d.floorplanMaskedAreaId === area.id && d.type === 'BleReader')
        .forEach((d) => {
          const x = (d.posPxX / originalWidth) * width;
          const y = (d.posPxY / originalHeight) * height;
          drawIntensityCircle(x, y, radius);
        });

      ctx.restore();
    });

    // convert grayscale to jet
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const intensity = data[i];
      const v = intensity / 255;
      if (v <= 0.001) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      } else {
        const { r, g, b } = jetColorMap(v);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = Math.min(255, Math.floor(200 * v + 55));
      }
    }
    ctx.putImageData(imageData, 0, 0);
    const outImg = new window.Image();
    outImg.src = canvas.toDataURL('image/png');
    outImg.onload = () => {
      setHeatmapImage(outImg);
    };
  }, [devices, areas, width, height, originalWidth, originalHeight, scale, getRadius, jetColorMap]);

  // device rendering
  const renderDeviceIcon = (device: FloorplanDeviceType) => {
    const isActive = activeDevice?.id === device.id;
    const isEditing = editingDevice?.id === device.id;

    let icon: CanvasImageSource | undefined = iconUnknown as unknown as CanvasImageSource;
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
        icon = iconUnknown as unknown as CanvasImageSource;
    }

    const x = (device.posPxX / originalWidth) * width;
    const y = (device.posPxY / originalHeight) * height;

    const handlePathClick = () => {
      if (!isDrawingPath) return;
      if (device.id === drawingPath) return;

      const finalNode: PathNodeType = {
        id: crypto.randomUUID(),
        deviceId: device.id,
      } as PathNodeType;

      const forwardNodes = [...pathNodes, finalNode];

      if (!editingDevice) return;

      const forward = {
        deviceId: editingDevice.id,
        paths: forwardNodes,
      } as PathsType;

      const reversedNodes = [...forwardNodes].reverse().map((n) => ({ ...n }));

      reversedNodes.forEach((node, index) => {
        const orig = forwardNodes[forwardNodes.length - 1 - index];
        node.deviceId = orig.deviceId;
        node.posPxX = orig.posPxX;
        node.posPxY = orig.posPxY;
      });

      const backward = {
        deviceId: device.id,
        paths: reversedNodes,
      } as PathsType;

      dispatch(addDevicePathPair({ forward, backward }));
      setPathNodes([]);
      dispatch(DrawingDevicePath(''));
    };

    const handleNormalClick = () => {
      if (isDrawingPath) return;
      if (isActive) return;
      if (editingDevice) {
        setPendingDeviceId(device.id);
        setConfirmDialogOpen(true);
        return;
      }
      dispatch(SelectFloorplanDevice(device.id));
    };

    return (
      <React.Fragment key={device.id}>
        <KonvaImage
          image={icon as CanvasImageSource}
          x={x - 18}
          y={y - 18}
          width={36}
          height={36}
          onClick={isDrawingPath ? undefined : handleNormalClick}
          draggable={isEditing && !isDrawingPath}
          onMouseDown={() => !isDrawingPath && setIsDragging(device.id)}
          onDragEnd={(e) => !isDrawingPath && handleDragEnd(e, device)}
          stroke={isActive ? 'lightgreen' : 'transparent'}
          strokeWidth={isActive ? 5 : 0}
        />
        {isDrawingPath && device.id !== drawingPath && (
          <Circle
            x={x}
            y={y}
            radius={26}
            stroke="yellow"
            strokeWidth={4}
            opacity={0.75}
            onClick={handlePathClick}
          />
        )}
      </React.Fragment>
    );
  };

  const getNodeScreenPos = (node: PathNodeType): { x: number; y: number } => {
    if (node.deviceId) {
      const dev = devices?.find((d) => d.id === node.deviceId);
      if (dev) {
        return {
          x: pxToScreenX(dev.posPxX),
          y: pxToScreenY(dev.posPxY),
        };
      }
    }
    return {
      x: pxToScreenX(node.posPxX ?? 0),
      y: pxToScreenY(node.posPxY ?? 0),
    };
  };

  // helper to get image natural size safely
  function getImageSize(src?: HTMLImageElement | undefined) {
    if (!src) return { width: 0, height: 0 };
    return {
      width: src.naturalWidth || (src as any).width || 0,
      height: src.naturalHeight || (src as any).height || 0,
    };
  }
  const bgSize = useMemo(() => getImageSize(bgImage || previewImage), [bgImage, previewImage]);

  return (
    <>
      <Stage
        width={width}
        height={height}
        ref={stageRef as any}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stageX}
        y={stageY}
        onMouseMove={(e) => {
          const pos = e.target.getStage()?.getPointerPosition();
          if (pos) setCursorPos({ x: pos.x, y: pos.y });
        }}
        onClick={(e) => handleCanvasClickForPath(e)}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          if (drawingPath) {
            dispatch(DrawingDevicePath(''));
            setPathNodes([]);
          }
        }}
      >
        {/* Background in FastLayer for performance */}
        <FastLayer>
          {/* Prefer full bgImage, fallback to previewImage */}
          {(bgImage || previewImage) && (
            <KonvaImage
              image={(bgImage || previewImage) as CanvasImageSource}
              width={bgSize.width}
              height={bgSize.height}
              x={0}
              y={0}
              listening={false}
            />
          )}
        </FastLayer>

        <Layer listening={false}>
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

        {/* Heatmap */}
        {heatmapImage && showEffectiveArea && (
          <FastLayer>
            <KonvaImage
              image={heatmapImage as CanvasImageSource}
              x={0}
              y={0}
              width={width}
              height={height}
              opacity={0.95}
              listening={false}
            />
          </FastLayer>
        )}

        {/* Drawing path layer */}
        <Layer listening={false}>
          {pathNodes.length > 1 &&
            pathNodes.map((n, i) => {
              if (i === pathNodes.length - 1) return null;
              const next = pathNodes[i + 1];
              const p1 = getNodeScreenPos(n);
              const p2 = getNodeScreenPos(next);
              return (
                <Line
                  key={`seg-${i}`}
                  points={[p1.x, p1.y, p2.x, p2.y]}
                  stroke="yellow"
                  strokeWidth={3}
                />
              );
            })}

          {pathNodes.length > 0 && cursorPos && (
            <Line
              points={[
                getNodeScreenPos(pathNodes[pathNodes.length - 1]).x,
                getNodeScreenPos(pathNodes[pathNodes.length - 1]).y,
                cursorPos.x,
                cursorPos.y,
              ]}
              stroke="yellow"
              strokeWidth={2}
              dash={[10, 5]}
              opacity={0.8}
            />
          )}

          {pathNodes.map((n, idx) => {
            const p = getNodeScreenPos(n);
            return (
              <Circle
                key={n.id}
                x={p.x}
                y={p.y}
                radius={idx === 0 ? 8 : 5}
                fill={idx === 0 ? 'green' : 'black'}
                stroke="white"
                strokeWidth={idx === 0 ? 2 : 1}
              />
            );
          })}
        </Layer>

        {/* Saved editing paths */}
        <Layer listening={false}>
          {editingPaths.map((pathObj) =>
            pathObj.paths.map((node, i) => {
              if (i === pathObj.paths.length - 1) return null;
              const next = pathObj.paths[i + 1];
              const p1 = getNodeScreenPos(node);
              const p2 = getNodeScreenPos(next);
              return (
                <Line
                  key={`saved-${pathObj.id}-${i}`}
                  points={[p1.x, p1.y, p2.x, p2.y]}
                  stroke="#00e5ff"
                  strokeWidth={4}
                />
              );
            }),
          )}

          {editingPaths.flatMap((pathObj) =>
            pathObj.paths.map((node, idx) => {
              const p = getNodeScreenPos(node);
              return (
                <Circle
                  key={`saved-node-${pathObj.id}-${node.id}`}
                  x={p.x}
                  y={p.y}
                  radius={idx === 0 ? 8 : 5}
                  fill={idx === 0 ? 'cyan' : 'white'}
                  stroke="black"
                  strokeWidth={idx === 0 ? 2 : 1}
                />
              );
            }),
          )}
        </Layer>

        {/* Icons layer (interactive) */}
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
