
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Image as ImageIcon, ZoomIn, X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { SEO } from '@/components/SEO';
import { useProgram } from '../../layouts/ProgramLayout';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  image_url: string;
}

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  images?: string[];
  created_at: string;
  tagged_members?: { team_member: TeamMember }[];
}

const ProgramGallery: React.FC = () => {
  const { program, programColor } = useProgram();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  const carouselSlides = items.flatMap(item => {
    const images = item.images && item.images.length > 0 ? item.images : [item.image_url];
    return images.map(img => ({
      ...item,
      display_image: img
    }));
  });

  useEffect(() => {
    if (program?.id) {
      fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      // First get team members for this show
      const { data: teamData } = await supabase
        .from('show_team_members')
        .select('team_member_id')
        .eq('show_id', program.id);

      const memberIds = teamData?.map(tm => tm.team_member_id) || [];

      if (memberIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Then get gallery items tagged with these members
      const { data, error } = await supabase
        .from('gallery')
        .select(`
          *,
          tagged_members:gallery_team_tags!inner(
            team_member:team_members(*)
          )
        `)
        .eq('active', true)
        .in('gallery_team_tags.team_member_id', memberIds)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetTimeout = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    resetTimeout();
    if (carouselSlides.length > 1) {
      timeoutRef.current = window.setTimeout(() => {
        setCurrentSlide((prev) => (prev === carouselSlides.length - 1 ? 0 : prev + 1));
      }, 5000);
    }
    return () => resetTimeout();
  }, [currentSlide, carouselSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === carouselSlides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? carouselSlides.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (selectedImage) {
      setLightboxIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedImage]);

  const lightboxImages = selectedImage?.images && selectedImage.images.length > 0 
    ? selectedImage.images 
    : (selectedImage?.image_url ? [selectedImage.image_url] : []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev === lightboxImages.length - 1 ? 0 : prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev === 0 ? lightboxImages.length - 1 : prev - 1));
      } else if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, lightboxImages.length]);

  const nextLightboxImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev === lightboxImages.length - 1 ? 0 : prev + 1));
  };

  const prevLightboxImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev === 0 ? lightboxImages.length - 1 : prev - 1));
  };

  return (
    <div className="text-white pt-0 p-4 font-['Plus_Jakarta_Sans']">
      <SEO title={`Galería - ${program?.title}`} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="serif-emphasis text-5xl sm:text-6xl mb-4" style={{ color: programColor }}>
            Momentos <span className="text-white">Inolvidables</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Un vistazo exclusivo a lo que sucede detrás de cámaras en {program?.title}.
          </p>
        </div>

        {/* Carousel */}
        {!loading && carouselSlides.length > 0 && (
          <div className="mb-16 relative rounded-3xl overflow-hidden aspect-video md:aspect-[21/9] shadow-2xl group border border-white/10">
            <div 
              className="w-full h-full whitespace-nowrap transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {carouselSlides.map((slide, idx) => (
                <div key={`${slide.id}-${idx}`} className="inline-block w-full h-full relative">
                  <img 
                    src={slide.display_image} 
                    alt={slide.title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 md:p-12 whitespace-normal">
                     <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">{slide.title}</h2>
                     <p className="text-white/80 max-w-2xl">{slide.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {carouselSlides.length > 1 && (
              <>
                <button 
                  onClick={prevSlide}
                  title="Anterior"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={nextSlide}
                  title="Siguiente"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight size={24} />
                </button>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {carouselSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      title={`Ver imagen ${idx + 1}`}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentSlide === idx ? 'w-6' : 'bg-white/50 hover:bg-white'
                      }`}
                      style={{ backgroundColor: currentSlide === idx ? programColor : undefined }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: programColor }}></div>
          </div>
        ) : items.length > 0 ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {items.map((item, idx) => (
              <div 
                key={item.id} 
                className="break-inside-avoid group relative rounded-2xl overflow-hidden cursor-zoom-in bg-white/5 animate-fade-in-up border border-white/5"
                style={{ animationDelay: `${idx * 100}ms` }}
                onClick={() => setSelectedImage(item)}
              >
                <img 
                  src={item.image_url} 
                  alt={item.title || 'Galería'} 
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {item.images && item.images.length > 1 && (
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 z-10">
                    <ImageIcon size={14} />
                    {item.images.length}
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  {item.title && (
                    <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                  )}
                  {item.description && (
                    <p className="text-white/80 text-sm line-clamp-2">{item.description}</p>
                  )}
                  <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                    <ZoomIn size={20} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <EmptyState
              icon={ImageIcon}
              title="Galería aún sin contenido"
              description="Acompáñanos pronto para ver las mejores imágenes de nuestro programa."
              actionLabel="Ver Otros Contenidos"
              actionLink="/acompaname-tonight/videos"
              programColor={programColor}
            />
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="min-h-full w-full flex flex-col items-center py-12 md:py-20 px-4">
            <button 
              onClick={() => setSelectedImage(null)}
              title="Cerrar"
              className="fixed top-6 right-6 p-2 text-white/50 hover:text-white transition-colors z-[110] bg-black/50 rounded-full backdrop-blur-md"
            >
              <X size={32} />
            </button>
            
            <div 
              className="relative max-w-7xl w-full flex flex-col items-center my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full flex items-center justify-center group/lightbox">
                <img 
                  src={lightboxImages[lightboxIndex]} 
                  alt={selectedImage.title} 
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl transition-all duration-300"
                />

                {lightboxImages.length > 1 && (
                  <>
                    <button 
                      onClick={prevLightboxImage}
                      title="Anterior"
                      className="absolute left-4 p-4 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all backdrop-blur-sm opacity-0 group-hover/lightbox:opacity-100"
                    >
                      <ChevronLeft size={32} />
                    </button>
                    <button 
                      onClick={nextLightboxImage}
                      title="Siguiente"
                      className="absolute right-4 p-4 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all backdrop-blur-sm opacity-0 group-hover/lightbox:opacity-100"
                    >
                      <ChevronRight size={32} />
                    </button>

                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/20 rounded-full backdrop-blur-md">
                      {lightboxImages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setLightboxIndex(idx)}
                          title={`Ver imagen ${idx + 1}`}
                          className={`w-2 h-2 rounded-full transition-all ${
                            lightboxIndex === idx ? 'w-6' : 'bg-white/30 hover:bg-white/60'
                          }`}
                          style={{ backgroundColor: lightboxIndex === idx ? programColor : undefined }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {(selectedImage.title || selectedImage.description || (selectedImage.tagged_members && selectedImage.tagged_members.length > 0)) && (
                <div className="mt-12 text-center max-w-2xl w-full">
                  {selectedImage.title && (
                    <h3 className="text-2xl font-bold text-white mb-2">{selectedImage.title}</h3>
                  )}
                  {selectedImage.description && (
                    <p className="text-white/70 mb-6">{selectedImage.description}</p>
                  )}
                  
                  {selectedImage.tagged_members && selectedImage.tagged_members.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-6 pt-6 border-t border-white/10">
                       {selectedImage.tagged_members.map(({ team_member }) => (
                         <div 
                           key={team_member.id} 
                           className="flex items-center gap-2 border px-3 py-1.5 rounded-full backdrop-blur-md transition-all group"
                           style={{ backgroundColor: `${programColor}20`, borderColor: `${programColor}40` }}
                         >
                            <div className="size-5 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                               {team_member.image_url ? (
                                 <img src={team_member.image_url} alt={team_member.name} className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-[8px] text-white font-bold">
                                    <User size={10} />
                                 </div>
                               )}
                            </div>
                            <span className="text-xs font-bold tracking-tight" style={{ color: programColor }}>{team_member.name}</span>
                            <span className="text-[10px] text-white/40 font-medium px-1.5 py-0.5 bg-white/5 rounded-full">{team_member.role}</span>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div 
              className="absolute inset-0 -z-10"
              onClick={() => setSelectedImage(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramGallery;
