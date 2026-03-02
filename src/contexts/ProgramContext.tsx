import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Show } from '@/pages/ShowDetail';

interface ProgramContextType {
  program: Show | null;
  programColor: string;
  stats: { avgRating: number; messageCount: number };
}

export const ProgramContext = createContext<ProgramContextType | null>(null);

export const useProgram = () => {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgram must be used within a ProgramProvider');
  }
  return context;
};

// Helper to convert hex to space-separated RGB (Tailwind format)
const hexToRgbValues = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

export const ProgramProvider = ({ children }: { children: React.ReactNode }) => {
  const { slug } = useParams<{ slug: string }>();
  const [program, setProgram] = useState<Show | null>(null);
  const [stats, setStats] = useState({ avgRating: 0, messageCount: 0 });

  useEffect(() => {
    const fetchProgramData = async () => {
      if (!slug) return;
      
      const { data } = await supabase
        .from('shows')
        .select('*')
        .eq('slug', slug)
        .single();
      if (data) setProgram(data);
    };
    fetchProgramData();
  }, [slug]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!program?.id) return;
      
      const { data } = await supabase
        .from('show_comments')
        .select('rating')
        .eq('show_id', program.id)
        .eq('is_approved', true);

      if (data && data.length > 0) {
        const count = data.length;
        const sum = data.reduce((acc, curr) => acc + (curr.rating || 0), 0);
        setStats({
          avgRating: sum / count,
          messageCount: count
        });
      }
    };

    fetchStats();
  }, [program?.id]);

  const programColor = program?.color || '#38761D'; // Default to Green if not set
  const rgbValues = hexToRgbValues(programColor);

  return (
    <ProgramContext.Provider value={{ program, programColor, stats }}>
      <div 
        className="program-immersive-typography min-h-screen flex flex-col" 
        style={{ 
          '--program-color': programColor,
          '--color-primary': rgbValues
        } as React.CSSProperties}
      >
        {children}
      </div>
    </ProgramContext.Provider>
  );
};
