import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../AuthContext/AuthContext.jsx';
import { ThemeToggle } from '../ThemeContext/ThemeContext.jsx';
import { showError } from '../../utils/errors.js';
import logo from '../../assets/Logo.png';

/** Text for the 🔥 streak pill (same wording as the old nav.js). */
function streakLabel(streak) {
  const current = streak ? streak.current : 0;
  if (streak && streak.activeToday) return `${current}-day streak - you've learned today. Great job!`;
  if (current > 0) return `${current}-day streak - learn something today to keep it going!`;
  return 'Start your streak - complete a topic or take a quiz today!';
}

/** The one shared navbar (replaces nav.js + the <header data-site-header> placeholder on every page). */
export default function Navbar() {
  const { user, loaded, setUser } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false); // mobile menu
  const [streak, setStreak] = useState(null); // { current, longest, activeToday, ... } from GET /me/streak
  const [loggingOut, setLoggingOut] = useState(false);
  const userId = user ? user.id : null;

  const refreshStreak = useCallback(async () => {
    if (!userId) return;
    try {
      const payload = await api.get('/me/streak');
      setStreak(payload.data);
    } catch (error) {
      console.warn('Could not load streak:', showError(error)); // the nav still works without it
    }
  }, [userId]);

  // load the streak once per signed-in user, clear it on logout
  useEffect(() => {
    if (userId) refreshStreak();
    else setStreak(null);
  }, [userId, refreshStreak]);

  // topics ticked on a roadmap / quizzes submitted dispatch these document events
  useEffect(() => {
    document.addEventListener('progress-changed', refreshStreak);
    document.addEventListener('streak-refresh', refreshStreak);
    return () => {
      document.removeEventListener('progress-changed', refreshStreak);
      document.removeEventListener('streak-refresh', refreshStreak);
    };
  }, [refreshStreak]);

  // Escape closes the mobile menu
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.post('/auth/logout', {});
    } catch (error) {
      // even if the API call fails, clear local auth state
      console.warn(showError(error));
    }
    setStreak(null);
    setUser(null);
    setLoggingOut(false);
    if (pathname === '/account') navigate('/');
  }

  const current = (path) => (pathname === path ? 'page' : undefined);
  const lit = Boolean(streak && streak.activeToday);
  const label = streakLabel(streak);

  let authArea;
  if (!loaded) {
    authArea = (
      <span className="r2r-link" aria-hidden="true">
        …
      </span>
    );
  } else if (user) {
    authArea = (
      <>
        {user.role === 'admin' && (
          <Link className="r2r-link" to="/admin" aria-current={current('/admin')}>
            Admin
          </Link>
        )}
        <Link
          className={`streak-pill${lit ? ' is-lit' : ''}`}
          to="/account#streak"
          title={label}
          aria-label={label}
        >
          <span className="streak-flame" aria-hidden="true">
            🔥
          </span>
          <span className="streak-count">{streak ? streak.current : 0}</span>
        </Link>
        <Link className="r2r-link" to="/account" aria-current={current('/account')}>
          Hello, {user.username}
        </Link>
        <button className="r2r-btn" type="button" disabled={loggingOut} onClick={handleLogout}>
          Log out
        </button>
      </>
    );
  } else {
    authArea = (
      <>
        <Link className="r2r-link" to="/login" aria-current={current('/login')}>
          Sign in
        </Link>
        <Link className="r2r-btn r2r-btn--primary" to="/register">
          Sign up
        </Link>
      </>
    );
  }

  return (
    <header className={`r2r-header${open ? ' is-open' : ''}`} data-site-header>
      <div className="r2r-header__inner">
        <Link className="r2r-brand" to="/" aria-label="Road2Role home" aria-current={current('/')}>
          <img className="r2r-brand-logo" src={logo} alt="Road2Role — Pathways to Career Success" />
        </Link>
        <button
          className="r2r-toggle"
          type="button"
          aria-controls="site-nav"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
        <nav
          className="r2r-nav"
          id="site-nav"
          aria-label="Main"
          onClick={(event) => {
            if (event.target.closest('a')) setOpen(false);
          }}
        >
          <Link className="r2r-link" to="/" aria-current={current('/')}>
            Home
          </Link>
          <Link className="r2r-link" to="/#roadmaps">
            Roadmaps
          </Link>
          <ThemeToggle />
          <span data-auth-area>{authArea}</span>
        </nav>
      </div>
    </header>
  );
}
