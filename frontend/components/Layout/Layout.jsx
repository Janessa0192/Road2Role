import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../Navbar/Navbar.jsx';

// App shell shared by every route: skip link + navbar, then the current page.
export default function Layout() {
  const { pathname, hash } = useLocation();

  // A full page load used to start at the top / jump to #anchors; do the same on route changes.
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <Outlet />
    </>
  );
}
