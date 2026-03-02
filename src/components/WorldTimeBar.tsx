import React, { useState, useEffect } from 'react';
import { Globe, Lightbulb } from 'lucide-react';

const CITIES = [
  { name: 'Miami', timeZone: 'America/New_York' },
  { name: 'Nueva York', timeZone: 'America/New_York' },
  { name: 'La Habana', timeZone: 'America/Havana' },
  { name: 'Los Ángeles', timeZone: 'America/Los_Angeles' },
  { name: 'CDMX', timeZone: 'America/Mexico_City' },
  { name: 'Bogotá', timeZone: 'America/Bogota' },
  { name: 'Buenos Aires', timeZone: 'America/Argentina/Buenos_Aires' },
  { name: 'Madrid', timeZone: 'Europe/Madrid' },
  { name: 'Londres', timeZone: 'Europe/London' },
  { name: 'París', timeZone: 'Europe/Paris' },
  { name: 'Roma', timeZone: 'Europe/Rome' },
  { name: 'Tokio', timeZone: 'Asia/Tokyo' },
  { name: 'Sídney', timeZone: 'Australia/Sydney' },
];

const CITY_FACTS: Record<string, string[]> = {
  'Miami': [
    'Miami es la única gran ciudad estadounidense fundada por una mujer, Julia Tuttle.',
    'Tiene la mayor colección de arquitectura Art Decó del mundo.',
    'Es conocida como la "Capital de los Cruceros" del mundo.',
    'El nombre "Miami" proviene de una de las tribus nativas americanas de la región.',
    'Es la única ciudad en EE. UU. rodeada por dos parques nacionales.'
  ],
  'Nueva York': [
    'El Banco de la Reserva Federal de Wall Street guarda el 25% del oro mundial.',
    'Los taxistas de NY inventaron el icónico color amarillo para ser más visibles.',
    'Se hablan más de 800 idiomas diferentes en la ciudad.',
    'La Estatua de la Libertad fue un regalo de Francia en 1886.',
    'Central Park es más grande que los países de Mónaco o el Vaticano.'
  ],
  'La Habana': [
    'Alberga el castillo colonial más grande de América: San Carlos de la Cabaña.',
    'El Capitolio de La Habana es ligeramente más grande que el de Washington D.C.',
    'Tiene el sistema de autos antiguos estadounidenses más grande y mejor conservado.',
    'La Universidad de La Habana fue fundada en 1728, siendo una de las más antiguas.',
    'El Malecón habanero tiene una longitud de 8 kilómetros de extensión.'
  ],
  'Los Ángeles': [
    'El cartel de "Hollywood" originalmente decía "Hollywoodland".',
    'Tiene la mayor población de origen mexicano fuera de México.',
    'La ciudad tiene su propio "paseo de la fama" con más de 2,700 estrellas.',
    'Su nombre original completo es "El Pueblo de Nuestra Señora la Reina de los Ángeles".',
    'Es el hogar de la mayor industria del entretenimiento del mundo.'
  ],
  'CDMX': [
    'Es la ciudad con más museos en el mundo después de Londres.',
    'El Castillo de Chapultepec es el único castillo real en el continente americano.',
    'La ciudad se hunde un promedio de 50 centímetros cada año.',
    'Tiene el sistema de transporte colectivo (Metro) más grande de Latinoamérica.',
    'El Zócalo es la segunda plaza pública más grande del mundo.'
  ],
  'Bogotá': [
    'Es una de las capitales más altas del mundo, a 2,640 metros sobre el nivel del mar.',
    'Alberga el Museo del Oro, con la colección más grande de orfebrería prehispánica.',
    'La Ciclovía de Bogotá fue pionera en el mundo, cerrando calles a los autos los domingos.',
    'El cerro de Monserrate ofrece la vista panorámica más icónica de la ciudad.',
    'Tiene uno de los sistemas de autobuses de tránsito rápido más extensos (TransMilenio).'
  ],
  'Buenos Aires': [
    'Es conocida como "La París de Sudamérica" por su arquitectura europea.',
    'La Avenida 9 de Julio fue alguna vez la calle más ancha del mundo.',
    'Tiene la mayor concentración de teatros del mundo.',
    'El Teatro Colón es considerado uno de los teatros con mejor acústica a nivel mundial.',
    'Es la cuna mundial indiscutible del tango.'
  ],
  'Madrid': [
    'El restaurante Botín es reconocido como el más antiguo del mundo en funcionamiento.',
    'El Museo del Prado tiene una de las mayores colecciones de arte europeo.',
    'Es la capital más alta de la Unión Europea.',
    'El Parque del Retiro era originalmente un lugar de recreo exclusivo para la monarquía.',
    'El Palacio Real de Madrid tiene más habitaciones que cualquier otro palacio europeo.'
  ],
  'Londres': [
    'El "Big Ben" no es el nombre de la torre ni del reloj, sino de la campana principal.',
    'El sistema del Metro de Londres ("The Tube") es el más antiguo del mundo.',
    'Se conducen más de 20,000 taxis negros por las calles de Londres.',
    'La ciudad ha sido sede de los Juegos Olímpicos de verano en tres ocasiones.',
    'Existen más de 170 museos en la capital británica.'
  ],
  'París': [
    'La Torre Eiffel fue construida como una estructura temporal para una Exposición Universal.',
    'El Museo del Louvre es el museo de arte más visitado del mundo.',
    'Tiene una Estatua de la Libertad en miniatura que mira hacia su hermana mayor en NY.',
    'La ciudad cuenta con un intrincado sistema de catacumbas bajo sus calles.',
    'La famosa campana de Notre Dame pesa más de 13 toneladas.'
  ],
  'Roma': [
    'El Coliseo Romano podía albergar hasta 80,000 espectadores.',
    'Existe una ley que permite a los gatos vivir libremente donde nacen en Roma.',
    'El Panteón ha estado en uso continuo desde el siglo VII.',
    'Es la única ciudad en el mundo que tiene otro país dentro de ella: El Vaticano.',
    'La Fontana de Trevi tiene la cúpula de hormigón no reforzado más grande del mundo.'
  ],
  'Tokio': [
    'El cruce de Shibuya es considerado el paso de peatones más transitado del mundo.',
    'La estación de Shinjuku es la más concurrida, con millones de pasajeros diarios.',
    'Es la metrópolis con más estrellas Michelin del planeta.',
    'Tiene máquinas expendedoras para casi todo lo imaginable.',
    'La Torre de Tokio es más alta que la Torre Eiffel original.'
  ],
  'Sídney': [
    'La Ópera de Sídney tardó 14 años en construirse y su techo tiene más de un millón de azulejos.',
    'El Puente de la Bahía de Sídney es el puente de arco de acero más ancho del mundo.',
    'Las playas de Sídney son famosas, cuenta con más de 100 en su litoral.',
    'Originalmente se planeaba llamar a la ciudad "Albion".',
    'La araña de tela de embudo, una de las más mortales, es originaria de los alrededores.'
  ]
};

const ALL_FACTS = Object.entries(CITY_FACTS).flatMap(([city, facts]) => 
  facts.map(fact => ({ city, fact }))
);

export const WorldTimeBar: React.FC = () => {
  const [times, setTimes] = useState<Record<string, string>>({});
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [facts] = useState(() => [...ALL_FACTS].sort(() => Math.random() - 0.5));

  useEffect(() => {
    const updateTimes = () => {
      const newTimes: Record<string, string> = {};
      const now = new Date();
      
      CITIES.forEach(city => {
        try {
          const formatter = new Intl.DateTimeFormat('es-ES', {
            timeZone: city.timeZone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          newTimes[city.name] = formatter.format(now).toUpperCase();
        } catch (e) {
          console.error(`Error formatting time for ${city.timeZone}`, e);
          newTimes[city.name] = '--:--';
        }
      });
      
      setTimes(newTimes);
    };

    updateTimes(); // Initial update
    
    // Update every minute, synchronized to the top of the minute
    const now = new Date();
    const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    
    let interval: NodeJS.Timeout;
    const timeout = setTimeout(() => {
      updateTimes();
      interval = setInterval(updateTimes, 60000);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentFactIndex((prev) => (prev + 1) % facts.length);
        setFade(true);
      }, 500); // 500ms fade duration
    }, 12000); // 12 seconds per fact

    return () => clearInterval(timer);
  }, [facts.length]);

  // For seamless scrolling, we duplicate the list of cities
  const duplicatedCities = [...CITIES, ...CITIES];

  return (
    <div className="w-full bg-slate-900 border border-white/10 rounded-2xl relative overflow-hidden flex flex-col shadow-2xl">
      {/* Top Row: World Times */}
      <div className="w-full relative py-3 flex items-center">
        <div className="absolute left-0 top-0 bottom-0 w-8 md:w-32 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none rounded-tl-2xl" />
        <div className="absolute right-0 top-0 bottom-0 w-8 md:w-32 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none rounded-tr-2xl" />
        
        {/* Title Label (Sticky left) */}
        <div className="flex absolute left-0 top-0 bottom-0 bg-slate-900 z-20 items-center pl-3 pr-2 md:pl-6 md:pr-4 border-r border-white/5 shadow-[10px_0_20px_-10px_rgba(0,0,0,0.5)]">
          <Globe className="text-primary mr-1.5 md:mr-2" size={16} />
          <span className="text-white text-[10px] md:text-sm font-black uppercase tracking-tight md:tracking-widest">
            <span className="md:hidden">HORA</span>
            <span className="hidden md:inline">Hora Mundo</span>
          </span>
        </div>

        {/* Marquee Container */}
        <div className="flex w-full overflow-hidden">
          <div className="flex whitespace-nowrap animate-loop-scroll pl-[80px] md:pl-[140px]">
            {duplicatedCities.map((city, index) => (
              <div 
                key={`${city.name}-${index}`} 
                className="flex items-center mx-4 md:mx-6 cursor-default select-none"
              >
                <span className="text-white/60 text-[10px] sm:text-sm font-bold tracking-wider uppercase mr-1.5 md:mr-2">
                  {city.name}
                </span>
                <span className="text-white font-black text-xs sm:text-base tracking-tighter shadow-sm bg-white/5 px-1.5 md:px-2 py-0.5 rounded-md border border-white/5 font-mono min-w-[65px] md:min-w-[85px] flex items-center justify-center tabular-nums">
                  {times[city.name] || '--:--'}
                </span>
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white/20 ml-8 md:ml-12" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Sabías que... (Curiosities) */}
      <div className="w-full border-t border-white/5 bg-slate-950/50 py-3 px-4 md:px-6 flex items-center overflow-hidden min-h-[56px] md:min-h-[60px]">
        <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] md:text-xs flex-shrink-0 mr-3 border-r border-white/10 pr-3">
          <Lightbulb size={16} className="animate-pulse" />
          <span className="hidden sm:inline">Sabías que...</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <p 
            className={`text-white/80 text-xs sm:text-sm font-medium line-clamp-2 transition-opacity duration-500 ease-in-out ${fade ? 'opacity-100' : 'opacity-0'}`}
            title={`${facts[currentFactIndex].city}: ${facts[currentFactIndex].fact}`}
          >
            <strong className="text-white mr-1.5 uppercase tracking-wide">{facts[currentFactIndex].city}:</strong> 
            {facts[currentFactIndex].fact}
          </p>
        </div>
      </div>
    </div>
  );
};
