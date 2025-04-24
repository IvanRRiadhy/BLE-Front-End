import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Star, Image as KonvaImage } from 'react-konva';
import { useSelector, useDispatch, AppState } from 'src/store/Store';
import {
  EditUnsavedDevice,
  FloorplanDeviceType,
  SelectEditingFloorplanDevice,
} from 'src/store/apps/crud/floorplanDevice';
import { SelectFloorplanDevice } from 'src/store/apps/crud/floorplanDevice';

const Devices = [
  { id: 1, x: 250, y: 50, type: 'CCTV' },
  { id: 2, x: 20, y: 130, type: 'Reader' },
  { id: 3, x: 300, y: 300, type: 'CCTV' },
  { id: 4, x: 10, y: 200, type: 'CCTV' },
  { id: 5, x: 260, y: 200, type: 'Reader' },
  { id: 6, x: 150, y: 200, type: 'Door' },
];

const EditDeviceRenderer: React.FC<{
  width: number;
  height: number;
  imageSrc?: string;
  scale: number;
  devices?: FloorplanDeviceType[];
  activeDevice?: FloorplanDeviceType | null;
}> = ({ width, height, imageSrc, scale, devices, activeDevice }) => {
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
  }, [imageSrc]);

  // const handleDragMove = (e: any, device: FloorplanDeviceType) => {
  //   const newPosX = (e.target.x() * 4) / scales; // Convert back to original scale
  //   const newPosY = (e.target.y() * 4) / scales;

  //   // Optionally, you can update the device's position in the Redux store here
  //   console.log(`Dragging device ${device.id}:`, { newPosX, newPosY });
  //   dispatch(EditUnsavedDevice({ ...device, posPxX: newPosX, posPxY: newPosY }));
  // };

  const handleDragEnd = (e: any, device: FloorplanDeviceType) => {
    const newPosX = (e.target.x() * 4) / scales; // Convert back to original scale
    const newPosY = (e.target.y() * 4) / scales;

    // Dispatch an action to update the device's position in the Redux store
    dispatch(EditUnsavedDevice({ ...device, posPxX: newPosX, posPxY: newPosY }));

    // console.log(`Device ${device.id} dropped at:`, { newPosX, newPosY });
  };
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const handleConfirmProceed = () => {
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
    // console.log('device', device.posPxX, device.posPxY);
    // console.log('scales', scales);
    switch (device.type) {
      case 'Cctv':
        return (
          <Circle
            key={device.id}
            x={(device.posPxX * scales) / 4}
            y={(device.posPxY * scales) / 4}
            radius={20}
            fill="blue"
            stroke={isActive ? 'lightgreen' : undefined}
            strokeWidth={isActive ? 5 : 0}
            onClick={handleDeviceClick}
            draggable={isEditing} // Make it draggable only if editing
            // onDragMove={(e) => handleDragMove(e, device)} // Handle drag move
            onDragEnd={(e) => handleDragEnd(e, device)} // Handle drag end
          />
        );
      case 'BleReader':
        return (
          <Rect
            key={device.id}
            x={(device.posPxX * scales) / 4}
            y={(device.posPxY * scales) / 4}
            width={40}
            height={40}
            fill="green"
            stroke={isActive ? 'lightgreen' : undefined}
            strokeWidth={isActive ? 5 : 0}
            onClick={handleDeviceClick}
            draggable={isEditing} // Make it draggable only if editing
            // onDragMove={(e) => handleDragMove(e, device)} // Handle drag move
            onDragEnd={(e) => handleDragEnd(e, device)} // Handle drag end
          />
        );
      case 'AccessDoor':
        return (
          <Star
            key={device.id}
            x={(device.posPxX * scales) / 4}
            y={(device.posPxY * scales) / 4}
            numPoints={3}
            innerRadius={15}
            outerRadius={30}
            fill="red"
            stroke={isActive ? 'lightgreen' : undefined}
            strokeWidth={isActive ? 5 : 0}
            onClick={handleDeviceClick}
            draggable={isEditing} // Make it draggable only if editing
            // onDragMove={(e) => handleDragMove(e, device)} // Handle drag move
            onDragEnd={(e) => handleDragEnd(e, device)} // Handle drag end
          />
        );
      default:
        return (
          <Rect
            key={device.id}
            x={(device.posPxX * scales) / 4}
            y={(device.posPxY * scales) / 4}
            width={40}
            height={40}
            fill="gray"
            stroke={isActive ? 'lightgreen' : undefined}
            strokeWidth={isActive ? 5 : 0}
            onClick={handleDeviceClick}
            draggable={isEditing} // Make it draggable only if editing
            // onDragMove={(e) => handleDragMove(e, device)} // Handle drag move
            onDragEnd={(e) => handleDragEnd(e, device)} // Handle drag end
          />
        );
    }
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
