import React, { useRef, useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { FeaturedNewsSection } from '../components/FeaturedNewsSection';
import { ReelsSection } from '../components/ReelsSection';
import { SponsorBanner } from '../components/SponsorBanner';
import { NewsList } from '../components/NewsList';
import { PodcastList } from '../components/PodcastList';
import { YouTubeSection } from '../components/YouTubeSection';
import { SponsorsSection } from '../components/SponsorsSection';
import { WeatherWidget } from '../components/WeatherWidget';
import { TopNewsWidget } from '../components/TopNewsWidget';
import { ProgramWidget } from '../components/ProgramWidget';
import { PopularTagsCloud } from '../components/PopularTagsCloud';
import { TeamBanner } from '../components/TeamBanner';
import { AudienceMap } from '../components/AudienceMap';
import { CategoryCloud } from '../components/CategoryCloud';
import { ContentCarousel } from '../components/ContentCarousel';
import { DailyScheduleWidget } from '../components/DailyScheduleWidget';
import FloridaEventsBanner from '../components/FloridaEventsBanner';
import { WorldTimeBar } from '../components/WorldTimeBar';
import { supabase } from '@/lib/supabase';
import { SEO } from '../components/SEO';
import { generateStationSchema } from '@/lib/metadata';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function Home() {
  const { config } = useSiteConfig();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [widgetSettings, setWidgetSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchSettings() {
      const { data: widgetData } = await supabase.from('admin_settings').select('setting_key, setting_value');
      if (widgetData) {
        const settings = widgetData.reduce((acc: Record<string, string>, curr) => {
          acc[curr.setting_key] = curr.setting_value;
          return acc;
        }, {});
        setWidgetSettings(settings);
      }
    }
    fetchSettings();
  }, []);

  return (
    <>
      <SEO 
        schema={generateStationSchema({
          name: config?.site_name || '',
          url: 'https://www.antenaflorida.com',
          logo: config?.logo_url || '',
          description: config?.station_description || ''
        })}
      />
      
      <ErrorBoundary>
        <Hero />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <AudienceMap />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <ContentCarousel />
      </ErrorBoundary>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-8">
        <ErrorBoundary>
          <WorldTimeBar />
        </ErrorBoundary>
      </section>

      <ErrorBoundary>
        <FeaturedNewsSection />
      </ErrorBoundary>
      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6">
         <div className="w-full">
            <SponsorBanner location="home_middle" />
         </div>
      </section>

      <ErrorBoundary>
        <ReelsSection />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <FloridaEventsBanner />
      </ErrorBoundary>

      <ErrorBoundary>
        <TeamBanner viewMode="carousel" />
      </ErrorBoundary>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 items-start">
        <div id="news-section" className="lg:col-span-2 flex flex-col">
          <div className="bg-white dark:bg-card-dark rounded-[32px] p-6 sm:p-10 shadow-xl border border-slate-100 dark:border-white/5">
            <ErrorBoundary>
              <NewsList sidebarRef={sidebarRef} />
            </ErrorBoundary>
          </div>
          <div className="mt-12">
             <ErrorBoundary>
               <CategoryCloud />
             </ErrorBoundary>
          </div>
        </div>
        <div id="podcasts-section" ref={sidebarRef} className="h-full space-y-6">
          <SponsorBanner location="sidebar_ad" />
          
          {widgetSettings && widgetSettings.widget_tags_enabled !== 'false' && (
            <div>
              <ErrorBoundary>
                <PopularTagsCloud />
              </ErrorBoundary>
            </div>
          )}

          {widgetSettings && widgetSettings.widget_programs_enabled !== 'false' && (
            <ErrorBoundary>
              <ProgramWidget 
                autoPlayInterval={8000}
                showControls={true}
                forceShowAll={widgetSettings.widget_programs_show_all === 'true'}
              />
            </ErrorBoundary>
          )}

          {widgetSettings && widgetSettings.widget_weather_enabled !== 'false' && (
            <ErrorBoundary>
              <WeatherWidget />
            </ErrorBoundary>
          )}

          <ErrorBoundary>
            <TopNewsWidget />
          </ErrorBoundary>

          {widgetSettings && widgetSettings.widget_schedule_enabled !== 'false' && (
            <ErrorBoundary>
              <DailyScheduleWidget />
            </ErrorBoundary>
          )}

          {widgetSettings && widgetSettings.widget_podcasts_enabled !== 'false' && (
            <ErrorBoundary>
              <PodcastList />
            </ErrorBoundary>
          )}
        </div>
      </section>

      <ErrorBoundary>
        <YouTubeSection />
      </ErrorBoundary>
      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6">
         <div className="w-full">
            <SponsorBanner location="home_bottom" />
         </div>
      </section>

      <ErrorBoundary>
        <SponsorsSection />
      </ErrorBoundary>
    </>
  );
}
