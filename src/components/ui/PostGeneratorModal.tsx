
import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Copy, Check, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { getValidImageUrl } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { QRCodeCanvas } from 'qrcode.react';

interface NewsItem {
  id: string;
  title: string;
  slug?: string;
  content?: string;
  category: string;
  image_url: string;
  image_source?: string;
  image_source_url?: string;
  created_at: string;
}

interface PostGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  newsItem: NewsItem | null;
}

export function PostGeneratorModal({ isOpen, onClose, newsItem }: PostGeneratorModalProps) {
  const { config } = useSiteConfig();
  const previewRef = useRef<HTMLDivElement>(null);
  const [hashtags, setHashtags] = useState('');
  const [postText, setPostText] = useState('');
  const [tone, setTone] = useState<'Amigable' | 'Profesional' | 'Directo'>('Profesional');
  const [copied, setCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && newsItem) {
      // Generate Post Text based on Tone
      let intro = '';
      if (tone === 'Amigable') intro = '👋 ¡Hola comunidad! Miren lo que está pasando:';
      else if (tone === 'Profesional') intro = `📰 Actualización importante de ${config?.site_name || 'Antena Florida'}:`;
      else intro = '🚨 ÚLTIMA HORA:';

      const content = newsItem.content || '';
      const title = newsItem.title || 'Sin título';
      const generatedText = `${intro}\n\n${title}\n\n${content.substring(0, 150)}${content.length > 150 ? '...' : ''}\n\n📍 Haz clic en el enlace de mi perfil para más información o escanea el QR de esta noticia.`;
      setPostText(generatedText);
    }
  }, [isOpen, newsItem, tone]);

  useEffect(() => {
    if (isOpen && newsItem) {
      // 1. Get base hashtags from config
      const baseHashtags = config?.news_hashtags ? config.news_hashtags.split(/\s+/).filter(h => h.startsWith('#')) : [];
      
      // 2. Generate automatic hashtags from title and category
      const title = newsItem.title || '';
      const category = newsItem.category || '';
      const textToAnalyze = (title + ' ' + category.replace(/,/g, ' ')).toLowerCase();
      // Remove accents and special characters for better matching
      const cleanText = textToAnalyze.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const words = cleanText.split(/[^a-z0-9]/).filter(w => w.length > 4);
      
      // Common Spanish stop words to exclude
      const stopWords = ['desde', 'sobre', 'entre', 'hacia', 'hasta', 'donde', 'cuando', 'quien', 'porque', 'nuestro', 'vuestro', 'vuestra', 'nuestra', 'estamos', 'tienen', 'donde', 'habia', 'estos', 'estas', 'todos', 'todas', 'donde', 'luego', 'antes', 'despues'];
      
      const uniqueWords = [...new Set(words)]
        .filter(w => !stopWords.includes(w))
        .slice(0, 8); // Take up to 8 keywords from text
      
      const autoHashtags = uniqueWords.map(w => `#${w}`);
      
      // 3. Combine and limit to 13
      const combined = [...new Set([...baseHashtags, ...autoHashtags])].slice(0, 13);
      setHashtags(combined.join(' '));
    }
  }, [isOpen, newsItem, config]);

  const [previewScale, setPreviewScale] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Increased padding to ensure header visibility
        const paddingX = 48; 
        const paddingY = 120; // More vertical padding for title/close button
        const availableWidth = width - paddingX;
        const availableHeight = height - paddingY;
        
        // Calculate scale to fit within the container
        const scaleX = availableWidth / 1080;
        const scaleY = availableHeight / 1080;
        
        // Use the smaller scale to ensure it fits entirely
        const newScale = Math.min(scaleX, scaleY, 0.55); // Slightly reduced max scale
        
        setPreviewScale(newScale > 0 ? newScale : 0.3);
      }
    };

    if (isOpen) {
      updateScale();
      window.addEventListener('resize', updateScale);
      // Small delay to ensure layout is settled
      const timer = setTimeout(updateScale, 100);
      return () => {
        window.removeEventListener('resize', updateScale);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  if (!isOpen || !newsItem) return null;

  const handleCopyHashtags = () => {
    navigator.clipboard.writeText(hashtags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyText = () => {
    const fullText = `${postText}\n\n${hashtags}`;
    navigator.clipboard.writeText(fullText);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    
    setDownloading(true);
    try {
      // Dynamically import html2canvas
      const { default: html2canvas } = await import('html2canvas');

      // Use html2canvas with fixed configuration
      const canvas = await html2canvas(previewRef.current, {
        useCORS: true,
        scale: 2, // 2x scale results in 2160x2160 image (since base is 1080)
        backgroundColor: '#ffffff',
        logging: false,
        width: 1080,
        height: 1080,
        windowWidth: 1080,
        windowHeight: 1080,
        onclone: (clonedDoc) => {
          const element = clonedDoc.getElementById('post-preview-card');
          if (element) {
            // Ensure no transforms interfere
            element.style.transform = 'none';
            element.style.margin = '0';
          }
        }
      });
      
      const link = document.createElement('a');
      const safeTitle = (newsItem.title || 'post').substring(0, 30).replace(/\s+/g, '-');
      link.download = `post-${safeTitle}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Hubo un error al generar la imagen. Inténtalo de nuevo.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-auto max-w-[95vw] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Side: Controls */}
        <div className="w-full md:w-[400px] flex-shrink-0 p-6 flex flex-col gap-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Generar Post</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full" title="Cerrar modal" aria-label="Cerrar modal">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Tone Selector */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-white/60 uppercase tracking-widest mb-2">Tono del Texto</h3>
              <div className="flex gap-2">
                {(['Amigable', 'Profesional', 'Directo'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg border transition-all
                      ${tone === t 
                        ? 'bg-primary text-white border-primary' 
                        : 'bg-white dark:bg-white/5 text-slate-500 dark:text-white/60 border-slate-200 dark:border-white/10 hover:border-primary'}`}
                  >
                    {t}
                  </button>
                ))}
                </div>
              </div>

            {/* Generated Text */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-white/60 uppercase tracking-widest mb-2">Texto del Post</h3>
              <div className="relative">
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="w-full h-40 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none resize-none"
                  aria-label="Texto del post generado"
                  title="Texto del post"
                />
                <button 
                  onClick={handleCopyText}
                  className="absolute bottom-2 right-2 p-2 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-white/10 hover:text-primary transition-colors"
                  title="Copiar texto completo"
                >
                  {textCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-white/60 uppercase tracking-widest mb-2">Hashtags</h3>
              <div className="relative">
                <textarea
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  className="w-full h-24 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none resize-none"
                  aria-label="Hashtags generados"
                  title="Hashtags"
                />
                <button 
                  onClick={handleCopyHashtags}
                  className="absolute bottom-2 right-2 p-2 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-white/10 hover:text-primary transition-colors"
                  title="Copiar hashtags"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-3 bg-primary text-background-dark font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-background-dark"></span>
                ) : (
                  <>
                    <Download size={20} /> Descargar Imagen
                  </>
                )}
              </button>
            </div>

            <div className="text-xs text-slate-400 dark:text-white/40">
              <p>💡 Tip: La imagen se genera en alta resolución. Asegúrate de que la imagen original de la noticia tenga buena calidad.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Preview (Hidden but rendered for html2canvas) */}
        <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', visibility: 'visible' }}>
           {/* We keep the structure but hide it from user view. 
               However, for html2canvas to work, it must be in the DOM. 
               We position it absolute off-screen.
           */}
           <div 
             ref={containerRef} // Keep ref here for scaling logic if needed, though scaling might not matter if hidden
             style={{ position: 'relative' }}
           >
              <div 
                  ref={previewRef}
                  id="post-preview-card"
                  style={{
                    width: '1080px',
                    height: '1080px',
                    minWidth: '1080px',
                    minHeight: '1080px',
                    backgroundColor: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
              {/* --- NEW DESIGN STRUCTURE START --- */}
              
              {/* 1. FRANJA SUPERIOR (Encabezado) */}
              <div style={{ 
                width: '100%', 
                height: '140px', // Increased height for better visibility
                backgroundColor: '#ffffff', // Changed to White to match Brand Colors
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '0 48px',
                position: 'relative',
                zIndex: 10
              }}>
                {/* Left: Logo Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '8px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '16px',
                        backgroundColor: 'transparent'
                      }}>
                        <img 
                          src="/logowebestatico.jpg" 
                          alt="Logo" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          crossOrigin="anonymous"
                          onError={(e) => {
                             // Fallback to dynamic logo or placeholder if static file fails
                             if (config?.logo_url) {
                                e.currentTarget.src = config.logo_url;
                             } else {
                                e.currentTarget.style.display = 'none';
                             }
                          }}
                        />
                      </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {config?.site_name ? (
                         config.site_name.split(' ').map((word, i, arr) => (
                           <span key={i} style={{ 
                             fontSize: '42px', 
                             fontWeight: 900, 
                             color: i === arr.length - 1 ? '#F68B1F' : '#38761D',
                             letterSpacing: '-0.02em',
                             textTransform: 'uppercase',
                             fontStyle: 'italic',
                             lineHeight: 1
                           }}>
                             {word}
                           </span>
                         ))
                      ) : (
                        <><span style={{ fontSize: '42px', fontWeight: 900, color: '#38761D', letterSpacing: '-0.02em', textTransform: 'uppercase', fontStyle: 'italic' }}>ANTENA</span> <span style={{ fontSize: '42px', fontWeight: 900, color: '#F68B1F', letterSpacing: '-0.02em', textTransform: 'uppercase', fontStyle: 'italic' }}>FLORIDA</span></>
                      )}
                    </div>
                  </div>
                  <span style={{ 
                    color: '#38761D', 
                    fontSize: '14px', 
                    letterSpacing: '0.2em', 
                    textTransform: 'uppercase', 
                    fontWeight: 700,
                    marginLeft: '72px' 
                  }}>
                    {config?.slogan || 'LA SEÑAL QUE NOS UNE'}
                  </span>
                </div>

                {/* Right: QR Code Area */}
                <div style={{ 
                  position: 'absolute',
                  top: '0px',
                  right: '0px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  zIndex: 30
                }}>
                  <div style={{ 
                    padding: '20px', 
                    backgroundColor: 'white', 
                    borderBottomLeftRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '-4px 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <QRCodeCanvas 
                      value={`${window.location.origin}/noticias/${newsItem.slug || newsItem.id}`}
                      size={180}
                      level="H"
                      includeMargin={false}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  </div>
                </div>
              </div>

              {/* 2. IMAGEN PRINCIPAL (Centro) */}
              <div style={{ 
                position: 'relative', 
                width: '100%', 
                height: '560px', 
                backgroundColor: '#000',
                overflow: 'hidden',
                // Use background image for better html2canvas support (avoids distortion and tiling)
                backgroundImage: `url(${getValidImageUrl(newsItem.image_url, 'news', undefined, 1080, config)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}>
                {/* Hidden img to force CORS loading for html2canvas if needed, 
                    but main display is via background-image above. 
                    Actually, for background-image to work with CORS in html2canvas, 
                    sometimes it's tricky. 
                    However, usually useCORS:true handles it.
                    If we strictly want to avoid "double" rendering, we rely solely on background.
                */}
                {!newsItem.image_url && (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={128} className="text-slate-400" />
                  </div>
                )}
              </div>

              {/* 3. BARRAS DE ESTADO (Superpuestas) */}
              <div style={{ 
                position: 'relative', 
                marginTop: '-50px', // Overlap the image
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                zIndex: 20,
                width: '100%'
              }}>
                {/* Orange Bar */}
                <div style={{ 
                  backgroundColor: '#F68B1F',
                  padding: '12px 60px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1 // Fix line height for vertical centering
                }}>
                  <span style={{ 
                    color: 'white', 
                    fontSize: '32px', 
                    fontWeight: 900, 
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    lineHeight: 1, // Reset line height
                    paddingBottom: '4px' // Changed from paddingTop to paddingBottom to move text up
                  }}>
                    ÚLTIMA HORA
                  </span>
                </div>

                {/* Green Bar */}
                <div style={{ 
                  backgroundColor: '#38761D',
                  padding: '8px 40px', // Increased vertical padding slightly
                  marginTop: '0px', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1
                }}>
                  <span style={{ 
                    color: 'white', 
                    fontSize: '20px', 
                    fontWeight: 600,
                    lineHeight: 1,
                    paddingBottom: '2px' // Changed from paddingTop to paddingBottom to move text up
                  }}>
                    {format(new Date(newsItem.created_at), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>

              {/* 4. ÁREA DEL TITULAR (Fondo Blanco) */}
              <div style={{ 
                flex: 1, 
                backgroundColor: 'white', 
                padding: '40px 60px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <h1 style={{ 
                  fontSize: '56px', 
                  fontWeight: 900, 
                  lineHeight: 1.1, 
                  color: '#0f172a', 
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  maxWidth: '100%',
                  paddingBottom: '24px' // Significantly increased padding to move text up
                }}>
                  {newsItem.title}
                </h1>
              </div>

              {/* 5. FRANJA INFERIOR (Pie de página) */}
              <div style={{ 
                width: '100%', 
                height: '60px', 
                backgroundColor: '#38761D', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                paddingBottom: '12px' // Increased padding to move text up
              }}>
                <span style={{ 
                  color: 'white', 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  lineHeight: 1
                }}>
                  {window.location.hostname.toUpperCase()}
                </span>
              </div>
              
              {/* --- NEW DESIGN STRUCTURE END --- */}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
