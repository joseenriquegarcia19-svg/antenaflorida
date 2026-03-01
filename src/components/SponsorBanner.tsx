import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { usePromotions, Promotion } from '@/hooks/usePromotions';
import { Link } from 'react-router-dom';

interface SponsorBannerProps {
  location?: string;
}

export const SponsorBanner: React.FC<SponsorBannerProps> = ({ location = 'home_banner' }) => {
  const { promotions: rawPromotions, loading } = usePromotions(location);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const { config } = useSiteConfig();

  // Process promotions for display
  const promotions = React.useMemo(() => {
    return rawPromotions.map(promo => {
      const p = { ...promo } as Promotion;
      // Handle "Anúnciate con Nosotros" fallback link
      if (p.title === 'Anúnciate con Nosotros' && !p.link_url && config?.social_whatsapp) {
        p.link_url = `https://wa.me/${config.social_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero anunciarme en la emisora')}`;
      }
      return p;
    });
  }, [rawPromotions, config]);

  // Handle auto-slide
  const resetTimeout = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    resetTimeout();
    if (promotions.length > 1) {
      const currentPromo = promotions[currentIndex];
      const intervalTime = currentPromo?.duration_ms || config?.promotions_interval || 5000;
      
      timeoutRef.current = window.setTimeout(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === promotions.length - 1 ? 0 : prevIndex + 1
        );
      }, intervalTime);
    }
    return () => resetTimeout();
  }, [currentIndex, promotions, config?.promotions_interval]);

  // Reset index if promotions change
  useEffect(() => {
    setCurrentIndex(0);
  }, [promotions.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentIndex((prev) => (prev === 0 ? promotions.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentIndex((prev) => (prev === promotions.length - 1 ? 0 : prev + 1));
  };

  const getObjectFit = (style?: string) => {
    if (style === 'contain') return 'object-contain';
    if (style === 'center') return 'object-none object-center';
    if (style === 'normal') return 'object-contain p-4';
    if (style === 'tile') return 'object-cover'; // Fixed: Use object-cover instead of object-none
    return 'object-cover';
  };

  const getMediaClass = (promo: Promotion) => {
    const base = "w-full h-full";
    const fit = getObjectFit(promo.display_style);
    const bg = ''; // Controlled by style prop now to allow user custom color
    
    // Custom styles classes
    let customClasses = '';
    if (promo.display_style === 'gradient') customClasses = 'animate-gradient-x bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 bg-[length:200%_200%]';
    if (promo.display_style === 'minimalist') customClasses = 'border-4 border-primary/30 m-2 rounded-xl box-border';
    if (promo.display_style === 'flashy') customClasses = 'shadow-[inset_0_0_50px_rgba(var(--color-primary),0.2)] animate-pulse';
    
    return `${base} ${fit} ${bg} ${customClasses}`;
  };

  const renderMedia = (promo: Promotion) => {
    const transformStyle = promo.style_config ? {
      transform: `translate(${promo.style_config.x}%, ${promo.style_config.y}%) rotate(${promo.style_config.rotate}deg) scale(${promo.style_config.scale})`,
      transformOrigin: 'center center'
    } : {};

    const isVideo = promo.media_type === 'video';
    const isText = promo.media_type === 'text';
    const className = getMediaClass(promo);
    
    // Improved tile style handled via inline styles below if display_style is tile

    if (promo.is_custom_ad) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-slate-900 flex flex-col sm:flex-row items-center justify-center p-4 md:p-8 text-center sm:text-left gap-4 md:gap-8 overflow-hidden">
           <div className="size-12 md:size-20 bg-primary/20 rounded-2xl flex items-center justify-center animate-pulse shrink-0 rotate-3">
              <Megaphone className="text-primary w-6 h-6 md:w-10 md:h-10 -rotate-3" />
           </div>
           <div className="flex-1 flex flex-col justify-center min-w-0">
              <h3 className="text-xl sm:text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-1 leading-none">
                 Anúnciate Aquí
              </h3>
              <p className="text-white/60 text-[10px] sm:text-sm md:text-lg font-medium leading-tight max-w-md">
                 Llega a miles de oyentes cada día con la mejor publicidad para tu negocio.
              </p>
           </div>
           <span className="px-5 py-2 md:px-8 md:py-3 bg-primary text-background-dark font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform shadow-xl shadow-primary/20 text-[10px] md:text-sm shrink-0 whitespace-nowrap">
              Contáctanos
           </span>
        </div>
      );
    }

    if (isText) {
      // Improved text centering and adaptation
      return (
        <div 
          className={`w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 text-center gap-2 sm:gap-4 relative overflow-hidden ${
            promo.display_style === 'gradient' ? 'animate-gradient-x bg-gradient-to-br from-primary/20 via-transparent to-primary/20 bg-[length:200%_200%]' : ''
          } ${
            promo.display_style === 'flashy' ? 'after:absolute after:inset-0 after:shadow-[inset_0_0_100px_rgba(var(--color-primary),0.3)] after:animate-pulse' : ''
          } ${
            promo.display_style === 'minimalist' ? 'before:absolute before:inset-4 before:border-2 before:border-current before:opacity-20 before:rounded-lg' : ''
          }`}
          style={{ backgroundColor: promo.background_color || '#1e293b', color: promo.text_color || '#ffffff' }}
        >
           <div className="max-w-4xl mx-auto z-10 flex flex-col items-center justify-center h-full w-full min-h-0">
              <h3 className={`${isSidebar ? 'text-xs sm:text-lg lg:text-xl' : 'text-sm sm:text-2xl md:text-4xl lg:text-5xl'} font-black uppercase tracking-tight leading-[1.1] text-balance line-clamp-3`}>
                 {promo.description || promo.title}
              </h3>
              
              {promo.link_url && (
                 <span className={`${isSidebar ? 'mt-1 sm:mt-3 px-3 py-0.5 sm:px-4 sm:py-1.5' : 'mt-2 sm:mt-6 px-4 py-1 sm:px-8 sm:py-3'} border-2 border-current rounded-full font-bold uppercase tracking-widest text-[8px] sm:text-xs hover:bg-white/10 transition-colors shrink-0`}>
                    Ver Más
                 </span>
              )}
           </div>
        </div>
      );
    }

    if (promo.display_style === 'tile' && !isVideo) {
      return (
        <div className="relative w-full h-full overflow-hidden">
             <div 
              className="absolute inset-[-50%] w-[200%] h-[200%] bg-cover bg-repeat -rotate-12" 
              style={{ 
                backgroundImage: `url(${promo.image_url})`,
                backgroundSize: '100px 100px', // Creates actual tile effect
                backgroundRepeat: 'repeat',
                transformOrigin: 'center center'
              }} 
              title={promo.title} 
            />
        </div>
      );
    }

    // Note: 'free' display style is handled in admin panel but not in public banner view
    // Fallback to contain style for unsupported styles
    if (promo.display_style === 'contain' || !promo.display_style) {
       return (
         <div 
           className="w-full h-full overflow-hidden relative flex items-center justify-center"
           style={{ backgroundColor: promo.background_color || '#1e293b' }}
         >
             {isVideo ? (
                <video 
                  src={promo.image_url} 
                  className={getMediaClass(promo)}
                  style={transformStyle}
                  autoPlay 
                  muted 
                  loop 
                  playsInline
                />
             ) : (
                <img 
                  src={promo.image_url} 
                  alt={promo.title}
                  className={getMediaClass(promo)}
                  style={transformStyle}
                />
             )}
         </div>
       );
    }
    
    if (isVideo) {
      return (
        <video 
          src={promo.image_url} 
          className={className}
          style={transformStyle}
          autoPlay 
          muted 
          loop 
          playsInline 
        />
      );
    }

    return (
      <div 
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: promo.background_color || '#1e293b' }}
      >
        <img 
          src={promo.image_url} 
          alt={promo.title} 
          className={`${className} block max-w-full max-h-full mx-auto`} 
          style={transformStyle}
        />
      </div>
    );
  };

  const isSidebar = location === 'sidebar_ad';

  if (loading || promotions.length === 0) return null;

  return (
    <div className={`w-full mb-10 relative group rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-white/5 ${isSidebar ? 'aspect-square sm:aspect-video lg:aspect-square' : 'aspect-[3/1]'}`}>
      <div 
        className="w-full h-full whitespace-nowrap transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {promotions.map((promo) => (
          <div key={promo.id} className="inline-block w-full h-full relative align-top">
            {promo.link_url ? (
               promo.link_url.startsWith('/') ? (
                 <Link to={promo.link_url} className="block w-full h-full cursor-pointer">
                    {renderMedia(promo)}
                 </Link>
               ) : (
                 <a href={promo.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer">
                    {renderMedia(promo)}
                 </a>
               )
            ) : (
               renderMedia(promo)
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      {promotions.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title="Anterior"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title="Siguiente"
          >
            <ChevronRight size={24} />
          </button>
          
          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {promotions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentIndex === idx ? 'bg-primary w-4' : 'bg-white/50 hover:bg-white'
                }`}
                title={`Ir a la promoción ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
