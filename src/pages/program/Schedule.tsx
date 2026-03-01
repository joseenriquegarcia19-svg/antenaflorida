import React from 'react';
import { useProgram } from '../../layouts/ProgramLayout';
import { Calendar, Clock, MapPin, Info } from 'lucide-react';
import { SEO } from '@/components/SEO';

const Schedule: React.FC = () => {
  const { program, programColor } = useProgram();

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  // Handle schedule_days being present and an array
  const scheduleDays = program?.schedule_days || [];

  return (
    <div className="text-white pt-0 p-4">
      <SEO title={`Programación - ${program?.title}`} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="serif-emphasis text-5xl sm:text-6xl mb-4" style={{ color: programColor }}>
            Nuestra <span className="text-white">Agenda</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            No te pierdas ni un minuto de {program?.title}. Aquí tienes nuestro horario detallado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Time Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 sm:p-12 flex flex-col items-center text-center group hover:bg-white/10 transition-all duration-500">
            <div className="p-6 rounded-3xl mb-6 transition-transform duration-500 group-hover:scale-110 shadow-2xl" style={{ backgroundColor: `${programColor}20` }}>
              <Clock size={48} style={{ color: programColor }} />
            </div>
            <h2 className="detail-caps text-2xl mb-4 text-white/90">Horario de Emisión</h2>
            <div className="text-5xl sm:text-6xl font-black tracking-tighter mb-2" style={{ color: programColor }}>
              {program?.time || '20:00'}
            </div>
            {program?.end_time && (
              <div className="detail-caps text-white/40 !text-[10px]">
                hasta las {program?.end_time}
              </div>
            )}
            <p className="mt-6 text-white/60 leading-relaxed font-light text-lg">
              Sintoniza en vivo para disfrutar de la mejor selección musical y contenido exclusivo cada semana.
            </p>
          </div>

          {/* Days Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 sm:p-12 flex flex-col group hover:bg-white/10 transition-all duration-500">
            <div className="flex items-center gap-6 mb-8">
               <div className="p-5 rounded-2xl shadow-xl" style={{ backgroundColor: `${programColor}20` }}>
                 <Calendar size={32} style={{ color: programColor }} />
               </div>
               <h2 className="detail-caps text-2xl text-white/90">Días de Transmisión</h2>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {dayNames.map((day, index) => {
                const isActive = Array.isArray(scheduleDays) && scheduleDays.includes(index);
                return (
                  <div 
                    key={day}
                    className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-300 ${
                      isActive 
                        ? 'shadow-lg' 
                        : 'bg-white/5 text-white/20 border border-white/5'
                    }`}
                    style={isActive ? { backgroundColor: programColor, color: '#000' } : {}}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            <div className="mt-auto pt-8 border-t border-white/5 flex items-start gap-4 text-white/40">
              <Info size={20} className="shrink-0 mt-1" />
              <p className="text-sm font-medium italic">
                La programación está sujeta a cambios por eventos especiales en Florida.
              </p>
            </div>
          </div>
        </div>

        {/* Studio / Location Info */}
        <div className="bg-gradient-to-r from-transparent via-white/5 to-transparent border-y border-white/5 py-12 px-6 rounded-3xl text-center mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
           <h3 className="detail-caps text-white/30 !text-[10px] mb-6">Emisión desde</h3>
           <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="flex items-center gap-3">
                 <div className="size-2 rounded-full animate-pulse" style={{ backgroundColor: programColor }} />
                 <span className="text-xl font-bold text-white/80">Antena Florida</span>
              </div>
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-xl" style={{ backgroundColor: `${programColor}20` }}>
                    <MapPin size={22} style={{ color: programColor }} />
                 </div>
                 <div className="flex flex-col items-start">
                    <span className="detail-caps text-white/30 !text-[10px] leading-none mb-1">Cortesía de</span>
                    <span className="text-xl font-bold text-white/80">Elios Studio</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
