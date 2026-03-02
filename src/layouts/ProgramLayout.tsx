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
  const { currentTrack, isPlayerCollapsed } = usePlayer();
  const { programColor } = useProgram();

  return (
    <>
      <main className="flex-grow">
        <Outlet />
      </main>
      
      <div
        id="player-expanded-wrapper"
        className={`fixed bottom-0 left-0 right-0 z-[100] pointer-events-none pb-[calc(104px+env(safe-area-inset-bottom))] xl:pb-12 transition-all duration-500 ${
          currentTrack
            ? isPlayerCollapsed
              ? 'translate-y-4 shadow-none'
              : 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 invisible'
        }`}
      >
        <PlayerBar />
      </div>

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
