import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Radio, Mic, FileText, LogOut, Home, Settings, Users, BarChart3, Menu, X, Megaphone, Video, Smartphone, ChevronLeft, ChevronRight, ChevronDown, Gift, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/hooks/usePlayer';
import { logActivity } from '@/lib/activityLogger';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { PasswordEnforcement } from '@/components/auth/PasswordEnforcement';
import { isVideo } from '@/lib/utils';
import { NotificationSystem } from '@/components/header/NotificationSystem';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { useScheduleSync } from '@/hooks/useScheduleSync';



export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role, permissions, loading, user: authUser } = useAuth();
  const { isPlaying } = usePlayer();
  const { config } = useSiteConfig();
  const { title: headerTitle, subtitle: headerSubtitle, actions: headerActions } = useAdminHeader();
  const [redirected, setRedirected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  
  interface ShowWithSchedule {
    id: string;
    title: string;
    image_url: string;
    time?: string;
    end_time?: string;
    schedule_type?: string;
    schedule_days?: number[];
    date?: string;
  }
  
  const [allShows, setAllShows] = useState<ShowWithSchedule[]>([]);

  // Fetch all shows for global sync
  useEffect(() => {
    if (!session || role === 'user') return;

    const fetchShows = async () => {
      const { data } = await supabase
        .from('shows')
        .select(`
          id,
          title,
          image_url,
          schedule (
            day_of_week,
            start_time,
            end_time,
            schedule_type,
            date
          )
        `);
      
      if (data) {
        const formattedShows = data.map(show => ({
          ...show,
          // Flatten schedule for the hook
          time: show.schedule?.[0]?.start_time,
          end_time: show.schedule?.[0]?.end_time,
          schedule_type: show.schedule?.[0]?.schedule_type,
          schedule_days: show.schedule?.map((s: { day_of_week: string }) => {
             const days: Record<string, number> = {
               'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
             };
             return days[s.day_of_week];
          }),
          date: show.schedule?.[0]?.date
        }));
        setAllShows(formattedShows);
      }
    };

    fetchShows();
  }, [session, role]);

  // Execute global sync
  useScheduleSync(allShows);


  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  useEffect(() => {
    // Auto-expand menu based on current path
    if (location.pathname.startsWith('/admin/stations')) {
      setExpandedMenus(prev => ({ ...prev, stations: true }));
    }
    if (location.pathname.startsWith('/admin/pages') || location.pathname.startsWith('/admin/gallery')) {
      setExpandedMenus(prev => ({ ...prev, pages: true }));
    }
    // New sections
    if (location.pathname.startsWith('/admin/podcasts')) {
      setExpandedMenus(prev => ({ ...prev, podcasts: true }));
    }
    if (location.pathname.startsWith('/admin/news')) {
      setExpandedMenus(prev => ({ ...prev, news: true }));
    }
    if (location.pathname.startsWith('/admin/videos')) {
      setExpandedMenus(prev => ({ ...prev, videos: true }));
    }
    if (location.pathname.startsWith('/admin/reels')) {
      setExpandedMenus(prev => ({ ...prev, reels: true }));
    }
    if (location.pathname.startsWith('/admin/promotions')) {
      setExpandedMenus(prev => ({ ...prev, promotions: true }));
    }
    if (location.pathname.startsWith('/admin/team')) {
      setExpandedMenus(prev => ({ ...prev, team: true }));
    }
    if (location.pathname.startsWith('/admin/users')) {
      setExpandedMenus(prev => ({ ...prev, users: true }));
    }
    if (location.pathname.startsWith('/admin/analytics')) {
      setExpandedMenus(prev => ({ ...prev, analytics: true }));
    }
    if (location.pathname.startsWith('/admin/settings')) {
      setExpandedMenus(prev => ({ ...prev, settings: true }));
    }
  }, [location.pathname]);
  
  // Get linked team member for image
  const [teamMemberImage, setTeamMemberImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamImage = async () => {
      // Force refresh of auth user data if team_member_id is missing but might exist
      if (authUser && !authUser.team_member_id) {
         // Optionally refetch profile here if needed, but usually auth context handles it
      }

      if (authUser?.team_member_id) {
        const { data } = await supabase
          .from('team_members')
          .select('image_url')
          .eq('id', authUser.team_member_id)
          .single();
        if (data?.image_url) setTeamMemberImage(data.image_url);
      }
    };
    if (authUser) fetchTeamImage();
  }, [authUser]);

  useEffect(() => {
    if (loading) return;
    
    // Redirect if not logged in
    if (!session && !redirected) {
      setRedirected(true);
      navigate('/login', { replace: true });
      return;
    }

    // Allow 'user' role ONLY to access /admin/profile, otherwise redirect
    if (session && role === 'user') {
      if (location.pathname !== '/admin/profile') {
        navigate('/admin/profile', { replace: true });
      }
      return;
    }

    // Redirect if not authorized (admin or editor)
    if (session && role && role !== 'admin' && role !== 'editor' && !redirected) {
      setRedirected(true);
      navigate('/', { replace: true });
      return;
    }

    // Redirect Editors trying to access restricted pages directly
    if (role === 'editor' && !redirected) {
      const path = location.pathname;
      // Define restricted paths for editors without specific permissions
      if (path === '/admin/users' && !permissions.users) { // Actually editors never have 'users' permission by UI design
        navigate('/admin', { replace: true });
      }
      if (path === '/admin/settings' && !permissions.settings) {
        navigate('/admin', { replace: true });
      }
      // Add other checks if needed
    }
  }, [loading, session, role, permissions, redirected, navigate, location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (session && !loading && !sessionStorage.getItem('admin_session_logged')) {
      logActivity('Inicio de Sesión', `Acceso al panel administrativo con sesión activa: ${session.user.email}`);
      sessionStorage.setItem('admin_session_logged', 'true');
    }
  }, [session, loading]);

  useEffect(() => {
    if (session && !loading && location.pathname.startsWith('/admin')) {
      const section = location.pathname.split('/').pop() || 'dashboard';
      if (section !== 'activity') { // Don't log visits to the activity log itself to avoid recursion/clutter
        logActivity('Visitar Sección', `Visitó la sección: ${section}`);
      }
    }
  }, [location.pathname, session, loading]);

  // Track real-time presence
  // Refs for consistent state access
  const isPlayingRef = React.useRef(isPlaying);
  const locationRef = React.useRef(location.pathname);
  const sessionRef = React.useRef(session);
  const channelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    locationRef.current = location.pathname;
    sessionRef.current = session;
  }, [isPlaying, location.pathname, session]);

  // Track real-time presence
  useEffect(() => {
    if (!session?.user) return;

    const presenceKey = `user:${session.user.id}`;
    
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });

    channelRef.current = channel;

    const updatePresence = async () => {
      try {
        await channel.track({ 
          online_at: new Date().toISOString(),
          page: locationRef.current,
          is_admin: true,
          is_playing: isPlayingRef.current,
          user_id: sessionRef.current?.user.id,
          is_registered: true
        });
      } catch (error) {
        console.error('Error tracking presence:', error);
      }
    };

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await updatePresence();
      }
    });

    // Fallback: If channel is already subscribed, attempt to track after a short delay
    const timer = setTimeout(() => {
      updatePresence();
    }, 1000);

    return () => {
      clearTimeout(timer);
      channelRef.current = null;
      channel.unsubscribe();
    };
  }, [session?.user?.id, session?.user]); // Only re-subscribe if user ID changes (login/logout)

  // Sub-effect: update presence when isPlaying or page changes
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !session?.user) return;
    
    const timer = setTimeout(async () => {
      try {
        await channel.track({ 
          online_at: new Date().toISOString(),
          page: location.pathname,
          is_admin: true,
          is_playing: isPlaying,
          user_id: session.user.id,
          is_registered: true
        });
      } catch {
        // ignore - channel might not be subscribed yet
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [isPlaying, location.pathname, session?.user]);

  const handleLogout = async () => {
    await logActivity('Cerrar Sesión', 'El usuario cerró sesión desde el panel de administración.');
    sessionStorage.removeItem('admin_session_logged');
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-bold uppercase tracking-widest">Cargando...</div>;
  if (!session) return null;
  // If user role, only render if on profile page
  if (role === 'user' && location.pathname !== '/admin/profile') return null;
  if (role && role !== 'admin' && role !== 'editor' && role !== 'user') return null;

  const isActive = (path: string) => location.pathname === path;
  const linkClass = (path: string) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(path) ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'} ${collapsed ? 'justify-center' : ''}`;

  // Helper to check if user has permission
  const canAccess = (feature: 'news' | 'podcasts' | 'stations' | 'users' | 'settings' | 'videos' | 'reels' | 'gallery' | 'promotions' | 'sponsors' | 'stats' | 'giveaways') => {
    if (role === 'admin') return true;
    if (role === 'editor') return permissions[feature] === true;
    return false;
  };

  // Helper to check if any of the management items are accessible
  const hasManagementAccess = () => {
    if (role === 'admin') return true;
    if (role === 'editor') {
      return (
        canAccess('promotions') || 
        canAccess('users') || 
        canAccess('settings')
      );
    }
    return false;
  };

  const isEditorRestricted = role === 'editor' && Object.values(permissions).every(p => !p);

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      <PasswordEnforcement />
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[60] bg-white dark:bg-[#26282e] border-r border-slate-200 dark:border-white/10 flex flex-col transition-all duration-300 ease-in-out h-full
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-20' : 'w-64'}
      `}>
        {/* Header - Fixed at top */}
        <div className={`h-16 lg:h-20 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-4'} border-b border-slate-200 dark:border-white/5 flex-shrink-0 transition-all duration-300`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
              {config?.logo_url ? (
                <div className="size-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex-shrink-0">
                  {isVideo(config.logo_url) ? (
                    <video 
                      src={config.logo_url} 
                      className="w-full h-full object-cover" 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                    />
                  ) : (
                    <img src={config.logo_url} alt={config.site_name || 'Logo'} className="w-full h-full object-contain" />
                  )}
                </div>
              ) : (
                <div className="size-9 rounded-lg bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Radio size={18} className="text-primary" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <h2 className="text-sm font-black italic text-slate-900 dark:text-white truncate leading-tight">
                  {(config?.site_name || 'Antena Florida').toUpperCase()}
                </h2>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider leading-tight">Panel de Administración</span>
              </div>
            </div>
          )}
          
          {collapsed && (
             <div className="size-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center flex-shrink-0">
                {config?.logo_url ? (
                  isVideo(config.logo_url) ? (
                    <video 
                      src={config.logo_url} 
                      className="w-full h-full object-cover" 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                    />
                  ) : (
                    <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  )
                ) : (
                  <Radio size={18} className="text-primary" />
                )}
             </div>
          )}

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white"
              title="Cerrar menú"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* Collapse Toggle Button (Desktop Only) */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-24 bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-full p-1 text-slate-500 hover:text-primary shadow-sm z-50"
          title={collapsed ? "Expandir menú" : "Contraer menú"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        
        {/* Nav - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <nav className="p-4 space-y-2">
            
            {/* Regular User Menu - Only Profile */}
            {role === 'user' && (
              <Link to="/admin/profile" className={linkClass('/admin/profile')} title={collapsed ? "Mi Perfil" : ""}>
                <Users size={20} />
                {!collapsed && <span>Mi Perfil</span>}
              </Link>
            )}

            {/* Admin/Editor Menu */}
            {(role === 'admin' || role === 'editor') && (
              <>
                <Link to="/admin" className={linkClass('/admin')} title={collapsed ? "Dashboard" : ""}>
                  <LayoutDashboard size={20} />
                  {!collapsed && <span>Dashboard</span>}
                </Link>
                
                {canAccess('stations') && (
              <>
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                     location.pathname.startsWith('/admin/stations') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                   } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('stations') : navigate('/admin/stations')}
                   title={collapsed ? "Programas" : "Expandir Programas"}
                >
                  {collapsed ? (
                       <Radio size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <Radio size={20} />
                         <span>Gestión Emisora</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['stations'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['stations'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2">
                     <Link to="/admin/stations?tab=stats" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=stats') || (location.pathname === '/admin/stations' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Estadísticas</Link>
                     <Link to="/admin/stations?tab=programs" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=programs') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Programas</Link>
                     <Link to="/admin/stations?tab=schedule" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=schedule') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Programación</Link>
                     <Link to="/admin/stations?tab=history" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=history') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Historial</Link>
                     <Link to="/admin/stations?tab=messages" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=messages') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Mensajes</Link>
                     <Link to="/admin/stations?tab=lives" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=lives') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Transmisiones temporales</Link>
                  </div>
                )}
              </>
            )}
            
            {canAccess('podcasts') && (
              <>
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                     location.pathname.startsWith('/admin/podcasts') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                   } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('podcasts') : navigate('/admin/podcasts')}
                   title={collapsed ? "Podcasts" : "Expandir Podcasts"}
                >
                  {collapsed ? (
                       <Mic size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <Mic size={20} />
                         <span>Podcasts</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['podcasts'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['podcasts'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2">
                     <Link to="/admin/podcasts?tab=stats" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=stats') || (location.pathname === '/admin/podcasts' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Estadísticas</Link>
                     <Link to="/admin/podcasts?tab=manager" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=manager') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Episodios</Link>
                     <Link to="/admin/podcasts?tab=settings" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=settings') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Configuración</Link>
                     <Link to="/admin/podcasts?tab=sources" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=sources') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Fuentes</Link>
                  </div>
                )}
              </>
            )}

            {canAccess('news') && (
              <>
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                      location.pathname.startsWith('/admin/news') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                    } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('news') : navigate('/admin/news')}
                   title={collapsed ? "Noticias" : "Expandir Noticias"}
                >
                  {collapsed ? (
                       <FileText size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <FileText size={20} />
                         <span>Noticias</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['news'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['news'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2">
                     <Link to="/admin/news?tab=stats" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=stats') || (location.pathname === '/admin/news' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Estadísticas</Link>
                     <Link to="/admin/news?tab=manager" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=manager') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Gestor</Link>
                     <Link to="/admin/news?tab=drafts" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=drafts') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Borradores IA</Link>
                     <Link to="/admin/news?tab=categories" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=categories') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Categorías</Link>
                     <Link to="/admin/news?tab=tags" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=tags') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Etiquetas</Link>
                     <Link to="/admin/news?tab=comments" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=comments') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Comentarios</Link>
                     <Link to="/admin/news?tab=gallery" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=gallery') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Galería</Link>
                     <Link to="/admin/news?tab=settings" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=settings') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Configuración</Link>
                  </div>
                )}
              </>
            )}

            {canAccess('videos') && (
            <>
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                     location.pathname.startsWith('/admin/videos') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                   } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('videos') : navigate('/admin/videos')}
                   title={collapsed ? "Vídeos" : "Expandir Vídeos"}
                >
                  {collapsed ? (
                       <Video size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <Video size={20} />
                         <span>Vídeos</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['videos'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['videos'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2">
                     <Link to="/admin/videos?tab=stats" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=stats') || (location.pathname === '/admin/videos' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Estadísticas</Link>
                     <Link to="/admin/videos?tab=manager" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=manager') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Videoteca</Link>
                     <Link to="/admin/videos?tab=settings" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=settings') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Configuración</Link>
                     <Link to="/admin/videos?tab=sources" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=sources') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Fuentes</Link>
                  </div>
                )}
            </>
            )}

            {canAccess('reels') && (
            <>
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                     location.pathname.startsWith('/admin/reels') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                   } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('reels') : navigate('/admin/reels')}
                   title={collapsed ? "Reels" : "Expandir Reels"}
                >
                  {collapsed ? (
                       <Smartphone size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <Smartphone size={20} />
                         <span>Reels / Shorts</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['reels'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['reels'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2">
                     <Link to="/admin/reels?tab=stats" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=stats') || (location.pathname === '/admin/reels' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Estadísticas</Link>
                     <Link to="/admin/reels?tab=manager" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=manager') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Gestor</Link>
                     <Link to="/admin/reels?tab=settings" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=settings') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Configuración</Link>
                     <Link to="/admin/reels?tab=sources" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=sources') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Fuentes</Link>
                  </div>
                )}
            </>
            )}

            {canAccess('sponsors') && (
            <Link to="/admin/sponsors" className={linkClass('/admin/sponsors')} title={collapsed ? "Patrocinadores" : ""}>
              <Megaphone size={20} />
              {!collapsed && <span>Patrocinadores</span>}
            </Link>
            )}

            {!collapsed && hasManagementAccess() && (
              <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">
                Gestión
              </div>
            )}
            {collapsed && hasManagementAccess() && <div className="h-4" />}

            {canAccess('promotions') && (
              <>
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                     location.pathname.startsWith('/admin/promotions') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                   } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('promotions') : navigate('/admin/promotions')}
                   title={collapsed ? "Promociones" : "Expandir Promociones"}
                >
                  {collapsed ? (
                       <Megaphone size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <Megaphone size={20} />
                         <span>Promociones</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['promotions'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['promotions'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2">
                     <Link to="/admin/promotions?tab=promotions" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=promotions') || (location.pathname === '/admin/promotions' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Lista</Link>
                     <Link to="/admin/promotions?tab=locations" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=locations') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Ubicaciones</Link>
                  </div>
                )}
              </>
            )}

            {canAccess('giveaways') && (
              <Link to="/admin/giveaways" className={linkClass('/admin/giveaways')} title={collapsed ? "Sorteos" : ""}>
                <Gift size={20} />
                {!collapsed && <span>Sorteos</span>}
              </Link>
            )}

            {(role === 'admin' || permissions.settings) && (
              <>
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                     location.pathname.startsWith('/admin/team') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                   } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('team') : navigate('/admin/team')}
                   title={collapsed ? "Equipo" : "Expandir Equipo"}
                >
                  {collapsed ? (
                       <Users size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <Users size={20} />
                         <span>Equipo</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['team'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['team'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2">
                     <Link to="/admin/team?tab=stats" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=stats') || (location.pathname === '/admin/team' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Estadísticas</Link>
                     <Link to="/admin/team?tab=team" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=team') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Miembros</Link>
                     <Link to="/admin/team?tab=guests" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=guests') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Invitados</Link>
                     <Link to="/admin/team?tab=gallery" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=gallery') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Galería</Link>
                  </div>
                )}
              </>
            )}

            {canAccess('users') && (
              <>
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                     location.pathname.startsWith('/admin/users') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                   } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('users') : navigate('/admin/users')}
                   title={collapsed ? "Usuarios" : "Expandir Usuarios"}
                >
                  {collapsed ? (
                       <Users size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <Users size={20} />
                         <span>Usuarios</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['users'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['users'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2">
                     <Link to="/admin/users?tab=stats" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=stats') || (location.pathname === '/admin/users' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Estadísticas</Link>
                     <Link to="/admin/users?tab=users" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=users') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Directorio</Link>
                     {role === 'admin' && (
                       <Link to="/admin/users?tab=activity" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=activity') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Actividad</Link>
                     )}
                  </div>
                )}
              </>
            )}

            {/* Team Member Specific Links - Always visible if linked */}
            {authUser?.team_member_id && (role === 'admin' || role === 'editor') ? (
              <>
                 {!collapsed && (
                  <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">
                    Mi Perfil
                  </div>
                )}
                {collapsed && <div className="h-4" />}

                <Link to="/admin/profile" className={linkClass('/admin/profile')} title={collapsed ? "Mi Perfil" : ""}>
                  <Settings size={20} />
                  {!collapsed && <span>Mi Perfil</span>}
                </Link>
              </>
            ) : null}
            
            {/* If NOT linked to team, show simple account settings */}
            {(!authUser?.team_member_id && (role === 'admin' || role === 'editor')) && (
              <>
                {!collapsed && (
                  <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">
                    Mi Cuenta
                  </div>
                )}
                {collapsed && <div className="h-4" />}
                <Link to="/admin/profile" className={linkClass('/admin/profile')} title={collapsed ? "Mi Perfil" : ""}>
                  <Settings size={20} />
                  {!collapsed && <span>Mi Perfil</span>}
                </Link>
              </>
            )}

            {!isEditorRestricted && canAccess('stats') && (
              <>
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                     location.pathname.startsWith('/admin/analytics') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                   } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('analytics') : navigate('/admin/analytics')}
                   title={collapsed ? "Estadísticas" : "Expandir Estadísticas"}
                >
                  {collapsed ? (
                       <BarChart3 size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <BarChart3 size={20} />
                         <span>Estadísticas</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['analytics'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['analytics'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2">
                     <Link to="/admin/analytics?tab=overview" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=overview') || (location.pathname === '/admin/analytics' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>General</Link>
                     <Link to="/admin/analytics?tab=top_content" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=top_content') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Contenido</Link>
                     <Link to="/admin/analytics?tab=audience" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=audience') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Audiencia</Link>
                     <Link to="/admin/analytics?tab=tech" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=tech') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Tecnología</Link>
                  </div>
                )}
              </>
            )}



            {canAccess('settings') && (
              <>
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                     location.pathname.startsWith('/admin/pages') || location.pathname.startsWith('/admin/gallery') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                   } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('pages') : navigate('/admin/pages')}
                   title={collapsed ? "Páginas" : "Expandir Páginas"}
                >
                  {collapsed ? (
                       <LayoutGrid size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <LayoutGrid size={20} />
                         <span>Páginas</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['pages'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['pages'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2">
                     <Link to="/admin/pages?tab=stats" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=stats') || (location.pathname === '/admin/pages' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Estadísticas</Link>
                     <Link to="/admin/pages?tab=maintenance" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=maintenance') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Mantenimiento</Link>
                     <Link to="/admin/pages?tab=home" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=home') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Inicio</Link>
                     <Link to="/admin/pages?tab=services" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=services') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Servicios</Link>
                     <Link to="/admin/pages?tab=station" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=station') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>La Emisora</Link>
                     <Link to="/admin/pages?tab=programs" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=programs') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Programación</Link>
                     <Link to="/admin/pages?tab=team" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=team') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Equipo</Link>
                     <Link to="/admin/gallery" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.pathname === '/admin/gallery' ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Galería General</Link>
                  </div>
                )}
                <div 
                   className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer select-none ${
                     location.pathname.startsWith('/admin/settings') ? 'bg-primary text-background-dark font-bold' : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                   } ${collapsed ? 'justify-center' : ''}`}
                   onClick={() => !collapsed ? toggleMenu('settings') : navigate('/admin/settings')}
                   title={collapsed ? "Configuración" : "Expandir Configuración"}
                >
                  {collapsed ? (
                       <Settings size={20} />
                  ) : (
                      <div className="flex items-center gap-3">
                         <Settings size={20} />
                         <span>Configuración</span>
                      </div>
                  )}
                  {!collapsed && (
                     <ChevronDown size={14} className={`transition-transform duration-200 ${expandedMenus['settings'] ? 'rotate-180' : ''}`} />
                  )}
                </div>
                
                {!collapsed && expandedMenus['settings'] && (
                  <div className="ml-11 space-y-1 animate-fade-in pr-2 border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                     <Link to="/admin/settings?tab=general" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=general') || (location.pathname === '/admin/settings' && !location.search) ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>General</Link>
                     <Link to="/admin/settings?tab=appearance" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=appearance') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Top Bar</Link>
                     <Link to="/admin/settings?tab=web_appearance" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=web_appearance') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Diseño Web</Link>
                     <Link to="/admin/settings?tab=station" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=station') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Emisora</Link>
                     <Link to="/admin/settings?tab=audience" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=audience') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Audiencia</Link>
                     <Link to="/admin/settings?tab=widgets" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=widgets') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Widgets</Link>
                     <Link to="/admin/settings?tab=integrations" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=integrations') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Integraciones</Link>
                     <Link to="/admin/settings?tab=docs" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=docs') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Documentación</Link>
                     <Link to="/admin/settings?tab=system_docs" className={`block px-3 py-2 text-xs rounded-md transition-colors ${location.search.includes('tab=system_docs') ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}>Técnica</Link>
                  </div>
                )}
              </>
            )}
            </>
            )}
          </nav>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-2 flex-shrink-0 bg-card">
          {session && (
             <div className={`flex items-center gap-3 px-4 py-2 mb-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 ${collapsed ? 'justify-center' : ''}`}>
                <div className="relative">
                   {teamMemberImage ? (
                     <img 
                       src={teamMemberImage} 
                       alt="Profile" 
                       className="size-8 rounded-full object-cover border border-slate-200 dark:border-white/10" 
                       onError={(e) => {
                         e.currentTarget.style.display = 'none';
                         setTeamMemberImage(null);
                       }}
                     />
                   ) : (
                     <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                        {session.user.email?.[0].toUpperCase()}
                     </div>
                   )}
                   <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-500 border-2 border-white dark:border-card-dark rounded-full" title="Online" />
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                     <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {session.user.email}
                     </p>
                     <p className="text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-wider font-bold">
                        {role === 'admin' ? 'Administrador' : (role === 'editor' ? 'Editor' : 'Usuario')}
                     </p>
                  </div>
                )}
             </div>
          )}
          
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`} title={collapsed ? "Ver Sitio Web" : ""}>
            <Home size={20} />
            {!collapsed && <span>Ver Sitio Web</span>}
          </Link>
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-accent-coral hover:bg-accent-coral/10 rounded-lg transition-colors font-bold ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? "Cerrar Sesión" : ""}
          >
            <LogOut size={20} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full relative bg-background custom-scrollbar">
        {/* Mobile Header - Sticky with solid opaque background */}
        <div className="lg:hidden h-16 bg-white dark:bg-[#17171c] border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="text-slate-900 dark:text-white p-2 -ml-2"
              title="Abrir menú"
            >
              <Menu size={24} />
            </button>
            {config?.logo_url ? (
              <div className="size-7 rounded-md overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex-shrink-0">
                {isVideo(config.logo_url) ? (
                  <video src={config.logo_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={config.logo_url} alt={config?.site_name || 'Logo'} className="w-full h-full object-contain" />
                )}
              </div>
            ) : null}
            <div className="flex flex-col min-w-0 ml-2">
              <h1 className="font-black text-slate-900 dark:text-white text-base truncate leading-tight italic uppercase">
                 {headerTitle || config?.site_name || 'Radio'}
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight truncate">
                 {headerSubtitle || 'Panel Admin'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationSystem />
            <ThemeToggle />
          </div>
        </div>

        {/* Desktop Header - Simplified */}
        <div className="hidden lg:flex justify-between items-center gap-4 px-8 py-4 w-full border-b border-border bg-white dark:bg-[#17171c] sticky top-0 z-30 min-h-[64px]">
           <div className="flex flex-col min-w-0">
             <h1 className="font-black text-slate-900 dark:text-white text-xl truncate leading-tight italic uppercase">
                {headerTitle || config?.site_name || 'Radio'}
             </h1>
             {headerSubtitle && (
               <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-tight truncate">
                  {headerSubtitle}
               </p>
             )}
           </div>
           <div className="flex items-center gap-3">
             {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
             <NotificationSystem />
             <ThemeToggle />
           </div>
        </div>

        <div className="p-4 md:p-8 lg:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
