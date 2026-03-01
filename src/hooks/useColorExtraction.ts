import { useState, useEffect, useRef } from 'react';
import { getValidImageUrl } from '@/lib/utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

export function useColorExtraction(imageUrl: string | null | undefined, defaultColor: string = '246, 139, 31') {
  const [dynamicRgb, setDynamicRgb] = useState<string>(defaultColor);
  const lastValidRgb = useRef<string>(defaultColor);
  const lastProcessedUrl = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { config } = useSiteConfig();

  useEffect(() => {
    if (!imageUrl) {
      setDynamicRgb(defaultColor);
      lastValidRgb.current = defaultColor;
      lastProcessedUrl.current = null;
      return;
    }

    if (imageUrl === lastProcessedUrl.current) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = getValidImageUrl(imageUrl, 'show', undefined, undefined, config);

    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 10;
      canvas.height = 10;
      ctx.drawImage(img, 0, 0, 10, 10);
      
      const data = ctx.getImageData(0, 0, 10, 10).data;
      let r = 0, g = 0, b = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      
      const totalPixels = data.length / 4;
      r = Math.floor(r / totalPixels);
      g = Math.floor(g / totalPixels);
      b = Math.floor(b / totalPixels);
      
      // Ensure vibrant accent for dark backgrounds
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 120) {
        const factor = 120 / Math.max(brightness, 1);
        r = Math.min(255, Math.floor(r * factor));
        g = Math.min(255, Math.floor(g * factor));
        b = Math.min(255, Math.floor(b * factor));
      }
      
      const newRgb = `${r}, ${g}, ${b}`;
      lastValidRgb.current = newRgb;
      lastProcessedUrl.current = imageUrl;
      setDynamicRgb(newRgb);
    };

    img.onerror = () => {
      console.warn('Failed to load image for color extraction:', imageUrl);
      setDynamicRgb(lastValidRgb.current);
    };
  }, [imageUrl, config, defaultColor]);

  return { dynamicRgb, canvasRef };
}
