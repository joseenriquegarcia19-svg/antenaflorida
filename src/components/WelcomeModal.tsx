import React from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Star, MessageSquare, Heart, Shield, Edit, X, ArrowRight, Radio } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { role, user } = useAuth();
  const { config } = useSiteConfig();

  if (!isOpen) return null;

  const slogan = config?.slogan || 'La señal que nos une';

  const renderContent = () => {
    switch (role) {
      case 'admin':
        return (
          <>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-xl mb-6 flex items-start gap-4">
              <Shield className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-1">Panel de Administración</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Tienes acceso total al sistema. Puedes gestionar usuarios, noticias, podcasts, programación y configuración del sitio.
                </p>
              </div>
            </div>
          </>
        );
      case 'editor':
        return (
          <>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-xl mb-6 flex items-start gap-4">
              <Edit className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1">Panel de Edición</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Puedes crear y editar contenido según tus permisos asignados. Accede al Dashboard para comenzar.
                </p>
              </div>
            </div>
          </>
        );
      default: // Regular User
        return (
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg text-yellow-600 dark:text-yellow-400">
                <Star size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Califica y Opina</h4>
                <p className="text-sm text-slate-500 dark:text-white/60">
                  Valora las noticias y programas. Tu opinión ayuda a destacar el mejor contenido.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-lg text-pink-600 dark:text-pink-400">
                <Heart size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Interactúa</h4>
                <p className="text-sm text-slate-500 dark:text-white/60">
                  Dale "Me gusta" a tus contenidos favoritos y guárdalos para verlos después.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400">
                <MessageSquare size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Comenta y Participa</h4>
                <p className="text-sm text-slate-500 dark:text-white/60">
                  Únete a la conversación en las noticias y envía mensajes a los locutores de tus programas favoritos.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-white/10 max-h-[90vh] flex flex-col">
        {/* Header decoration */}
        <div className="bg-gradient-to-br from-primary via-primary/80 to-purple-600 relative overflow-hidden flex-shrink-0 p-6 pt-12">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 text-white">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-1">
              ¡Bienvenido!
            </h2>
            <div className="text-white/90 font-medium">
               <div className="text-base font-extrabold tracking-tight uppercase text-white leading-none mb-1" style={{ fontFamily: '"Montserrat", "Helvetica Neue", Arial, sans-serif' }}>
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
                </div>
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase bg-white/90 px-2 py-0.5 rounded-full inline-block mt-1">
                  {slogan}
                </span>
            </div>
            <p className="text-white/90 font-medium mt-2 text-sm">
              Gracias por unirte a nuestra comunidad
            </p>
          </div>

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors backdrop-blur-sm z-20"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <p className="text-slate-600 dark:text-white/70 leading-relaxed">
              Hola <span className="font-bold text-primary">{user?.full_name || user?.email?.split('@')[0] || 'Anónimo'}</span>, 
              {role === 'user' 
                ? ' ahora eres parte oficial de nuestra radio con una cuenta de usuario.' 
                : ' tu cuenta ha sido configurada correctamente.'}
            </p>
            {role === 'user' && (
              <p className="text-xs text-slate-400 dark:text-white/40 mt-2 italic border-l-2 border-slate-300 dark:border-white/20 pl-2">
                Nota: Esta cuenta no tiene permisos de administrador. Si crees que esto es un error, contacta al administrador del sistema.
              </p>
            )}
          </div>

          {renderContent()}

          <button
            onClick={onClose}
            className="w-full bg-primary text-background-dark py-4 rounded-xl font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
          >
            Comenzar a explorar
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};