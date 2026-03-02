import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseActive } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Radio, ArrowLeft, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { logActivity, logAuthFailure } from '@/lib/activityLogger';
import { isVideo } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { config } = useSiteConfig();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResendButton, setShowResendButton] = useState(false);
  const navigate = useNavigate();
  const { session, role, loading: authLoading } = useAuth();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setIsRegistering(false);
      setEmail('');
      setPassword('');
      setFullName('');
    }
  }, [isOpen]);

  // Close modal on success login
  useEffect(() => {
    if (authLoading) return;
    if (session && isOpen) {
       onClose();
       if (role === 'admin' || role === 'editor') {
         navigate('/admin');
       }
    }
  }, [authLoading, session, role, isOpen, onClose, navigate]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!isSupabaseActive) {
      setError('Autenticación no configurada. Configura Supabase en .env');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowResendButton(false);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        let errorMsg = '';
        
        if (signInError.message.includes('Invalid login credentials')) {
          errorMsg = 'Correo electrónico o contraseña incorrectos.';
        } else if (signInError.message.includes('Email not confirmed')) {
          errorMsg = 'Por favor confirma tu correo electrónico antes de ingresar.';
          setShowResendButton(true);
        } else {
          errorMsg = signInError.message;
        }
        
        // Log failed login attempt
        await logAuthFailure('Intento Fallido de Login', email, errorMsg);
        throw new Error(errorMsg);
      }
      
      const user = data.user;

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin' || profile?.role === 'editor') {
           await logActivity('Inicio de Sesión', `Usuario con email ${email} inició sesión exitosamente.`);
           sessionStorage.setItem('admin_session_logged', 'true');
           navigate('/admin');
        }
        // Regular user stays on the page, modal will close via useEffect
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error al iniciar sesión.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowResendButton(false);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        // Log failed registration attempt
        await logAuthFailure('Intento Fallido de Registro', email, signUpError.message);
        
        // Handle rate limit error specifically
        if (signUpError.message.includes('Email rate limit exceeded')) {
           throw new Error('Demasiados intentos. Por favor espera unos minutos antes de intentar registrarte de nuevo.');
        }
        
        throw signUpError;
      }

      if (data.user) {
        if (data.session) {
           setSuccessMessage('Registro exitoso. Bienvenido!');
           // AuthContext will update session, modal will close
        } else {
           setSuccessMessage('Registro exitoso. Iniciando sesión...');
           const { error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
           });
           
           if (signInError) throw signInError;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error al registrarse.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const getRedirectUrl = () => {
      return window.location.origin;
    };

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: getRedirectUrl(),
        }
      });

      if (error) throw error;
      
      setSuccessMessage('Correo de confirmación reenviado. Por favor revisa tu bandeja de entrada y spam.');
      setShowResendButton(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reenviar el correo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'BUENOS DÍAS';
    if (hour >= 12 && hour < 19) return 'BUENAS TARDES';
    return 'BUENAS NOCHES';
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Blur Background */}
      <div 
        className="absolute inset-0 backdrop-blur-xl bg-black/50 z-0 animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div className="relative z-10 bg-white dark:bg-card-dark p-4 sm:p-6 rounded-2xl w-full max-w-md border border-slate-200 dark:border-white/5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar my-4 sm:my-8 animate-in zoom-in-95 duration-300">
        
        {/* Header Controls inside the card */}
        <div className="flex justify-between items-center mb-3 sm:mb-4">
           <button 
             onClick={onClose}
             className="text-slate-500 dark:text-white/60 hover:text-primary transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5" 
             title="Cerrar"
           >
             <ArrowLeft size={24} />
           </button>
           <ThemeToggle />
        </div>

        <div className="flex flex-col items-center justify-center mb-4 sm:mb-5 flex-shrink-0">
          {config?.logo_url ? (
            <div className={`size-12 sm:size-14 rounded-2xl overflow-hidden flex items-center justify-center mb-2 ${
              isVideo(config.logo_url) ? 'bg-white/5 border border-slate-200 dark:border-white/10' : 'bg-transparent border-0'
            }`}>
              {isVideo(config.logo_url) ? (
                <video 
                  src={config.logo_url} 
                  className="w-full h-full object-cover" 
                  autoPlay 
                  muted 
                  loop 
                  playsInline 
                />
              ) : (
                <img src={config.logo_url} alt={config.site_name || 'Logo'} className="w-full h-full object-contain" />
              )}
            </div>
          ) : (
            <div className="size-12 sm:size-14 bg-primary rounded-2xl flex items-center justify-center text-background-dark mb-2">
              <Radio className="text-white" size={24} />
            </div>
          )}
          <h2 className="text-lg sm:text-xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white leading-none whitespace-normal text-center">
            {config?.site_name ? (
              <>
                {config.site_name.split(' ').map((word, i) => (
                  <span key={i} className={word.toLowerCase() === 'florida' ? 'text-primary-orange' : 'text-primary'}>
                    {word}{' '}
                  </span>
                ))}
              </>
            ) : (
              <><span className="text-primary">ANTENA</span> <span className="text-primary-orange">FLORIDA</span></>
            )}
          </h2>
          <span className="text-[10px] sm:text-[11px] font-bold text-primary tracking-[0.2em] uppercase whitespace-normal leading-none mt-1 text-center">
            {config?.slogan || 'La señal que nos une'}
          </span>
        </div>
        
        <h2 className="text-xl sm:text-2xl font-black text-center text-slate-900 dark:text-white mb-1 tracking-tight flex-shrink-0">
          {isRegistering ? 'CREAR CUENTA' : `${getGreeting()}`}
        </h2>
        <p className="text-sm text-center text-slate-500 dark:text-white/60 mb-4 sm:mb-5 flex-shrink-0">
          {isRegistering ? 'Únete a nuestra comunidad' : 'Bienvenido, ingresa para gestionar tu cuenta'}
        </p>
        
        {successMessage && (
          <div className="mb-4 sm:mb-5 bg-green-500/10 border border-green-500/50 text-green-500 p-2 sm:p-3 rounded-lg text-sm text-center">
            {successMessage}
          </div>
        )}

        <form onSubmit={isRegistering ? handleSignUp : handleLogin} className="space-y-3 sm:space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-slate-500 dark:text-white/60 text-xs sm:text-sm font-bold uppercase tracking-widest mb-1 sm:mb-2">Nombre Completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 sm:py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
                required={isRegistering}
                placeholder="Ej. Juan Pérez"
              />
            </div>
          )}
          
          <div>
            <label className="block text-slate-500 dark:text-white/60 text-xs sm:text-sm font-bold uppercase tracking-widest mb-1 sm:mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 sm:py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
              required
              placeholder="tu@email.com"
            />
          </div>
          
          <div>
            <label className="block text-slate-500 dark:text-white/60 text-xs sm:text-sm font-bold uppercase tracking-widest mb-1 sm:mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 sm:py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 sm:p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-background-dark font-bold uppercase tracking-widest py-3 sm:py-3.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base mt-2"
          >
            {loading ? (
              'Procesando...'
            ) : isRegistering ? (
              <>
                <UserPlus size={18} /> Registrarse
              </>
            ) : (
              <>
                <LogIn size={18} /> Iniciar Sesión
              </>
            )}
          </button>

          {showResendButton && !isRegistering && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={loading}
              className="w-full bg-transparent border-2 border-primary text-primary font-bold uppercase tracking-widest py-2.5 sm:py-3 rounded-lg hover:bg-primary/10 transition-all disabled:opacity-50 text-xs sm:text-sm mt-2 sm:mt-3"
            >
              Reenviar correo de confirmación
            </button>
          )}
        </form>

        <div className="mt-4 pt-4 sm:mt-5 sm:pt-5 border-t border-slate-200 dark:border-white/10 text-center">
          <p className="text-sm text-slate-500 dark:text-white/60 mb-1 sm:mb-2">
            {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
          </p>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
              setSuccessMessage(null);
            }}
            className="text-primary text-sm sm:text-base font-bold hover:underline"
          >
            {isRegistering ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};