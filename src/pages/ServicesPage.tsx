import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, CheckCircle2, Music, Mic2, Video, Camera, ArrowRight, MessageCircle } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { useSiteConfig } from '../contexts/SiteConfigContext';

interface ServiceConfig {
  header_image_url?: string;
  gallery_images?: string[];
  contact_whatsapp?: string;
  header_mode?: 'image' | 'carousel';
}

export default function ServicesPage() {
  const { config: siteConfig } = useSiteConfig();
  const [config, setConfig] = useState<ServiceConfig>({});
  const [loading, setLoading] = useState(true);
  const [currentHeaderIndex, setCurrentHeaderIndex] = useState(0);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('page_maintenance')
          .select('header_image_url, gallery_images, contact_whatsapp, header_mode')
          .eq('route', '/servicios')
          .single();
        
        if (data) setConfig(data);
        if (error) console.error('Error fetching services config:', error);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const features = [
    {
      icon: <Mic2 className="text-primary" size={32} />,
      title: "Grabación de Audio Profesional",
      description: "Micrófonos Shure SM7B y preamplificadores de alta gama para una calidad de voz cristalina."
    },
    {
      icon: <Video className="text-primary" size={32} />,
      title: "Producción de Video 4K",
      description: "Sistema multicámara con iluminación profesional para podcasts visuales y entrevistas."
    },
    {
      icon: <Music className="text-primary" size={32} />,
      title: "Edición y Post-producción",
      description: "Servicio completo de mezcla, masterización y edición de video para entregar un producto final pulido."
    },
    {
      icon: <Camera className="text-primary" size={32} />,
      title: "Streaming en Vivo",
      description: "Capacidad para transmitir tu programa en directo a YouTube, Twitch y Facebook simultáneamente."
    }
  ];

  const galleryImages = config.gallery_images?.length ? config.gallery_images : [
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1478737270239-2f02b77ac6d5?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1524678606372-987d7e66c447?auto=format&fit=crop&q=80&w=2000"
  ];

  const isVideo = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov)$/i);
  };

  useEffect(() => {
    if (config.header_mode === 'carousel' && galleryImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentHeaderIndex(prev => (prev + 1) % galleryImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [config.header_mode, galleryImages.length]);

  const headerImage = config.header_image_url || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=2000";
  const whatsappNumber = config.contact_whatsapp || "1234567890";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background-dark">
        <div className="animate-pulse text-primary font-bold tracking-widest uppercase italic">Cargando Elios's Studio...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <SEO 
        title="Elios's Studio - Servicios de Grabación y Producción" 
        description="Estudio de grabación profesional, producción de video 4K, podcasts y streaming. Reserva tu sesión en Elios's Studio."
        image={headerImage}
      />

      {/* Hero Section */}
      <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <div className="absolute inset-0 bg-slate-900">
          {config.header_mode === 'carousel' && galleryImages.length > 0 ? (
            galleryImages.map((img, idx) => (
              <img 
                key={idx}
                src={img} 
                alt={`Elios's Studio ${idx + 1}`} 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                  idx === currentHeaderIndex ? 'opacity-60' : 'opacity-0'
                }`}
              />
            ))
          ) : (
            <img 
              src={headerImage} 
              alt="Elios's Studio" 
              className="w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background-light dark:from-background-dark via-transparent to-transparent" />
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4 max-w-4xl mx-auto">
            <span className="inline-block py-1 px-3 rounded-full bg-primary/20 text-primary border border-primary/30 text-sm font-bold uppercase tracking-widest mb-6 backdrop-blur-sm animate-fade-in">
              Professional Recording Studio
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 font-display tracking-tight drop-shadow-2xl animate-fade-in-up">
              ELIOS'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">STUDIO</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 max-w-2xl mx-auto leading-relaxed mb-10 font-light animate-fade-in-up delay-100">
              El espacio creativo definitivo para tus podcasts, música y contenido digital. Equipamiento de clase mundial en un ambiente inspirador.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
              <a 
                href={`https://wa.me/${whatsappNumber}?text=Hola,%20quisiera%20más%20información%20sobre%20los%20servicios%20de%20Elios's%20Studio`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-full font-bold uppercase tracking-wider hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <MessageCircle size={20} />
                Más Información
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 md:-mt-20 relative z-10">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white dark:bg-card-dark p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-white/5 hover:border-primary/50 transition-colors group">
              <div className="mb-6 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl w-fit group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
              <p className="text-slate-500 dark:text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Studio Gallery */}
        <div className="mb-20">
          <div className="flex flex-col items-center justify-center gap-6 mb-12 text-center">
            <div>
              <span className="text-primary font-bold uppercase tracking-widest text-sm mb-2 block">Nuestras Instalaciones</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">Conoce el Estudio</h2>
            </div>
            <p className="text-slate-500 dark:text-white/60 max-w-md mx-auto">
              Un espacio acústicamente tratado y diseñado para potenciar tu creatividad al máximo nivel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleryImages.map((img, idx) => (
              <div 
                key={idx} 
                className="relative rounded-3xl overflow-hidden group shadow-xl bg-black aspect-video sm:aspect-square lg:aspect-video border border-slate-100 dark:border-white/5"
              >
                {isVideo(img) ? (
                  <video 
                    src={`${img}#t=0.001`} 
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <>
                    <img 
                      src={img} 
                      alt={`Studio Gallery ${idx + 1}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8">
                      <span className="text-white font-bold text-lg">Elios's Studio</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pricing / Packages Preview */}
        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">¿Listo para crear algo increíble?</h2>
            <p className="text-slate-300 text-lg mb-10 leading-relaxed">
              Ya sea que necesites grabar un podcast, producir un audiolibro o realizar una transmisión en vivo, tenemos el paquete perfecto para ti.
            </p>
            <ul className="flex flex-wrap justify-center gap-4 md:gap-8 mb-10 text-left">
              {['Equipamiento Premium', 'Ingeniero de Sonido', 'Video 4K', 'Entrega Rápida'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-white font-medium">
                  <CheckCircle2 className="text-primary" size={20} />
                  {item}
                </li>
              ))}
            </ul>
            <a 
              href={`https://wa.me/${whatsappNumber}?text=Hola,%20estoy%20interesado%20en%20reservar%20el%20estudio`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-full font-black uppercase tracking-wider hover:bg-slate-200 transition-colors"
            >
              Contactar Ahora <ArrowRight size={20} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
