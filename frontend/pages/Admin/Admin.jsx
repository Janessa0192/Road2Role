import usePageStyles from '../../hooks/usePageStyles.js';
import adminCss from './admin.css?inline';

const STYLES = [adminCss];

export default function Admin() {
  usePageStyles(STYLES);
  return (
    <main id="main" className="container page-shell">
      <h1>Admin</h1>
      <p>React setup placeholder. Content migrates from admin.js in the next phase (admin-only guard comes with AuthContext).</p>
    </main>
  );
}
