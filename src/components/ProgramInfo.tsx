import React from 'react';
import { useProgram } from '../layouts/ProgramLayout';
import { Clock, MapPin, Share2, Instagram, Facebook, Youtube, Music2, ExternalLink, Star, MessageSquare } from 'lucide-react';
import { XIcon } from '@/components/icons/XIcon';

const ProgramInfo: React.FC = () => {
  const { program, programColor, stats } = useProgram();

  if (!program) return null;

  const socialLinks = [
    { name: 'YouTube', icon: <Youtube size={20} />, url: program.social_links?.youtube },
    { name: 'TikTok', icon: <Music2 size={20} />, url: program.social_links?.tiktok },
    { name: 'Instagram', icon: <Instagram size={20} />, url: program.social_links?.instagram },
    { name: 'Twitter', icon: <XIcon size={20} />, url: program.social_links?.x },
    { name: 'Facebook', icon: <Facebook size={20} />, url: program.social_links?.facebook },
  ].filter(social => social.url);

  const youtubeUrl = program.social_links?.youtube;
  const hasYouTube = !!youtubeUrl;

  const liveLinks = [
    { name: 'YouTube Live', url: program.youtube_live_url, icon: <Youtube size={18} /> },
    { name: 'Facebook Live', url: program.facebook_live_url, icon: <Facebook size={18} /> },
    { name: 'Streaming', url: program.stream_url, icon: <ExternalLink size={18} /> },
  ].filter(link => link.url);

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-12 pt-0 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Description */}
        <div className="lg:col-span-2">
          <h3
            className="text-3xl font-black mb-8 border-b-2 pb-4 inline-block"
            style={{ borderColor: `${programColor}30` }}
          >
            Sobre el Programa
          </h3>
          <p className="text-lg text-white/60 leading-relaxed mb-10 max-w-2xl whitespace-pre-wrap">
            {program.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div
              className="p-8 bg-white/5 border border-white/10 rounded-[32px] transition-colors group"
              style={{ transition: 'border-color 0.3s', '--hover-border-color': `${programColor}50` } as React.CSSProperties}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = `var(--hover-border-color)`)}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = '')}
            >
              <Clock style={{ color: programColor }} className="mb-4 group-hover:scale-110 transition-transform" size={32} />
              <h4 className="detail-caps text-white/40 mb-2">Horario</h4>
              <p className="text-xl font-bold">
                {program.time} - {program.end_time}
              </p>
            </div>
            <div
              className="p-8 bg-white/5 border border-white/10 rounded-[32px] transition-colors group"
              style={{ transition: 'border-color 0.3s', '--hover-border-color': `${programColor}50` } as React.CSSProperties}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = `var(--hover-border-color)`)}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = '')}
            >
              <MapPin style={{ color: programColor }} className="mb-4 group-hover:scale-110 transition-transform" size={32} />
              <h4 className="detail-caps text-white/40 mb-2">Ubicación</h4>
              <p className="text-xl font-bold">Florida, USA</p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
              <div 
                className="size-12 rounded-xl flex items-center justify-center bg-amber-400/10 text-amber-400"
                style={{ backgroundColor: `${programColor}15`, color: programColor }}
              >
                <Star size={24} fill="currentColor" />
              </div>
              <div>
                <p className="text-2xl font-black">{stats.avgRating.toFixed(1)}</p>
                <p className="detail-caps text-white/40 !text-[10px]">Calificación</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
              <div 
                className="size-12 rounded-xl flex items-center justify-center bg-blue-400/10 text-blue-400"
                style={{ backgroundColor: `${programColor}15`, color: programColor }}
              >
                <MessageSquare size={24} fill="currentColor" />
              </div>
              <div>
                <p className="text-2xl font-black">{stats.messageCount}</p>
                <p className="detail-caps text-white/40 !text-[10px]">Mensajes</p>
              </div>
            </div>
          </div>

          {/* Live Transmissions Section */}
          {liveLinks.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-black mb-6 uppercase tracking-widest flex items-center gap-3">
                <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                Transmisión en Vivo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {liveLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold group"
                  >
                    <span style={{ color: programColor }} className="group-hover:scale-110 transition-transform">
                      {link.icon}
                    </span>
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Socials */}
        <div className="space-y-12">
          <div>
            <h3 className="text-xl font-black mb-6 uppercase tracking-widest">Síguenos</h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-12 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl flex items-center justify-center transition-all hover:-translate-y-1 shadow-lg group"
                  style={{ color: programColor }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = programColor;
                    e.currentTarget.style.color = '#000';
                    e.currentTarget.style.boxShadow = `0 10px 30px ${programColor}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                    e.currentTarget.style.color = programColor;
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>

            {hasYouTube && (
              <a
                href={`${youtubeUrl}?sub_confirmation=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex items-center justify-center gap-3 w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-600/20 active:scale-[0.98]"
              >
                <Youtube size={24} />
                Suscribirse a YouTube
              </a>
            )}
          </div>

          <div
            className="p-8 rounded-[40px] border shadow-2xl overflow-hidden relative"
            style={{
              background: `linear-gradient(to bottom right, ${programColor}20, ${programColor}05, transparent)`,
              borderColor: `${programColor}30`,
            }}
          >
            <div className="relative z-10">
              <Share2 style={{ color: programColor }} className="mb-6" size={40} />
              <h3 className="text-2xl font-black mb-4 tracking-tighter">Comparte la Experiencia</h3>
              <p className="text-sm text-white/60 mb-6 leading-relaxed">Invita a tus amigos a sintonizar Acompáñame Tonight y vivir una noche diferente.</p>
              <button
                className="w-full py-4 text-black font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                style={{ backgroundColor: programColor, boxShadow: `0 10px 20px ${programColor}30` }}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('¡Enlace copiado al portapapeles!');
                }}
              >
                Copiar Enlace
              </button>
            </div>
            
            {/* Background decoration */}
            <div 
              className="absolute -bottom-10 -right-10 size-40 blur-[60px] opacity-20"
              style={{ backgroundColor: programColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramInfo;
