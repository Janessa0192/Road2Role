import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

/**
 * React version of the old `authStore` (state.js) + `loadAuth()`.
 *   user   - null or { id, username, role, ... } from GET /auth/me
 *   loaded - false until the first /auth/me call has finished
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loaded: false });

  // Resolve the current session once on app load.
  useEffect(() => {
    let active = true;
    api
      .get('/auth/me')
      .then((payload) => active && setState({ user: payload.data.user, loaded: true }))
      .catch(() => active && setState({ user: null, loaded: true }));
    return () => {
      active = false;
    };
  }, []);

  // Used by login / register / logout to update the session without a reload.
  const setUser = useCallback((user) => setState({ user, loaded: true }), []);

  const value = useMemo(() => ({ ...state, setUser }), [state, setUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
