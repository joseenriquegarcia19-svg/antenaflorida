import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export const PasswordEnforcement: React.FC = () => {
  const { user, session } = useAuth();
  const { error: showError, info: showInfo } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only run if user is logged in and has a profile loaded
    if (!user || !session || hasChecked.current) return;

    const checkPasswordStatus = async () => {
      if (user.is_temporary_password) {
        hasChecked.current = true;
        
        // If we are already on the profile page, we are good, just show reminder
        // But we still need to increment attempts if this is a new session/login
        // For simplicity, we increment on every full app load/refresh where this component mounts
        
        // We can use sessionStorage to ensure we only increment once per browser session
        const sessionKey = `temp_pass_check_${user.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
          // Increment attempts in DB
          await supabase.rpc('increment_temp_password_attempts', { user_id: user.id });
          sessionStorage.setItem(sessionKey, 'true');
          
          // Refresh user profile to get updated attempts count
          // However, we can just estimate it or rely on the next fetch.
          // Since we can't easily force-refresh the auth context user from here without exposing a reload method,
          // we will assume the increment happened.
          
          const currentAttempts = (user.temp_password_login_attempts || 0) + 1;
          
          handleEnforcement(currentAttempts);
        } else {
          handleEnforcement(user.temp_password_login_attempts || 0);
        }
      }
    };

    checkPasswordStatus();
  }, [user, session]);

  // Effect to block navigation if enforcement is active
  useEffect(() => {
    if (user?.is_temporary_password && (user.temp_password_login_attempts || 0) >= 2) {
       // Allow only /admin/profile
       if (location.pathname !== '/admin/profile') {
         navigate('/admin/profile', { replace: true });
         showError('Por motivos de seguridad, debes cambiar tu contraseña obligatoriamente antes de continuar.');
       }
    }
  }, [location.pathname, user]);

  const handleEnforcement = (attempts: number) => {
    if (attempts >= 2) {
      showError('Has excedido el límite de accesos con contraseña temporal. Debes cambiarla ahora.');
      navigate('/admin/profile');
    } else {
      showInfo('Estás usando una contraseña temporal. Por seguridad, cámbiala en tu perfil.', 8000);
    }
  };

  return null;
};
