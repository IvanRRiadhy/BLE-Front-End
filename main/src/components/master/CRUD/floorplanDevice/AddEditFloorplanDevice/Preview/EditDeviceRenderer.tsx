import {
  Button,
  darken,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Star, Image as KonvaImage, Line } from 'react-konva';
import { useSelector, useDispatch, AppState } from 'src/store/Store';
import {
  EditUnsavedDevice,
  FloorplanDeviceType,
  RevertDevice,
  SelectEditingFloorplanDevice,
  SelectFloorplanDevice,
  editDevicePosition,
} from 'src/store/apps/crud/floorplanDevice';

import FaceRecog from 'src/assets/images/svgs/devices/FACE RECOGNITION FIX.svg';
import borderFaceRecog from 'src/assets/images/svgs/devices/FACE READER ICON.png';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
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
  imageSrc?: string;
  scale: number;
  devices?: FloorplanDeviceType[];
  activeDevice?: FloorplanDeviceType | null;
  setIsDragging: (isDragging: string) => void;
  areas: MaskedAreaType[];
  showAreas: boolean;
}> = ({
  width,
  height,
  imageSrc,
  scale,
  devices,
  activeDevice,
  setIsDragging,
  areas,
  showAreas,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [scales, setScale] = useState<number>(scale);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const editingDevice = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );
  useEffect(() => {
    if (imageSrc) {
      const img = new window.Image();
      img.src = imageSrc;
      img.onload = () => {
        setImage(img);
      };
    }
    console.log('Width:', width, 'Height:', height, 'Scale:', scale);
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
  const iconCCTV = useDeviceIcon(CCTVSVG);
  const iconGateway = useDeviceIcon(borderGateway);
  const iconFaceRecog = useDeviceIcon(borderFaceRecog);
  const iconUnknown = useDeviceIcon(UnknownDevice);
  const setPointsFromNodes = (nodes: Nodes[]): number[] => {
    return nodes.flatMap((node) => [node.x, node.y]); // Flatten x and y into a single array
  };
  // const handleDragMove = (e: any, device: FloorplanDeviceType) => {
  //   const newPosX = (e.target.x() * 4) / scales; // Convert back to original scale
  //   const newPosY = (e.target.y() * 4) / scales;

  //   // Optionally, you can update the device's position in the Redux store here
  //   console.log(`Dragging device ${device.id}:`, { newPosX, newPosY });
  //   dispatch(EditUnsavedDevice({ ...device, posPxX: newPosX, posPxY: newPosY }));
  // };
  function isPointInPolygon(point: { x: number; y: number }, polygon: Nodes[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.00001) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
  const handleDragStart = (e: string) => {
    console.log('Drag started:', e); // Log the name of the dragged element
    setIsDragging(e); // Set dragging state to true
  };

  const handleDragEnd = (e: any, device: FloorplanDeviceType) => {
    const newPosX = e.target.x() + 18; // Convert back to original scale
    const newPosY = e.target.y() + 18;

    // Check if the device is inside any area
    const devicePoint = { x: newPosX, y: newPosY };
      let detectedAreaId = device.floorplanMaskedAreaId || ''; // Initialize with existing area ID or empty string
    areas.forEach((area) => {
      if (area.nodes && isPointInPolygon(devicePoint, area.nodes)) {
        console.log(`Device ${device.id} is inside area ${area.name}`);
      detectedAreaId = area.id;
      }
    });
    // Dispatch an action to update the device's position in the Redux store
    // dispatch(EditUnsavedDevice({ ...device, posPxX: newPosX, posPxY: newPosY }));
    const newDevice = { ...device, floorplanMaskedAreaId: detectedAreaId, posPxX: newPosX, posPxY: newPosY };
    dispatch(editDevicePosition(newDevice)); // Update the device position in the store
    setIsDragging(''); // Set dragging state to false
    // console.log(`Device ${device.id} dropped at:`, { newPosX, newPosY });
  };
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const handleConfirmProceed = () => {
    dispatch(RevertDevice(editingDevice?.id || '')); // Revert the device to its original state
    if (pendingDeviceId) {
      dispatch(SelectFloorplanDevice(pendingDeviceId));
      dispatch(SelectEditingFloorplanDevice(null));
    }

    setConfirmDialogOpen(false); // Close the dialog
    setPendingDeviceId(null); // Clear the pending device ID
  };
  const handleCancelProceed = () => {
    setConfirmDialogOpen(false); // Close the dialog
    setPendingDeviceId(null); // Clear the pending device ID
  };
  const renderDeviceShape = (device: FloorplanDeviceType) => {
    const isActive = activeDevice?.id === device.id;
    const isEditing = editingDevice?.id === device.id; // Check if the device is being edited
    const handleDeviceClick = () => {
      if (isActive) return; // Prevent re-selecting the same device
      // console.log('id: ', id);
      if (editingDevice) {
        setPendingDeviceId(device.id); // Store the device ID for later use
        setConfirmDialogOpen(true); // Open the confirmation dialog
        return;
      }
      dispatch(SelectFloorplanDevice(device.id));
    };
    let deviceIcon, width, height;
    switch (device.type) {
      case 'Cctv':
        deviceIcon = iconCCTV;
        width = 36;
        height = 36;
        break;
      case 'BleReader':
        deviceIcon = iconGateway;
        width = 36;
        height = 36;
        break;
      case 'AccessDoor':
        deviceIcon = iconFaceRecog;
        width = 36;
        height = 36;
        break;

      default:
        deviceIcon = iconUnknown;
        width = 36;
        height = 36;
        break;
    }
    const x = device.posPxX - width / 2; // Center the icon inside the rect
    const y = device.posPxY - height / 2; // Center the icon inside the rect
    return (
      deviceIcon && (
        <KonvaImage
          key={device.id}
          name="Device"
          image={deviceIcon}
          x={x} // Center the icon inside the rect
          y={y}
          width={width}
          height={height}
          // listening={false}
          onClick={handleDeviceClick}
          draggable={isEditing} // Make it draggable only if editing
          // onDragMove={(e) => handleDragMove(e, device)} // Handle drag move
          onMouseDown={() => handleDragStart(device.id)} // Handle drag start
          // onDragStart={handleDragStart} // Handle drag start
          onDragEnd={(e) => handleDragEnd(e, device)} // Handle drag end
          stroke={isActive ? 'lightgreen' : 'transparent'}
          strokeWidth={isActive ? 5 : 0}
        />
      )
    );
    // console.log('device', device.posPxX, device.posPxY);
    // console.log('scales', scales);
    // switch (device.type) {
    //   case 'Cctv':
    //     const icon = useDeviceIcon(CCTVSVG);
    //     const x = (device.posPxX * scales) / 4;
    //     const y = (device.posPxY * scales) / 4;
    //     return (
    //       <>
    //         {/* <Circle
    //           name="Device"
    //           key={device.id}
    //           x={x}
    //           y={y}
    //           radius={20}
    //           fill="transparent"
    //           stroke={isActive ? 'lightgreen' : undefined}
    //           strokeWidth={isActive ? 5 : 0}
    //         /> */}
    //         {icon && (
    //           <KonvaImage
    //             image={icon}
    //             x={x} // Center the icon inside the rect
    //             y={y}
    //             width={36}
    //             height={36}
    //             // listening={false}
    //             onClick={handleDeviceClick}
    //             draggable={isEditing} // Make it draggable only if editing
    //             // onDragMove={(e) => handleDragMove(e, device)} // Handle drag move
    //             onMouseDown={() => handleDragStart(device.id)} // Handle drag start
    //             // onDragStart={handleDragStart} // Handle drag start
    //             onDragEnd={(e) => handleDragEnd(e, device)} // Handle drag end
    //             stroke={isActive ? 'lightgreen' : 'transparent'}
    //             strokeWidth={isActive ? 5 : 0}
    //           />
    //         )}
    //       </>
    //     );
    //   case 'BleReader': {
    //     const icon = useDeviceIcon(GatewaySVG); // Use your SVG or PNG path
    //     const x = (device.posPxX * scales) / 4;
    //     const y = (device.posPxY * scales) / 4;
    //     return (
    //       <>
    //         <Rect
    //           name="Device"
    //           key={device.id}
    //           x={x}
    //           y={y}
    //           width={40}
    //           height={40}
    //           fill="transparent"
    //           stroke={isActive ? 'lightgreen' : undefined}
    //           strokeWidth={isActive ? 5 : 0}
    //           onClick={handleDeviceClick}
    //           draggable={isEditing}
    //           onMouseDown={() => handleDragStart(device.id)}
    //           onDragEnd={(e) => handleDragEnd(e, device)}
    //         />
    //         {icon && (
    //           <KonvaImage
    //             image={icon}
    //             x={x} // Center the icon inside the rect
    //             y={y}
    //             width={40}
    //             height={40}
    //             listening={false}
    //           />
    //         )}
    //       </>
    //     );
    //   }
    //   case 'AccessDoor': {
    //     const icon = useDeviceIcon(FaceRecog);
    //     const x = (device.posPxX * scales) / 4;
    //     const y = (device.posPxY * scales) / 4;
    //     return (
    //       <>
    //         <Star
    //           name="Device"
    //           key={device.id}
    //           x={x}
    //           y={y}
    //           numPoints={3}
    //           innerRadius={15}
    //           outerRadius={30}
    //           fill="red"
    //           stroke={isActive ? 'lightgreen' : undefined}
    //           strokeWidth={isActive ? 5 : 0}
    //           onClick={handleDeviceClick}
    //           draggable={isEditing}
    //           onMouseDown={() => handleDragStart(device.id)}
    //           onDragEnd={(e) => handleDragEnd(e, device)}
    //         />
    //         {icon && (
    //           <KonvaImage image={icon} x={x} y={y} width={50} height={50} listening={false} />
    //         )}
    //       </>
    //     );
    //   }
    //   default:
    //     return (
    //       <Rect
    //         name="Device"
    //         key={device.id}
    //         x={(device.posPxX * scales) / 4}
    //         y={(device.posPxY * scales) / 4}
    //         width={40}
    //         height={40}
    //         fill="gray"
    //         stroke={isActive ? 'lightgreen' : undefined}
    //         strokeWidth={isActive ? 5 : 0}
    //         onClick={handleDeviceClick}
    //         draggable={isEditing} // Make it draggable only if editing
    //         // onDragMove={(e) => handleDragMove(e, device)} // Handle drag move
    //         onMouseDown={() => handleDragStart(device.id)} // Handle drag start
    //         onDragEnd={(e) => handleDragEnd(e, device)} // Handle drag end
    //       />
    //     );
    // }
  };

  return (
    <>
      <Stage width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Layer>
          {image && (
            <KonvaImage
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
                points={area.nodes ? setPointsFromNodes(area.nodes) : []}
                stroke={darken(area.colorArea, 0.5)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={area.colorArea}
                opacity={0.5}
              />
            ))}
          {/*Render devices*/}
          {devices && devices.map((device) => renderDeviceShape(device))}
        </Layer>
      </Stage>
      <Dialog open={confirmDialogOpen} onClose={handleCancelProceed} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are still in editing mode. Any editing progress will be cancelled if you wish to
            proceed. Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelProceed} color="primary" variant="contained">
            Cancel
          </Button>
          <Button onClick={handleConfirmProceed} color="error">
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditDeviceRenderer;
