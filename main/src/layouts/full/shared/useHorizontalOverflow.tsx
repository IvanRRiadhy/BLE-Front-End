import { useEffect, useRef, useState } from 'react';

export const useHorizontalOverflow = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const checkOverflow = () => {
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return { ref, isOverflowing };
};
