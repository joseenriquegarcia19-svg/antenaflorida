import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export interface Guest {
  id: string;
  name: string;
  role: string;
  bio: string;
  summary?: string;
  image_url: string;
  slug: string;
  website_url?: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
}

interface GuestContextType {
  guest: Guest | null;
  loading: boolean;
}

const GuestContext = createContext<GuestContextType | null>(null);

export const useGuest = () => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};

export const GuestProvider = ({ children }: { children: React.ReactNode }) => {
  const { slug } = useParams<{ slug: string }>();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuest = async () => {
      if (!slug) return;
      setLoading(true);
      const { data } = await supabase
        .from('guests')
        .select('*')
        .eq('slug', slug)
        .single();
      if (data) setGuest(data);
      setLoading(false);
    };
    fetchGuest();
  }, [slug]);

  return (
    <GuestContext.Provider value={{ guest, loading }}>
      {children}
    </GuestContext.Provider>
  );
};
