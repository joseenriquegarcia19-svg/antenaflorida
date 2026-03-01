import { Shield, FileText, HelpCircle, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { SEO } from '@/components/SEO';

interface LegalProps {
  type: 'privacy' | 'terms' | 'faq' | 'sitemap';
}

export default function Legal({ type }: LegalProps) {
  const { config } = useSiteConfig();
  const siteName = config?.site_name || 'Radio Wave';
  const contactEmail = config?.contact_email || 'contacto@radiowave.com';

  const content = {
    privacy: {
      title: 'Política de Privacidad',
      icon: <Shield size={40} className="text-primary" />,
      text: (
        <div className="space-y-4">
          <p>En {siteName}, valoramos su privacidad. Esta política explica cómo recopilamos, usamos y protegemos su información personal.</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">1. Recopilación de Información</h3>
          <p>Recopilamos información que usted nos proporciona directamente, como cuando se registra para recibir nuestro boletín informativo o nos contacta.</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">2. Uso de la Información</h3>
          <p>Utilizamos la información para mejorar nuestros servicios, personalizar su experiencia y comunicarnos con usted.</p>
        </div>
      )
    },
    terms: {
      title: 'Términos y Condiciones',
      icon: <FileText size={40} className="text-primary" />,
      text: (
        <div className="space-y-4">
          <p>Bienvenido a {siteName}. Al acceder a nuestro sitio web, usted acepta cumplir con estos términos y condiciones.</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">1. Uso del Sitio</h3>
          <p>Usted se compromete a utilizar nuestro sitio solo para fines legales y de una manera que no infrinja los derechos de otros.</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">2. Propiedad Intelectual</h3>
          <p>Todo el contenido de este sitio es propiedad de {siteName} o de sus licenciantes y está protegido por las leyes de derechos de autor.</p>
        </div>
      )
    },
    faq: {
      title: 'Preguntas Frecuentes',
      icon: <HelpCircle size={40} className="text-primary" />,
      text: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">¿Cómo puedo escuchar la radio en vivo?</h3>
            <p className="mt-2">Puede escuchar nuestra transmisión en vivo haciendo clic en el botón "Play" en la parte superior de la página o en la barra de reproducción inferior.</p>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">¿Tienen una aplicación móvil?</h3>
            <p className="mt-2">Actualmente, nuestro sitio web es totalmente responsivo y funciona perfectamente en dispositivos móviles. Estamos trabajando en una aplicación dedicada.</p>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">¿Cómo puedo contactar con un programa?</h3>
            <p className="mt-2">Puede contactarnos a través de nuestras redes sociales o enviando un correo a {contactEmail}.</p>
          </div>
        </div>
      )
    },
    sitemap: {
      title: 'Mapa del Sitio',
      icon: <Map size={40} className="text-primary" />,
      text: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Principal</h3>
            <ul className="space-y-2 list-disc pl-5">
              <li><a href="/" className="hover:text-primary">Inicio</a></li>
              <li><a href="/horario" className="hover:text-primary">Programación</a></li>
              <li><a href="/noticias" className="hover:text-primary">Noticias</a></li>
              <li><a href="/podcasts" className="hover:text-primary">Podcasts</a></li>
              <li><a href="/programas" className="hover:text-primary">Programas</a></li>
              <li><a href="/emisora" className="hover:text-primary">Emisora</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Multimedia</h3>
            <ul className="space-y-2 list-disc pl-5">
              <li><a href="/videos" className="hover:text-primary">Videos</a></li>
              <li><a href="/reels" className="hover:text-primary">Reels</a></li>
              <li><a href="/galeria" className="hover:text-primary">Galería</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Nosotros</h3>
            <ul className="space-y-2 list-disc pl-5">
              <li><a href="/equipo" className="hover:text-primary">Equipo</a></li>
              <li><a href="/invitados" className="hover:text-primary">Invitados</a></li>
              <li><a href="/servicios" className="hover:text-primary">Servicios</a></li>
              <li><a href="/patrocinadores" className="hover:text-primary">Patrocinadores</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Legal</h3>
            <ul className="space-y-2 list-disc pl-5">
              <li><a href="/privacidad" className="hover:text-primary">Política de Privacidad</a></li>
              <li><a href="/terminos" className="hover:text-primary">Términos y Condiciones</a></li>
              <li><a href="/preguntas-frecuentes" className="hover:text-primary">Preguntas Frecuentes</a></li>
              <li><a href="/mapa-del-sitio" className="hover:text-primary">Mapa del Sitio</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Cuenta</h3>
            <ul className="space-y-2 list-disc pl-5">
              <li><Link to="/login" className="hover:text-primary">Iniciar Sesión</Link></li>
            </ul>
          </div>
        </div>
      )
    }
  };

  const data = content[type];

  return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <SEO title={data.title} />
        <div className="flex items-center gap-4 mb-8">
          {data.icon}
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            {data.title}
          </h1>
        </div>
        <div className="bg-white dark:bg-card-dark rounded-2xl p-8 border border-slate-200 dark:border-white/5 shadow-lg prose prose-lg dark:prose-invert max-w-none text-slate-600 dark:text-white/80">
          {data.text}
        </div>
      </div>
  );
}
