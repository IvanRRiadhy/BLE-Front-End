import React from 'react';
import { Box } from '@mui/material';
import { Stage, Layer } from 'react-konva';
import Nodes from './Nodes';
import Arrows from './Arrows';
import MemberNodes from '../Nodes/Member/MemberNodes';
import AreaNodes from '../Nodes/Area/AreaNodes';
import TimeNodes from '../Nodes/Time/TimeNodes';
import VisitorNodes from '../Nodes/Visitor/VisitorNodes';
import AndNodes from '../Nodes/Logical/AndNodes';
import OrNodes from '../Nodes/Logical/OrNodes';
import IfNodes from '../Nodes/Logical/IfNodes';
import PreviewArrow from './PreviewArrow';
import { useSelector, AppState, dispatch } from 'src/store/Store';
import {
  ArrowType,
  setArrowDrawing,
  setArrowPreviewEnd,
} from 'src/store/apps/rules/RulesConnectors';

const nodeComponentMapping: { [key: string]: React.FC<any> } = {
  Member: MemberNodes,
  Visitor: VisitorNodes,
  Area: AreaNodes,
  Time: TimeNodes,
  and: AndNodes,
  or: OrNodes,
  if: IfNodes,
};

const Canvas = () => {
  const nodes = useSelector((state: AppState) => state.RulesNodeReducer.nodes);
  const arrows = useSelector((state: AppState) => state.RulesConnectorReducer.arrows);
  const arrowDrawing = useSelector((state: AppState) => state.RulesConnectorReducer.arrowDrawing);
  return (
    <Box
      sx={{
        flex: 1,
        background: '#f0f0f0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stage
        width={window.innerWidth}
        height={window.innerHeight - 150}
        onMouseMove={(e) => {
          if (arrowDrawing && arrowDrawing.startNodeId) {
            const stage = e.target.getStage();
            const pointerPosition = stage?.getPointerPosition();
            if (pointerPosition) {
              dispatch(
                setArrowPreviewEnd({
                  id: arrowDrawing.id,
                  x: pointerPosition.x,
                  y: pointerPosition.y,
                }),
              );
            }
          }
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = arrowDrawing ? 'crosshair' : 'default';
          }
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = 'default';
          }
        }}
        onClick={(e) => {
          const clickedOnEmptySpace =
            e.target.attrs.name !== 'circle' && e.target.attrs.name !== 'node';

          if (arrowDrawing && clickedOnEmptySpace) {
            dispatch(setArrowDrawing(null));
          }
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
        }}
      >
        <Layer>
          {/* Render Arrows */}
          {arrows.map((arrow: ArrowType) => (
            <Arrows key={arrow.id} {...arrow} />
          ))}
          <PreviewArrow />
          {nodes.map((node: any) => {
            const NodeComponent = nodeComponentMapping[node.name]; // Get the correct component
            if (!NodeComponent) {
              return <Nodes key={node.id} node={node} />;
            }
            return <NodeComponent key={node.id} node={node} />;
          })}
        </Layer>
      </Stage>
      {/* Render Node Popup */}
    </Box>
  );
};

export default Canvas;
