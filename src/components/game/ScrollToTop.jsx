import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function getScrollRoot() {
  if (typeof document === 'undefined') return null;

  return (
    document.querySelector('[data-veilbreak-scroll-root="true"]') ||
    document.querySelector('main')
  );
}

function scrollGameToTop() {
  const scrollRoot = getScrollRoot();

  if (scrollRoot && typeof scrollRoot.scrollTo === 'function') {
    scrollRoot.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  if (typeof document !== 'undefined') {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
}

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollGameToTop);
    const timeout = window.setTimeout(scrollGameToTop, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
}
