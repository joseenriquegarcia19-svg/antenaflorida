import React from 'react';
import { useGuest } from '@/layouts/GuestLayout';

const GuestBio = () => {
  const { guest } = useGuest();
  if (!guest) return null;

  return (
    <div className="py-12 sm:py-20 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
        <div className="md:col-span-1 sticky top-32">
          <h3 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">
            Sobre <br /><span className="text-primary italic font-serif lowercase text-5xl">el invitado</span>
          </h3>
          <div className="flex items-center gap-3 text-white/40 font-bold uppercase text-[10px] tracking-widest">
            <div className="size-1.5 rounded-full bg-primary" />
            <span>Biografía Oficial</span>
          </div>
        </div>
        <div className="md:col-span-2 space-y-6">
            {guest.bio.split('\n').filter(Boolean).map((paragraph, i) => (
              <p
                key={i}
                className={`leading-relaxed text-white/90 ${
                  i === 0
                    ? 'text-xl sm:text-2xl font-light first-letter:text-6xl first-letter:font-black first-letter:text-primary first-letter:mr-3 first-letter:float-left'
                    : 'text-lg sm:text-xl font-light text-white/70'
                }`}
              >
                {paragraph}
              </p>
            ))}
          </div>
      </div>
    </div>
  );
};

export default GuestBio;
