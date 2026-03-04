import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Megaphone, ExternalLink, Mail } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { EmptyState } from '@/components/EmptyState';
import { SEO } from '@/components/SEO';

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url: string;
}

export default function SponsorsPage() {
  const { config } = useSiteConfig();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching sponsors:', error);
    else setSponsors(data || []);
    setLoading(false);
  };

  return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark pt-8 pb-20">
        <SEO
        title="Nuestros Patrocinadores"
        description="Conoce a los patrocinadores que apoyan a Antena Florida. Aliados y marcas que hacen posible nuestra programación."
        keywords="patrocinadores, sponsors, antena florida"
      />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
              Nuestros <span className="text-primary">Patrocinadores</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-white/60 max-w-2xl mx-auto">
              Empresas que confían en nosotros y hacen posible que {config?.site_name || 'Antena Florida'} siga creciendo.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
               <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : sponsors.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 mb-20">
              {sponsors.map((sponsor, idx) => (
                <a 
                  key={sponsor.id} 
                  href={sponsor.website_url || '#'} 
                  target={sponsor.website_url ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className={`group flex items-center justify-center p-8 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 animate-fade-in-up ${!sponsor.website_url && 'cursor-default'}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <img 
                    src={sponsor.logo_url} 
                    alt={sponsor.name} 
                    className="max-w-full max-h-24 object-contain filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110 mix-blend-multiply dark:mix-blend-normal dark:brightness-200 dark:contrast-125 group-hover:dark:brightness-100 group-hover:dark:contrast-100"
                  />
                </a>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Megaphone}
              title="Sé nuestro primer patrocinador"
              description="Aún no tenemos patrocinadores listados. ¡Esta es tu oportunidad para destacar!"
              actionLabel="Contáctanos"
              actionLink="/contact" // Assuming there's a contact page or anchor
            />
          )}

          {/* CTA Section */}
          <div className="bg-primary text-background-dark rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="relative z-10 max-w-3xl mx-auto">
              <Megaphone size={48} className="mx-auto mb-6 text-white" />
              <h2 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-tight">¿Quieres anunciar tu marca aquí?</h2>
              <p className="text-lg md:text-xl font-medium mb-8 opacity-90">
                Llega a miles de oyentes cada día. Contáctanos para conocer nuestros planes de publicidad y patrocinios.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {config?.contact_email && (
                  <a href={`mailto:${config.contact_email}`} className="bg-white text-primary px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2 shadow-lg">
                    <Mail size={20} /> Enviar Email
                  </a>
                )}
                {config?.social_whatsapp && (
                  <a href={config.social_whatsapp} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2 shadow-lg">
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
            
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          </div>
        </div>
      </div>
  );
}
