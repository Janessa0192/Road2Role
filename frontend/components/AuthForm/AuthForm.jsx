import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../services/api.js';
import { useAuth } from '../../AuthContext/AuthContext.jsx';
import { showError } from '../../utils/errors.js';

/** Only same-site paths are allowed as redirect target (same rule as the old auth.js). */
function safeNext(next) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

/**
 * Sign in / Create account form (replaces login.html + register.html + auth.js).
 *   <AuthForm mode="login" />   or   <AuthForm mode="register" />
 */
export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { user, loaded, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const target = safeNext(searchParams.get('next'));

  // Signed in (just now, or already before) -> leave the form page.
  useEffect(() => {
    if (loaded && user) navigate(target, { replace: true });
  }, [loaded, user, target, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setFieldErrors({});

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());

    // light client-side pre-checks (the server validates again - never trust the client)
    const errors = {};
    if (!String(data.identifier || data.username || '').trim()) {
      errors[isRegister ? 'username' : 'identifier'] = 'This field is required.';
    }
    if (!data.password) errors.password = 'Password is required.';
    if (isRegister && !data.email) errors.email = 'Email is required.';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = isRegister
        ? await api.post('/auth/register', {
            username: String(data.username).trim(),
            email: String(data.email).trim(),
            password: data.password,
          })
        : await api.post('/auth/login', {
            identifier: String(data.identifier).trim(),
            password: data.password,
          });

      setUser(payload.data.user); // the effect above redirects
    } catch (error) {
      setSubmitting(false);

      if (error instanceof ApiError && error.details.length) {
        const serverErrors = {};
        let firstField = null;
        for (const detail of error.details) {
          const field = detail.field.split('.')[0];
          serverErrors[field] = detail.message;
          firstField = firstField || field;
        }
        setFieldErrors(serverErrors);
        formRef.current?.elements[firstField]?.focus();
      } else {
        setFormError(showError(error));
        if (error.status === 401) formRef.current?.elements.password?.focus();
      }
    }
  }

  const submitLabel = isRegister
    ? submitting ? 'Creating account…' : 'Create account'
    : submitting ? 'Signing in…' : 'Sign in';

  return (
    <form className="form-card" ref={formRef} onSubmit={handleSubmit} noValidate>
      <h1>{isRegister ? 'Create your account' : 'Sign in'}</h1>

      {!isRegister && (
        <p className="alert alert-info" hidden>
          Brute-force protected: 5 attempts per 15 minutes.
        </p>
      )}
      <div className="alert alert-error" role="alert" hidden={!formError}>
        {formError}
      </div>

      {isRegister ? (
        <>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="3-30 chars: letters, numbers, _ or -"
              required
              autoFocus
            />
            <p className="field-error">{fieldErrors.username}</p>
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            <p className="field-error">{fieldErrors.email}</p>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 chars, a letter and a number"
              required
              aria-describedby="password-hint"
            />
            <p className="hint" id="password-hint">
              Minimum 8 characters, including a letter and a number.
            </p>
            <p className="field-error">{fieldErrors.password}</p>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="identifier">Email or username</label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="you@example.com"
              required
              autoFocus
            />
            <p className="field-error">{fieldErrors.identifier}</p>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
            <p className="field-error">{fieldErrors.password}</p>
          </div>
        </>
      )}

      <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
        {submitLabel}
      </button>

      <p className="form-footer">
        {isRegister ? (
          <>
            Already registered? <Link to="/login">Sign in</Link>
          </>
        ) : (
          <>
            New here? <Link to="/register">Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
