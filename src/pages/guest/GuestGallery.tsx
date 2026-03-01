import React, { useState, useEffect } from 'react';
import { useGuest } from '@/layouts/GuestLayout';
import { supabase } from '@/lib/supabase';
import { ImageIcon } from 'lucide-react';

const GuestGallery = () => {
  const { guest } = useGuest();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      if (!guest?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('gallery_guests')
        .select(`
          gallery (*)
        `)
        .eq('guest_id', guest.id);
      
      if (data) {
        setItems(data.map((item: any) => item.gallery).filter(Boolean));
      }
      setLoading(false);
    };
    fetchGallery();
  }, [guest?.id]);

  if (loading) return <div className="py-20 text-center text-white/40">Cargando galería...</div>;

  return (
    <div className="py-12 sm:py-20 animate-fade-in">
      <div className="flex items-end justify-between border-b border-white/10 pb-4 mb-8">
        <h3 className="text-3xl font-black uppercase tracking-tighter">Galería <span className="text-primary italic font-serif lowercase text-4xl">de imágenes</span></h3>
      </div>

      {items.length === 0 ? (
        <div className="py-20 bg-white/5 rounded-3xl border border-dashed border-white/20 text-center text-white/40 italic flex flex-col items-center gap-4">
          <ImageIcon size={48} className="opacity-20" />
          No hay imágenes en la galería actualmente.
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {items.map((item) => (
            <div key={item.id} className="relative group rounded-2xl overflow-hidden bg-white/5 border border-white/10 break-inside-avoid shadow-2xl">
              <img src={item.url} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110" alt={item.title || 'Galería'} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <span className="text-white text-xs font-bold uppercase tracking-widest">{item.title || 'Ver Imagen'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuestGallery;
