import { useSelector } from 'react-redux';
import { Arrow } from 'react-konva';

const PreviewArrow = () => {
  const nodes = useSelector((state: any) => state.RulesNodeReducer.nodes);
  const arrowDrawing = useSelector((state: any) => state.RulesConnectorReducer.arrowDrawing);

  if (!arrowDrawing || !arrowDrawing.arrowPreviewEnd) return null;

  const startNode = nodes.find((node: any) => node.id === arrowDrawing.startNodeId);
  if (!startNode) return null;


  const points = [
    startNode.posX + startNode.dimensions.width, // Arrow start position (right side of the start node)
    startNode.posY + startNode.dimensions.height / 2, // Center vertically relative to the Rect
    startNode.posX + startNode.dimensions.width + 10, // Add straight line from the arrow start
    startNode.posY + startNode.dimensions.height / 2,
    arrowDrawing.arrowLatch ? arrowDrawing.arrowLatch.x - 25 : arrowDrawing.arrowPreviewEnd.x - 25, // Latched position if available
    arrowDrawing.arrowLatch ? arrowDrawing.arrowLatch.y : arrowDrawing.arrowPreviewEnd.y,
    arrowDrawing.arrowLatch ? arrowDrawing.arrowLatch.x - 5 : arrowDrawing.arrowPreviewEnd.x - 5, // Latched position if available
    arrowDrawing.arrowLatch ? arrowDrawing.arrowLatch.y : arrowDrawing.arrowPreviewEnd.y,
  ];

  return (
    <Arrow
      points={points}
      stroke="gray"
      fill="gray"
      pointerLength={10}
      pointerWidth={10}
      dash={[8, 3]} // Dashed line for the preview
    />
  );
};

export default PreviewArrow;
