import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Instagram, 
  Youtube,
  MessageCircle,
  Video,
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  ArrowUp
} from 'lucide-react';
import { XIcon } from './icons/XIcon';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { SponsorBanner } from './SponsorBanner';
import versionData from '../../version.json';
import { Logo } from './ui/Logo';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { config } = useSiteConfig();

  const siteName = config?.site_name || 'Antena Florida';
  const slogan = config?.slogan || 'La señal que nos une';

  return (
    <footer className="bg-slate-900 text-white pt-16 pb-32 sm:pb-24 border-t border-white/10 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-12">
          <SponsorBanner location="footer_ad" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand & About */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Logo />
              </div>
              <div className="flex flex-col">
                <div className="text-2xl font-black tracking-tighter uppercase italic">
                  {config?.site_name ? (
                    <>
                      {config.site_name.split(' ').map((word, i, arr) => (
                        <span key={i} className={i === arr.length - 1 ? 'text-primary-orange' : 'text-primary'}>
                          {word}{' '}
                        </span>
                      ))}
                    </>
                  ) : (
                    <><span className="text-primary">ANTENA</span> <span className="text-primary-orange">FLORIDA</span></>
                  )}
                </div>
                <span className="text-xs font-bold text-primary tracking-widest uppercase">
                  {slogan}
                </span>
              </div>
            </div>
            
            <div className="flex gap-4 pt-2">
              {config?.social_facebook && <SocialLink href={config.social_facebook} icon={<Facebook size={20} />} label="Facebook" />}
              {config?.social_instagram && <SocialLink href={config.social_instagram} icon={<Instagram size={20} />} label="Instagram" />}
              {config?.social_x && <SocialLink href={config.social_x} icon={<XIcon size={20} />} label="X" />}
              {config?.social_youtube && <SocialLink href={config.social_youtube} icon={<Youtube size={20} />} label="YouTube" />}
              {config?.social_tiktok && <SocialLink href={config.social_tiktok} icon={<Video size={20} />} label="TikTok" />}
              {config?.social_whatsapp && <SocialLink href={config.social_whatsapp} icon={<MessageCircle size={20} />} label="WhatsApp" />}
            </div>
            <div className="pt-4">
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                v{versionData.version}
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold uppercase tracking-widest mb-6 text-primary">Explorar</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <FooterLink to="/horario">Programación</FooterLink>
              <FooterLink to="/podcasts">Podcasts</FooterLink>
              <FooterLink to="/noticias">Noticias</FooterLink>
              <FooterLink to="/videos">Videos</FooterLink>
              <FooterLink to="/reels">Reels</FooterLink>
              <FooterLink to="/galeria">Galería</FooterLink>
              <FooterLink to="/equipo">Equipo</FooterLink>
              <FooterLink to="/servicios">Servicios</FooterLink>
              <FooterLink to="/invitados">Invitados</FooterLink>
              <FooterLink to="/patrocinadores">Patrocinadores</FooterLink>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold uppercase tracking-widest mb-6 text-primary">Legal</h3>
            <div className="flex flex-col space-y-3 text-sm">
              <FooterLink to="/privacidad">Política de Privacidad</FooterLink>
              <FooterLink to="/terminos">Términos y Condiciones</FooterLink>
              <FooterLink to="/preguntas-frecuentes">Preguntas Frecuentes</FooterLink>
              <FooterLink to="/mapa-del-sitio">Mapa del Sitio</FooterLink>
            </div>
          </div>

          {/* Contact & Info */}
          <div>
            <h3 className="text-lg font-bold uppercase tracking-widest mb-6 text-primary">Contacto</h3>
            <ul className="space-y-4 text-sm">
              {config?.contact_address && (
                <li className="flex items-start gap-3 text-white/70">
                  <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <span>{config.contact_address}</span>
                </li>
              )}
              {config?.contact_phone && (
                <li className="flex items-center gap-3 text-white/70">
                  <Phone size={18} className="text-primary flex-shrink-0" />
                  <a href={`tel:${config.contact_phone}`} className="hover:text-white transition-colors">{config.contact_phone}</a>
                </li>
              )}
              {config?.contact_email && (
                <li className="flex items-center gap-3 text-white/70">
                  <Mail size={18} className="text-primary flex-shrink-0" />
                  <a href={`mailto:${config.contact_email}`} className="hover:text-white transition-colors">{config.contact_email}</a>
                </li>
              )}
            </ul>
            
            <div className="mt-8 pt-6 border-t border-white/10">
               <div className="flex items-center gap-2 text-white/40 text-xs font-mono uppercase tracking-widest">
                  <Clock size={14} className="text-primary" />
                  <span>Versión: {versionData.version}</span>
               </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <div className="flex flex-col md:flex-row items-center gap-2 text-center md:text-left">
            <p>{siteName}&trade; {currentYear}. Todos los derechos reservados.</p>
            <span className="hidden md:inline">•</span>
            <p>
              Sitio creado por <a href="https://www.jegromanweb.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">www.jegromanweb.com</a>
            </p>
            <span className="hidden md:inline">•</span>
            <p className="font-bold uppercase tracking-widest opacity-60">
               {siteName}, ELIOS'S STUDIO {currentYear}
            </p>
          </div>
          <div className="flex gap-6 items-center">
            <Link to="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
            <Link to="/terminos" className="hover:text-white transition-colors">Términos</Link>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
              className="flex items-center gap-1 hover:text-white transition-colors text-primary font-bold uppercase tracking-widest ml-2"
              title="Volver Arriba"
            >
              TOP <ArrowUp size={14} className="mb-0.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer"
    aria-label={label}
    className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-background-dark transition-all hover:scale-110"
  >
    {icon}
  </a>
);

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <div>
    <Link to={to} className="text-white/60 hover:text-white hover:pl-2 transition-all block">
      {children}
    </Link>
  </div>
);

export default Footer;
