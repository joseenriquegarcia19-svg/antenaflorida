import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Prevent scrolling to top when navigating within the demo sub-routes
    if (pathname.startsWith('/demo/')) {
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
