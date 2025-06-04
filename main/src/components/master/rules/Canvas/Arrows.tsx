import { useSelector, useDispatch } from 'react-redux';
import { Arrow, Line } from 'react-konva';
import { setHoveredArrowIndex, deleteArrow, ArrowType } from 'src/store/apps/rules/RulesConnectors';
import { nodeType } from 'src/store/apps/rules/RulesNodes';

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
  const detailsText = (node: nodeType) => {
    if (node.details.startsWith('Choose a')) {
      return node.details;
    }
    const detailsParts = node.details.split(' - ');
    const organizations = detailsParts[0]?.split(',').map((o: string) => o.trim()) || [];
    const departments = detailsParts[1]?.split(',').map((d: string) => d.trim()) || [];
    const districts = detailsParts[2]?.split(',').map((d: string) => d.trim()) || [];
    const members = detailsParts[3]?.split(',').map((m: string) => m.trim()) || [];

    const firstOrganization = organizations[0] || '';
    const extraOrganizations = organizations.length > 1 ? ` +${organizations.length - 1}` : '';
    const firstDepartment = departments[0] || '';
    const extraDepartments = departments.length > 1 ? ` +${departments.length - 1}` : '';
    const firstDistrict = districts[0] || '';
    const extraDistricts = districts.length > 1 ? ` +${districts.length - 1}` : '';
    const firstMember = members[0] || '';
    const extraMembers = members.length > 1 ? ` +${members.length - 1}` : '';

    const formatPart = (first: string, extra: string) => (first ? `${first}${extra}` : '');

    return [
      formatPart(firstOrganization, extraOrganizations),
      formatPart(firstDepartment, extraDepartments),
      formatPart(firstDistrict, extraDistricts),
      formatPart(firstMember, extraMembers),
    ]
      .filter(Boolean)
      .join(' | ');
  };
  const detailsWidth = calculateTextWidth(detailsText(startNode), 12);
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
