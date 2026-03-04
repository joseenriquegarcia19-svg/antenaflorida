import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Megaphone, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url: string;
}

export const SponsorsSection: React.FC = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');
  const { config } = useSiteConfig();

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'start',
      slidesToScroll: 1,
      breakpoints: {
        '(min-width: 640px)': { slidesToScroll: 2 },
        '(min-width: 1024px)': { slidesToScroll: 3 }
      }
    }, 
    [Autoplay({ delay: 3000, stopOnInteraction: false })]
  );

  useEffect(() => {
    async function fetchData() {
      // Fetch View Mode
      const { data: pageData } = await supabase
        .from('page_maintenance')
        .select('sponsors_view_mode')
        .eq('route', '/')
        .single();
      
      if (pageData?.sponsors_view_mode) {
        setViewMode(pageData.sponsors_view_mode as 'grid' | 'carousel');
      }

      // Fetch Sponsors
      const { data } = await supabase
        .from('sponsors')
        .select('id, name, logo_url, website_url')
        .eq('active', true)
        .order('display_order', { ascending: true });
      
      if (data) setSponsors(data);
    }
    fetchData();
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6">
      <div className="bg-slate-50 dark:bg-[#0a0a0c]/60 backdrop-blur-2xl rounded-[32px] p-6 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 relative overflow-hidden">
        {/* Luxury Background Detail */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12 text-center md:text-left">
          <div>
            <span className="text-primary font-bold uppercase tracking-widest text-xs">Apoyo Comunitario</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-2">Nuestros Patrocinadores</h2>
            <p className="text-slate-600 dark:text-white/60 text-sm sm:text-base font-medium max-w-2xl mt-4">
              Marcas de prestigio que confían en nosotros y hacen posible nuestra señal.
            </p>
          </div>
          {config?.social_whatsapp && (
            <a 
              href={`https://wa.me/${config.social_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero anunciarme en la emisora')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-8 py-4 bg-primary text-background-dark rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 hover:shadow-xl hover:shadow-primary/20 transition-all shadow-lg"
            >
              <Megaphone size={18} className="group-hover:rotate-12 transition-transform" />
              Anúnciate con nosotros
            </a>
          )}
        </div>

        {sponsors.length > 0 ? (
          viewMode === 'grid' ? (
            /* Grid View (Existing) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 md:gap-12">
              {sponsors.map((sponsor) => (
                <a
                  key={sponsor.id}
                  href={sponsor.website_url || '#'}
                  target={sponsor.website_url ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className={`
                    group relative flex flex-col items-center justify-center p-4
                    grayscale opacity-60 hover:grayscale-0 hover:opacity-100 
                    hover:-translate-y-1
                    transition-all duration-500 ${!sponsor.website_url && 'cursor-default'}
                  `}
                  title={sponsor.name}
                >
                  <div className="aspect-[3/2] w-full flex items-center justify-center mb-3">
                    <img 
                      src={sponsor.logo_url} 
                      alt={sponsor.name} 
                      className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110 mix-blend-multiply dark:mix-blend-normal dark:brightness-200 dark:contrast-125 group-hover:dark:brightness-100 group-hover:dark:contrast-100" 
                    />
                  </div>

                  {sponsor.website_url && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={12} className="text-primary" />
                    </div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            /* Carousel View (New) */
            <div className="relative group/carousel">
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-6">
                  {sponsors.map((sponsor) => (
                    <div key={sponsor.id} className="flex-[0_0_50%] sm:flex-[0_0_33.333%] lg:flex-[0_0_25%] min-w-0">
                      <a
                        href={sponsor.website_url || '#'}
                        target={sponsor.website_url ? "_blank" : "_self"}
                        rel="noopener noreferrer"
                        className={`
                          group relative flex flex-col items-center justify-center p-6 bg-white/5 rounded-3xl border border-white/5
                          grayscale opacity-60 hover:grayscale-0 hover:opacity-100 
                          hover:-translate-y-1
                          transition-all duration-500 ${!sponsor.website_url && 'cursor-default'}
                        `}
                        title={sponsor.name}
                      >
                        <div className="aspect-[3/2] w-full flex items-center justify-center mb-3">
                          <img 
                            src={sponsor.logo_url} 
                            alt={sponsor.name} 
                            className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110 mix-blend-multiply dark:mix-blend-normal dark:brightness-200 dark:contrast-125 group-hover:dark:brightness-100 group-hover:dark:contrast-100" 
                          />
                        </div>

                        {sponsor.website_url && (
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink size={14} className="text-primary" />
                          </div>
                        )}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <button 
                onClick={() => emblaApi?.scrollPrev()}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white/10 backdrop-blur-md border border-white/10 p-2 rounded-full text-white/50 hover:text-white transition-colors opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:-translate-x-6 z-10"
                aria-label="Anterior"
                title="Anterior"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => emblaApi?.scrollNext()}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white/10 backdrop-blur-md border border-white/10 p-2 rounded-full text-white/50 hover:text-white transition-colors opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:translate-x-6 z-10"
                aria-label="Siguiente"
                title="Siguiente"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
            <p className="text-slate-400 dark:text-white/40 text-sm font-bold uppercase tracking-wider mb-4">ESPACIO DISPONIBLE PARA TU MARCA</p>
            <Link to="/sponsors" className="text-primary hover:underline font-bold text-sm">
              Conoce nuestros planes
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
