import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface GlobalVideoContextType {
  currentTime: number;
  registerVideo: (video: HTMLVideoElement) => void;
  unregisterVideo: (video: HTMLVideoElement) => void;
}

const GlobalVideoContext = createContext<GlobalVideoContextType | undefined>(undefined);

export const GlobalVideoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const videosRef = useRef<Set<HTMLVideoElement>>(new Set());
  const masterVideoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number>();

  const syncVideos = () => {
    if (masterVideoRef.current) {
      const time = masterVideoRef.current.currentTime;
      setCurrentTime(time);
      
      videosRef.current.forEach(video => {
        if (video !== masterVideoRef.current && Math.abs(video.currentTime - time) > 0.1) {
          video.currentTime = time;
        }
        if (masterVideoRef.current && !masterVideoRef.current.paused && video.paused) {
           video.play().catch(() => {});
        }
      });
    }
    rafRef.current = requestAnimationFrame(syncVideos);
  };

  const registerVideo = (video: HTMLVideoElement) => {
    videosRef.current.add(video);
    if (!masterVideoRef.current) {
      masterVideoRef.current = video;
      // Start loop if this is the first video
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(syncVideos);
      }
    } else {
      // Sync new video to master immediately
      video.currentTime = masterVideoRef.current.currentTime;
    }
  };

  const unregisterVideo = (video: HTMLVideoElement) => {
    videosRef.current.delete(video);
    if (masterVideoRef.current === video) {
      // Pick a new master if available
      const nextMaster = videosRef.current.values().next().value;
      masterVideoRef.current = nextMaster || null;
      if (!nextMaster && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <GlobalVideoContext.Provider value={{ currentTime, registerVideo, unregisterVideo }}>
      {children}
    </GlobalVideoContext.Provider>
  );
};

export const useGlobalVideoSync = () => {
  const context = useContext(GlobalVideoContext);
  if (!context) {
    throw new Error('useGlobalVideoSync must be used within a GlobalVideoProvider');
  }
  return context;
};