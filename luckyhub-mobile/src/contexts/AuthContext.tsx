import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { getValidatedSession } from '../lib/authCallback';
import { supabase } from '../lib/supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  recovering: boolean;
  setRecovering: (value: boolean) => void;
  refreshSession: () => Promise<Session | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const revision = useRef(0);
  const mounted = useRef(false);

  const refreshSession = useCallback(() => {
    const request = ++revision.current;
    return getValidatedSession(supabase).then(validated => {
      if (mounted.current && request === revision.current) setSession(validated);
      return validated;
    }).catch(() => {
      // Fail closed without deleting stored credentials during a network outage.
      if (mounted.current && request === revision.current) setSession(null);
      return null;
    }).finally(() => {
      if (mounted.current) setLoading(false);
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    // Auth listeners must stay synchronous: Supabase may still hold its auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION' || !mounted.current) return;
      revision.current += 1;
      setSession(nextSession);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    });
    void refreshSession();
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshSession();
    });
    return () => {
      mounted.current = false;
      revision.current += 1;
      subscription.unsubscribe();
      appState.remove();
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!session?.expires_at) return;
    const timer = setTimeout(() => {
      setSession(null);
      void refreshSession();
    }, Math.max(0, session.expires_at * 1000 - Date.now()));
    return () => clearTimeout(timer);
  }, [session, refreshSession]);

  return (
    <AuthContext.Provider value={{ session, loading, recovering, setRecovering, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
