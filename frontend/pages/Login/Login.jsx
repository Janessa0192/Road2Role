import AuthForm from '../../components/AuthForm/AuthForm.jsx';
import usePageStyles from '../../hooks/usePageStyles.js';
import signinCss from "../../../pages/Register/signin.css?inline";

// The old login.html loaded signin.css (the register page did not).
const STYLES = [signinCss];

export default function Login() {
  usePageStyles(STYLES);
  return (
    <>
      <main id="main" className="container">
        <AuthForm mode="login" />
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
