import React, { useEffect, useState } from 'react';
import { Stage, Layer, Rect, Arrow, Line, Image as KonvaImage } from 'react-konva';
import { useSelector, useDispatch } from 'src/store/Store';
import { fetchGates, SelectGate } from '../../../store/apps/tracking/GatesSlice';
import { gatesType } from 'src/types/tracking/gate';

const Initial_Size = 50;

const Squares: React.FC<{
  width: number;
  height: number;
  imageSrc?: string;
  setIsDragging?: (dragging: boolean) => void;
}> = ({ width, height, imageSrc, setIsDragging }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchGates());
  }, [dispatch]);

  const filterGates = (gates: gatesType[], gSearch: string) => {
    if (gSearch !== '')
      return gates.filter(
        (t: any) =>
          t.isActive && t.id.toLocaleLowerCase().concat(' ').includes(gSearch.toLocaleLowerCase()),
      );

    return gates.filter((t) => t.isActive);
  };

  const gateway = useSelector((state) =>
    filterGates(state.gateReducer.unsavedGates, state.gateReducer.gateSearch),
  );

  const gridSize = 50;

  // useEffect(() => {
  //   const updateSize = () => {
  //     if (containerRef.current) {
  //       setDimensions({
  //         width: containerRef.current.clientWidth,
  //         height: containerRef.current.clientHeight,
  //       });
  //     }
  //   };

  //   updateSize();
  //   window.addEventListener('resize', updateSize);

  //   return () => {
  //     window.removeEventListener('resize', updateSize);
  //   };
  // }, []);

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

  //Getting the coordinate of the edge of the squares
  const getEdgePosition = (start: gatesType, end: gatesType): number[] => {
    const size = Initial_Size;

    if (
      start.posX === undefined ||
      start.posY === undefined ||
      end.posX === undefined ||
      end.posY === undefined
    ) {
      throw new Error('Start or end position is undefined');
    }

    let startX = start.posX + size / 2;
    let startY = start.posY + size / 2;
    let endX = end.posX + size / 2;
    let endY = end.posY + size / 2;

    const dx = endX - startX;
    const dy = endY - startY;
    let angle = Math.atan2(-dy, dx);

    startX = startX + -size * Math.cos(angle + Math.PI);
    startY = startY + size * Math.sin(angle + Math.PI);
    endX = endX + -size * Math.cos(angle);
    endY = endY + size * Math.sin(angle);

    return [startX, startY, endX, endY];
  };

  return (
    <Stage width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Layer>
        {/* Render the floorplan image */}
        {image && (
          <KonvaImage
            image={image}
            width={width}
            height={height} // Scale proportionally
            opacity={1}
            top={0}
            left={0}
            bottom={0}
            right={0}
          />
        )}
      </Layer>
      <Layer>
        {gateway.map((gate) => (
          <Rect
            key={gate.id}
            x={gate.posX}
            y={gate.posY}
            width={Initial_Size}
            height={Initial_Size}
            fill={gate.color}
            stroke="black"
            strokeWidth={2}
          />
        ))}
        {gateway.map((startgate) =>
          gateway.map((endgate) => {
            if (startgate.id !== endgate.id) {
              const [startX, startY, endX, endY] = getEdgePosition(startgate, endgate);
              return (
                <Arrow
                  key={`${startgate.id}-${endgate.id}`}
                  points={[startX, startY, endX, endY]}
                  stroke="black"
                  fill="black"
                  strokeWidth={5}
                  pointerWidth={15}
                  pointerLength={15}
                />
              );
            }
            return null;
          }),
        )}
      </Layer>
    </Stage>
  );
};

export default Squares;
