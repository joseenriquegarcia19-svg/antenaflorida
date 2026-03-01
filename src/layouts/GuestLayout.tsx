import React from 'react';
import { Outlet } from 'react-router-dom';
import { PlayerBar } from '@/components/PlayerBar';
import { usePlayer } from '@/hooks/usePlayer';
import { GuestProvider } from '@/contexts/GuestContext';

// Re-export so existing imports from this file keep working
export { useGuest } from '@/contexts/GuestContext';

export const GuestLayout: React.FC = () => {
  const { currentTrack } = usePlayer();

  return (
    <GuestProvider>
      <div className="min-h-screen flex flex-col bg-black">
        <main className="flex-grow">
          <Outlet />
        </main>
        
        {currentTrack && (
          <div className="sticky bottom-0 z-[100]">
            <PlayerBar />
          </div>
        )}
      </div>
    </GuestProvider>
  );
};
