import React, { useEffect } from 'react';
import { LiveChat } from '@/components/LiveChat';
import { useScheduleTimeline } from '@/hooks/useScheduleTimeline';
import { Clock, Calendar, ChevronRight, Facebook, Instagram, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useLiveStats } from '@/contexts/LiveStatsContext';
import { useAuth } from '@/contexts/AuthContext';


export default function LiveChatPage() {
  const { currentShow, nextShows } = useScheduleTimeline();
  const { realShowId } = useLiveStats();
  const { user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';

  // Handle mobile layout scrolling - lock body overflow to only scroll messages
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      const originalOverscroll = window.getComputedStyle(document.body).overscrollBehavior;
      
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      
      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.overscrollBehavior = originalOverscroll;
      };
    }
  }, []);



  // Calculate ISO timestamps for the chat to scope messages correctly
  const chatTimestamps = React.useMemo(() => {
    if (!currentShow) return { start: undefined, end: undefined };
    
    // We assume currentShow.date is "YYYY-MM-DD" and currentShow.time is "HH:mm"
    const dateStr = currentShow.date || new Date().toISOString().split('T')[0];
    
    // Construct Start Timestamp
    let startIso: string | undefined;
    if (currentShow.time) {
      try {
        const startDate = new Date(`${dateStr}T${currentShow.time}:00`);
        // Subtract 10 minutes to be safe with message persistence/scoping
        startDate.setMinutes(startDate.getMinutes() - 10);
        startIso = startDate.toISOString();
      } catch {
        // Fallback
        startIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      }
    }

    // Construct End Timestamp
    let endIso: string | undefined;
    if (currentShow.end_time) {
      try {
        // Handle cross-midnight
        let endDateStr = dateStr;
        if (currentShow.end_time < (currentShow.time || '00:00')) {
             // Ends next day
             const d = new Date(dateStr);
             d.setDate(d.getDate() + 1);
             endDateStr = d.toISOString().split('T')[0];
        } else if (currentShow.end_time === '24:00') {
             // Special case
             const d = new Date(dateStr);
             d.setDate(d.getDate() + 1);
             endDateStr = d.toISOString().split('T')[0];
             currentShow.end_time = '00:00';
        }
        
        endIso = new Date(`${endDateStr}T${currentShow.end_time}:00`).toISOString();
      } catch {
        // Fallback
      }
    }

    return { start: startIso, end: endIso };
  }, [currentShow]);

  if (!currentShow) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <SEO title="Chat en Vivo - Próximamente" />
        
        {/* Luxury Background Arcs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        {/* Floating Back Button */}
        <Link 
          to="/" 
          className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 p-3 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 text-slate-900 dark:text-white hover:bg-primary hover:text-white dark:hover:text-background-dark transition-all group flex items-center gap-2 shadow-lg"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest mr-2">Volver</span>
        </Link>

        <div className="relative z-10 max-w-2xl w-full text-center">
          <div className="mb-12 inline-block">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative bg-white/10 dark:bg-white/5 backdrop-blur-2xl border border-black/5 dark:border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                <Clock size={80} className="text-primary mb-2 mx-auto" strokeWidth={1} />
                <span className="text-white backdrop-blur-md bg-black/50 px-3 py-1.5 rounded-full border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] font-mono text-[10px] sm:text-xs">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !is24h })}
              </span>
                <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Hora Local</div>
              </div>
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 leading-none">
            La cabina está <span className="text-primary">cerrada</span>
          </h2>
          <p className="text-slate-500 dark:text-white/40 mb-12 text-lg font-medium">Sintoniza el próximo programa para unirte a la conversación en vivo.</p>

          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3 mb-6">
              <Calendar size={18} className="text-primary" />
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Próximos Programas</h3>
            </div>
            
            <div className="grid gap-3">
              {nextShows.slice(0, 3).map((show, i) => (
                <div 
                  key={show.id} 
                  className="bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4 rounded-3xl flex items-center justify-between group hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-500 shadow-sm"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl overflow-hidden border border-white/10">
                      <img src={show.image_url} alt={show.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{show.title}</h4>
                      <p className="text-xs text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest mt-0.5">{show.time}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/horario" className="bg-primary text-background-dark px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">
              Ver Programación Completa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background-light dark:bg-background-dark flex flex-col relative overflow-hidden transition-colors duration-500">
      <SEO title={`En Vivo - ${currentShow.title}`} />

      {/* Dynamic Background Ambience */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110 opacity-30 blur-[100px]"
          style={{ backgroundImage: `url(${currentShow.image_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background-light/80 via-transparent to-background-light dark:from-background-dark/80 dark:via-transparent dark:to-background-dark transition-colors duration-500" />
        
        {/* Animated Light Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[150px] animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto w-full flex-1 flex flex-col pt-4 pb-4 px-4 min-h-0">
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
          
          {/* Main Chat Column (70%) */}
          <div className="flex-[7] flex flex-col min-h-0">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <LiveChat 
                showId={realShowId || currentShow.id} 
                showTitle={currentShow.title} 
                showImage={currentShow.image_url}
                startTimestamp={chatTimestamps.start}
                endTimestamp={chatTimestamps.end}
                showSlug={currentShow.slug || currentShow.id}
                teamMembers={currentShow.show_team_members?.map(stm => ({
                  id: stm.team_member.id,
                  name: stm.team_member.name,
                  image_url: stm.team_member.image_url,
                  role: stm.team_member.role,
                  social_links: stm.team_member.social_links,
                  email: stm.team_member.email
                }))}
              />
            </div>
          </div>

          {/* Program Info Sidebar (30%) - Desktop Only */}
          <div className="hidden lg:flex flex-[3] flex-col gap-6 min-h-0">
            {/* Show Profile Card */}
            <div className="flex-1 min-h-0 flex flex-col bg-white/5 dark:bg-black/20 backdrop-blur-3xl rounded-[2.5rem] border border-black/5 dark:border-white/5 p-8 shadow-sm overflow-hidden transition-all duration-500">
              <div className="aspect-video sm:aspect-square rounded-3xl overflow-hidden border border-black/5 dark:border-white/10 shadow-2xl bg-black/5 dark:bg-white/5 shrink-0">
                <img src={currentShow.image_url} alt={currentShow.title} className="w-full h-full object-cover" />
              </div>
              
              <div className="mt-6 flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-primary/50 scrollbar-track-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <span className="size-2 bg-primary rounded-full animate-pulse shadow-glow" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Sintonizando</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight mb-4">{currentShow.title}</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-slate-600 dark:text-white/60 text-sm leading-relaxed">{currentShow.description || 'Sin descripción disponible.'}</p>
                </div>

                {/* Team Members Section integrated into same height column or matching box */}
                {currentShow.show_team_members && currentShow.show_team_members.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-black/10 dark:border-white/10">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <div className="size-1.5 bg-primary rounded-full" />
                      En Cabina
                    </h3>
                    <div className="space-y-6">
                      {currentShow.show_team_members.map((stm) => (
                        <div key={stm.team_member.id} className="flex items-center justify-between group">
                          <Link to={`/equipo/${stm.team_member.id}`} className="flex items-center gap-4 flex-1">
                            <div className="size-14 rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 shadow-lg group-hover:border-primary/50 transition-all bg-black/5 dark:bg-white/5">
                              <img src={stm.team_member.image_url} alt={stm.team_member.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-primary transition-colors">{stm.team_member.name}</h4>
                              <p className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest">{stm.role_in_show || stm.team_member.role}</p>
                            </div>
                          </Link>
                          
                          <div className="flex items-center gap-2">
                            {stm.team_member.social_links?.instagram && (
                              <a href={stm.team_member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="size-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-[#E4405F] hover:text-white transition-all" title="Instagram">
                                <Instagram size={14} />
                              </a>
                            )}
                            {stm.team_member.social_links?.facebook && (
                              <a href={stm.team_member.social_links.facebook} target="_blank" rel="noopener noreferrer" className="size-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-[#1877F2] hover:text-white transition-all" title="Facebook">
                                <Facebook size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info - Reduced size */}
        <div className="mt-2 text-center shrink-0 py-2 border-t border-black/5 dark:border-white/5">
          <p className="text-slate-400 dark:text-white/20 text-[9px] font-black uppercase tracking-[0.3em]">
            Antena Florida &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
