import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Plus, Loader2, Globe } from 'lucide-react';

interface AudienceEntry {
  id: string;
  country_name: string;
  country_code: string;
  listeners_count: number;
  active: boolean;
}

interface StatsEntry {
  country: string;
  views: number;
}

const COMMON_COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CA', name: 'Canadá' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'ES', name: 'España' },
  { code: 'FR', name: 'Francia' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'IT', name: 'Italia' },
  { code: 'MX', name: 'México' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PE', name: 'Perú' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'DE', name: 'Alemania' },
];

export function AudienceManager() {
  const [fixedEntries, setFixedEntries] = useState<AudienceEntry[]>([]);
  const [statsEntries, setStatsEntries] = useState<StatsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  
  // Form state
  const [newCountryCode, setNewCountryCode] = useState('US');
  const [newListeners, setNewListeners] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to map country names to codes for comparison
  const getCodeForCountry = (name: string): string | undefined => {
    const map: Record<string, string> = {
      'United States': 'US', 'Estados Unidos': 'US',
      'Spain': 'ES', 'España': 'ES',
      'Mexico': 'MX', 'México': 'MX',
      'Argentina': 'AR',
      'Colombia': 'CO',
      'Chile': 'CL',
      'Peru': 'PE', 'Perú': 'PE',
      'Venezuela': 'VE',
      'Ecuador': 'EC',
      'Guatemala': 'GT',
      'Bolivia': 'BO',
      'Dominican Republic': 'DO', 'República Dominicana': 'DO',
      'Honduras': 'HN',
      'Paraguay': 'PY',
      'El Salvador': 'SV',
      'Nicaragua': 'NI',
      'Costa Rica': 'CR',
      'Panama': 'PA', 'Panamá': 'PA',
      'Uruguay': 'UY',
      'Brazil': 'BR', 'Brasil': 'BR',
      'Canada': 'CA', 'Canadá': 'CA',
      'United Kingdom': 'GB', 'Reino Unido': 'GB',
      'France': 'FR', 'Francia': 'FR',
      'Italy': 'IT', 'Italia': 'IT',
      'Germany': 'DE', 'Alemania': 'DE'
    };
    return map[name];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      // 1. Fetch Fixed Audience (Manual)
      const { data: fixedData, error: fixedError } = await supabase
        .from('audience_map_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (fixedError) throw fixedError;
      
      // 2. Fetch Stats (Dynamic) - Using the same RPC as AudienceMap
      const { data: statsData, error: statsError } = await supabase.rpc('stats_by_country', {
        p_start: thirtyDaysAgo.toISOString(),
        p_end: today.toISOString(),
        p_limit: 50 // Get more to ensure we cover enough ground
      });

      let currentStats: StatsEntry[] = [];
      if (!statsError && statsData) {
        currentStats = statsData
          .filter((item: any) => 
            item.country && 
            item.country !== 'Unknown' && 
            item.country !== 'Desconocido'
          )
          .map((item: any) => ({
            country: item.country,
            views: item.views
          }));
        setStatsEntries(currentStats);
      } else {
        setStatsEntries([]);
      }

      // 3. Cleanup: Remove fixed entries that are already in stats
      const statsCodes = new Set(
        currentStats
          .map(s => getCodeForCountry(s.country))
          .filter(c => c !== undefined) as string[]
      );

      // Identify fixed entries to delete (those that are present in stats)
      const entriesToDelete = fixedData?.filter(entry => statsCodes.has(entry.country_code)) || [];
      
      if (entriesToDelete.length > 0) {
        // Delete from DB
        const idsToDelete = entriesToDelete.map(e => e.id);
        await supabase.from('audience_map_entries').delete().in('id', idsToDelete);
        
        // Filter local state
        const validFixed = fixedData?.filter(entry => !statsCodes.has(entry.country_code)) || [];
        setFixedEntries(validFixed);
      } else {
        setFixedEntries(fixedData || []);
      }

    } catch (error) {
      console.error('Error fetching audience data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newCountryCode) return;

    // Check if country exists in stats
    const statsCodes = new Set(
      statsEntries
        .map(s => getCodeForCountry(s.country))
        .filter(c => c !== undefined) as string[]
    );

    if (statsCodes.has(newCountryCode)) {
      alert('Este país ya aparece automáticamente en las estadísticas. No es necesario agregarlo manualmente.');
      return;
    }

    setAdding(true);
    
    const countryName = COMMON_COUNTRIES.find(c => c.code === newCountryCode)?.name || newCountryCode;

    try {
      const { error } = await supabase.from('audience_map_entries').insert([{
        country_code: newCountryCode,
        country_name: countryName,
        listeners_count: newListeners,
        active: true
      }]);

      if (error) throw error;
      
      setNewListeners(0);
      fetchData(); // Refresh list and re-verify
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Error al agregar país');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este país de la lista fija?')) return;
    
    try {
      const { error } = await supabase.from('audience_map_entries').delete().eq('id', id);
      if (error) throw error;
      setFixedEntries(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error al eliminar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
           <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestión de Audiencia Global</h2>
           <p className="text-sm text-slate-500 dark:text-white/60">Configura qué países aparecen en la barra de audiencia.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FIXED AUDIENCE (Editable) */}
        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5 h-fit">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="bg-primary text-background-dark text-xs px-2 py-1 rounded">MANUAL</span>
            Audiencia Fija
          </h3>
          <p className="text-sm text-slate-500 dark:text-white/60 mb-6">
            Estos países aparecerán siempre en la barra, independientemente de las estadísticas reales.
            Úsalo para mostrar presencia global permanente.
          </p>

          {/* Add Form */}
          <div className="flex gap-2 mb-6 items-end bg-white dark:bg-black/20 p-4 rounded-lg border border-slate-200 dark:border-white/5">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 uppercase">País</label>
              <select 
                value={newCountryCode}
                onChange={(e) => setNewCountryCode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary"
              >
                {COMMON_COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            {/*
            <div className="w-24">
              <label className="block text-xs font-bold text-slate-500 dark:text-white/50 mb-1 uppercase">Oyentes (Sim.)</label>
              <input 
                type="number" 
                value={newListeners}
                onChange={(e) => setNewListeners(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary"
              />
            </div>
            */}
            <button 
              onClick={handleAdd}
              disabled={adding}
              className="bg-primary hover:bg-primary/90 text-background-dark px-4 py-2 rounded font-bold text-sm flex items-center gap-1 transition-colors h-[38px]"
            >
              {adding ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Agregar
            </button>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {loading ? (
              <div className="text-center py-4 text-slate-500">Cargando...</div>
            ) : fixedEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-white/30 italic bg-white dark:bg-black/10 rounded-lg border border-dashed border-slate-200 dark:border-white/10">
                No hay audiencia fija configurada.
              </div>
            ) : (
              fixedEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between bg-white dark:bg-black/20 p-3 rounded-lg border border-slate-100 dark:border-white/5 hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <img 
                      src={`https://flagcdn.com/24x18/${entry.country_code.toLowerCase()}.png`} 
                      alt={entry.country_name}
                      className="w-6 h-4 object-cover rounded-sm shadow-sm"
                    />
                    <span className="font-medium text-slate-900 dark:text-white">{entry.country_name}</span>
                  </div>
                  <button 
                    onClick={() => handleDelete(entry.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* STATS AUDIENCE (Read Only) */}
        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5 h-fit opacity-75">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">AUTO</span>
            Audiencia por Estadística
          </h3>
          <p className="text-sm text-slate-500 dark:text-white/60 mb-6">
            Estos países se detectan automáticamente según las visitas reales al sitio. 
            <br/><span className="italic text-xs text-orange-500">Solo lectura - No editable.</span>
          </p>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
             {statsEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-white/30 italic bg-white dark:bg-black/10 rounded-lg border border-dashed border-slate-200 dark:border-white/10">
                  No hay datos estadísticos suficientes aún.
                </div>
             ) : (
               statsEntries.map((entry, idx) => (
                 <div key={idx} className="flex items-center justify-between bg-white dark:bg-black/20 p-3 rounded-lg border border-slate-100 dark:border-white/5">
                   <div className="flex items-center gap-3">
                     <Globe size={16} className="text-slate-400" />
                     <span className="font-medium text-slate-900 dark:text-white">{entry.country || 'Desconocido'}</span>
                   </div>
                   <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-600 dark:text-white/60">
                     {entry.views} visitas
                   </span>
                 </div>
               ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
