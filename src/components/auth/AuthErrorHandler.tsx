import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';

export function AuthErrorHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const { error: showError } = useToast();

  useEffect(() => {
    const hash = location.hash;
    if (!hash || !hash.includes('error=')) return;

    // Parse hash parameters
    // The hash looks like #error=access_denied&error_code=otp_expired&...
    const params = new URLSearchParams(hash.substring(1));
    const error = params.get('error');
    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');

    if (error) {
      let message = errorDescription || 'Ocurrió un error de autenticación.';

      // Translate common Supabase errors to Spanish
      if (errorCode === 'otp_expired') {
        message = 'El enlace de verificación ha expirado o ya fue utilizado. Por favor intenta iniciar sesión.';
      } else if (error === 'access_denied') {
        message = 'Acceso denegado. El enlace no es válido.';
      }

      showError(message, 6000); // Show for 6 seconds

      // Clear the hash and redirect to login
      // We use replace to avoid the user going back to the error URL
      navigate('/login', { replace: true });
    }
  }, [location, navigate, showError]);

  return null;
}
