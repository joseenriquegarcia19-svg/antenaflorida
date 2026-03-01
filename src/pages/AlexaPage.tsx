import React from 'react';
import { SEO } from '@/components/SEO';
import { Radio, Mic2, Play, Info, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../contexts/SiteConfigContext';

export default function AlexaPage() {
  const { config } = useSiteConfig();
  const siteName = config?.site_name || 'Antena Florida';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark pb-20">
      <SEO 
        title="Escuchar en Alexa" 
        description={`Aprende cómo escuchar ${siteName} en tus dispositivos Alexa.`} 
      />

      {/* Hero Section */}
      <div className="relative h-[40vh] flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&q=80&w=2000" 
            alt="Smart Speaker" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900" />
        
        <div className="relative z-10 text-center px-4">
          <Link to="/emisora" className="inline-flex items-center gap-2 text-primary font-bold mb-8 hover:gap-3 transition-all">
            <ArrowLeft size={20} /> Volver a la Emisora
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase">
            Alexa + <span className="text-primary">{siteName}</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Lleva la mejor programación a tu hogar con solo usar tu voz.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-20">
        {/* Main Card */}
        <div className="bg-white dark:bg-card-dark rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="p-8 md:p-12">
            
            {/* Logo Integration Section */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-16 py-8 border-b border-slate-100 dark:border-white/5">
              <div className="relative group">
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <img 
                  src={config?.logo_url || "/og-image.png"} 
                  alt={siteName} 
                  className="w-32 h-32 object-contain relative z-10 rounded-2xl shadow-xl"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 bg-slate-200 dark:bg-white/10 rounded-full" />
                <span className="text-2xl font-black text-slate-300 dark:text-white/20">+</span>
                <div className="h-1 w-12 bg-slate-200 dark:bg-white/10 rounded-full" />
              </div>

              <div className="relative group">
                <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-32 h-32 bg-slate-900 rounded-2xl flex items-center justify-center p-6 relative z-10 shadow-xl">
                  <svg viewBox="0 0 24 24" className="w-full h-full fill-[#00CAFF]">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 21.6c-5.302 0-9.6-4.298-9.6-9.6S6.698 2.4 12 2.4s9.6 4.298 9.6 9.6-4.298 9.6-9.6 9.6zm3.3-13.8c-1.8 0-3.3 1.5-3.3 3.3s1.5 3.3 3.3 3.3 3.3-1.5 3.3-3.3-1.5-3.3-3.3-3.3zm0 4.8c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm-6.6-4.8c-1.8 0-3.3 1.5-3.3 3.3s1.5 3.3 3.3 3.3 3.3-1.5 3.3-3.3-1.5-3.3-3.3-3.3zm0 4.8c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <Mic2 className="text-primary" />
                    ¿Cómo empezar?
                  </h2>
                  <p className="text-slate-600 dark:text-white/70 mb-6 leading-relaxed">
                    Escuchar {siteName} en tu dispositivo Alexa es muy sencillo gracias a nuestra integración con <span className="font-bold text-slate-900 dark:text-white">Live365</span>.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    'Asegúrate de que tu dispositivo Alexa esté encendido y conectado.',
                    `Di el comando de voz mágico: "Alexa, play ${siteName} on Live365".`,
                    '¡Listo! Disfruta de nuestra señal en vivo con la mejor calidad.'
                  ].map((step, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="w-8 h-8 rounded-full bg-primary text-background-dark flex items-center justify-center font-black shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-slate-700 dark:text-white/80 font-medium">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-primary/5 p-8 rounded-3xl border border-primary/20">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Info className="text-primary" />
                    Tip Pro
                  </h3>
                  <p className="text-slate-600 dark:text-white/70 leading-relaxed italic">
                    "Si es la primera vez, Alexa podría pedirte que habilites el skill de Live365. Solo di 'Sí' y la próxima vez bastará con pedir nuestra emisora."
                  </p>
                </div>

                <div className="bg-slate-900 p-8 rounded-3xl text-white">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
                    <CheckCircle2 className="text-primary" />
                    Beneficios
                  </h3>
                  <ul className="space-y-4 text-slate-300">
                    <li className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Sonido HD digital
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Sin necesidad de cables
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Control total con tu voz
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center">
              <a 
                href="https://live365.com/station/Antena-Florida-a84668" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-primary text-background-dark px-10 py-5 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
              >
                Ver en Live365 <Play size={20} fill="currentColor" />
              </a>
              <p className="mt-6 text-slate-400 dark:text-white/30 text-sm">
                {siteName} y Live365 son partners oficiales para streaming digital.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
