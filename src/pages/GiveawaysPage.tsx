import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Gift, Calendar, ExternalLink, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SEO } from '@/components/SEO';

type Giveaway = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  rules: string;
  start_date: string;
  end_date: string;
  active: boolean;
  link_url?: string;
};

export default function GiveawaysPage() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGiveaways() {
      const { data } = await supabase
        .from('giveaways')
        .select('*')
        .eq('active', true)
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true });
      
      if (data) setGiveaways(data);
      setLoading(false);
    }
    fetchGiveaways();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-20 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Sorteos y Concursos"
        description="Participa en sorteos y concursos de Antena Florida. Premios, promociones y oportunidades para la audiencia."
        keywords="sorteos, concursos, premios, promociones, antena florida"
      />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tight">
            Sorteos y <span className="text-primary">Concursos</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-white/70 max-w-2xl mx-auto">
            Participa en nuestros sorteos exclusivos y gana premios increíbles. ¡No te pierdas ninguna oportunidad!
          </p>
        </div>

        {giveaways.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {giveaways.map((giveaway) => (
              <div key={giveaway.id} className="group bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={giveaway.image_url} 
                    alt={giveaway.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4 bg-primary text-background-dark text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
                    Activo
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors">
                    {giveaway.title}
                  </h3>
                  <p className="text-slate-600 dark:text-white/70 mb-6 line-clamp-3">
                    {giveaway.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-white/50 mb-6 bg-slate-50 dark:bg-white/5 p-3 rounded-lg">
                    <Calendar size={16} className="text-primary" />
                    <span>Finaliza el {format(new Date(giveaway.end_date), 'dd MMMM', { locale: es })}</span>
                  </div>

                  {giveaway.rules && (
                     <div className="mb-6 text-sm text-slate-500 dark:text-white/50 bg-slate-50 dark:bg-white/5 p-4 rounded-lg">
                        <strong className="block text-slate-700 dark:text-white/80 mb-1">Reglas:</strong>
                        <p className="whitespace-pre-line">{giveaway.rules}</p>
                     </div>
                  )}

                  {giveaway.link_url ? (
                    <a 
                      href={giveaway.link_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-primary text-background-dark font-bold py-3 rounded-xl hover:brightness-110 transition-all"
                    >
                      Participar Ahora <ExternalLink size={18} />
                    </a>
                  ) : (
                    <button className="flex items-center justify-center gap-2 w-full bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-white/40 font-bold py-3 rounded-xl cursor-not-allowed">
                      Más información pronto
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
            <Gift size={64} className="mx-auto mb-6 text-slate-300 dark:text-white/20" />
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No hay sorteos activos</h3>
            <p className="text-slate-500 dark:text-white/50">Vuelve pronto para nuevas oportunidades de ganar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
