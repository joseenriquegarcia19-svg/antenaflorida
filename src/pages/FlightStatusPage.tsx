import React, { useState, useEffect, useCallback } from 'react';
import {
  Plane, PlaneLanding, Package, RefreshCw,
  Clock, Search,
  AlertCircle, CheckCircle,
  XCircle, Info, Users, ChevronDown, ChevronUp,
  Wifi, WifiOff
} from 'lucide-react';
import { SEO } from '@/components/SEO';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AirportRef {
  name: string;
  iata?: string;
  countryCode?: string;
  municipalityName?: string;
}

interface TimeSlot {
  airport?: AirportRef;
  scheduledTimeLocal?: string;
  actualTimeLocal?: string;
  estimatedTimeLocal?: string;
  terminal?: string;
  gate?: string;
  baggage?: string;
}

interface Flight {
  number: string;
  callSign?: string;
  status: string;
  airline: { name: string; iata?: string };
  aircraft?: { model?: string; reg?: string; image?: { url?: string } };
  departure: TimeSlot;
  arrival: TimeSlot;
  isCargo?: boolean;
  totalPassengers?: number;
  codeshareStatus?: string;
  isCodeshared?: { airline?: { name: string; iata?: string }; flightNumber?: string };
}

interface FlightResponse {
  arrivals?: Flight[];
  departures?: Flight[];
  _error?: string;
  _detail?: string;
  _demo?: boolean;
  _date?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  Landed:    { label: 'Aterrizó',     color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30', Icon: CheckCircle },
  Scheduled: { label: 'Programado',   color: 'text-sky-400',     bg: 'bg-sky-500/20 border-sky-500/30',         Icon: Clock },
  Delayed:   { label: 'Demorado',     color: 'text-amber-400',   bg: 'bg-amber-500/20 border-amber-500/30',     Icon: AlertCircle },
  Cancelled: { label: 'Cancelado',    color: 'text-rose-400',    bg: 'bg-rose-500/20 border-rose-500/30',       Icon: XCircle },
  Departed:  { label: 'En vuelo',     color: 'text-violet-400',  bg: 'bg-violet-500/20 border-violet-500/30',   Icon: Plane },
  Diverted:  { label: 'Desviado',     color: 'text-orange-400',  bg: 'bg-orange-500/20 border-orange-500/30',   Icon: AlertCircle },
};

const getStatus = (status: string) =>
  STATUS_CONFIG[status] || { label: status, color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30', Icon: Info };

const fmtTime = (t?: string) => {
  if (!t) return '–';
  // AeroDataBox returns times as "2026-02-27 08:30+00:00" OR "2026-02-27T08:30"
  const normalized = t.replace(' ', 'T');
  const tPart = normalized.split('T')[1] || normalized;
  return tPart.substring(0, 5);
};

const airlineLogoUrl = (iata?: string) =>
  iata ? `https://images.kiwi.com/airlines/64/${iata}.png` : '';

const flagUrl = (code?: string) =>
  code ? `https://flagcdn.com/24x18/${code.toLowerCase()}.png` : '';

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimeDisplay({ scheduled, actual }: { scheduled?: string; actual?: string }) {
  const isDelayed = actual && scheduled && fmtTime(actual) !== fmtTime(scheduled);
  return (
    <div className="flex flex-col items-end">
      {isDelayed && (
        <span className="text-[10px] font-bold text-slate-500 line-through">{fmtTime(scheduled)}</span>
      )}
      <span className={`text-base font-black ${isDelayed ? 'text-amber-400' : 'text-white'}`}>
        {fmtTime(actual || scheduled)}
      </span>
    </div>
  );
}

function FlightRow({ flight, expanded, onToggle }: { flight: Flight; expanded: boolean; onToggle: () => void }) {
  const status = getStatus(flight.status);
  const StatusIcon = status.Icon;
  const isCargo = flight.isCargo;

  return (
    <div
      className={`rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer
        ${expanded
          ? 'border-sky-500/50 bg-slate-800/80 shadow-lg shadow-sky-500/10'
          : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
        }`}
      onClick={onToggle}
    >
      {/* Main Row */}
      <div className="flex items-center gap-3 p-3 sm:p-4">
        {/* Airline Logo */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
          {flight.airline.iata ? (
            <img
              src={airlineLogoUrl(flight.airline.iata)}
              alt={flight.airline.name}
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (e.currentTarget.parentElement!).innerHTML = `<span class="text-[10px] font-black text-white/60 text-center px-1">${flight.airline.iata}</span>`;
              }}
            />
          ) : (
            <span className="text-[10px] font-black text-white/60">?</span>
          )}
        </div>

        {/* Flight Number & Airline */}
        <div className="w-24 sm:w-28 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-black text-white tracking-wide">{flight.number}</span>
            {isCargo && <Package size={12} className="text-amber-400" />}
          </div>
          <span className="text-[10px] font-bold text-slate-400 truncate block max-w-[96px]">{flight.airline.name}</span>
        </div>

        {/* Route */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              {flight.departure.airport?.countryCode && (
                <img src={flagUrl(flight.departure.airport.countryCode)} alt="" className="w-4 h-3 object-cover rounded-sm" />
              )}
              <span className="font-black text-white text-xs sm:text-sm">
                {flight.departure.airport?.iata || '–'}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold truncate max-w-[80px] sm:max-w-[140px]">
              {flight.departure.airport?.municipalityName || flight.departure.airport?.name || '–'}
            </span>
          </div>

          <div className="flex-1 flex items-center gap-1 justify-center text-slate-600">
            <div className="h-px flex-1 bg-slate-700" />
            <PlaneLanding size={14} className="text-sky-400 shrink-0" />
            <div className="h-px flex-1 bg-slate-700" />
          </div>

          <div className="flex flex-col items-end min-w-0">
            <span className="font-black text-white text-xs sm:text-sm">MIA</span>
            {flight.arrival.terminal && (
              <span className="text-[9px] text-slate-400 font-bold">Terminal {flight.arrival.terminal}</span>
            )}
          </div>
        </div>

        {/* Times */}
        <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 w-20">
          <TimeDisplay scheduled={flight.arrival.scheduledTimeLocal} actual={flight.arrival.actualTimeLocal || flight.arrival.estimatedTimeLocal} />
          <span className="text-[9px] font-bold text-slate-500 uppercase">Llegada</span>
        </div>

        {/* Status */}
        <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] sm:text-xs font-black uppercase tracking-wider ${status.bg} ${status.color}`}>
          <StatusIcon size={12} className="shrink-0" />
          <span className="hidden sm:inline">{status.label}</span>
        </div>

        {/* Expand arrow */}
        <div className="shrink-0 text-slate-500">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded Detail Panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Salida</span>
              <span className="text-lg font-black text-white">{fmtTime(flight.departure.scheduledTimeLocal)}</span>
              <span className="text-xs text-slate-400">{flight.departure.airport?.name}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Llegada (MIA)</span>
              <TimeDisplay scheduled={flight.arrival.scheduledTimeLocal} actual={flight.arrival.actualTimeLocal} />
              <div className="flex gap-2 text-xs text-slate-400">
                {flight.arrival.terminal && <span>Terminal <strong className="text-white">{flight.arrival.terminal}</strong></span>}
                {flight.arrival.gate && <span>Puerta <strong className="text-white">{flight.arrival.gate}</strong></span>}
                {flight.arrival.baggage && <span>Carrusel <strong className="text-sky-400">{flight.arrival.baggage}</strong></span>}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aeronave</span>
              <span className="text-sm font-black text-white">{flight.aircraft?.model || '–'}</span>
              {flight.aircraft?.reg && <span className="text-xs text-slate-400">Reg: {flight.aircraft.reg}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {isCargo ? 'Tipo' : 'Pasajeros'}
              </span>
              {isCargo ? (
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-amber-400" />
                  <span className="text-sm font-black text-amber-400">CARGA</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-sky-400" />
                  <span className="text-lg font-black text-white">
                    {flight.totalPassengers ? flight.totalPassengers.toLocaleString() : '–'}
                  </span>
                </div>
              )}
              {flight.isCodeshared && (
                <span className="text-[10px] text-slate-400">
                  También como: {flight.isCodeshared.airline?.iata} {flight.isCodeshared.flightNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FlightStatusPage() {
  const [data, setData] = useState<FlightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'passenger' | 'cargo'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const today = new Date().toLocaleDateString('es-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/New_York'
  });

  const fetchFlights = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/miami-flights?type=arrivals`;
      const res = await fetch(url, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: FlightResponse = await res.json();

      // Show API-level errors from edge function
      if (json._error) {
        setError(`Error de API: ${json._error}${json._detail ? ` – ${json._detail}` : ''}`);
      }

      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setError(`No se pudo conectar con el servidor de vuelos: ${e}`);
      setData({ arrivals: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlights(); }, [fetchFlights]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchFlights(true), 30 * 60 * 1000); // 30 min — respects BASIC plan quota
    return () => clearInterval(interval);
  }, [autoRefresh, fetchFlights]);

  const allFlights: Flight[] = data?.arrivals || (Array.isArray(data) ? data as Flight[] : []);

  const filtered = allFlights.filter(f => {
    const matchStatus = filterStatus === 'all' || f.status === filterStatus;
    const matchType = filterType === 'all'
      || (filterType === 'cargo' && f.isCargo)
      || (filterType === 'passenger' && !f.isCargo);
    const q = search.toLowerCase();
    const matchSearch = !q
      || f.number.toLowerCase().includes(q)
      || f.airline.name.toLowerCase().includes(q)
      || (f.departure.airport?.name || '').toLowerCase().includes(q)
      || (f.departure.airport?.iata || '').toLowerCase().includes(q)
      || (f.departure.airport?.municipalityName || '').toLowerCase().includes(q);
    return matchStatus && matchType && matchSearch;
  });

  // Stats
  const stats = {
    total: allFlights.length,
    landed: allFlights.filter(f => f.status === 'Landed').length,
    scheduled: allFlights.filter(f => f.status === 'Scheduled').length,
    delayed: allFlights.filter(f => f.status === 'Delayed').length,
    cancelled: allFlights.filter(f => f.status === 'Cancelled').length,
    cargo: allFlights.filter(f => f.isCargo).length,
    passengers: allFlights.filter(f => !f.isCargo).reduce((s, f) => s + (f.totalPassengers || 0), 0),
  };

  const statusOptions = ['all', 'Scheduled', 'Landed', 'Delayed', 'Cancelled', 'Departed', 'Diverted'];

  return (
    <>
      <SEO
        title="Estado de Vuelos – Aeropuerto de Miami"
        description="Consulta en tiempo real los vuelos de llegada al Aeropuerto Internacional de Miami (MIA). Información de aerolínea, estado, pasajeros, terminal y más."
      />

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">

        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden border-b border-slate-800">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-sky-950/30" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-500/30">
                    <PlaneLanding size={28} className="text-sky-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                      Estado de <span className="text-sky-400">Vuelos</span>
                    </h1>
                    <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Aeropuerto Internacional de Miami · KMIA / MIA
                    </p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm capitalize">{today}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAutoRefresh(p => !p)}
                  title={autoRefresh ? 'Deshabilitar actualización automática' : 'Habilitar actualización automática'}
                  className={`p-2.5 rounded-lg border transition-all ${autoRefresh ? 'bg-sky-500/20 border-sky-500/40 text-sky-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                >
                  {autoRefresh ? <Wifi size={18} /> : <WifiOff size={18} />}
                </button>
                <button
                  onClick={() => fetchFlights()}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-sky-500/30"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  Actualizar
                </button>
              </div>
            </div>

            {lastUpdated && (
              <p className="text-[10px] text-slate-500 font-bold mt-4 flex items-center gap-1">
                <Clock size={10} /> Última actualización: {lastUpdated.toLocaleTimeString('es-US')}
              </p>
            )}

            {/* Stats Row */}
            {!loading && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Total Vuelos', value: stats.total, color: 'text-white' },
                  { label: 'Aterrizados', value: stats.landed, color: 'text-emerald-400' },
                  { label: 'Programados', value: stats.scheduled, color: 'text-sky-400' },
                  { label: 'Demorados', value: stats.delayed, color: 'text-amber-400' },
                  { label: 'Cancelados', value: stats.cancelled, color: 'text-rose-400' },
                  { label: 'Carga', value: stats.cargo, color: 'text-amber-300' },
                  { label: 'Pasajeros Llegan', value: stats.passengers.toLocaleString(), color: 'text-violet-400' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-3 flex flex-col gap-0.5">
                    <span className={`text-xl sm:text-2xl font-black ${s.color}`}>{s.value}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Arrivals Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-sky-500/20 border border-sky-500/30">
              <PlaneLanding size={20} className="text-sky-400" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Llegadas del Día</h2>
            <span className="text-xs font-black text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full ml-auto">
              {filtered.length} vuelos
            </span>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar vuelo, aerolínea, origen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:border-sky-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
              {[
                { value: 'all', label: 'Todos', Icon: Plane },
                { value: 'passenger', label: 'Pasajeros', Icon: Users },
                { value: 'cargo', label: 'Carga', Icon: Package },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setFilterType(value as typeof filterType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${filterType === value ? 'bg-sky-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  <Icon size={12} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-sky-500 focus:outline-none transition-colors"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>
                  {s === 'all' ? '🔵 Todos los estados' : `${getStatus(s).label}`}
                </option>
              ))}
            </select>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6 text-amber-400 text-sm font-bold">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Flight List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-800/40 border border-slate-700/30 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-600">
              <PlaneLanding size={64} />
              <p className="font-black text-lg">No se encontraron vuelos</p>
              <p className="text-sm font-bold">Prueba ajustando los filtros de búsqueda</p>
              {data && allFlights.length === 0 && (
                <p className="text-xs text-slate-700 font-mono max-w-md text-center mt-2">
                  La API devolvió 0 vuelos. {data._date && `Fecha consultada: ${data._date}`}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((flight) => (
                <FlightRow
                  key={`${flight.number}-${flight.departure.scheduledTimeLocal}`}
                  flight={flight}
                  expanded={expandedId === flight.number}
                  onToggle={() => setExpandedId(prev => prev === flight.number ? null : flight.number)}
                />
              ))}
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-10 flex items-start gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/30 text-slate-500 text-xs font-bold">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>
              La información de vuelos se actualiza automáticamente cada 2 minutos y proviene de la API AeroDataBox.
              Los datos de pasajeros son estimaciones basadas en la capacidad de la aeronave.
              Para confirmación oficial, consulte el <a href="https://www.miami-airport.com" target="_blank" rel="noopener noreferrer" className="underline text-sky-500 hover:text-sky-400">sitio web del Aeropuerto de Miami</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
