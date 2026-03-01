import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Lazy loaded layouts
const MainLayout = lazy(() => import('./layouts/MainLayout').then(m => ({ default: m.MainLayout })));
const ProgramLayout = lazy(() => import('./layouts/ProgramLayout').then(m => ({ default: m.ProgramLayout })));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

import { GlobalVideoProvider } from './contexts/GlobalVideoContext';
import { AdminHeaderProvider } from './contexts/AdminHeaderContext';
import { LiveStatsProvider } from './contexts/LiveStatsContext';

// Lazy loaded components
const Home = lazy(() => import('./pages/Home'));
const Schedule = lazy(() => import('./pages/Schedule'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const PodcastDetail = lazy(() => import('./pages/PodcastDetail'));
const ShowDetail = lazy(() => import('./pages/ShowDetail'));
const Login = lazy(() => import('./pages/Login'));
const Legal = lazy(() => import('./pages/Legal'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ManageNews = lazy(() => import('./pages/admin/ManageNews'));
const ManagePodcasts = lazy(() => import('./pages/admin/ManagePodcasts'));
const ManageStations = lazy(() => import('./pages/admin/ManageStations'));
const ManagePromotions = lazy(() => import('./pages/admin/ManagePromotions'));
const ManageGiveaways = lazy(() => import('./pages/admin/ManageGiveaways'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers'));
const ManagePages = lazy(() => import('./pages/admin/ManagePages'));
const ManageTeam = lazy(() => import('./pages/admin/ManageTeam'));
const ManageVideos = lazy(() => import('./pages/admin/ManageVideos'));
const ManageReels = lazy(() => import('./pages/admin/ManageReels'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const PodcastsPage = lazy(() => import('./pages/PodcastsPage'));
const ShowsPage = lazy(() => import('./pages/ShowsPage'));
const GuestsPage = lazy(() => import('./pages/GuestsPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const TeamMemberPage = lazy(() => import('./pages/TeamMemberPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const RelatedContentPage = lazy(() => import('./pages/RelatedContentPage'));
const StationPage = lazy(() => import('./pages/StationPage'));
const YouTubePage = lazy(() => import('./pages/YouTubePage'));
const ReelsPage = lazy(() => import('./pages/ReelsPage'));
const FullPlayerPage = lazy(() => import('./pages/FullPlayerPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const SponsorsPage = lazy(() => import('./pages/SponsorsPage'));
const GiveawaysPage = lazy(() => import('./pages/GiveawaysPage'));
const SectionNewsPage = lazy(() => import('./pages/SectionNewsPage'));
const LiveChatPage = lazy(() => import('./pages/LiveChatPage'));
const AlexaPage = lazy(() => import('./pages/AlexaPage'));
const ManageGallery = lazy(() => import('./pages/admin/ManageGallery'));
const ManageSponsors = lazy(() => import('./pages/admin/ManageSponsors'));
const ManageComments = lazy(() => import('./pages/admin/ManageComments'));
const ImmersiveProgramPage = lazy(() => import('./pages/ImmersiveProgramPage'));
const ProgramVideos = lazy(() => import('./pages/program/Videos'));
const ProgramReels = lazy(() => import('./pages/program/Reels'));
const ProgramPodcasts = lazy(() => import('./pages/program/Podcasts'));
const ProgramGallery = lazy(() => import('./pages/program/Gallery'));
const ProgramTeam = lazy(() => import('./pages/ProgramTeamPage'));
const ProgramMessages = lazy(() => import('./pages/MessagesPage'));
const ProgramSchedule = lazy(() => import('./pages/program/Schedule'));
const ProgramInfo = lazy(() => import('./components/ProgramInfo'));
const GuestDetail = lazy(() => import('./pages/GuestDetail'));
const GuestInfo = lazy(() => import('./pages/guest/GuestInfo'));
const GuestBio = lazy(() => import('./pages/guest/GuestBio'));
const GuestPrograms = lazy(() => import('./pages/guest/GuestPrograms'));

const GuestMessages = lazy(() => import('./pages/guest/GuestMessages'));
const GuestLayout = lazy(() => import('./layouts/GuestLayout').then(m => ({ default: m.GuestLayout })));

const Profile = lazy(() => import('./pages/admin/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const FlightStatusPage = lazy(() => import('./pages/FlightStatusPage'));


import { useTrackPageView } from './hooks/useTrackPageView';
import ScrollToTop from './components/ScrollToTop';
import { AuthErrorHandler } from './components/auth/AuthErrorHandler';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ValentineEffects } from './components/effects/ValentineEffects';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useCheckUpdate } from './hooks/useCheckUpdate';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-bold uppercase tracking-widest">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Cargando...</span>
      </div>
    </div>
  );
}

function AnalyticsTracker() {
  useTrackPageView();
  return null;
}

function App() {
  useCheckUpdate();
  return (
    <GlobalVideoProvider>
      <Router>
        <ScrollToTop />
        <AnalyticsTracker />
        <SpeedInsights />
        <ValentineEffects />
        <AuthErrorHandler />
        <ErrorBoundary>
          <LiveStatsProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
              {/* Public Routes wrapped in MainLayout for persistent player */}
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/horario" element={<Schedule />} />
                  <Route path="/noticias" element={<NewsPage />} />
                  <Route path="/noticias/:id" element={<NewsDetail />} />
                  <Route path="/noticias/seccion/:section" element={<SectionNewsPage />} />
                  <Route path="/noticias/:id/relacionado" element={<RelatedContentPage />} />
                  <Route path="/podcasts" element={<PodcastsPage />} />
                  <Route path="/podcasts/:id" element={<PodcastDetail />} />
                  <Route path="/programas" element={<ShowsPage />} />
                  <Route path="/programa/:id" element={<ShowDetail />} />
                  <Route path="/buscar" element={<SearchResults />} />
                  <Route path="/equipo" element={<TeamPage />} />
                  <Route path="/invitados" element={<GuestsPage />} />
                  <Route path="/equipo/:id" element={<TeamMemberPage />} />
                  <Route path="/servicios" element={<ServicesPage />} />
                  <Route path="/emisora" element={<StationPage />} />
                  <Route path="/videos" element={<YouTubePage />} />
                  <Route path="/reels" element={<ReelsPage />} />
                  <Route path="/galeria" element={<GalleryPage />} />
                  <Route path="/patrocinadores" element={<SponsorsPage />} />
                  <Route path="/sorteos" element={<GiveawaysPage />} />
                  <Route path="/eventos" element={<EventsPage />} />
                  <Route path="/noticias/vuelos" element={<FlightStatusPage />} />

                  <Route path="/chat" element={<LiveChatPage />} />
                  <Route path="/alexa" element={<AlexaPage />} />
                  
                  {/* Redirects for legacy routes */}
                  <Route path="/schedule" element={<Navigate to="/horario" replace />} />
                  <Route path="/news" element={<Navigate to="/noticias" replace />} />
                  <Route path="/news/section/:section" element={<Navigate to="/noticias/seccion/:section" replace />} />
                  <Route path="/programs" element={<Navigate to="/programas" replace />} />
                  <Route path="/shows/:id" element={<Navigate to="/programa/:id" replace />} />
                  <Route path="/team" element={<Navigate to="/equipo" replace />} />
                  <Route path="/team/:id" element={<Navigate to="/equipo/:id" replace />} />
                  <Route path="/search" element={<Navigate to="/buscar" replace />} />
                  <Route path="/guests" element={<Navigate to="/invitados" replace />} />
                  <Route path="/services" element={<Navigate to="/servicios" replace />} />

                  {/* Redirects for rebranded program pages */}
                  <Route path="/demo" element={<Navigate to="/acompaname-tonight" replace />} />
                  <Route path="/demo/*" element={<Navigate to="/acompaname-tonight" replace />} />
                  <Route path="/programa/acompaname-tonight" element={<Navigate to="/acompaname-tonight" replace />} />
                  <Route path="/programa/el-fogon-show" element={<Navigate to="/el-fogon-show" replace />} />
                  <Route path="/station" element={<Navigate to="/emisora" replace />} />
                  <Route path="/gallery" element={<Navigate to="/galeria" replace />} />
                  <Route path="/sponsors" element={<Navigate to="/patrocinadores" replace />} />
                  <Route path="/giveaways" element={<Navigate to="/sorteos" replace />} />
                  <Route path="/live-chat" element={<Navigate to="/chat" replace />} />

                  {/* Legal Routes */}
                  <Route path="/privacidad" element={<Legal type="privacy" />} />
                  <Route path="/terminos" element={<Legal type="terms" />} />
                  <Route path="/preguntas-frecuentes" element={<Legal type="faq" />} />
                  <Route path="/mapa-del-sitio" element={<Legal type="sitemap" />} />
                  
                  <Route path="/privacy" element={<Navigate to="/privacidad" replace />} />
                  <Route path="/terms" element={<Navigate to="/terminos" replace />} />
                  <Route path="/faq" element={<Navigate to="/preguntas-frecuentes" replace />} />
                  <Route path="/sitemap" element={<Navigate to="/mapa-del-sitio" replace />} />
                </Route>

                <Route element={<GuestLayout />}>
                  <Route path="/invitado/:slug" element={<GuestDetail />}>
                    <Route index element={<GuestInfo />} />
                    <Route path="bio" element={<GuestBio />} />
                    <Route path="programs" element={<GuestPrograms />} />
                    <Route path="gallery" element={<Navigate to="programs" replace />} />
                    <Route path="messages" element={<GuestMessages />} />
                  </Route>
                </Route>
                
                <Route element={<ProgramLayout />}>
                  <Route path="/:slug" element={<ImmersiveProgramPage />}>
                    <Route index element={<ProgramInfo />} />
                    <Route path="team" element={<ProgramTeam />} />
                    <Route path="messages" element={<ProgramMessages />} />
                    <Route path="videos" element={<ProgramVideos />} />
                    <Route path="reels" element={<ProgramReels />} />
                    <Route path="podcasts" element={<ProgramPodcasts />} />
                    <Route path="gallery" element={<ProgramGallery />} />
                    <Route path="schedule" element={<ProgramSchedule />} />
                  </Route>
                </Route>
                
                <Route path="/login" element={<Login />} />
                <Route path="/player" element={<FullPlayerPage />} />

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <AdminHeaderProvider>
                    <AdminLayout />
                  </AdminHeaderProvider>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="news" element={<ManageNews />} />
                  <Route path="podcasts" element={<ManagePodcasts />} />
                  <Route path="comments" element={<ManageComments />} />
                  <Route path="stations" element={<ManageStations />} />
                  <Route path="promotions" element={<ManagePromotions />} />
                  <Route path="giveaways" element={<ManageGiveaways />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="appearance" element={<Navigate to="/admin/settings" replace />} />
                  <Route path="users" element={<ManageUsers />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="pages" element={<ManagePages />} />
                  <Route path="team" element={<ManageTeam />} />
                  <Route path="gallery" element={<ManageGallery isGeneral={true} />} />
                  <Route path="sponsors" element={<ManageSponsors />} />
                  <Route path="videos" element={<ManageVideos />} />
                  <Route path="reels" element={<ManageReels />} />
                  <Route path="activity" element={<Navigate to="/admin/users" replace />} />
                  <Route path="profile" element={<Profile />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </LiveStatsProvider>
        </ErrorBoundary>
      </Router>
    </GlobalVideoProvider>
  );
}

export default App;