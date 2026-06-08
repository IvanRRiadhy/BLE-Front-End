import { useSelector, useDispatch } from 'react-redux';
import { Arrow, Line } from 'react-konva';
import { setHoveredArrowIndex, deleteArrow, ArrowType } from 'src/store/apps/rules/RulesConnectors';

const Arrows = (arrow: ArrowType) => {
  const dispatch = useDispatch();
  const nodes = useSelector((state: any) => state.RulesNodeReducer.nodes);
  const hoveredArrowIndex = useSelector(
    (state: any) => state.RulesConnectorReducer.hoveredArrowIndex,
  );

  if (!arrow) return null;
  const startNode = nodes.find((node: any) => node.id === arrow.startNodeId);
  const endNode = nodes.find((node: any) => node.id === arrow.endNodeId);
  if (!startNode || !endNode) return null;


  const points = [
    startNode.posX + startNode.dimensions.width, // Arrow start position (right side of the start node)
    startNode.posY + startNode.dimensions.height / 2, // Center vertically relative to the Rect
    startNode.posX + startNode.dimensions.width + 10, // Add straight line from the arrow start
    startNode.posY + startNode.dimensions.height / 2,
    endNode.posX - 25, // Add straight line before the arrow end
    endNode.posY + startNode.dimensions.height / 2,
    endNode.posX - 5, // Arrow end position (Arrow Pointer)
    endNode.posY + startNode.dimensions.height / 2,
  ];

  const arrowColorMap: Record<string, string> = {
    IF_True: 'lightgreen',
    IF_False: 'red',
  };
  const arrowColor = hoveredArrowIndex === arrow.id ? 'blue' : arrowColorMap[arrow.type] || 'black';

  return (
    <>
      {/* Invisible Line for wider right-click area */}
      <Line
      name='detectorLine'
        points={points}
        stroke="transparent"
        strokeWidth={30}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          dispatch(deleteArrow(arrow.id));
        }}
        onMouseEnter={() => {
          dispatch(setHoveredArrowIndex(arrow.id));
        }}
        onMouseLeave={() => {
          dispatch(setHoveredArrowIndex(''));
        }}
      />
      {/* Actual Arrow */}
      <Arrow
        points={points}
        stroke={arrowColor}
        fill={arrowColor}
        pointerLength={10}
        pointerWidth={10}
        strokeWidth={2} 
        onContextMenu={(e) => {
          e.evt.preventDefault();
          dispatch(deleteArrow(arrow.id));
        }}
        onMouseEnter={() => {
          dispatch(setHoveredArrowIndex(arrow.id));
        }}
      />
      {/* Render the preview arrow */}
      {/* {arrowDrawing &&
        arrowDrawing.arrowPreviewEnd &&
        (() => {
          console.log('arrowDrawing', arrowDrawing);
          const startNode = nodes.find((node: any) => node.id === arrowDrawing.startNodeId);
          if (!startNode) return null;

          const textWidthStart = calculateTextWidth(startNode.name, 16); // Approximate text width
          const rectWidthStart = Math.max(textWidthStart + 20, 100) + 8; // Add padding for the start node

          return (
            <Arrow
              points={[
                startNode.posX + rectWidthStart, // Start position (right side of the start node)
                startNode.posY + 25, // Center vertically relative to the Rect
                startNode.posX + rectWidthStart + 10, // Add straight line from the arrow start
                startNode.posY + 25,
                arrowDrawing.arrowLatch
                  ? arrowDrawing.arrowLatch.x - 25
                  : arrowDrawing.arrowPreviewEnd.x - 25, // Latched position if available
                arrowDrawing.arrowLatch
                  ? arrowDrawing.arrowLatch.y
                  : arrowDrawing.arrowPreviewEnd.y,
                arrowDrawing.arrowLatch
                  ? arrowDrawing.arrowLatch.x - 5
                  : arrowDrawing.arrowPreviewEnd.x - 5, // Latched position if available
                arrowDrawing.arrowLatch
                  ? arrowDrawing.arrowLatch.y
                  : arrowDrawing.arrowPreviewEnd.y,
              ]}
              stroke="gray"
              fill="gray"
              pointerLength={10}
              pointerWidth={10}
              dash={[10, 5]} // Dashed line for the preview
            />
          );
        })()} */}
    </>
  );
};

export default Arrows;
