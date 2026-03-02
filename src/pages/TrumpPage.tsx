import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { ChevronLeft, FileText, Eye, Smile, Calendar, Clock, Image as ImageIcon, LayoutGrid, List } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { getValidImageUrl } from '@/lib/utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { SEO } from '@/components/SEO';
import { News } from '@/types';

interface NewsItem extends Omit<News, 'content'> {
  content?: string;
  image_source?: string;
  image_source_url?: string;
  tags?: string[];
  summary?: string;
  profiles?: {
    full_name: string | null;
  };
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
}

export default function TrumpPage() {
  const { config } = useSiteConfig();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Time calculations
  const inaugurationDate = new Date('2025-01-20T12:00:00-05:00'); // EST
  const endOfTermDate = new Date('2029-01-20T12:00:00-05:00'); // EST
  const today = new Date();

  // Time in office
  const daysInOffice = differenceInDays(today, inaugurationDate);
  const monthsInOffice = differenceInMonths(today, inaugurationDate);
  const yearsInOffice = differenceInYears(today, inaugurationDate);

  let timeInOfficeStr = '';
  if (yearsInOffice > 0) timeInOfficeStr += `${yearsInOffice} año${yearsInOffice > 1 ? 's' : ''} `;
  if (monthsInOffice % 12 > 0) timeInOfficeStr += `${monthsInOffice % 12} mes${monthsInOffice % 12 > 1 ? 'es' : ''} `;
  if (daysInOffice % 30 > 0) timeInOfficeStr += `${daysInOffice % 30} día${daysInOffice % 30 > 1 ? 's' : ''}`;
  if (!timeInOfficeStr) timeInOfficeStr = '0 días';

  // Time left
  const daysLeft = differenceInDays(endOfTermDate, today);
  const monthsLeft = differenceInMonths(endOfTermDate, today);
  const yearsLeft = differenceInYears(endOfTermDate, today);

  let timeLeftStr = '';
  if (yearsLeft > 0) timeLeftStr += `${yearsLeft} año${yearsLeft > 1 ? 's' : ''} `;
  if (monthsLeft % 12 > 0) timeLeftStr += `${monthsLeft % 12} mes${monthsLeft % 12 > 1 ? 'es' : ''} `;
  if (daysLeft % 30 > 0) timeLeftStr += `${daysLeft % 30} día${daysLeft % 30 > 1 ? 's' : ''}`;

  useEffect(() => {
    async function fetchTrumpNews() {
      try {
        setLoading(true);
        // Search for 'trump' in title, summary or category
        const search = '%trump%';
        const { data } = await supabase
          .from('news')
          .select('id, title, slug, category, image_url, image_source, image_source_url, created_at, views, reactions, summary')
          .or(`title.ilike.${search},summary.ilike.${search},category.ilike.${search}`)
          .order('created_at', { ascending: false });

        if (data) {
          setNews(data as unknown as NewsItem[]);
        }
      } catch (error) {
        console.error('Error fetching Trump news:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrumpNews();
  }, []);

  return (
    <div className="min-h-screen bg-red-950 font-display text-white transition-colors duration-300 flex flex-col">
      <SEO 
        title="Noticias sobre Donald Trump" 
        description="Últimas noticias y actualizaciones sobre la presidencia de Donald Trump."
      />
      
      {/* Hero Header */}
      <div className="relative w-full h-[55vh] sm:h-[65vh] md:h-[75vh] flex items-end justify-center overflow-hidden bg-red-900 border-b-4 border-red-500 pt-24">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1580128660010-fd027e1e587a?q=80&w=2000&auto=format&fit=crop" 
            alt="Donald Trump" 
            className="w-full h-full object-cover object-top opacity-60 mix-blend-luminosity scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-red-950/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/70 via-transparent to-red-950/70" />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8 flex flex-col items-center text-center">
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter italic drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] text-white mb-2 leading-none">
            TRUMP
          </h1>
          <span className="text-red-200 text-sm sm:text-base md:text-xl font-bold uppercase tracking-[0.5em] mb-8 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-red-500/30">
            Presidencia y Actualidad
          </span>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl mx-auto mt-4">
            <div className="bg-red-900/50 backdrop-blur-md border border-red-500/30 p-4 rounded-2xl flex flex-col items-center shadow-2xl shadow-red-900/50">
              <Calendar className="text-red-400 mb-2" size={24} />
              <span className="text-[10px] text-red-300 font-bold uppercase tracking-widest mb-1">Inicio 2do Mandato</span>
              <span className="font-black text-lg md:text-xl leading-tight">20 de Ene, 2025</span>
            </div>
            
            <div className="bg-red-900/50 backdrop-blur-md border border-red-500/30 p-4 rounded-2xl flex flex-col items-center shadow-2xl shadow-red-900/50">
              <Clock className="text-red-400 mb-2" size={24} />
              <span className="text-[10px] text-red-300 font-bold uppercase tracking-widest mb-1">Tiempo en el cargo</span>
              <span className="font-black text-lg md:text-xl leading-tight text-white">{timeInOfficeStr.trim()}</span>
            </div>

            <div className="bg-red-900/50 backdrop-blur-md border border-red-500/30 p-4 rounded-2xl flex flex-col items-center shadow-2xl shadow-red-900/50">
              <Calendar className="text-red-400 mb-2" size={24} />
              <span className="text-[10px] text-red-300 font-bold uppercase tracking-widest mb-1">Falta para término</span>
              <span className="font-black text-lg md:text-xl leading-tight">{timeLeftStr.trim() || 'Completado'}</span>
              <span className="text-[9px] text-red-400 font-medium uppercase mt-1">(20 de Ene, 2029)</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="flex items-center justify-between mb-10">
          <Link 
            to="/noticias" 
            className="inline-flex items-center gap-2 text-sm font-bold text-red-300 hover:text-white transition-colors uppercase tracking-widest bg-red-900/30 px-4 py-2 rounded-xl border border-red-500/20"
          >
            <ChevronLeft size={16} /> Volver a Noticias
          </Link>

          <div className="flex items-center gap-2 bg-red-900/30 p-1.5 rounded-xl border border-red-500/20">
            <button 
              title="Ver como cuadrícula" 
              aria-label="Ver como cuadrícula" 
              onClick={() => setViewMode('grid')} 
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-red-500 text-white shadow-md' : 'text-red-300 hover:bg-red-500/20'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              title="Ver como lista" 
              aria-label="Ver como lista" 
              onClick={() => setViewMode('list')} 
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-red-500 text-white shadow-md' : 'text-red-300 hover:bg-red-500/20'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="size-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : news.length === 0 ? (
          <div className="bg-red-900/20 border border-red-500/20 rounded-3xl p-12 text-center flex flex-col items-center">
            <FileText size={48} className="text-red-500/50 mb-4" />
            <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">No hay noticias</h3>
            <p className="text-red-300 font-medium">Por el momento no se han encontrado noticias relacionadas a este tema.</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "flex flex-col gap-6"}>
            {news.map((item) => (
              <Link 
                to={`/noticias/${item.slug || item.id}`} 
                key={item.id} 
                className={viewMode === 'grid'
                  ? "group flex flex-col bg-red-900/20 rounded-2xl overflow-hidden border border-red-500/20 shadow-lg hover:border-red-500 hover:bg-red-900/40 transition-all hover:-translate-y-1"
                  : "group flex flex-col sm:flex-row gap-6 bg-red-900/20 p-4 rounded-2xl border border-red-500/20 shadow-lg hover:border-red-500 hover:bg-red-900/40 transition-all hover:-translate-y-1"
                }
              >
                <div className={viewMode === 'grid'
                  ? "relative aspect-video overflow-hidden bg-red-950 flex items-center justify-center"
                  : "w-full sm:w-64 aspect-video sm:aspect-square rounded-xl overflow-hidden bg-red-950 flex-shrink-0 flex items-center justify-center relative"
                }>
                  <img src={getValidImageUrl(item.image_url, 'news', undefined, 600, config)} alt={item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  
                  {/* Fuente incrustada en la imagen */}
                  {(item.image_source || item.image_source_url) && (
                    <div className={viewMode === 'grid' ? "absolute top-4 right-4 z-20" : "absolute bottom-4 right-4 z-20"}>
                      {item.image_source_url ? (
                        <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-1 px-3 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/90 shadow-lg">
                          <ImageIcon size={10} className="text-red-400" />
                          <span className="max-w-[100px] truncate">Fuente: {item.image_source}</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-1 px-3 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/90 shadow-lg">
                          <ImageIcon size={10} className="text-red-400" />
                          <span className="max-w-[100px] truncate">Fuente: {item.image_source}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-transparent to-transparent opacity-80" />
                </div>
                <div className={viewMode === 'grid' ? "p-5 flex flex-col flex-1" : "flex flex-col flex-1 py-2"}>
                  <div className="flex items-center gap-2 mb-3">
                    {item.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
                      <span key={idx} className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">{cat}</span>
                    ))}
                  </div>
                  <h3 className={viewMode === 'grid' 
                    ? "font-black text-white text-lg sm:text-xl leading-tight mb-3 line-clamp-3 group-hover:text-red-300 transition-colors"
                    : "font-black text-white text-xl sm:text-2xl leading-tight mb-3 group-hover:text-red-300 transition-colors"
                  }>
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className={`text-red-200/70 font-medium ${viewMode === 'grid' ? 'text-sm line-clamp-2 mb-4' : 'text-base line-clamp-3 mb-6'}`}>
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-red-300 text-[10px] font-bold uppercase tracking-widest pt-4 border-t border-red-500/20">
                    <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {item.views || 0}
                      </span>
                      {item.reactions && item.reactions.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Smile size={12} /> {item.reactions.reduce((acc, curr) => acc + curr.count, 0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
