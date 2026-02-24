import React, { useEffect, useRef, useState } from 'react';
import { Tooltip, Box, Typography, TypographyProps, SxProps } from '@mui/material';

interface SmartScrollingTextProps extends TypographyProps {
  text: string;
  containerSx?: SxProps; // optional styling for outer container
  pauseDuration?: number; // optional pause override (default 1000ms)
  speed?: number; // ms per step
  hoverDelay?: number; // delay before starting scroll on hover (default 1200ms)
}

const SmartScrollingText: React.FC<SmartScrollingTextProps> = ({
  text,
  containerSx,
  pauseDuration = 1000,
  speed = 80,
  hoverDelay = 1200,
  sx,
  ...typographyProps
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [visibleChars, setVisibleChars] = useState(text.length);
  const [startIndex, setStartIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  const directionRef = useRef<'forward' | 'backward'>('forward');
  const pausedRef = useRef(false);

  /* Measure how many characters fit */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const temp = document.createElement('span');
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.whiteSpace = 'nowrap';

    // Apply font styles dynamically
    if (typographyProps.fontSize) temp.style.fontSize = String(typographyProps.fontSize);
    if (typographyProps.fontWeight) temp.style.fontWeight = String(typographyProps.fontWeight);

    document.body.appendChild(temp);

    let count = text.length;

    for (let i = 1; i <= text.length; i++) {
      temp.innerText = text.slice(0, i) + '...';
      if (temp.offsetWidth > container.clientWidth) {
        count = i - 1;
        break;
      }
    }

    document.body.removeChild(temp);
    setVisibleChars(count);
  }, [text, typographyProps.fontSize, typographyProps.fontWeight]);
  

  /* Animation loop */
  useEffect(() => {
    if (!hovered || visibleChars >= text.length) return;
    isActiveRef.current = true;
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (!isActiveRef.current) return;
      if (!hovered) return;

      if (pausedRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (time - lastTime > speed) {
        lastTime = time;

        setStartIndex((prev) => {
          const maxIndex = text.length - visibleChars;

          if (directionRef.current === 'forward') {
            if (prev >= maxIndex) {
              directionRef.current = 'backward';
              pausedRef.current = true;

              setTimeout(() => {
                pausedRef.current = false;
              }, pauseDuration);

              return prev;
            }
            return prev + 1;
          } else {
            if (prev <= 0) {
              directionRef.current = 'forward';
              pausedRef.current = true;

              setTimeout(() => {
                pausedRef.current = false;
              }, pauseDuration);

              return prev;
            }
            return prev - 1;
          }
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      isActiveRef.current = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [hovered, visibleChars, text.length, speed, pauseDuration]);

  const displayedText =
    startIndex + visibleChars >= text.length
      ? text.slice(startIndex)
      : text.slice(startIndex, startIndex + visibleChars) + '...';

  return (
    <Tooltip title={text} arrow>
      <Box
        ref={containerRef}
        onMouseEnter={() => {
          hoverTimeoutRef.current = setTimeout(() => {
            isActiveRef.current = true;
            setHovered(true);
          }, hoverDelay);
        }}
        onMouseLeave={() => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          isActiveRef.current = false;
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          setHovered(false);
          setStartIndex(0);
          directionRef.current = 'forward';
          pausedRef.current = false;
        }}
        sx={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          cursor: 'pointer',
          ...containerSx,
        }}
      >
        <Typography component="span" sx={sx} {...typographyProps}>
          {displayedText}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default SmartScrollingText;
