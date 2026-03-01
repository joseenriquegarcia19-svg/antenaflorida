import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface UserPermissions {
  news?: boolean;
  podcasts?: boolean;
  stations?: boolean;
  users?: boolean; // Admin only
  settings?: boolean; // Admin only
  videos?: boolean;
  reels?: boolean;
  gallery?: boolean;
  promotions?: boolean;
  giveaways?: boolean;
  sponsors?: boolean;
  stats?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  team_member_id?: string;
  role: 'admin' | 'editor' | 'user';
  permissions: UserPermissions;
  super_admin: boolean;
  avatar_url?: string;
  accessibility_settings?: {
    chat_sound_enabled?: boolean;
    time_format?: '12h' | '24h';
  };
  is_temporary_password?: boolean;
  temp_password_login_attempts?: number;
  has_seen_welcome?: boolean;
}

type AuthState = {
  session: Session | null;
  role: 'admin' | 'editor' | 'user' | null;
  permissions: UserPermissions;
  isSuperAdmin: boolean;
  user: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'editor' | 'user' | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        const r = data.role === 'admin' ? 'admin' : (data.role === 'editor' ? 'editor' : 'user');
        setRole(r);
        setPermissions(data.permissions || {});
        setIsSuperAdmin(data.super_admin || false);
        setUserProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error('[auth] getSession error', error);
        // If the refresh token is invalid, we should sign out to clear state
        if (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found')) {
          await supabase.auth.signOut();
        }
        setSession(null);
        setRole(null);
        setAuthLoading(false);
        return;
      }
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (import.meta.env.DEV) {
        console.info('[auth] event', event);
      }
      
      // Handle TOKEN_REFRESHED, SIGNED_OUT, etc.
      if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
        setSession(null);
        setRole(null);
        setUserProfile(null);
        setPermissions({});
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session);
      } else {
        setSession(session);
      }
      
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let canceled = false;

    if (!session?.user?.id) {
      setRole(null);
      return;
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (canceled) return;
        
        if (error) {
          setRole('user');
          setPermissions({});
          setIsSuperAdmin(false);
          setUserProfile(null);
          return;
        }
        
        const r = data?.role === 'admin' ? 'admin' : (data?.role === 'editor' ? 'editor' : 'user');
        setRole(r);
        setPermissions(data?.permissions || {});
        setIsSuperAdmin(data?.super_admin || false);
        setUserProfile(data as UserProfile);
        supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', session.user.id).then();
      });

    // Setup periodic presence update
    const presenceTimer = setInterval(() => {
       if (session?.user?.id) {
         supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', session.user.id).then();
       }
    }, 60000); // Every minute

    return () => {
      canceled = true;
      clearInterval(presenceTimer);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    // We don't need a periodic interval to check session validity as onAuthStateChange handles it.
    // However, if we want to be extra safe against token expiration issues:
    const intervalId = window.setInterval(async () => {
      // Just checking if we have a session locally first
      if (!session) return; 

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (import.meta.env.DEV) console.warn('[auth] periodic getSession error', error);
        // If the refresh token is invalid, we should sign out to clear state
        if (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found')) {
          await supabase.auth.signOut();
          setSession(null);
          setRole(null);
        }
        return;
      }
      // Only update if the session actually changed to avoid re-renders
      if (data.session?.access_token !== session?.access_token) {
         setSession(data.session);
      }
    }, 4 * 60 * 1000); // Check every 4 minutes (tokens usually last 1 hour)

    return () => {
      window.clearInterval(intervalId);
    };
  }, [session]);

  const loading = authLoading || (!!session && role === null);
  const value = useMemo<AuthState>(() => ({ 
    session, 
    role, 
    permissions, 
    isSuperAdmin, 
    user: userProfile,
    loading,
    refreshProfile
  }), [session, role, permissions, isSuperAdmin, userProfile, loading, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
