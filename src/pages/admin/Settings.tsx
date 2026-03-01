import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { logActivity } from '@/lib/activityLogger';
import { useToast } from '@/contexts/ToastContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Settings as SettingsIcon, Info, Image, Radio, Globe, Wifi, Bot, FileText, BookOpen, Palette, Check, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { usePalette } from '@/contexts/PaletteContext';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { useSearchParams } from 'react-router-dom';
import { AdminModal } from '@/components/ui/AdminModal';
import ManageGallery from './ManageGallery';
import {
  InputField, 
  TextareaField, 
  CheckboxField, 
  SelectField, 
  ColorField,
  RangeField
} from './SettingsComponents';

// Constants for Top Bar
const contentOptions = [
  { value: 'news_ticker', label: 'Noticias (Ticker)' },
  { value: 'podcasts', label: 'Podcasts' },
  { value: 'stations', label: 'Estaciones' },
  { value: 'time', label: 'Hora' },
  { value: 'weather', label: 'Clima' },
  { value: 'live', label: 'Emisión En Vivo' },
  { value: 'shows', label: 'Programas' },
  { value: 'team', label: 'Equipo' },
  { value: 'deploy_logs', label: 'Logs De Despliegue' },
];

const displayModeOptions = [
  { value: 'icon_text', label: 'Icono y Texto' },
  { value: 'icon_only', label: 'Solo Icono' },
  { value: 'text_only', label: 'Solo Texto' },
];

// Main Settings Component
const mapFormStateToConfig = (formState) => {
    const configPayload = {
        site_name: formState.site_name,
        slogan: formState.slogan,
        frequency_value: formState.frequency_identifier,
        frequency_type: formState.frequency_type,
        news_hashtags: formState.default_hashtags,
        news_pinned_categories: formState.featured_categories.split(',').map(s => s.trim()).filter(Boolean),
        contact_email: formState.contact_email,
        contact_phone: formState.phone_number,
        contact_address: formState.address,
        social_facebook: formState.facebook_url,
        social_x: formState.twitter_url,
        social_instagram: formState.instagram_url,
        social_youtube: formState.youtube_url,
        social_tiktok: formState.tiktok_url,
        social_whatsapp: formState.whatsapp_url,
        logo_url: formState.logo_url,
        top_bar_enabled: formState.enable_top_bar,
        top_bar_bg_color: formState.top_bar_bg_color,
        top_bar_text_color: formState.top_bar_text_color,
        promotions_interval: Number(formState.top_bar_promotion_speed),
        top_bar_left_items: [formState.top_bar_left_content],
        top_bar_left_mode: formState.top_bar_left_mode,
        top_bar_right_items: [formState.top_bar_right_content],
        top_bar_right_mode: formState.top_bar_right_mode,
        station_description: formState.station_description,
        ceo_member_id: formState.station_ceo_id,
        listening_platforms_live365: formState.live365_url,
        listening_platforms_roku: formState.roku_channel_url,
        listening_platforms_tunein: formState.tunein_url,
        header_bg_image_url: formState.header_bg_image_url,
        header_bg_position_x: Number(formState.header_bg_position_x),
        header_bg_position_y: Number(formState.header_bg_position_y),
        header_bg_scale: Number(formState.header_bg_scale),
        header_bg_rotation: Number(formState.header_bg_rotation),
        header_bg_opacity: Number(formState.header_bg_opacity),
        header_bg_grayscale: formState.header_bg_grayscale,
    };
    
    Object.keys(configPayload).forEach(key => {
        if (configPayload[key] === undefined || configPayload[key] === null) {
            delete configPayload[key];
        }
    });

    return configPayload;
};

const mapConfigToFormState = (config, currentState) => {
    if (!config) return currentState;
    return {
        ...currentState,
        site_name: config.site_name || '',
        slogan: config.slogan || '',
        frequency_identifier: config.frequency_value || '',
        frequency_type: config.frequency_type || 'FM',
        default_hashtags: config.news_hashtags || '',
        featured_categories: (config.news_pinned_categories || []).join(', '),
        contact_email: config.contact_email || '',
        phone_number: config.contact_phone || '',
        address: config.contact_address || '',
        facebook_url: config.social_facebook || '',
        twitter_url: config.social_x || '',
        instagram_url: config.social_instagram || '',
        youtube_url: config.social_youtube || '',
        tiktok_url: config.social_tiktok || '',
        whatsapp_url: config.social_whatsapp || '',
        logo_url: config.logo_url || '',
        enable_top_bar: config.top_bar_enabled ?? true,
        top_bar_bg_color: config.top_bar_bg_color || '#000000',
        top_bar_text_color: config.top_bar_text_color || '#FFFFFF',
        top_bar_promotion_speed: config.promotions_interval || 5000,
        top_bar_left_content: (config.top_bar_left_items || ['news_ticker'])[0],
        top_bar_left_mode: config.top_bar_left_mode || 'icon_text',
        top_bar_right_content: (config.top_bar_right_items || ['live'])[0],
        top_bar_right_mode: config.top_bar_right_mode || 'icon_text',
        station_description: config.station_description || '',
        station_ceo_id: config.ceo_member_id || '',
        live365_url: config.listening_platforms_live365 || '',
        roku_channel_url: config.listening_platforms_roku || '',
        tunein_url: config.listening_platforms_tunein || '',
        header_bg_image_url: config.header_bg_image_url || '',
        header_bg_position_x: config.header_bg_position_x ?? 50,
        header_bg_position_y: config.header_bg_position_y ?? 50,
        header_bg_scale: config.header_bg_scale ?? 100,
        header_bg_rotation: config.header_bg_rotation ?? 0,
        header_bg_opacity: config.header_bg_opacity ?? 20,
        header_bg_grayscale: config.header_bg_grayscale ?? false,
    };
};
  export default function Settings() {
  const { config, updateConfig, loading: configLoading } = useSiteConfig();
  const { setHeader } = useAdminHeader();
  const { success, error } = useToast();
  const { theme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'web_appearance' | 'station' | 'audience' | 'widgets' | 'integrations' | 'docs' | 'system_docs'>(
    (tabParam as 'general' | 'appearance' | 'web_appearance' | 'station' | 'audience' | 'widgets' | 'integrations' | 'docs' | 'system_docs') || 'general'
  );

  useEffect(() => {
    if (tabParam && ['general', 'appearance', 'web_appearance', 'station', 'audience', 'widgets', 'integrations', 'docs', 'system_docs'].includes(tabParam)) {
       setActiveTab(tabParam as 'general' | 'appearance' | 'web_appearance' | 'station' | 'audience' | 'widgets' | 'integrations' | 'docs' | 'system_docs');
    }
  }, [tabParam]);

  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const { palette, setPalette } = usePalette();

  useEffect(() => {
    const fetchTeamMembers = async () => {
      const { data, error } = await supabase.from('team_members').select('id, name');
      if (error) console.error('Error fetching team members:', error);
      else setTeamMembers(data);
    };
    fetchTeamMembers();
  }, []);

  const [formState, setFormState] = useState({
    site_name: '',
    site_description: '',
    slogan: '',
    frequency_identifier: '',
    frequency_type: 'FM',
    default_hashtags: '',
    featured_categories: '',
    contact_email: '',
    phone_number: '',
    address: '',
    facebook_url: '',
    twitter_url: '',
    instagram_url: '',
    youtube_url: '',
    tiktok_url: '',
    whatsapp_url: '',
    logo_url: '',
    favicon_url: '',
    enable_top_bar: true,
    top_bar_bg_color: '#000000',
    top_bar_text_color: '#FFFFFF',
    top_bar_promotion_speed: 5000,
    top_bar_left_content: 'news_ticker',
    top_bar_left_mode: 'icon_text',
    top_bar_right_content: 'live',
    top_bar_right_mode: 'icon_text',
    station_name: '',
    stream_url: '',
    stream_url_hq: '',
    stream_url_mobile: '',
    fallback_stream_url: '',
    default_album_art: '',
    default_artist: '',
    default_track: '',
    station_description: '',
    station_ceo_id: '',
    live365_url: '',
    roku_channel_url: '',
    tunein_url: '',
    enable_audience_map: true,
    fixed_countries: [],
    weather_api_key: '',
    weather_lat: '',
    weather_lon: '',
    enable_weather: true,
    show_all_programs_in_widget: false,
    enable_tags_cloud_widget: true,
    enable_podcasts_list_widget: true,
    enable_ai_post_generator: true,
    enable_youtube_import: true,
    openai_api_key: '',
    admin_manual_url: '',
    user_guide_url: '',
    header_bg_image_url: '',
    header_bg_position_x: 50,
    header_bg_position_y: 50,
    header_bg_scale: 100,
    header_bg_rotation: 0,
    header_bg_opacity: 20,
    header_bg_grayscale: false,
  });

  useEffect(() => {
    const titles = {
      general: { title: 'Ajustes Generales', subtitle: 'Información y contacto', icon: Info },
      appearance: { title: 'Barra Superior', subtitle: 'Personaliza el encabezado flotante', icon: Image },
      web_appearance: { title: 'Diseño y Colores', subtitle: 'Personaliza el tema visual', icon: Palette },
      station: { title: 'Sobre la Emisora', subtitle: 'Información institucional', icon: Radio },
      audience: { title: 'Audiencia', subtitle: 'Control de presencia global', icon: Globe },
      widgets: { title: 'Widgets y Cards', subtitle: 'Configura bloques interactivos', icon: Wifi },
      integrations: { title: 'Integraciones', subtitle: 'IA y servicios externos', icon: Bot },
      docs: { title: 'Documentación', subtitle: 'Manuales de uso', icon: FileText },
      system_docs: { title: 'Sistema', subtitle: 'Documentación técnica', icon: BookOpen },
    };
    const current = titles[activeTab] || titles.general;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
    });
    if (config) {
      setFormState(currentState => mapConfigToFormState(config, currentState));
    }
  }, [config, setHeader, activeTab]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const configPayload = mapFormStateToConfig(formState);
      await updateConfig(configPayload);
      await logActivity('Actualizar Configuración', 'Se actualizaron los ajustes generales del sitio.');
      success('¡Configuración guardada con éxito!');
    } catch (err) {
      console.error(err);
      error('Hubo un error al guardar la configuración.');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettingsTab formState={formState} handleInputChange={handleInputChange} config={config} onSave={handleSubmit} loading={loading} onGalleryClick={() => setIsGalleryOpen(true)} />;
      case 'appearance':
        return <AppearanceSettingsTab formState={formState} handleInputChange={handleInputChange} theme={theme} setTheme={setTheme} onSave={handleSubmit} loading={loading} />; 
      case 'station':
        return <StationSettingsTab formState={formState} handleInputChange={handleInputChange} teamMembers={teamMembers} onSave={handleSubmit} loading={loading} />;
      case 'audience':
        return <AudienceSettingsTab formState={formState} setFormState={setFormState} onSave={handleSubmit} loading={loading} />;
      case 'widgets':
        return <WidgetsSettingsTab />;
      case 'integrations':
        return <IntegrationsSettingsTab />;
      case 'docs':
        return <DocsSettingsTab formState={formState} handleInputChange={handleInputChange} onSave={handleSubmit} loading={loading} />;
      case 'system_docs':
        return <SystemDocsSettingsTab />;
      case 'web_appearance':
        return <WebAppearanceSettingsTab palette={palette} setPalette={setPalette} />;
      default:
        return null;
    }
  };

  if (configLoading) return <div>Cargando configuración...</div>;

  return (
    <div className="space-y-8">

      <div className="space-y-6">


        <div className="bg-card p-6 rounded-lg border border-border">
          {renderForm()}
        </div>
      </div>

      <AdminModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        title="Seleccionar de Galería"
        maxWidth="max-w-6xl"
      >
        <ManageGallery 
          isGeneral={true}
          hideSidebar={true}
          onSelect={(url) => {
             handleInputChange({ target: { name: 'logo_url', value: url }});
             setIsGalleryOpen(false);
          }}
        />
      </AdminModal>
    </div>
  );
}

// Sub-components for each tab
const GeneralSettingsTab = ({ formState, handleInputChange, config, onSave, loading, onGalleryClick }) => {

  return (
   <div className="space-y-10">
    {/* INFORMACIÓN GENERAL */}
    <div className="space-y-6">
      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Información General</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div>
          <label className="block text-sm font-bold text-foreground mb-2">LOGO (IMAGEN O VIDEO)</label>
          <ImageUpload 
            value={formState.logo_url} 
            onChange={(url) => handleInputChange({ target: { name: 'logo_url', value: url }})} 
            onGalleryClick={onGalleryClick}
          />
          <p className="text-xs text-muted-foreground mt-2">Si subes una imagen, se guardará el enlace público y se aplicará en toda la web.</p>
        </div>
        <InputField label="URL DEL LOGO (OPCIONAL)" name="logo_url" value={formState.logo_url} onChange={handleInputChange} />
      </div>
      <InputField label="NOMBRE DEL SITIO" name="site_name" value={formState.site_name} onChange={handleInputChange} />
      <InputField label="SLOGAN" name="slogan" value={formState.slogan} onChange={handleInputChange} />
      
      {/* Fecha de Creación - Read Only */}
      {config?.creation_date && (
        <div>
          <label className="block text-sm font-bold text-foreground mb-2">FECHA DE CREACIÓN DEL SITIO</label>
          <div className="w-full px-4 py-3 bg-muted/50 rounded-xl border border-border text-muted-foreground text-sm font-bold cursor-not-allowed">
            📅 {new Date(config.creation_date + 'T00:00:00').toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Fecha del primer despliegue de la web. Este valor no se puede modificar.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="FRECUENCIA / IDENTIFICADOR" name="frequency_identifier" value={formState.frequency_identifier} onChange={handleInputChange} />
          <SelectField label="TIPO DE FRECUENCIA" name="frequency_type" value={formState.frequency_type} onChange={handleInputChange} options={['FM', 'AM', 'Online']} optionLabels={null} />
      </div>
        <TextareaField label="CATEGORÍAS DESTACADAS (SECCIÓN NOTICIAS)" name="featured_categories" value={formState.featured_categories} onChange={handleInputChange} rows={2} placeholder="Política, Deportes, Entretenimiento" />
        <p className="text-xs text-muted-foreground -mt-3 ml-1">Ingresa las categorías separadas por comas. Estas aparecerán como pestañas en la página de noticias (máximo 8 recomendadas).</p>
    </div>

    {/* CONTACTO */}
    <div className="space-y-6 border-t border-border pt-6">
      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Contacto</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="EMAIL" name="contact_email" type="email" value={formState.contact_email} onChange={handleInputChange} />
        <InputField label="TELÉFONO" name="phone_number" value={formState.phone_number} onChange={handleInputChange} />
      </div>
      <InputField label="DIRECCIÓN" name="address" value={formState.address} onChange={handleInputChange} />
    </div>

    {/* REDES SOCIALES */}
    <div className="space-y-6 border-t border-border pt-6">
      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Redes Sociales</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="FACEBOOK" name="facebook_url" value={formState.facebook_url} onChange={handleInputChange} placeholder="https://facebook.com/tu-pagina" />
        <InputField label="X (TWITTER)" name="twitter_url" value={formState.twitter_url} onChange={handleInputChange} placeholder="https://x.com/tu-usuario" />
        <InputField label="INSTAGRAM" name="instagram_url" value={formState.instagram_url} onChange={handleInputChange} placeholder="https://instagram.com/tu-usuario" />
        <InputField label="YOUTUBE" name="youtube_url" value={formState.youtube_url} onChange={handleInputChange} placeholder="https://youtube.com/c/tu-canal" />
        <InputField label="TIKTOK" name="tiktok_url" value={formState.tiktok_url} onChange={handleInputChange} placeholder="https://tiktok.com/@tu-usuario" />
        <InputField label="WHATSAPP" name="whatsapp_url" value={formState.whatsapp_url} onChange={handleInputChange} placeholder="https://wa.me/1234567890" />
      </div>
    </div>

    <div className="flex justify-end pt-4 border-t border-border">
      <button 
        onClick={onSave}
        disabled={loading} 
        className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
      >
        {loading ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SettingsIcon size={18} />}
        {loading ? 'Guardando...' : 'Guardar Información'}
      </button>
    </div>
  </div>
  );
};

const AppearanceSettingsTab = ({ formState, handleInputChange, theme, setTheme, onSave, loading }) => (
  <div className="space-y-10">
    {/* TEMÁTICA DEL SITIO */}
    <div className="space-y-4">
      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Temática del Sitio</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button type="button" onClick={() => setTheme('light')} className={`p-4 rounded-lg border-2 text-center transition-all font-bold ${theme === 'light' ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}>Claro (Regular)</button>
        <button type="button" onClick={() => setTheme('dark')} className={`p-4 rounded-lg border-2 text-center transition-all font-bold ${theme === 'dark' ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}>Oscuro (Regular)</button>
        <button type="button" onClick={() => setTheme('valentine')} className={`p-4 rounded-lg border-2 text-center transition-all font-bold ${theme === 'valentine' ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}>❤️💕 San Valentín 💘</button>
      </div>
    </div>

    {/* BARRA SUPERIOR */}
    <div className="space-y-6 border-t border-border pt-6">
      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Barra Superior (Top Bar)</h4>
      <CheckboxField label="Activar Barra Superior" name="enable_top_bar" checked={formState.enable_top_bar} onChange={handleInputChange} />
      
      {formState.enable_top_bar && (
        <div className="space-y-6 pl-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ColorField label="COLOR DE FONDO" name="top_bar_bg_color" value={formState.top_bar_bg_color} onChange={handleInputChange} />
            <ColorField label="COLOR DE TEXTO" name="top_bar_text_color" value={formState.top_bar_text_color} onChange={handleInputChange} />
          </div>
          <div>
            <InputField label="TIEMPO DE ROTACIÓN DE PROMOCIONES (MS)" name="top_bar_promotion_speed" type="number" value={formState.top_bar_promotion_speed} onChange={handleInputChange} />
            <p className="text-xs text-muted-foreground mt-1">* 1000ms = 1 segundo. Recomendado: 5000ms (5 segundos).</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div className="bg-card-dark/20 dark:bg-card-dark/50 p-4 rounded-lg space-y-4">
              <h5 className="text-sm font-bold uppercase tracking-wider text-primary">IZQUIERDA</h5>
              <SelectField 
                label="Contenido" 
                name="top_bar_left_content"
                value={formState.top_bar_left_content}
                onChange={handleInputChange}
                options={contentOptions.map(o => o.value)}
                optionLabels={contentOptions.reduce((acc, o) => ({...acc, [o.value]: o.label }), {}) }
              />
              <SelectField 
                label="MODO DE VISUALIZACIÓN" 
                name="top_bar_left_mode"
                value={formState.top_bar_left_mode}
                onChange={handleInputChange}
                options={displayModeOptions.map(o => o.value)}
                optionLabels={displayModeOptions.reduce((acc, o) => ({...acc, [o.value]: o.label }), {}) }
              />
            </div>
            <div className="bg-card-dark/20 dark:bg-card-dark/50 p-4 rounded-lg space-y-4">
              <h5 className="text-sm font-bold uppercase tracking-wider text-primary">DERECHA</h5>
              <SelectField 
                label="Contenido" 
                name="top_bar_right_content"
                value={formState.top_bar_right_content}
                onChange={handleInputChange}
                options={contentOptions.map(o => o.value)}
                optionLabels={contentOptions.reduce((acc, o) => ({...acc, [o.value]: o.label }), {}) }
              />
              <SelectField 
                label="MODO DE VISUALIZACIÓN" 
                name="top_bar_right_mode"
                value={formState.top_bar_right_mode}
                onChange={handleInputChange}
                options={displayModeOptions.map(o => o.value)}
                optionLabels={displayModeOptions.reduce((acc, o) => ({...acc, [o.value]: o.label }), {}) }
              />
            </div>
          </div>
        </div>
      )}
    </div>

    {/* FONDO DEL HEADER */}
    <div className="space-y-6 border-t border-border pt-6">
      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Fondo del Header (Navigation Bar)</h4>
      <HeaderBackgroundEditor formState={formState} handleInputChange={handleInputChange} />
    </div>

    <div className="flex justify-end pt-4 border-t border-border">
      <button 
        onClick={onSave}
        disabled={loading} 
        className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
      >
        {loading ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SettingsIcon size={18} />}
        {loading ? 'Guardando...' : 'Guardar Apariencia'}
      </button>
    </div>
  </div>
);

const StationSettingsTab = ({ formState, handleInputChange, teamMembers, onSave, loading }) => (
  <div className="space-y-8">
    <div>
      <h3 className="text-lg font-bold text-card-foreground">Información de la Emisora</h3>
    </div>

    <div className="space-y-6 border-t border-border pt-6">
      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">DESCRIPCIÓN DE LA EMISORA</h4>
      <TextareaField 
        label="DESCRIPCIÓN"
        name="station_description" 
        value={formState.station_description} 
        onChange={handleInputChange} 
        rows={5}
      />
    </div>

    <div className="space-y-6 border-t border-border pt-6">
      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">CEO / DIRECTOR</h4>
      <select 
        name="station_ceo_id"
        value={formState.station_ceo_id}
        onChange={handleInputChange}
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary-orange"
      >
        <option value="">Seleccionar miembro del equipo...</option>
        {teamMembers.map(member => (
          <option key={member.id} value={member.id}>{member.name}</option>
        ))}
      </select>
    </div>

    <div className="space-y-6 border-t border-border pt-6">
      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Plataformas de Escucha</h4>
      <InputField label="LIVE365 ID/URL" name="live365_url" value={formState.live365_url} onChange={handleInputChange} />
      <InputField label="ROKU CHANNEL URL" name="roku_channel_url" value={formState.roku_channel_url} onChange={handleInputChange} />
      <InputField label="TUNEIN URL" name="tunein_url" value={formState.tunein_url} onChange={handleInputChange} />
    </div>

    <div className="flex justify-end pt-4 border-t border-border">
      <button 
        onClick={onSave}
        disabled={loading} 
        className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
      >
        {loading ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SettingsIcon size={18} />}
        {loading ? 'Guardando...' : 'Guardar Información'}
      </button>
    </div>
  </div>
);

const AudienceSettingsTab = ({ formState, setFormState, onSave, loading }) => {
  const [newCountry, setNewCountry] = useState('');
  const [stats, setStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Dummy data for the manual country selector
  const countries = [{ code: 'AR', name: 'Argentina' }, { code: 'US', name: 'Estados Unidos' }, { code: 'ES', name: 'España' }, { code: 'MX', name: 'México' }, { code: 'CO', name: 'Colombia' }];

  useEffect(() => {
    const fetchCountryStats = async () => {
      setLoadingStats(true);
      const today = new Date();
      const priorDate = new Date(new Date().setDate(today.getDate() - 90));
      
      const { data, error } = await supabase.rpc('stats_by_country', {
        p_start: priorDate.toISOString(),
        p_end: today.toISOString(),
        p_limit: 10
      });

      if (error) {
        console.error('Error fetching country stats:', error);
      } else {
        setStats(data);
      }
      setLoadingStats(false);
    };

    fetchCountryStats();
  }, []);

  const handleAddCountry = () => {
    if (newCountry && !formState.fixed_countries.some(c => c.code === newCountry)) {
      const country = countries.find(c => c.code === newCountry);
      if (country) {
        setFormState(prev => ({ ...prev, fixed_countries: [...prev.fixed_countries, country] }));
      }
    }
  };

  const handleRemoveCountry = (code) => {
    setFormState(prev => ({ ...prev, fixed_countries: prev.fixed_countries.filter(c => c.code !== code) }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-card-foreground">Gestión de Audiencia Global</h3>
        <p className="text-sm text-muted-foreground mt-1">Configura qué países aparecen en la barra de audiencia.</p>
      </div>

      {/* MANUAL SECTION */}
      <div className="space-y-4 border-t border-border pt-6">
        <h4 className="text-sm font-bold uppercase tracking-wider text-primary">MANUAL</h4>
        <div className="bg-card-dark/20 dark:bg-card-dark/50 p-4 rounded-lg">
          <h5 className="font-bold">Audiencia Fija</h5>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Estos países aparecerán siempre en la barra, independientemente de las estadísticas reales. Úsalo para mostrar presencia global permanente.</p>
          
          <div className="flex gap-2 items-center">
            <select 
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              className="flex-grow bg-background border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary-orange text-sm"
            >
              <option value="">Seleccionar país...</option>
              {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            <button type="button" onClick={handleAddCountry} className="bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-md text-sm transition-opacity">Agregar</button>
          </div>

          <div className="mt-4 space-y-2">
            {formState.fixed_countries && formState.fixed_countries.map(country => (
              <div key={country.code} className="flex items-center justify-between bg-background p-2 rounded-md border border-border">
                <span className="text-sm font-bold">{country.name}</span>
                <button type="button" onClick={() => handleRemoveCountry(country.code)} className="text-xs text-red-500 hover:text-red-700">Quitar</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AUTO SECTION */}
      <div className="space-y-4 border-t border-border pt-6">
        <h4 className="text-sm font-bold uppercase tracking-wider text-primary">AUTO</h4>
        <div className="bg-card-dark/20 dark:bg-card-dark/50 p-4 rounded-lg">
          <h5 className="font-bold">Audiencia por Estadística</h5>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Estos países se detectan automáticamente según las visitas reales al sitio. Solo lectura - No editable.</p>
          
          <div className="space-y-2">
            {loadingStats ? (
              <p className="text-sm text-muted-foreground">Cargando estadísticas...</p>
            ) : (
              stats.map(stat => (
                <div key={stat.country} className="flex items-center justify-between bg-background p-2 rounded-md border-border">
                  <span className="text-sm font-bold">{stat.country}</span>
                  <span className="text-xs text-muted-foreground">{stat.views.toLocaleString()} visitas</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button 
          onClick={onSave}
          disabled={loading} 
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          {loading ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SettingsIcon size={18} />}
          {loading ? 'Guardando...' : 'Guardar Audiencia'}
        </button>
      </div>
    </div>
  );
};

const WidgetsSettingsTab = () => {
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [widgetSaving, setWidgetSaving] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const [widgetState, setWidgetState] = useState({
    widget_programs_show_all: false,
    widget_programs_enabled: true,
    widget_weather_enabled: true,
    widget_tags_enabled: true,
    widget_podcasts_enabled: true,
    widget_schedule_enabled: true,
    weather_api_key: '',
    weather_lat: '',
    weather_lon: '',
  });

  useEffect(() => {
    const loadWidgetSettings = async () => {
      setWidgetLoading(true);
      const { data } = await supabase.from('admin_settings').select('setting_key, setting_value');
      if (data) {
        const settings: Record<string, string> = {};
        data.forEach(d => { settings[d.setting_key] = d.setting_value; });
        setWidgetState({
          widget_programs_show_all: settings.widget_programs_show_all === 'true',
          widget_programs_enabled: settings.widget_programs_enabled !== 'false',
          widget_weather_enabled: settings.widget_weather_enabled !== 'false',
          widget_tags_enabled: settings.widget_tags_enabled !== 'false',
          widget_podcasts_enabled: settings.widget_podcasts_enabled !== 'false',
          widget_schedule_enabled: settings.widget_schedule_enabled !== 'false',
          weather_api_key: settings.weather_api_key || '',
          weather_lat: settings.weather_lat || '',
          weather_lon: settings.weather_lon || '',
        });
      }
      setWidgetLoading(false);
    };
    loadWidgetSettings();
  }, []);

  const handleWidgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setWidgetState(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const saveWidgetSettings = async () => {
    setWidgetSaving(true);
    try {
      const entries = [
        { setting_key: 'widget_programs_show_all', setting_value: String(widgetState.widget_programs_show_all), description: 'Mostrar todos los programas en el widget' },
        { setting_key: 'widget_programs_enabled', setting_value: String(widgetState.widget_programs_enabled), description: 'Habilitar widget de programación' },
        { setting_key: 'widget_weather_enabled', setting_value: String(widgetState.widget_weather_enabled), description: 'Habilitar widget del clima' },
        { setting_key: 'widget_tags_enabled', setting_value: String(widgetState.widget_tags_enabled), description: 'Habilitar nube de etiquetas' },
        { setting_key: 'widget_podcasts_enabled', setting_value: String(widgetState.widget_podcasts_enabled), description: 'Habilitar lista de podcasts' },
        { setting_key: 'widget_schedule_enabled', setting_value: String(widgetState.widget_schedule_enabled), description: 'Habilitar parrilla del día' },
        { setting_key: 'weather_api_key', setting_value: widgetState.weather_api_key, description: 'API Key de OpenWeatherMap' },
        { setting_key: 'weather_lat', setting_value: widgetState.weather_lat, description: 'Latitud para el clima' },
        { setting_key: 'weather_lon', setting_value: widgetState.weather_lon, description: 'Longitud para el clima' },
      ];

      for (const entry of entries) {
        const { error } = await supabase.from('admin_settings').upsert(entry, { onConflict: 'setting_key' });
        if (error) throw error;
      }

      await logActivity('Actualizar Widgets', 'Se actualizaron los ajustes de widgets de la barra lateral.');
      toastSuccess('¡Configuración de widgets guardada con éxito!');
    } catch (err) {
      console.error('Error saving widget settings:', err);
      toastError('Hubo un error al guardar la configuración de widgets.');
    } finally {
      setWidgetSaving(false);
    }
  };

  if (widgetLoading) return <div className="py-12 text-center text-muted-foreground">Cargando configuración de widgets...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-card-foreground">Gestión de Widgets (Barra Lateral)</h3>
        <p className="text-sm text-muted-foreground mt-1">Configura la visibilidad y opciones de los widgets que aparecen en la barra lateral de la página de inicio.</p>
      </div>

      <div className="space-y-6 border-t border-border pt-6">
        <h4 className="text-sm font-bold uppercase tracking-wider text-primary">WIDGET DE PROGRAMACIÓN</h4>
        <CheckboxField label="Habilitar Widget de Programación" name="widget_programs_enabled" checked={widgetState.widget_programs_enabled} onChange={handleWidgetChange} />
        <CheckboxField 
          label="Mostrar todos los programas (en lugar de solo los destacados)" 
          name="widget_programs_show_all" 
          checked={widgetState.widget_programs_show_all} 
          onChange={handleWidgetChange} 
        />
        <p className="text-xs text-muted-foreground -mt-3 ml-8">* Si se activa, el encabezado cambiará automáticamente a "Nuestra Programación".</p>
      </div>

      <div className="space-y-6 border-t border-border pt-6">
        <h4 className="text-sm font-bold uppercase tracking-wider text-primary">PARRILLA DEL DÍA</h4>
        <CheckboxField label="Habilitar Widget de Parrilla del Día (agenda diaria)" name="widget_schedule_enabled" checked={widgetState.widget_schedule_enabled} onChange={handleWidgetChange} />
        <p className="text-xs text-muted-foreground -mt-3 ml-8">* Muestra la programación del día actual con indicador en vivo.</p>
      </div>

      <div className="space-y-6 border-t border-border pt-6">
        <h4 className="text-sm font-bold uppercase tracking-wider text-primary">WIDGET DEL CLIMA</h4>
        <CheckboxField label="Habilitar Widget del Clima" name="widget_weather_enabled" checked={widgetState.widget_weather_enabled} onChange={handleWidgetChange} />
        <InputField label="API Key de OpenWeatherMap" name="weather_api_key" value={widgetState.weather_api_key} onChange={handleWidgetChange} type="password" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField label="Latitud para el Clima" name="weather_lat" value={widgetState.weather_lat} onChange={handleWidgetChange} />
          <InputField label="Longitud para el Clima" name="weather_lon" value={widgetState.weather_lon} onChange={handleWidgetChange} />
        </div>
      </div>
      
      <div className="space-y-6 border-t border-border pt-6">
        <h4 className="text-sm font-bold uppercase tracking-wider text-primary">NUBE DE ETIQUETAS</h4>
        <CheckboxField label="Habilitar Widget de Nube de Etiquetas" name="widget_tags_enabled" checked={widgetState.widget_tags_enabled} onChange={handleWidgetChange} />
      </div>

      <div className="space-y-6 border-t border-border pt-6">
        <h4 className="text-sm font-bold uppercase tracking-wider text-primary">LISTA DE PODCASTS</h4>
        <CheckboxField label="Habilitar Widget de Lista de Podcasts" name="widget_podcasts_enabled" checked={widgetState.widget_podcasts_enabled} onChange={handleWidgetChange} />
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button 
          onClick={saveWidgetSettings}
          disabled={widgetSaving} 
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          {widgetSaving ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SettingsIcon size={18} />}
          {widgetSaving ? 'Guardando...' : 'Guardar Widgets'}
        </button>
      </div>
    </div>
  );
};

const IntegrationsSettingsTab = () => (
  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <Info size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
      <div>
        <h3 className="text-base font-bold text-blue-800 dark:text-blue-300">Nota Informativa</h3>
        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
          La configuración de Inteligencia Artificial (claves de API y modelos) se gestiona ahora directamente desde el <strong>Gestor de Noticias</strong> para mayor comodidad. Por favor, ve a la sección de <code className="text-xs font-bold">Noticias → Configuración</code>.
        </p>
      </div>
    </div>
  </div>
);

const DocsSettingsTab = ({ formState, handleInputChange, onSave, loading }) => (
  <div className="space-y-6">
    <InputField label="URL Manual de Administrador" name="admin_manual_url" value={formState.admin_manual_url} onChange={handleInputChange} />
    <InputField label="URL Guía del Usuario" name="user_guide_url" value={formState.user_guide_url} onChange={handleInputChange} />

    <div className="flex justify-end pt-4 border-t border-border">
      <button 
        onClick={onSave}
        disabled={loading} 
        className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
      >
        {loading ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SettingsIcon size={18} />}
        {loading ? 'Guardando...' : 'Guardar Enlaces'}
      </button>
    </div>
  </div>
);


const SystemDocsSettingsTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-card-foreground">Guía de Uso y Funciones</h3>
    <p className="text-sm text-muted-foreground">
      Descarga un documento PDF completo que detalla todas las funcionalidades del sitio, la arquitectura técnica, base de datos y hosting. Ideal para entregar a nuevos propietarios o administradores.
    </p>
    <p className="text-sm text-muted-foreground">
      Incluye: Stack Tecnológico, Hosting (Vercel), Base de Datos (Supabase), Funciones de Admin y Usuario.
    </p>
    <button 
      type="button" 
      className="bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded inline-flex items-center transition-opacity"
    >
      <FileText size={18} className="mr-2"/>
      Descargar Manual PDF
    </button>
  </div>
);

const WebAppearanceSettingsTab = ({ palette, setPalette }: { palette: string; setPalette: (p: string) => void }) => {
  const palettes = [
    { name: 'default', label: 'Predeterminada', description: 'La experiencia original de la radio.' },
    { name: 'green', label: 'Verde Inmersivo', description: 'Un tema inspirado en la naturaleza y la tranquilidad.' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-card-foreground mb-1">Paleta de Colores de la Web</h3>
        <p className="text-sm text-muted-foreground mb-6">Selecciona la paleta de colores principal para toda la web, incluido el panel de administración.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {palettes.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setPalette(p.name)}
            className={`relative p-4 rounded-lg border-2 text-left transition-all ${
              palette === p.name ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
            }`}>
            <h4 className="font-bold text-lg text-card-foreground">{p.label}</h4>
            <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
            {palette === p.name && (
              <div className="absolute top-3 right-3 bg-primary text-white rounded-full p-1">
                <Check size={16} />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const HeaderBackgroundEditor = ({ formState, handleInputChange }) => {
  return (
    <div className="space-y-8">
      <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
        <h5 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Vista Previa del Header</h5>
        
        {/* Simplified Header Preview */}
        <div className="relative h-24 w-full bg-card rounded-lg border border-border overflow-hidden shadow-inner group">
          {/* Background Layer */}
          <div 
            className={`absolute inset-0 z-0 transition-all duration-300 ${formState.header_bg_grayscale ? 'grayscale' : ''}`}
            style={{
              backgroundImage: formState.header_bg_image_url ? `url(${formState.header_bg_image_url})` : 'none',
              backgroundPosition: `${formState.header_bg_position_x}% ${formState.header_bg_position_y}%`,
              backgroundSize: `${formState.header_bg_scale}% auto`,
              backgroundRepeat: 'no-repeat',
              opacity: formState.header_bg_opacity / 100,
              transform: `rotate(${formState.header_bg_rotation}deg)`,
            }}
          />
          
          {/* Content Overlays (Fake) */}
          <div className="absolute inset-0 z-10 p-4 flex items-center justify-between pointer-events-none">
            <div className="h-8 w-24 bg-primary/20 rounded animate-pulse" />
            <div className="flex gap-4">
              <div className="h-4 w-12 bg-muted-foreground/20 rounded" />
              <div className="h-4 w-12 bg-muted-foreground/20 rounded" />
              <div className="h-4 w-12 bg-muted-foreground/20 rounded" />
            </div>
            <div className="h-10 w-10 bg-primary/10 rounded-full" />
          </div>
          
          {!formState.header_bg_image_url && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-muted-foreground/50 italic">
              Sin imagen de fondo configurada
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-foreground">IMAGEN DE FONDO (URL)</label>
            <div className="flex gap-2">
              <input 
                name="header_bg_image_url"
                value={formState.header_bg_image_url}
                onChange={handleInputChange}
                placeholder="https://ejemplo.com/mapa.svg"
                className="flex-grow bg-background border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary-orange text-sm"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">* Puedes usar la URL de la Florida: <code>https://upload.wikimedia.org/wikipedia/commons/4/44/USA_Florida_location_map.svg</code></p>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
            <CheckboxField label="Efecto Blanco y Negro (Grayscale)" name="header_bg_grayscale" checked={formState.header_bg_grayscale} onChange={handleInputChange} />
            {formState.header_bg_grayscale ? <EyeOff size={16} className="text-muted-foreground" /> : <Eye size={16} className="text-primary" />}
          </div>

          <RangeField label="OPACIDAD DEL FONDO" name="header_bg_opacity" value={formState.header_bg_opacity} onChange={handleInputChange} min={0} max={100} unit="%" />
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <RangeField label="POSICIÓN H (X)" name="header_bg_position_x" value={formState.header_bg_position_x} onChange={handleInputChange} min={0} max={100} unit="%" />
            <RangeField label="POSICIÓN V (Y)" name="header_bg_position_y" value={formState.header_bg_position_y} onChange={handleInputChange} min={0} max={100} unit="%" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <RangeField label="ESCALA / ZOOM" name="header_bg_scale" value={formState.header_bg_scale} onChange={handleInputChange} min={10} max={500} unit="%" />
            <RangeField label="ROTACIÓN" name="header_bg_rotation" value={formState.header_bg_rotation} onChange={handleInputChange} min={-180} max={180} unit="°" />
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="button" 
              onClick={() => {
                handleInputChange({ target: { name: 'header_bg_position_x', value: 50, type: 'number' } });
                handleInputChange({ target: { name: 'header_bg_position_y', value: 50, type: 'number' } });
                handleInputChange({ target: { name: 'header_bg_scale', value: 100, type: 'number' } });
                handleInputChange({ target: { name: 'header_bg_rotation', value: 0, type: 'number' } });
                handleInputChange({ target: { name: 'header_bg_opacity', value: 20, type: 'number' } });
                handleInputChange({ target: { name: 'header_bg_grayscale', value: false, type: 'checkbox' } });
              }}
              className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <RotateCcw size={10} />
              Resetear Ajustes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


