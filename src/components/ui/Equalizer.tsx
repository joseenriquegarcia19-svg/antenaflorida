import React, { useEffect, useRef } from 'react';
import { usePlayer } from '@/hooks/usePlayer';

interface EqualizerProps {
  isPlaying: boolean;
  className?: string;
  color?: string;
}

export const Equalizer: React.FC<EqualizerProps> = ({ isPlaying, className = '', color = '#F08233' }) => {
  const { analyserNode, isBuffering: globalIsBuffering } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const heightsRef = useRef<number[]>(new Array(12).fill(4));
  const isPlayingRef = useRef(isPlaying);
  const analyserRef = useRef(analyserNode);
  const colorRef = useRef(color);
  const isBufferingRef = useRef(globalIsBuffering);

  // Sync refs so the persistent loop always reads latest values without restarting
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { analyserRef.current = analyserNode; }, [analyserNode]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { isBufferingRef.current = globalIsBuffering; }, [globalIsBuffering]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const BAR_COUNT = 12;
    const SPACING = 3;

    let isDrawing = true;

    const draw = () => {
      if (!isDrawing) return;

      const width = canvas.width;
      const height = canvas.height;
      if (!ctx || width === 0 || height === 0) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const barWidth = (width - (BAR_COUNT - 1) * SPACING) / BAR_COUNT;
      const playing = isPlayingRef.current;
      const analyser = analyserRef.current;
      const col = colorRef.current;
      const buffering = isBufferingRef.current;

      const drawBar = (x: number, barHeight: number, opacity: number = 1) => {
        const y = (height - barHeight) / 2;
        ctx.fillStyle = col;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
        ctx.globalAlpha = 1.0;
      };

      let requestsNextFrame = true;

      if (!playing) {
        // Draw flat bars — smoothly return heights to 4
        let isTotallyFlat = true;
        for (let i = 0; i < BAR_COUNT; i++) {
          heightsRef.current[i] = heightsRef.current[i] * 0.85 + 4 * 0.15;
          drawBar(i * (barWidth + SPACING), Math.max(4, heightsRef.current[i]), 0.5);
          if (heightsRef.current[i] > 4.1) {
            isTotallyFlat = false;
          }
        }
        // If entirely flat, stop the loop to save CPU
        if (isTotallyFlat) {
          requestsNextFrame = false;
        }
      } else if (buffering) {
        // Buffering state — slow horizontal wave to show "waiting" but active
        for (let i = 0; i < BAR_COUNT; i++) {
          const targetHeight = 6 + Math.sin(Date.now() * 0.005 + i * 0.5) * 4;
          heightsRef.current[i] = heightsRef.current[i] * 0.9 + targetHeight * 0.1;
          drawBar(i * (barWidth + SPACING), heightsRef.current[i], 0.3 + Math.sin(Date.now() * 0.01) * 0.2);
        }
      } else if (analyser) {
        // Real frequency data
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        let hasData = false;
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > 0) {
            hasData = true;
            break;
          }
        }

        if (hasData) {
          const usefulBins = Math.floor(dataArray.length * 0.6);
          const binsPerBar = Math.max(1, Math.floor(usefulBins / BAR_COUNT));

          for (let i = 0; i < BAR_COUNT; i++) {
            let sum = 0;
            for (let j = 0; j < binsPerBar; j++) {
              sum += dataArray[i * binsPerBar + j] || 0;
            }
            const avg = sum / binsPerBar;
            const v = avg / 255.0;
            const targetHeight = Math.max(4, v * height * 0.9);
            heightsRef.current[i] = heightsRef.current[i] * 0.6 + targetHeight * 0.4;
            drawBar(i * (barWidth + SPACING), heightsRef.current[i]);
          }
        } else {
          // Analyser exists but data is zero (CORS or stream limit) — synthetic animation
          for (let i = 0; i < BAR_COUNT; i++) {
            const targetHeight = 4 + Math.sin(Date.now() * 0.008 + i * 0.7) * 8 + Math.random() * 4;
            heightsRef.current[i] = heightsRef.current[i] * 0.8 + targetHeight * 0.2;
            drawBar(i * (barWidth + SPACING), heightsRef.current[i]);
          }
        }
      } else {
        // Playing but no analyser node — synthetic animation
        for (let i = 0; i < BAR_COUNT; i++) {
          const targetHeight = 4 + Math.sin(Date.now() * 0.008 + i * 0.7) * 8 + Math.random() * 4;
          heightsRef.current[i] = heightsRef.current[i] * 0.8 + targetHeight * 0.2;
          drawBar(i * (barWidth + SPACING), heightsRef.current[i]);
        }
      }

      if (requestsNextFrame) {
        animationRef.current = requestAnimationFrame(draw);
      } else {
        animationRef.current = 0; // Mark as stopped
      }
    };

    if (isPlaying || globalIsBuffering || animationRef.current === 0) {
      // Start or restart if playing/buffering, or if it was entirely stopped
      cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(draw);
    }

    return () => {
      isDrawing = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, globalIsBuffering]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={120}
      height={30}
    />
  );
};
