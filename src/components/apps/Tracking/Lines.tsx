// GridLines.tsx
import React from 'react';
import { Layer, Line } from 'react-konva';

const GridLines: React.FC = () => {
  const gridSize = 50; // Adjust for spacing
  const width = window.innerWidth;
  const height = window.innerHeight;
  const lines = [];

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

  return <Layer>{lines}</Layer>;
};

export default GridLines;
