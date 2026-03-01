import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ProgramBottomMenu } from '@/components/ProgramBottomMenu';
import { MediaSlidingMenu } from '@/components/MediaSlidingMenu';
import { PlayerBar } from '@/components/PlayerBar';
import { usePlayer } from '@/hooks/usePlayer';
import { ProgramProvider, useProgram } from '@/contexts/ProgramContext';

// Re-export so existing imports from this file keep working
export { useProgram };
export { ProgramProvider };
// ProgramContext re-export for ProgramTeamPage
export { ProgramContext } from '@/contexts/ProgramContext';

const ProgramLayoutContent: React.FC = () => {
  const [isMediaMenuOpen, setIsMediaMenuOpen] = useState(false);
  const { currentTrack } = usePlayer();
  const { programColor } = useProgram();

  return (
    <>
      <main className="flex-grow">
        <Outlet />
      </main>
      
      {currentTrack && (
        <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] xl:bottom-0 z-[100] transition-all duration-300">
          <PlayerBar />
        </div>
      )}

      <ProgramBottomMenu
        programColor={programColor}
        onMediaClick={() => setIsMediaMenuOpen(true)}
      />
      <MediaSlidingMenu
        isOpen={isMediaMenuOpen}
        onClose={() => setIsMediaMenuOpen(false)}
        programColor={programColor}
      />
    </>
  );
};

export const ProgramLayout: React.FC = () => {
  return (
    <ProgramProvider>
      <ProgramLayoutContent />
    </ProgramProvider>
  );
};
