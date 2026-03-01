import React, { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const ValentineEffects: React.FC = () => {
  const { activeSeasonalTheme } = useTheme();

  useEffect(() => {
    if (activeSeasonalTheme !== 'valentine') return;

    const createHeart = () => {
      const heart = document.createElement('div');
      heart.classList.add('valentine-heart');
      heart.innerHTML = ['❤️', '💖', '💕', '💗', '💘', '🌹'][Math.floor(Math.random() * 6)];
      heart.style.left = Math.random() * 100 + 'vw';
      heart.style.animationDuration = Math.random() * 3 + 3 + 's';
      heart.style.fontSize = Math.random() * 1 + 0.5 + 'rem';
      
      document.body.appendChild(heart);

      setTimeout(() => {
        heart.remove();
      }, 6000);
    };

    const interval = setInterval(createHeart, 500); // Create a heart every 500ms

    return () => {
      clearInterval(interval);
      // Cleanup existing hearts
      document.querySelectorAll('.valentine-heart').forEach(el => el.remove());
    };
  }, [activeSeasonalTheme]);

  return null; // This component doesn't render anything visible itself
};
