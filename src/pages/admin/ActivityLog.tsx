import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { Search, Filter, Calendar, Activity, Globe, Download, Copy, Trash2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../../contexts/ToastContext';

interface ActivityLog {
  id: string;
  user_id: string | null; // Can be null for failed auth attempts
  action_type: string;
  description: string;
  ip_address: string;
  occurred_at: string;
  profiles?: {
    full_name: string;
    email: string;
    team_members?: {
      name: string;
      image_url?: string;
    }[];
  } | null; // Can be null when user_id is null
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const LOGS_PER_PAGE = 25;

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchLogs(0);
    fetchActionTypes();
    logActivity('Visitar Sección', 'Visitó el Historial de Actividad');
  }, []);

  // Sync with filters
  useEffect(() => {
    fetchLogs(0);
  }, [debouncedSearchTerm, filterAction, dateRange, showErrorsOnly]);

  async function fetchActionTypes() {
    try {
      const { data } = await supabase
        .from('user_activity_log')
        .select('action_type')
        .limit(2000);
      if (data) {
        const types = Array.from(new Set(data.map(log => log.action_type))).sort();
        setActionTypes(types);
      }
    } catch (error) {
      console.error('Error fetching action types:', error);
    }
  }

  async function fetchLogs(pageNum: number, loadMore = false) {
    try {
      setLoading(true);
      const from = pageNum * LOGS_PER_PAGE;
      const to = from + LOGS_PER_PAGE - 1;

      let query = supabase
        .from('user_activity_log')
        .select(`
          *,
          profiles (
            full_name,
            email,
            team_members (name, image_url)
          )
        `, { count: 'exact' });

      // Apply Filters
      if (debouncedSearchTerm) {
        // Search in description and action_type
        // Note: Complex profile search is harder over RPC/standard JS client without custom functions
        query = query.or(`description.ilike.%${debouncedSearchTerm}%,action_type.ilike.%${debouncedSearchTerm}%`);
      }

      if (filterAction !== 'all') {
        query = query.eq('action_type', filterAction);
      }

      if (showErrorsOnly) {
        // Find errors in action type
        query = query.or('action_type.ilike.%Error%,action_type.ilike.%Fallido%');
      }

      if (dateRange.start) {
        query = query.gte('occurred_at', dateRange.start);
      }

      if (dateRange.end) {
        query = query.lte('occurred_at', `${dateRange.end}T23:59:59`);
      }

      const { data, count, error } = await query
        .order('occurred_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        if (loadMore) {
          setLogs(prev => [...prev, ...data]);
        } else {
          setLogs(data);
        }
        setPage(pageNum);
        setHasMore(data.length === LOGS_PER_PAGE);
        if (count !== null) setTotalCount(count);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      showErrorToast('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  }

  // Calculate statistics from a broader sample or separate query if needed
  // For now, we'll use the fetched logs but note it's limited
  const errorStats = {
    total: logs.filter(l => l.action_type.includes('Error') || l.action_type.includes('Intento Fallido')).length,
    authErrors: logs.filter(l => l.action_type.includes('Intento Fallido') || l.action_type.includes('Error de Autenticación')).length,
    systemErrors: logs.filter(l => l.action_type.includes('Error de Sistema') || l.action_type.includes('Error de Base de Datos')).length,
    saveErrors: logs.filter(l => l.action_type.includes('Error al Guardar') || l.action_type.includes('Error al Crear') || l.action_type.includes('Error al Modificar')).length,
    last24h: logs.filter(l => {
      const logDate = new Date(l.occurred_at);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return logDate >= oneDayAgo && (l.action_type.includes('Error') || l.action_type.includes('Intento Fallido'));
    }).length
  };

  const clearErrors = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar TODOS los registros de errores? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoading(true);
      // We'll delete logs where action_type contains "Error" or "Fallido"
      // Since supabase doesn't support complex OR filters easily in delete with contains,
      // we might need to do it in a loop or finding IDs first if we want to be specific.
      // Or we can rely on a simpler LIKE filter if supported or RPC.
      // But for client side simplicity with small data, let's find IDs first.
      
      const errorLogsToDelete = logs
        .filter(l => l.action_type.includes('Error') || l.action_type.includes('Intento Fallido'))
        .map(l => l.id);

      if (errorLogsToDelete.length === 0) {
        showSuccessToast('No hay errores en la vista actual');
        return;
      }

      const { error } = await supabase
        .from('user_activity_log')
        .delete()
        .in('id', errorLogsToDelete);

      if (error) throw error;

      setLogs(prev => prev.filter(l => !errorLogsToDelete.includes(l.id)));
      showSuccessToast(`Se eliminaron ${errorLogsToDelete.length} registros de errores`);
      logActivity('Eliminar Registro', `Eliminó ${errorLogsToDelete.length} registros de errores del historial`);
      
      // Update stats by re-fetching or just letting state update handle it
      // State update above handles visual list, but stats are derived from 'logs' state, so they update automatically.
      
    } catch (error) {
      console.error('Error clearing errors:', error);
      showErrorToast('Error al limpiar el historial de errores');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    logActivity('Actualizar Ajustes', `Exportó el historial de actividad a CSV (${logs.length} registros)`);
    const headers = ['Fecha', 'Usuario', 'Email', 'Acción', 'Descripción', 'IP'];
    const rows = logs.map(log => [
      format(new Date(log.occurred_at), 'yyyy-MM-dd HH:mm:ss'),
      log.profiles?.full_name || 'N/A',
      log.profiles?.email || 'N/A',
      log.action_type,
      log.description || '',
      log.ip_address || 'Unknown'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_actividad_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="invisible h-0 overflow-hidden">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Historial de Actividad</h1>
          <p className="text-slate-500 dark:text-white/50 text-sm mt-1">Auditoría detallada de acciones realizadas por usuarios.</p>
        </div>
          <button 
            onClick={clearErrors}
            className="flex items-center gap-2 px-4 py-2 bg-rose-100 dark:bg-rose-900/20 hover:bg-rose-200 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded-lg font-bold text-sm transition-colors border border-rose-200 dark:border-rose-800/30"
          >
            <Trash2 size={18} /> Limpiar Errores en Vista
          </button>
          <button 
            onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-lg font-bold text-sm transition-colors border border-slate-200 dark:border-white/10"
        >
          <Download size={18} /> Exportar Vista CSV
        </button>
      </div>

      {/* Error Summary Dashboard */}
      <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 p-6 rounded-2xl border border-rose-200 dark:border-rose-500/20 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-rose-500 rounded-lg">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Panel de Errores</h2>
            <p className="text-xs text-slate-600 dark:text-white/60">Monitoreo de problemas y fallos del sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          {/* Total Errors */}
          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-rose-200 dark:border-white/10">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{errorStats.total}</div>
            <div className="text-xs font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider mt-1">Total Errores</div>
          </div>

          {/* Auth Errors */}
          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-orange-200 dark:border-white/10">
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{errorStats.authErrors}</div>
            <div className="text-xs font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider mt-1">Fallos Login</div>
          </div>

          {/* System Errors */}
          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-red-200 dark:border-white/10">
            <div className="text-2xl font-black text-red-600 dark:text-red-400">{errorStats.systemErrors}</div>
            <div className="text-xs font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider mt-1">Errores Sistema</div>
          </div>

          {/* Save Errors */}
          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-amber-200 dark:border-white/10">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{errorStats.saveErrors}</div>
            <div className="text-xs font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider mt-1">Errores Guardar</div>
          </div>

          {/* Last 24h */}
          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-purple-200 dark:border-white/10">
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{errorStats.last24h}</div>
            <div className="text-xs font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider mt-1">Últimas 24h</div>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowErrorsOnly(!showErrorsOnly);
              setFilterAction('all');
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              showErrorsOnly
                ? 'bg-rose-600 text-white'
                : 'bg-white dark:bg-card-dark text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 hover:border-rose-500'
            }`}
          >
            {showErrorsOnly ? '✓ ' : ''}Solo Errores
          </button>
          <button
            onClick={() => {
              setFilterAction('Intento Fallido de Login');
              setShowErrorsOnly(false);
            }}
            className="px-4 py-2 bg-white dark:bg-card-dark text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm hover:border-orange-500 transition-all"
          >
            🔐 Intentos Fallidos Login
          </button>
          <button
            onClick={() => {
              setFilterAction('Error de Sistema');
              setShowErrorsOnly(false);
            }}
            className="px-4 py-2 bg-white dark:bg-card-dark text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm hover:border-red-500 transition-all"
          >
            ⚠️ Errores Sistema
          </button>
          <button
            onClick={() => {
              setFilterAction('Error al Modificar');
              setShowErrorsOnly(false);
            }}
            className="px-4 py-2 bg-white dark:bg-card-dark text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-lg font-bold text-sm hover:border-amber-500 transition-all"
          >
            💾 Errores al Guardar
          </button>
          <button
            onClick={() => {
              setFilterAction('all');
              setShowErrorsOnly(false);
              setSearchTerm('');
              setDateRange({ start: '', end: '' });
            }}
            className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
          >
            🔄 Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:border-primary outline-none transition-all appearance-none"
              aria-label="Filtrar por tipo de acción"
              title="Filtrar por tipo de acción"
            >
              <option value="all">Todas las acciones</option>
              {actionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Date Start */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:border-primary outline-none transition-all"
              aria-label="Fecha inicial"
              title="Fecha inicial"
            />
          </div>

          {/* Date End */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:border-primary outline-none transition-all"
              aria-label="Fecha final"
              title="Fecha final"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Fecha y Hora</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Acción</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Descripción</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-white/40">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Cargando registros...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-white/40">
                    No se encontraron registros de actividad.
                  </td>
                </tr>
              ) : (
                <>
                {logs.map((log) => {
                  const isError = log.action_type.includes('Error') || log.action_type.includes('Intento Fallido');
                  const logDate = new Date(log.occurred_at);
                  const isRecent = (Date.now() - logDate.getTime()) < 24 * 60 * 60 * 1000; // Last 24h
                  const isRecentError = isError && isRecent;
                  
                  return (
                    <tr 
                      key={log.id} 
                      className={`transition-all ${
                        isRecentError 
                          ? 'bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/30' 
                          : 'hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {format(new Date(log.occurred_at), 'd MMM yyyy', { locale: es })}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-white/40 font-mono">
                            {format(new Date(log.occurred_at), 'HH:mm:ss')}
                          </span>
                        </div>
                        {isRecentError && (
                          <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black uppercase rounded-full animate-pulse">
                            NUEVO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {log.user_id === null ? (
                          // Failed authentication attempt - no user
                          <>
                            <div className="size-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xs">
                              ⚠️
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-red-600 dark:text-red-400 truncate max-w-[150px]">
                                Intento Anónimo
                              </span>
                              <span className="text-xs text-slate-500 dark:text-white/40 truncate max-w-[150px]">
                                Sin autenticación
                              </span>
                            </div>
                          </>
                        ) : (
                          // Normal authenticated user log
                          <>
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                              {log.profiles?.team_members?.[0]?.image_url ? (
                                <img 
                                  src={log.profiles.team_members[0].image_url} 
                                  alt={log.profiles?.full_name || 'User'} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                log.profiles?.full_name?.[0] || log.profiles?.email?.[0] || 'U'
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                                {log.profiles?.full_name || log.profiles?.email || 'Sin nombre'}
                              </span>
                              {log.profiles?.team_members?.[0]?.name && (
                                <span className="text-[10px] text-primary font-bold truncate max-w-[150px]">
                                  {log.profiles.team_members[0].name}
                                </span>
                              )}
                              <span className="text-xs text-slate-500 dark:text-white/40 truncate max-w-[150px]">
                                {log.profiles?.email}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
                        ${log.action_type.includes('Intento Fallido') ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' : 
                          log.action_type.includes('Crear') ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 
                          log.action_type.includes('Eliminar') ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                          log.action_type.includes('Editar') ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                          log.action_type.includes('Error') ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                          'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/60'}
                      `}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(log.action_type.includes('Error') || log.action_type.includes('Intento Fallido')) ? (
                        // Enhanced error display
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              {/* Parse and display error details */}
                              {log.description?.includes('Email:') ? (
                                // Format auth failure logs
                                <div className="space-y-1">
                                  {log.description.split('|').map((part, idx) => {
                                    const trimmed = part.trim();
                                    if (trimmed.startsWith('Email:')) {
                                      return (
                                        <div key={idx} className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-500 dark:text-white/40">EMAIL:</span>
                                          <span className="text-sm font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">
                                            {trimmed.replace('Email:', '').trim()}
                                          </span>
                                        </div>
                                      );
                                    } else if (trimmed.startsWith('Error:')) {
                                      return (
                                        <div key={idx} className="flex items-start gap-2">
                                          <span className="text-xs font-bold text-rose-500">ERROR:</span>
                                          <span className="text-sm text-slate-700 dark:text-white/80 flex-1">
                                            {trimmed.replace('Error:', '').trim()}
                                          </span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              ) : (
                                // Regular error description
                                <p className="text-sm text-slate-700 dark:text-white/80 leading-relaxed">
                                  {log.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Error actions */}
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const errorReport = [
                                  `=== ERROR REPORT ===`,
                                  `Fecha: ${format(new Date(log.occurred_at), 'dd/MM/yyyy HH:mm:ss')}`,
                                  `Tipo: ${log.action_type}`,
                                  `Usuario: ${log.profiles?.email || 'Anónimo'}`,
                                  `IP: ${log.ip_address || 'Unknown'}`,
                                  ``,
                                  `Descripción:`,
                                  log.description,
                                  ``,
                                  `ID Log: ${log.id}`
                                ].join('\n');
                                
                                navigator.clipboard.writeText(errorReport);
                                alert('✓ Reporte de error copiado al portapapeles');
                              }}
                              className="text-[10px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wide hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors flex items-center gap-1.5"
                              title="Copiar reporte de error al portapapeles"
                              aria-label="Copiar reporte de error"
                            >
                              <Copy size={12} /> Copiar Reporte Completo
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Normal log display
                        <p className="text-sm text-slate-600 dark:text-white/70 line-clamp-2 min-w-[200px]">
                          {log.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40">
                        <Globe size={14} />
                        {log.ip_address || 'Unknown'}
                      </div>
                    </td>
                  </tr>
                  );
                })}
                </>
              )}
            </tbody>
            
            {(logs.length > 0 || loading) && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
                    <div className="flex flex-col items-center gap-4">
                      {hasMore && !loading && (
                        <button 
                          onClick={() => fetchLogs(page + 1, true)}
                          className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm group"
                        >
                          <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
                          Cargar más registros
                        </button>
                      )}

                      {loading && logs.length > 0 && (
                         <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/40">
                           <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                           Cargando más...
                         </div>
                      )}
                      
                      {!hasMore && logs.length > 0 && (
                        <p className="text-xs text-slate-400 dark:text-white/40 font-medium">
                          Has llegado al final de los resultados ({totalCount} registros en total)
                        </p>
                      )}

                      <button 
                        onClick={() => fetchLogs(0)}
                        className="text-xs text-primary hover:underline opacity-60 hover:opacity-100 transition-opacity"
                      >
                        Actualizar datos del servidor
                      </button>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
