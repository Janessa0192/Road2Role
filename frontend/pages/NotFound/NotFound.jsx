import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main id="main" className="container page-shell">
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to="/">Back to home</Link>
    </main>
  );
}
