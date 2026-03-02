import React from 'react';
import { Outlet } from 'react-router-dom';
import { GuestProvider } from '@/contexts/GuestContext';

// Re-export so existing imports from this file keep working
export { useGuest } from '@/contexts/GuestContext';

export const GuestLayout: React.FC = () => {
  return (
    <GuestProvider>
      <div className="min-h-screen flex flex-col bg-black">
        <main className="flex-grow">
          <Outlet />
        </main>
      </div>
    </GuestProvider>
  );
};
