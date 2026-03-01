import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Mic, Newspaper, Radio, LayoutDashboard, Youtube, Smartphone, Users, Image as ImageIcon, Megaphone, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { logActivity } from '@/lib/activityLogger';
import { RealTimeVisitors } from '@/components/RealTimeVisitors';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';

export default function Dashboard() {
  const { isDark } = useTheme();
  const { role, permissions, user: authUser } = useAuth();
  const { setHeader } = useAdminHeader();
  const [stats, setStats] = useState({
    news: 0,
    podcasts: 0,
    shows: 0,
    videos: 0,
    reels: 0,
    team: 0,
    sponsors: 0,
    gallery: 0,
    users: 0
  });
  const [loading, setLoading] = useState(true);

  // Helper to check permissions
  const canAccess = (feature: 'news' | 'podcasts' | 'stations' | 'users' | 'settings' | 'videos' | 'reels' | 'gallery' | 'promotions' | 'sponsors' | 'stats') => {
    if (role === 'admin') return true;
    if (role === 'editor') return permissions[feature] === true;
    return false;
  };
  
  // Check if user is a restricted editor (no permissions)
  const isRestrictedEditor = role === 'editor' && Object.values(permissions).every(p => !p);

  // Helper StatCard Component
  const StatCard = ({ to, icon: Icon, color, title, description, count, loading }: { to: string, icon: React.ElementType, color: string, title: string, description: string, count: number | string, loading: boolean }) => (
    <Link to={to} className={`bg-card p-6 rounded-xl border border-border transition-colors group relative overflow-hidden shadow-sm hover:border-${color}`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={100} className="text-foreground" />
      </div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <Icon className={`text-${color} group-hover:scale-110 transition-transform`} size={32} />
        {loading ? (
          <div className="h-10 w-16 bg-slate-200 dark:bg-white/10 animate-pulse rounded-lg" />
        ) : (
          <span className="text-4xl font-black text-foreground">{count}</span>
        )}
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2 relative z-10">{title}</h2>
      <p className="text-muted-foreground text-sm relative z-10">{description}</p>
      
      {/* Dynamic hover border color support */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hover\\:border-${color}:hover { border-color: ${color === 'primary' ? 'var(--primary)' : 
                                                         color === 'accent-coral' ? '#ff6b6b' :
                                                         color === 'yellow-400' ? '#facc15' :
                                                         color === 'red-500' ? '#ef4444' :
                                                         color === 'pink-500' ? '#ec4899' :
                                                         color === 'purple-500' ? '#a855f7' :
                                                         color === 'orange-500' ? '#f97316' :
                                                         color === 'cyan-500' ? '#06b6d4' :
                                                         color === 'emerald-500' ? '#10b981' :
                                                         color === 'blue-500' ? '#3b82f6' : 'var(--primary)'}; }
      `}} />
    </Link>
  );

  useEffect(() => {
    setHeader({
      title: 'Dashboard',
      subtitle: 'Resumen general del sitio y estadísticas',
      icon: LayoutDashboard,
    });
    fetchStats();
    logActivity('Visitar Sección', 'Visitó el Panel de Control (Dashboard)');

    // Subscribe to all changes in the public schema using a single channel to reduce connection overhead
    const channel = supabase.channel('dashboard-stats-channel')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setHeader]);

  async function fetchStats() {
    try {
      const [
        { count: newsCount },
        { count: podcastsCount },
        { count: showsCount },
        { count: videosCount },
        { count: reelsCount },
        { count: teamCount },
        { count: sponsorsCount },
        { count: galleryCount },
        { count: usersCount }
      ] = await Promise.all([
        supabase.from('news').select('*', { count: 'exact', head: true }),
        supabase.from('podcasts').select('*', { count: 'exact', head: true }),
        supabase.from('shows').select('*', { count: 'exact', head: true }),
        supabase.from('videos').select('*', { count: 'exact', head: true }),
        supabase.from('reels').select('*', { count: 'exact', head: true }),
        supabase.from('team_members').select('*', { count: 'exact', head: true }),
        supabase.from('sponsors').select('*', { count: 'exact', head: true }),
        supabase.from('gallery').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        news: newsCount || 0,
        podcasts: podcastsCount || 0,
        shows: showsCount || 0,
        videos: videosCount || 0,
        reels: reelsCount || 0,
        team: teamCount || 0,
        sponsors: sponsorsCount || 0,
        gallery: galleryCount || 0,
        users: usersCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const chartData = [
    { name: 'Noticias', count: stats.news, color: '#00cccc' },
    { name: 'Podcasts', count: stats.podcasts, color: '#ff6b6b' },
    { name: 'Shows', count: stats.shows, color: '#ffd166' },
    { name: 'Videos', count: stats.videos, color: '#ef4444' },
    { name: 'Reels', count: stats.reels, color: '#d946ef' },
    { name: 'Equipo', count: stats.team, color: '#8b5cf6' },
    { name: 'Sponsors', count: stats.sponsors, color: '#10b981' },
    { name: 'Galería', count: stats.gallery, color: '#f59e0b' },
  ];

  // We no longer block the whole UI with loading
  // if (loading) return <div className="text-slate-500 dark:text-white/50">Cargando estadísticas...</div>;

  return (
    <div className="space-y-8">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <RealTimeVisitors />

        {canAccess('news') && (
          <StatCard 
            to="/admin/news" 
            icon={Newspaper} 
            color="primary" 
            title="Noticias" 
            description="Gestionar artículos" 
            count={stats.news} 
            loading={loading}
          />
        )}

        {canAccess('podcasts') && (
          <StatCard 
            to="/admin/podcasts" 
            icon={Mic} 
            color="accent-coral" 
            title="Podcasts" 
            description="Gestionar episodios" 
            count={stats.podcasts} 
            loading={loading}
          />
        )}

        {canAccess('stations') && (
          <StatCard 
            to="/admin/stations" 
            icon={Radio} 
            color="yellow-400" 
            title="Programas" 
            description="Gestionar programación" 
            count={stats.shows} 
            loading={loading}
          />
        )}

        {!isRestrictedEditor && canAccess('videos') && (
          <StatCard 
            to="/admin/videos" 
            icon={Youtube} 
            color="red-500" 
            title="Videos" 
            description="Gestionar videos" 
            count={stats.videos} 
            loading={loading}
          />
        )}

        {!isRestrictedEditor && canAccess('reels') && (
          <StatCard 
            to="/admin/reels" 
            icon={Smartphone} 
            color="pink-500" 
            title="Reels" 
            description="Gestionar contenido vertical" 
            count={stats.reels} 
            loading={loading}
          />
        )}

        {!isRestrictedEditor && canAccess('settings') && (
          <StatCard 
            to="/admin/team" 
            icon={Users} 
            color="purple-500" 
            title="Equipo" 
            description="Gestionar miembros" 
            count={stats.team} 
            loading={loading}
          />
        )}

        {!isRestrictedEditor && canAccess('gallery') && (
          <StatCard 
            to="/admin/gallery" 
            icon={ImageIcon} 
            color="orange-500" 
            title="Galería" 
            description="Gestionar imágenes" 
            count={stats.gallery} 
            loading={loading}
          />
        )}

        {!isRestrictedEditor && canAccess('promotions') && (
          <StatCard 
            to="/admin/promotions" 
            icon={Megaphone} 
            color="cyan-500" 
            title="Promociones" 
            description="Gestionar banners" 
            count="Ads" 
            loading={loading}
          />
        )}

        {!isRestrictedEditor && canAccess('sponsors') && (
          <StatCard 
            to="/admin/sponsors" 
            icon={Megaphone} 
            color="emerald-500" 
            title="Sponsors" 
            description="Gestionar patrocinadores" 
            count={stats.sponsors} 
            loading={loading}
          />
        )}

        {canAccess('users') && (
          <StatCard 
            to="/admin/users" 
            icon={Shield} 
            color="blue-500" 
            title="Usuarios" 
            description="Gestionar acceso" 
            count={stats.users} 
            loading={loading}
          />
        )}

        {/* Team Member Profile Card - Always Visible if Linked */}
        {authUser?.team_member_id && (
          <StatCard 
            to={`/equipo/${authUser.team_member_id}`} 
            icon={Users} 
            color="indigo-500" 
            title="Ver Perfil" 
            description="Ir a mi página pública" 
            count="Mi Perfil" 
            loading={false}
          />
        )}
      </div>

      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Resumen de Contenido</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff10" : "#e2e8f0"} />
              <XAxis dataKey="name" stroke={isDark ? "#ffffff60" : "#64748b"} />
              <YAxis stroke={isDark ? "#ffffff60" : "#64748b"} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? '#17171c' : '#ffffff', 
                  border: isDark ? '1px solid #ffffff10' : '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  color: isDark ? '#fff' : '#0f172a'
                }}
                itemStyle={{ color: isDark ? '#fff' : '#0f172a' }}
                cursor={{ fill: isDark ? '#ffffff05' : '#f1f5f9' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
