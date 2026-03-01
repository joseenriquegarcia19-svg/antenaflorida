import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { BarChart3, Calendar, Download, Filter, Globe, TrendingUp, Users, FileText, Smartphone, Laptop, Share2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { downloadCsv, downloadPdfReport } from '@/lib/analyticsExport';
import { useTheme } from '@/hooks/useTheme';
import { logActivity } from '@/lib/activityLogger';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { vercelAnalyticsSnapshot } from '@/data/vercelAnalytics';

type OverviewRow = {
  views: number;
  unique_visitors: number;
  countries: number;
};

type TimeseriesRow = {
  bucket_start: string;
  views: number;
  unique_visitors: number;
};

type CountryRow = {
  country: string;
  views: number;
  unique_visitors: number;
};

type TopPageRow = {
  path: string;
  views: number;
  unique_visitors: number;
};

type DemoRow = { key: string; views: number; unique_visitors: number };
type Demographics = { device: DemoRow[]; browser: DemoRow[]; os: DemoRow[]; language: DemoRow[] };

function toUtcRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function formatBucketLabel(iso: string, bucket: 'day' | 'week' | 'month') {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  if (bucket === 'month') return `${y}-${m}`;
  if (bucket === 'week') return `${y}-${m}-${day}`;
  return `${y}-${m}-${day}`;
}

export default function Analytics() {
  const { isDark } = useTheme();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'overview' | 'top_content' | 'audience' | 'tech'>(
    (tabParam as 'overview' | 'top_content' | 'audience' | 'tech') || 'overview'
  );

  useEffect(() => {
    if (tabParam && (tabParam === 'overview' || tabParam === 'top_content' || tabParam === 'audience' || tabParam === 'tech')) {
       setActiveTab(tabParam as 'overview' | 'top_content' | 'audience' | 'tech');
    }
  }, [tabParam]);

  const today = useMemo(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const { setHeader } = useAdminHeader();

  useEffect(() => {
    const titles = {
      overview: { title: 'Estadísticas', subtitle: 'Vista general del tráfico', icon: BarChart3 },
      top_content: { title: 'Contenido', subtitle: 'Páginas más populares', icon: FileText },
      audience: { title: 'Audiencia', subtitle: 'Distribución geográfica', icon: Globe },
      tech: { title: 'Tecnología', subtitle: 'Dispositivos y navegadores', icon: Laptop }
    };
    const current = titles[activeTab] || titles.overview;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
    });
  }, [setHeader, activeTab]);

  const [bucket, setBucket] = useState<'day' | 'week' | 'month'>('day');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 29);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [endDate, setEndDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewRow>({ views: 0, unique_visitors: 0, countries: 0 });
  const [timeseries, setTimeseries] = useState<TimeseriesRow[]>([]);
  const [byCountry, setByCountry] = useState<CountryRow[]>([]);
  const [topPages, setTopPages] = useState<TopPageRow[]>([]);
  const [demographics, setDemographics] = useState<Demographics>({ device: [], browser: [], os: [], language: [] });

  const periodLabel = useMemo(() => `Periodo: ${startDate} → ${endDate} (UTC)`, [startDate, endDate]);

  const timeseriesChart = useMemo(
    () =>
      timeseries.map((r) => ({
        label: formatBucketLabel(r.bucket_start, bucket),
        views: r.views,
        unique: r.unique_visitors,
      })),
    [timeseries, bucket],
  );

  const [dataSource, setDataSource] = useState<'supabase' | 'vercel'>('supabase');
  const isVercel = dataSource === 'vercel';

  useEffect(() => {
    let canceled = false;

    const fetchData = (isSilent = false) => {
      if (canceled) return;
      if (!isSilent) {
        setLoading(true);
        setError(null);
      }

      if (isVercel) {
        setOverview(vercelAnalyticsSnapshot.overview);
        setTimeseries([]);
        setByCountry(vercelAnalyticsSnapshot.byCountry);
        setTopPages(vercelAnalyticsSnapshot.topPages);
        setDemographics({
          device: vercelAnalyticsSnapshot.demographics.device,
          browser: vercelAnalyticsSnapshot.demographics.browser,
          os: vercelAnalyticsSnapshot.demographics.os,
          language: [],
        });
        setLoading(false);
        return;
      }

      const { start, end } = toUtcRange(startDate, endDate);

      Promise.all([
        supabase.rpc('stats_overview', { p_start: start, p_end: end }),
        supabase.rpc('stats_timeseries', { p_bucket: bucket, p_start: start, p_end: end }),
        supabase.rpc('stats_by_country', { p_start: start, p_end: end, p_limit: 100 }),
        supabase.rpc('stats_top_pages', { p_start: start, p_end: end, p_limit: 10 }),
        supabase.rpc('stats_demographics', { p_start: start, p_end: end }),
      ])
      .then(([overviewRes, seriesRes, countryRes, pagesRes, demoRes]) => {
        if (canceled) return;

        if (overviewRes.error) throw overviewRes.error;
        if (seriesRes.error) throw seriesRes.error;
        if (countryRes.error) throw countryRes.error;
        if (pagesRes.error) throw pagesRes.error;
        const overviewRow = (overviewRes.data?.[0] || { views: 0, unique_visitors: 0, countries: 0 }) as OverviewRow;
        setTimeseries((seriesRes.data || []) as TimeseriesRow[]);
        
        const mappedCountryData = (countryRes.data || []) as CountryRow[];
        setByCountry(mappedCountryData);

        // Refine overview to only include identified countries as requested
        const identifiedData = mappedCountryData.filter(c => c.country && c.country !== 'Unknown' && c.country !== 'Untracked');
        const identifiedViews = identifiedData.reduce((acc, curr) => acc + (curr.views || 0), 0);
        const identifiedVisitors = identifiedData.reduce((acc, curr) => acc + (curr.unique_visitors || 0), 0);
        
        setOverview({
          ...overviewRow,
          views: identifiedViews,
          unique_visitors: identifiedVisitors,
          countries: identifiedData.length
        });
        
        setTopPages((pagesRes.data || []) as TopPageRow[]);
        setDemographics((demoRes.data || { device: [], browser: [], os: [], language: [] }) as Demographics);
      })
      .catch((err) => {
        if (canceled) return;
        console.error('Analytics Error:', err);
        const msg = err?.message || (typeof err === 'string' ? err : 'Error cargando estadísticas');
        setError(msg);
      })
      .finally(() => {
        if (canceled) return;
        setLoading(false);
      });
    };

    fetchData();

    if (isVercel) return;

    // Auto-refresh every 30 seconds for real-time feel
    const refreshInterval = setInterval(() => fetchData(true), 30000);

    return () => {
      canceled = true;
      clearInterval(refreshInterval);
    };
  }, [bucket, startDate, endDate, isVercel]);

  const pieColors = ['#00cccc', '#ff6b6b', '#ffd166', '#8ecae6', '#bde0fe', '#a7c957', '#9b5de5'];

  const exportCsv = () => {
    logActivity('Actualizar Ajustes', 'Exportó estadísticas de analytics a CSV');
    downloadCsv('analytics_overview.csv', [overview]);
    downloadCsv('analytics_timeseries.csv', timeseries);
    downloadCsv('analytics_countries.csv', byCountry);
    downloadCsv('analytics_top_pages.csv', topPages);
    downloadCsv('analytics_demographics_device.csv', demographics.device);
    downloadCsv('analytics_demographics_browser.csv', demographics.browser);
    downloadCsv('analytics_demographics_os.csv', demographics.os);
    downloadCsv('analytics_demographics_language.csv', demographics.language);
  };

  const exportPdf = () => {
    logActivity('Actualizar Ajustes', 'Generó y descargó reporte de analytics en PDF');
    downloadPdfReport({
      filename: 'analytics_report.pdf',
      title: 'Reporte de Estadísticas',
      periodLabel,
      overview,
      timeseries,
      byCountry,
      topPages,
      demographics,
    });
  };

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const y1 = start.getUTCFullYear();
    const m1 = String(start.getUTCMonth() + 1).padStart(2, '0');
    const d1 = String(start.getUTCDate()).padStart(2, '0');
    setStartDate(`${y1}-${m1}-${d1}`);

    const y2 = end.getUTCFullYear();
    const m2 = String(end.getUTCMonth() + 1).padStart(2, '0');
    const d2 = String(end.getUTCDate()).padStart(2, '0');
    setEndDate(`${y2}-${m2}-${d2}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab overview={overview} timeseriesChart={timeseriesChart} isDark={isDark} isVercel={isVercel} />;
      case 'top_content':
        return <TopContentTab topPages={topPages} isVercel={isVercel} />;
      case 'audience':
        return <AudienceTab byCountry={byCountry} isDark={isDark} isVercel={isVercel} />;
      case 'tech':
        return <TechTab demographics={demographics} pieColors={pieColors} isDark={isDark} isVercel={isVercel} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-4">

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10 mr-2">
            <button
              onClick={() => setDataSource('supabase')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                dataSource === 'supabase' 
                  ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                  : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60'
              }`}
            >
              Supabase
            </button>
            <button
              onClick={() => setDataSource('vercel')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                dataSource === 'vercel' 
                  ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                  : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60'
              }`}
            >
              Vercel
            </button>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white px-4 py-2 rounded-lg font-bold border border-slate-200 dark:border-white/10 flex items-center gap-2 transition-all shadow-sm"
          >
            <Download size={18} /> CSV
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="bg-primary text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            <Download size={18} /> PDF
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className={`bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm transition-opacity duration-300 ${isVercel ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <Filter size={18} className="text-primary" />
            Filtros Globales
          </div>
          {isVercel && (
            <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded font-black uppercase tracking-widest">
              Snapshot: Feb 2025 - Feb 2026
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest">Fecha Inicio</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 focus-within:border-primary transition-colors">
              <Calendar size={16} className="text-slate-400 dark:text-white/40" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Fecha de inicio"
                className="bg-transparent text-slate-900 dark:text-white w-full py-2 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest">Fecha Fin</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 focus-within:border-primary transition-colors">
              <Calendar size={16} className="text-slate-400 dark:text-white/40" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="Fecha de fin"
                className="bg-transparent text-slate-900 dark:text-white w-full py-2 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest">Agrupar por</label>
            <select
              value={bucket}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'day' || v === 'week' || v === 'month') setBucket(v);
              }}
              title="Agrupar por"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-primary transition-colors"
            >
              <option value="day" className="bg-white dark:bg-background-dark">Diario</option>
              <option value="week" className="bg-white dark:bg-background-dark">Semanal</option>
              <option value="month" className="bg-white dark:bg-background-dark">Mensual</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest">Períodos Rápidos</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => applyPreset(7)} className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors">7d</button>
              <button type="button" onClick={() => applyPreset(30)} className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors">30d</button>
              <button type="button" onClick={() => applyPreset(90)} className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors">90d</button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
          <div className="size-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="space-y-6">

        
        <div className="w-full min-w-0">
           {loading ? (
             <div className="bg-white dark:bg-card-dark p-12 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-4">
                <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Cargando datos...</span>
             </div>
           ) : (
             <div className="space-y-6">
                {renderContent()}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

const OverviewTab = ({ overview, timeseriesChart, isDark, isVercel }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
            Visitas
            <span className="text-[9px] bg-primary/10 text-primary px-1 rounded font-black">NETAS</span>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="text-primary" size={18} />
          </div>
        </div>
        <div className="text-4xl font-black text-slate-900 dark:text-white mt-3">{overview.views.toLocaleString()}</div>
      </div>

      <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
            Visitantes
            <span className="text-[9px] bg-accent-coral/10 text-accent-coral px-1 rounded font-black">ÚNICOS</span>
          </div>
          <div className="p-2 bg-accent-coral/10 rounded-lg">
            <Users className="text-accent-coral" size={18} />
          </div>
        </div>
        <div className="text-4xl font-black text-slate-900 dark:text-white mt-3">{overview.unique_visitors.toLocaleString()}</div>
      </div>

      <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
            Cobertura
            <span className="text-[9px] bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 px-1 rounded font-black">GLOBAL</span>
          </div>
          <div className="p-2 bg-yellow-400/10 rounded-lg">
            <Globe className="text-yellow-600 dark:text-yellow-400" size={18} />
          </div>
        </div>
        <div className="text-4xl font-black text-slate-900 dark:text-white mt-3">{overview.countries.toLocaleString()}</div>
      </div>
    </div>
    {!isVercel && (
    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <TrendingUp size={20} className="text-primary" />
        Tendencia de Tráfico
      </h2>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeseriesChart}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff10" : "#e2e8f0"} vertical={false} />
            <XAxis 
              dataKey="label" 
              stroke={isDark ? "#ffffff40" : "#94a3b8"} 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke={isDark ? "#ffffff40" : "#94a3b8"} 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: isDark ? '#1e1e24' : '#ffffff', 
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                color: isDark ? '#fff' : '#0f172a'
              }}
              itemStyle={{ color: isDark ? '#fff' : '#0f172a' }}
              cursor={{ stroke: isDark ? '#ffffff20' : '#e2e8f0', strokeWidth: 2 }}
            />
            <Legend iconType="circle" />
            <Line type="monotone" dataKey="views" name="Visitas" stroke="#317127" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
            <Line type="monotone" dataKey="unique" name="Únicos" stroke="#00cccc" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    )}
  </div>
);

const TopContentTab = ({ topPages, isVercel }) => (
  <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm animate-fade-in">
    <div className="mb-6 flex justify-between items-center">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <FileText size={20} className="text-primary" />
        Top Contenido
      </h2>
      {isVercel && (
        <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded font-black uppercase tracking-widest">
          Snapshot
        </span>
      )}
    </div>
    <div className="space-y-4">
       <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
          <div className="col-span-8">Ruta de la Página</div>
          <div className="col-span-2 text-right">Visitas</div>
          <div className="col-span-2 text-right">Únicos</div>
       </div>
       {topPages.map((page, index) => (
          <div key={page.path} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors items-center">
             <div className="col-span-8 flex items-center gap-3">
                <span className={`flex-shrink-0 size-6 flex items-center justify-center rounded-full text-xs font-bold ${index < 3 ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60'}`}>
                   {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-white truncate" title={page.path}>
                   {page.path}
                </span>
                <a href={page.path} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-primary transition-colors">
                   <Share2 size={14} />
                </a>
             </div>
             <div className="col-span-2 text-right font-bold text-slate-700 dark:text-white">
                {page.views.toLocaleString()}
             </div>
             <div className="col-span-2 text-right font-medium text-slate-500 dark:text-white/60">
                {page.unique_visitors.toLocaleString()}
             </div>
          </div>
       ))}
    </div>
  </div>
);

const AudienceTab = ({ byCountry, isDark, isVercel }: { byCountry: CountryRow[], isDark: boolean, isVercel: boolean }) => {
  const totalViews = byCountry.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalUnique = byCountry.reduce((acc, curr) => acc + (curr.unique_visitors || 0), 0);

  return (
  <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm animate-fade-in">
    <div className="mb-6 flex justify-between items-center">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Globe size={20} className="text-primary" />
        Audiencia por País
      </h2>
      {isVercel && (
        <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded font-black uppercase tracking-widest">
          Snapshot
        </span>
      )}
    </div>
    <div className="h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={byCountry} layout="vertical" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff10" : "#e2e8f0"} horizontal={false} />
          <XAxis 
            type="number" 
            stroke={isDark ? "#ffffff40" : "#94a3b8"} 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            type="category" 
            dataKey="country" 
            stroke={isDark ? "#ffffff40" : "#94a3b8"} 
            width={120} 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: isDark ? '#1e1e24' : '#ffffff', 
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              color: isDark ? '#fff' : '#0f172a'
            }}
            itemStyle={{ color: isDark ? '#fff' : '#0f172a' }}
          />
          <Bar dataKey="views" name="Visitas" fill="#00cccc" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* Breakdown Table */}
    <div className="mt-8">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Desglose por País</h3>
      <div className="bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5">País</div>
          <div className="col-span-3 text-right">Visitas</div>
          <div className="col-span-3 text-right">Visitantes Únicos</div>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[400px] overflow-y-auto">
          {byCountry.map((row, index) => (
            <div key={row.country} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-white dark:hover:bg-white/5 transition-colors items-center text-sm">
               <div className="col-span-1 text-center font-medium text-slate-400 dark:text-white/40">{index + 1}</div>
               <div className="col-span-5 font-medium text-slate-900 dark:text-white">{row.country}</div>
               <div className="col-span-3 text-right font-bold text-slate-700 dark:text-white/80">{row.views.toLocaleString()}</div>
               <div className="col-span-3 text-right font-medium text-slate-500 dark:text-white/60">{row.unique_visitors.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Totals Row */}
        <div className="grid grid-cols-12 gap-4 px-4 py-4 bg-primary/5 dark:bg-primary/10 border-t border-primary/20 items-center">
          <div className="col-span-6 font-black text-slate-900 dark:text-white text-right uppercase tracking-wider">Total Global</div>
          <div className="col-span-3 text-right font-black text-primary text-lg">{totalViews.toLocaleString()}</div>
          <div className="col-span-3 text-right font-black text-primary text-lg">{totalUnique.toLocaleString()}</div>
        </div>
      </div>
    </div>
  </div>
  );
};

const TechTab = ({ demographics, pieColors, isDark, isVercel }) => (
  <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm animate-fade-in">
    <div className="mb-6 flex justify-between items-center">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Smartphone size={20} className="text-primary" />
        Tecnología
      </h2>
      {isVercel && (
        <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded font-black uppercase tracking-widest">
          Snapshot
        </span>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {([
        ['Dispositivo', demographics.device],
        ['Navegador', demographics.browser],
        ['Sistema Operativo', demographics.os],
        ['Idioma', demographics.language],
      ] as Array<[string, DemoRow[]]>).map(([label, data], idx) => (
        <div key={label} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-6 transition-all hover:bg-slate-100 dark:hover:bg-white/10">
          <div className="flex items-center justify-between mb-4">
             <div className="text-slate-500 dark:text-white/60 text-sm font-black uppercase tracking-wider">{label}</div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1e1e24' : '#ffffff', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    color: isDark ? '#fff' : '#0f172a'
                  }}
                  itemStyle={{ color: isDark ? '#fff' : '#0f172a' }}
                />
                <Pie 
                  data={data} 
                  dataKey="views" 
                  nameKey="key" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={90} 
                  paddingAngle={2}
                >
                  {data.map((_, i) => (
                    <Cell key={`${label}-${i}`} fill={pieColors[(idx + i) % pieColors.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  </div>
);
