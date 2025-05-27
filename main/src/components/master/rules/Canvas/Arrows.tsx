import { useSelector, useDispatch } from 'react-redux';
import { Arrow, Line } from 'react-konva';
import { setHoveredArrowIndex, deleteArrow, ArrowType } from 'src/store/apps/rules/RulesConnectors';

const Arrows = (arrow: ArrowType) => {
  const dispatch = useDispatch();
  const nodes = useSelector((state: any) => state.RulesNodeReducer.nodes);
  const hoveredArrowIndex = useSelector(
    (state: any) => state.RulesConnectorReducer.hoveredArrowIndex,
  );
  const calculateTextWidth = (
    text: string,
    fontSize: number = 16,
    fontFamily: string = 'Arial',
  ) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = `${fontSize}px ${fontFamily}`;
      return context.measureText(text).width;
    }
    return 100; // Fallback width
  };

  if (!arrow) return null;
  const startNode = nodes.find((node: any) => node.id === arrow.startNodeId);
  const endNode = nodes.find((node: any) => node.id === arrow.endNodeId);
  if (!startNode || !endNode) return null;
  const nameWidth = calculateTextWidth(startNode.name, 16);
  const detailsText = (() => {
    if (startNode.details.startsWith('Choose a')) {
      return startNode.details; // Default text if no details are provided
    }
    const detailsParts = startNode.details.split(' - '); // Split into Building, Floorplan, and Area sections
    const buildings = detailsParts[0]?.split(',').map((b: string) => b.trim()) || [];
    const floorplans = detailsParts[1]?.split(',').map((f: string) => f.trim()) || [];
    const areas = detailsParts[2]?.split(',').map((a: string) => a.trim()) || [];
    const members = detailsParts[3]?.split(',').map((m: string) => m.trim()) || [];

    const firstBuilding = buildings[0] || 'No Building';
    const extraBuildings = buildings.length > 1 ? ` +${buildings.length - 1}` : '';

    const firstFloorplan = floorplans[0] || 'No Floorplan';
    const extraFloorplans = floorplans.length > 1 ? ` +${floorplans.length - 1}` : '';

    const firstArea = areas[0] || 'No Area';
    const extraAreas = areas.length > 1 ? ` +${areas.length - 1}` : '';

    const firstMember = members[0] || '';
    const extraMembers = members.length > 1 ? ` +${members.length - 1}` : '';
    if (firstMember && extraMembers) {
      return `${firstBuilding}${extraBuildings} | ${firstFloorplan}${extraFloorplans} | ${firstArea}${extraAreas} | ${firstMember}${extraMembers}`;
    }
    return `${firstBuilding}${extraBuildings} | ${firstFloorplan}${extraFloorplans} | ${firstArea}${extraAreas}`;
  })();
  const detailsWidth = calculateTextWidth(detailsText, 12);
  const textWidthStart = Math.max(nameWidth, detailsWidth); // Approximate text width
  const rectWidthStart = Math.max(textWidthStart + 20, 100);

  const points = [
    startNode.posX + rectWidthStart, // Arrow start position (right side of the start node)
    startNode.posY + 25, // Center vertically relative to the Rect
    startNode.posX + rectWidthStart + 10, // Add straight line from the arrow start
    startNode.posY + 25,
    endNode.posX - 25, // Add straight line before the arrow end
    endNode.posY + 25,
    endNode.posX - 5, // Arrow end position (Arrow Pointer)
    endNode.posY + 25,
  ];
  return (
    <>
      {/* Invisible Line for wider right-click area */}
      <Line
        points={points}
        stroke="transparent"
        strokeWidth={20}
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
        stroke={hoveredArrowIndex === arrow.id ? 'blue' : 'black'}
        fill={hoveredArrowIndex === arrow.id ? 'blue' : 'black'}
        pointerLength={10}
        pointerWidth={10}
        strokeWidth={2}
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
