interface Props {
  itemCount: number;
  rows: number;
  columns: number;
  cardWidth: number;
  cardHeight: number;
  gap: number;
}
const CHEVRON_SIZE = 28; // bigger, more visible
const CHEVRON_STEP = 20; // distance between chevrons

const SnakeChevronBackground = ({
  itemCount,
  rows,
  columns,
  cardWidth,
  cardHeight,
  gap,
}: Props) => {
  const rowHeight = cardHeight + gap;
  const colWidth = cardWidth + gap;
  const bandStartX = 0;
  const bandEndX = columns * cardWidth + (columns - 1) * gap;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${columns * colWidth} ${rows * rowHeight}`}
      preserveAspectRatio="xMinYMin meet"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <defs>
        <symbol id="chevron-right" viewBox="0 0 24 24">
          <polyline
            points="8,4 16,12 8,20"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="chevron-left" viewBox="0 0 20 20">
          <polyline
            points="16 4 8 12 16 20"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        <symbol id="chevron-down" viewBox="0 0 20 20">
          <polyline
            points="4 8 12 16 20 8"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
      </defs>

      {Array.from({ length: rows }).map((_, row) => {
        const isRTL = row % 2 === 1;
        const y = row * rowHeight + cardHeight / 2;

        return (
          <g key={row} opacity={0.6}>
            {/* Horizontal chevrons — STRICTLY inside existing cards */}
            {(() => {
              const chevrons = [];

              const startIndex = row * columns;
              const itemsInRow = Math.min(columns, itemCount - startIndex);

              if (itemsInRow <= 1) return null;

              const rowWidth = itemsInRow * cardWidth + (itemsInRow - 1) * gap;
              const RTLStart = cardWidth * 4;
              const RTLRowWidth = RTLStart + rowWidth;
              const RTLEnd = RTLStart - rowWidth + 220;

              if (!isRTL) {
                // LTR: first card → last card
                for (let x = cardWidth; x <= rowWidth ; x += CHEVRON_STEP) {
                  chevrons.push(
                    <use
                      key={`ltr-${x}`}
                      href="#chevron-right"
                      x={x}
                      y={y - CHEVRON_SIZE / 2}
                      width={CHEVRON_SIZE}
                      height={CHEVRON_SIZE}
                      opacity={0.35}
                    />,
                  );
                }
              } else {
                // RTL: right-most card → left-most card
                for (let x = RTLStart - CHEVRON_SIZE; x >= RTLEnd; x -= CHEVRON_STEP) {
                  chevrons.push(
                    <use
                      key={`rtl-${x}`}
                      href="#chevron-left"
                      x={x}
                      y={y - CHEVRON_SIZE / 2}
                      width={CHEVRON_SIZE}
                      height={CHEVRON_SIZE}
                      opacity={0.35}
                    />,
                  );
                }
              }

              return chevrons;
            })()}

            {/* Vertical chevrons at row end */}
            {row < rows - 1 &&
              (() => {
                const x = isRTL ? cardWidth/2 : columns * (cardWidth + gap);

                const chevrons = [];
                for (let i = 0; i < cardHeight; i += CHEVRON_STEP) {
                  chevrons.push(
                    <use
                      key={i}
                      href="#chevron-down"
                      x={x}
                      y={y + i}
                      width={CHEVRON_SIZE}
                      height={CHEVRON_SIZE}
                      opacity={0.35}
                    />,
                  );
                }
                return chevrons;
              })()}
          </g>
        );
      })}
    </svg>
  );
};

export default SnakeChevronBackground;
