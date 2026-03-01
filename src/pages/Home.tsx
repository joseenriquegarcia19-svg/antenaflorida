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
      
      <Hero />
      
      <AudienceMap />
      
      <ContentCarousel />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-8">
        <WorldTimeBar />
      </section>

      <FeaturedNewsSection />
      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6">
         <div className="w-full">
            <SponsorBanner location="home_middle" />
         </div>
      </section>

      <ReelsSection />
      
      <FloridaEventsBanner />

      <TeamBanner viewMode="carousel" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 items-start">
        <div id="news-section" className="lg:col-span-2 flex flex-col">
          <div className="bg-white dark:bg-card-dark rounded-[32px] p-6 sm:p-10 shadow-xl border border-slate-100 dark:border-white/5">
            <NewsList sidebarRef={sidebarRef} />
          </div>
          <div className="mt-12">
             <CategoryCloud />
          </div>
        </div>
        <div id="podcasts-section" ref={sidebarRef} className="h-full space-y-6">
          <SponsorBanner location="sidebar_ad" />
          
          {widgetSettings && widgetSettings.widget_tags_enabled !== 'false' && (
            <div>
              <PopularTagsCloud />
            </div>
          )}

          {widgetSettings && widgetSettings.widget_programs_enabled !== 'false' && (
            <ProgramWidget 
              autoPlayInterval={8000}
              showControls={true}
              forceShowAll={widgetSettings.widget_programs_show_all === 'true'}
            />
          )}

          {widgetSettings && widgetSettings.widget_weather_enabled !== 'false' && (
            <WeatherWidget />
          )}

          <TopNewsWidget />

          {widgetSettings && widgetSettings.widget_schedule_enabled !== 'false' && (
            <DailyScheduleWidget />
          )}

          {widgetSettings && widgetSettings.widget_podcasts_enabled !== 'false' && (
            <PodcastList />
          )}
        </div>
      </section>

      <YouTubeSection />
      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6">
         <div className="w-full">
            <SponsorBanner location="home_bottom" />
         </div>
      </section>

      <SponsorsSection />
    </>
  );
}
