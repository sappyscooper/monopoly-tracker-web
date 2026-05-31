import { useEffect, useRef, useState } from 'react';

export function useScrollVisibility(resetKey) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const settleTimer = useRef(null);
  const ticking = useRef(false);

  useEffect(() => {
    setVisible(true);
    lastScrollY.current = window.scrollY;
    window.clearTimeout(settleTimer.current);
  }, [resetKey]);

  useEffect(() => {
    const show = () => {
      window.clearTimeout(settleTimer.current);
      setVisible(true);
    };

    const hideThenSettle = () => {
      setVisible(false);
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => setVisible(true), 700);
    };

    const updateVisibility = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      const nearBottom = window.innerHeight + currentY >= document.body.scrollHeight - 60;
      const atTop = currentY < 10;

      if (delta > 2 && !nearBottom && currentY > 60) {
        hideThenSettle();
      } else if (delta < -2 || atTop || nearBottom) {
        show();
      }

      lastScrollY.current = currentY;
    };

    const onScroll = () => {
      if (ticking.current) return;

      requestAnimationFrame(() => {
        updateVisibility();
        ticking.current = false;
      });

      ticking.current = true;
    };

    const interval = window.setInterval(updateVisibility, 160);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(settleTimer.current);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return visible;
}
