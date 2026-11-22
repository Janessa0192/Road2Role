import { Navigate, useLocation } from 'react-router-dom';

// Old links such as /roadmap.html?slug=backend keep working: -> /roadmap?slug=backend
export default function LegacyRedirect({ to }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}
