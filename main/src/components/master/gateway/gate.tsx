import React, { useEffect, useState } from 'react';
import { Stage, Layer, Rect, Line, Image as KonvaImage } from 'react-konva';
import { useSelector, useDispatch } from 'src/store/Store';
import { fetchGates, SelectGate, UpdateGate } from '../../../store/apps/tracking/GatesSlice';
import {
  fetchBleReaders,
  SelectBleReader,
  bleReaderType,
  UpdateBleReader,
  RevertBleReader,
} from 'src/store/apps/crud/bleReader';
import { gatesType } from 'src/types/tracking/gate';

const Initial_Size = 25;

interface Props {
  width: number;
  height: number;
  imageSrc?: string;
  setIsDragging?: (dragging: boolean) => void;
  activeGateways: string[];
}

const Gates: React.FC<Props> = ({ width, height, imageSrc, setIsDragging, activeGateways }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchGates());
    dispatch(fetchBleReaders());
    console.log(gateway);
  }, [dispatch]);
  const gateway: gatesType[] = useSelector((state) =>
    state.gateReducer.unsavedGates.filter((gate) => (gate as gatesType).isActive),
  );
  const selectedGate = useSelector((state) => state.bleReaderReducer.selectedBleReader);
  const [isEditing, setIsEditing] = useState('');
  //const isAnyGateEditing = gateway.some((gate) => gate.isEditing);
  const gridSize = 25;
  const lines = [];

  const filterGates = (gates: bleReaderType[], activeGateways?: string[]) => {
    // console.log('Gates: ', gates);
    // console.log('Active Gateways: ', activeGateways);
    if (!Array.isArray(activeGateways) || activeGateways.length === 0) {
      return gates; // Return all gates if activeGateways is undefined or empty
    }

    return gates.filter((g: bleReaderType) =>
      activeGateways.some((gateway) =>
        g.id.toLocaleLowerCase().includes(gateway.toLocaleLowerCase()),
      ),
    );
  };
  const bleReader: bleReaderType[] = useSelector((state) =>
    filterGates(state.bleReaderReducer.bleReaders, activeGateways),
  );
  // Vertical lines
  for (let x = 0; x < width; x += gridSize) {
    lines.push(
      <Line key={`v-${x}`} points={[x, 0, x, height]} stroke="lightgray" strokeWidth={1} />,
    );
  }

  // Horizontal lines
  for (let y = 0; y < height; y += gridSize) {
    lines.push(
      <Line key={`h-${y}`} points={[0, y, width, y]} stroke="lightgray" strokeWidth={1} />,
    );
  }

  const snapToGrid = (value: number, gridSize: number = 25) => {
    if (!value || isNaN(value)) return 0; // Prevent NaN issues
    return Math.round(value / gridSize) * gridSize; // Example: Snap to 25px grid
  };

  const handleDragEnd = (e: any, id: string) => {
    const { x, y } = e.target.position();
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);
    e.target.to({
      x: snappedX,
      y: snappedY,
      duration: 0.1, // Smooth snap
    });
    dispatch(UpdateBleReader(id, { locationPxX: snappedX, locationPxY: snappedY }));
    //console.log('Drag End');
    if (!isColliding(snappedX, snappedY, id, bleReader, Initial_Size)) {
      e.target.to({
        x: snappedX,
        y: snappedY,
        duration: 0.1, // Smooth snap
      });
      dispatch(UpdateBleReader(id, { locationPxX: snappedX, locationPxY: snappedY }));
      //dispatch(UpdateGate(id, { posX: snappedX, posY: snappedY }));
    } else {
      const newPosition = findNonCollidingPosition(snappedX, snappedY, id, bleReader, gridSize);
      e.target.to({
        x: newPosition.x ?? 0,
        y: newPosition.y ?? 0,
        duration: 0.1,
      });
    }
  };

  const isColliding = (x: number, y: number, id: string, gates: bleReaderType[], size: number) => {
    return gates.some((gate) => {
      if (gate.id === id) return false; // Ignore self
      return !(
        (
          x + size <= gate.locationPxX || // Left of existing gate
          x >= gate.locationPxX + size || // Right of existing gate
          y + size <= gate.locationPxY || // Above existing gate
          y >= gate.locationPxY + size
        ) // Below existing gate
      );
    });
  };

  const findNonCollidingPosition = (
    x: number,
    y: number,
    id: string,
    gates: any[],
    size: number,
  ) => {
    let newX = x;
    let newY = y;
    const step = 25; // Move in increments of 25px

    while (isColliding(newX, newY, id, gates, size)) {
      newX += step; // Try shifting right
      if (newX > 500) {
        // Example boundary limit
        newX = x;
        newY += step; // Try shifting downward
      }
    }

    return { x: newX, y: newY };
  };

  // Load the image for Konva
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (imageSrc) {
      const img = new window.Image();
      img.src = imageSrc;
      img.onload = () => {
        setImage(img);
      };
    }
  }, [imageSrc]);

  const handleClick = (reader: bleReaderType) => {
    if (selectedGate !== reader) {
      dispatch(SelectBleReader(reader.id));
      dispatch(RevertBleReader(reader.id));
      setIsEditing(reader.id);
    }
  };

  return (
    <Stage
      width={width}
      height={height}
      // scaleX={scale}
      // scaleY={scale}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <Layer>
        {/* Render the floorplan image */}
        {image && (
          <KonvaImage
            image={image}
            width={width}
            height={height} // Scale proportionally
            opacity={0.4}
            top={0}
            left={0}
            bottom={0}
            right={0}
          />
        )}
      </Layer>
      <Layer>{lines}</Layer>
      <Layer>
        {bleReader.map((reader: bleReaderType) => (
          <Rect
            key={reader.id}
            x={reader.locationPxX}
            y={reader.locationPxY}
            width={Initial_Size}
            height={Initial_Size}
            fill={'red'}
            stroke="black"
            strokeWidth={2}
            onClick={() => handleClick(reader)}
            //onClick={() => dispatch(SelectGate(parseInt(reader.id)))}
            draggable={reader.id === isEditing}
            onDragStart={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'grabbing'; // Change cursor to grabbing
              if (setIsDragging) setIsDragging(true); // Notify Tracking that dragging started
            }}
            onDragEnd={(e) => {
              handleDragEnd(e, reader.id);
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = ''; // Change cursor back to pointer
              if (setIsDragging) setIsDragging(false); // Notify Tracking that dragging ended
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = '';
            }}
          />
        ))}
      </Layer>
    </Stage>
  );
};

export default Gates;
