import { useState, useRef } from 'react';

export function useColorExtraction(imageUrl: string | null | undefined, defaultColor: string = '56, 118, 29') {
  const [dynamicRgb] = useState<string>(defaultColor);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return { dynamicRgb, canvasRef };
}
