import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseActive } from '@/lib/supabase';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Radio, ArrowLeft, UserPlus, LogIn, Smartphone, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { SEO } from '@/components/SEO';
import { logActivity, logAuthFailure } from '@/lib/activityLogger';
import { isVideo } from '@/lib/utils';

export default function Login() {
  const { config } = useSiteConfig();
  const [isRegistering, setIsRegistering] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  
  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResendButton, setShowResendButton] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role, loading: authLoading } = useAuth();

  // Get return path from location state or default to home
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (authLoading) return;
    if (!session) return;

    if (role === 'admin' || role === 'editor') {
      navigate('/admin', { replace: true });
    } else {
      navigate(from, { replace: true });
    }
  }, [authLoading, session, role, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!isSupabaseActive) {
      setError('Autenticación no configurada. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env');
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
        } else {
           // Regular user - redirect to home or previous page
           navigate(from);
        }
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
    if (!isSupabaseActive) {
      setError('Autenticación no configurada. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env');
      return;
    }
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
        // Auto-login logic for disabled email confirmation
        // If email confirmation is disabled in Supabase, the user is automatically logged in
        if (data.session) {
           setSuccessMessage('Registro exitoso. Bienvenido!');
           // No need to do anything else, the AuthContext will pick up the session and redirect
        } else {
           // Fallback if session is not created immediately (should not happen if email confirm is off)
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

  const handleGoogleLogin = async () => {
    if (!isSupabaseActive) {
      setError('Autenticación no configurada.');
      return;
    }
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${from}`
        }
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión con Google.';
      setError(msg);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!otpSent) {
        const { error } = await supabase.auth.signInWithOtp({
          phone,
        });
        if (error) throw error;
        setOtpSent(true);
        setSuccessMessage('Código SMS enviado a tu teléfono');
      } else {
        const { error, data } = await supabase.auth.verifyOtp({
          phone,
          token: otp,
          type: 'sms'
        });
        if (error) throw error;
        
        // Wait for session to be established by AuthContext
        if (data.session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user!.id)
            .single();

          if (profile?.role === 'admin' || profile?.role === 'editor') {
             await logActivity('Inicio de Sesión', `Usuario con teléfono ${phone} inició sesión.`);
             sessionStorage.setItem('admin_session_logged', 'true');
             navigate('/admin');
          } else {
             navigate(from);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la solicitud.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image + Blur Overlay */}
      <style>{`
        .login-bg-image {
          background-image: url('${config?.logo_url || '/og-image.png'}');
        }
      `}</style>
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-110 login-bg-image" />
      <div className="absolute inset-0 z-0 backdrop-blur-2xl bg-black/60" />
      
      <SEO title={isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'} />
      
      {/* Return to Home Icon - Now inside the card context conceptually or just floating but cleaner */}
      {/* The user requested "volver a incio solo sera el icono no el texto" and "incluye volver a incio dentro del recuadro" */}
      {/* Wait, "incluye volver a incio dentro del recuadro" means inside the modal box. */}
      
      {/* Theme Toggle - Keep it floating or move inside? User said "asi como el modo d eocuro y claro". Let's put both inside the card. */}

      <div className="relative z-10 bg-white dark:bg-card-dark p-6 sm:p-8 rounded-2xl w-full max-w-md border border-slate-200 dark:border-white/5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar my-8 animate-in zoom-in-95 duration-300">
        
        {/* Header Controls inside the card */}
        <div className="flex justify-between items-center mb-6">
           <Link to="/" className="text-slate-500 dark:text-white/60 hover:text-primary transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5" title="Volver al Inicio">
             <ArrowLeft size={24} />
           </Link>
           <ThemeToggle />
        </div>

        <div className="flex justify-center mb-6 flex-shrink-0">
          {config?.logo_url ? (
            <div className="size-16 rounded-2xl overflow-hidden bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center">
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
            <div className="size-16 bg-primary rounded-2xl flex items-center justify-center text-background-dark">
              <Radio className="text-white" size={32} />
            </div>
          )}
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-black text-center text-slate-900 dark:text-white mb-2 tracking-tight flex-shrink-0">
          {isRegistering ? 'CREAR CUENTA' : 'BIENVENIDO'}
        </h2>
        <p className="text-center text-slate-500 dark:text-white/60 mb-6 flex-shrink-0">
          {isRegistering ? 'Únete a nuestra comunidad' : 'Ingresa para gestionar tu cuenta'}
        </p>
        
        {successMessage && (
          <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-lg text-sm text-center">
            {successMessage}
          </div>
        )}

        {/* Social / Alternate Login Methods */}
        <div className="flex flex-col gap-3 mb-6 flex-shrink-0">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-bold py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            type="button"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
          
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
            <button
              onClick={() => setAuthMethod('email')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${authMethod === 'email' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white'}`}
              type="button"
            >
              <div className="flex items-center justify-center gap-2">
                <Mail size={16} /> Email
              </div>
            </button>
            <button
              onClick={() => setAuthMethod('phone')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${authMethod === 'phone' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white'}`}
              type="button"
            >
              <div className="flex items-center justify-center gap-2">
                <Smartphone size={16} /> Teléfono
              </div>
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
            <span className="bg-white dark:bg-card-dark px-4 text-slate-400 dark:text-white/40">o {isRegistering ? 'regístrate' : 'ingresa'} con</span>
          </div>
        </div>

        {authMethod === 'email' ? (
          <form onSubmit={isRegistering ? handleSignUp : handleLogin} className="space-y-6">
            {isRegistering && (
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Nombre Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
                  required={isRegistering}
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            )}
            
            <div>
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
                required
                placeholder="tu@email.com"
              />
            </div>
            
            <div>
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-background-dark font-bold uppercase tracking-widest py-4 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Procesando...'
              ) : isRegistering ? (
                <>
                  <UserPlus size={20} /> Registrarse
                </>
              ) : (
                <>
                  <LogIn size={20} /> Iniciar Sesión
                </>
              )}
            </button>

            {showResendButton && !isRegistering && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={loading}
                className="w-full bg-transparent border-2 border-primary text-primary font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-primary/10 transition-all disabled:opacity-50 text-sm mt-4"
              >
                Reenviar correo de confirmación
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={handlePhoneLogin} className="space-y-6">
            <div>
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Número de Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
                required
                placeholder="+1234567890"
                disabled={otpSent}
              />
              <p className="text-xs text-slate-500 dark:text-white/50 mt-1">Incluye el código de país (ej. +1 o +34)</p>
            </div>

            {otpSent && (
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Código SMS</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
                  required
                  placeholder="123456"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-background-dark font-bold uppercase tracking-widest py-4 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Procesando...'
              ) : otpSent ? (
                <>Verificar Código</>
              ) : (
                <>Enviar SMS</>
              )}
            </button>
            
            {otpSent && (
               <button
                 type="button"
                 onClick={() => { setOtpSent(false); setOtp(''); }}
                 disabled={loading}
                 className="w-full bg-transparent text-primary font-bold py-2 rounded-lg hover:bg-primary/10 transition-all disabled:opacity-50 text-sm mt-2"
               >
                 Cambiar número de teléfono
               </button>
            )}
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 text-center">
          <p className="text-slate-500 dark:text-white/60 mb-2">
            {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
          </p>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
              setSuccessMessage(null);
            }}
            className="text-primary font-bold hover:underline"
          >
            {isRegistering ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}
