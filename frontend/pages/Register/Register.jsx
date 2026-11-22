import AuthForm from '../../components/AuthForm/AuthForm.jsx';
import usePageStyles from '../../hooks/usePageStyles.js';
import signupCss from './signup.css?inline';

// Sign-up has its own stylesheet (same blue look as sign-in, plus Road2Role branding + dark theme).
const STYLES = [signupCss];

export default function Register() {
  usePageStyles(STYLES);
  return (
    <>
      <main id="main" className="container">
        <AuthForm mode="register" />
      </main>

      <footer className="site-footer">
        <div className="container">
          <span>
            <span className="brand-line">Road2Role</span> · Learn, build, get hired.
          </span>
          <span>
            <a href="/api/docs">API reference</a>
          </span>
        </div>
      </footer>
    </>
  );
}
