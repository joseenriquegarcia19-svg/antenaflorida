import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, RotateCw, Move, RotateCcw } from 'lucide-react';

export interface MediaConfig {
  x: number; // Percentage
  y: number; // Percentage
  scale: number;
  rotate: number; // Degrees
}

interface MediaManipulatorProps {
  src: string;
  type: 'image' | 'video';
  initialConfig?: MediaConfig;
  onSave: (config: MediaConfig) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export function MediaManipulator({ src, type, initialConfig, onSave, onCancel, aspectRatio }: MediaManipulatorProps) {
  const [config, setConfig] = useState<MediaConfig>(initialConfig || { x: 0, y: 0, scale: 1, rotate: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Stores mouse position in pixels
  const [initialDragConfig, setInitialDragConfig] = useState({ x: 0, y: 0 }); // Stores config x/y in % at start of drag
  
  const containerRef = useRef<HTMLDivElement>(null); // Ref to the container to get dimensions

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialDragConfig({ x: config.x, y: config.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const { offsetWidth, offsetHeight } = containerRef.current;
    
    // Convert pixel delta to percentage of the element's dimension
    // We limit precision to 2 decimal places to be clean
    const deltaXPercent = (deltaX / offsetWidth) * 100;
    const deltaYPercent = (deltaY / offsetHeight) * 100;
    
    setConfig(prev => ({
      ...prev,
      x: initialDragConfig.x + deltaXPercent,
      y: initialDragConfig.y + deltaYPercent
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setConfig({ x: 0, y: 0, scale: 1, rotate: 0 });
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setInitialDragConfig({ x: config.x, y: config.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const touch = e.touches[0];
    
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    
    const { offsetWidth, offsetHeight } = containerRef.current;
    
    const deltaXPercent = (deltaX / offsetWidth) * 100;
    const deltaYPercent = (deltaY / offsetHeight) * 100;
    
    setConfig(prev => ({
      ...prev,
      x: initialDragConfig.x + deltaXPercent,
      y: initialDragConfig.y + deltaYPercent
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Move size={20} className="text-primary" /> Ajustar Vista
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
              title="Resetear"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-red-500/20 rounded-full text-white/70 hover:text-red-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center cursor-move select-none p-8"
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleMouseUp}
        >
          {/* Reference Frame (Optional) */}
          <div className="absolute inset-0 pointer-events-none border-2 border-white/5 z-10 opacity-0"></div>

          <div 
            ref={containerRef}
            style={aspectRatio ? {
              aspectRatio: aspectRatio,
              width: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
            } : {
              transform: `translate(${config.x}%, ${config.y}%) rotate(${config.rotate}deg) scale(${config.scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              transformOrigin: 'center center'
            }}
            className={aspectRatio ? "relative overflow-hidden border-2 border-primary/50 shadow-2xl bg-black/50" : "relative inline-block"} 
          >
            {type === 'video' ? (
              <video 
                src={src} 
                className={aspectRatio ? "w-full h-full object-cover" : "max-w-none max-h-[60vh] md:max-h-[70vh] object-contain pointer-events-none"} 
                style={aspectRatio ? {
                  transform: `translate(${config.x}%, ${config.y}%) rotate(${config.rotate}deg) scale(${config.scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                } : {}}
                muted loop autoPlay 
              />
            ) : (
              <img 
                src={src} 
                alt="Manipulate" 
                className={aspectRatio ? "w-full h-full object-cover pointer-events-none" : "max-w-none max-h-[60vh] md:max-h-[70vh] object-contain pointer-events-none"}
                style={aspectRatio ? {
                  transform: `translate(${config.x}%, ${config.y}%) rotate(${config.rotate}deg) scale(${config.scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                } : {}}
              />
            )}
            
            {/* Grid Helper for Aspect Ratio Mode */}
            {aspectRatio && (
              <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="w-full h-full border border-white/20"></div>
                <div className="absolute top-1/2 left-0 w-full h-px bg-white/20"></div>
                <div className="absolute top-0 left-1/2 w-px h-full bg-white/20"></div>
              </div>
            )}
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-2 rounded-full text-white/70 text-xs pointer-events-none whitespace-nowrap z-20">
            Arrastra para mover • Usa los controles para zoom y rotar
          </div>
        </div>

        {/* Controls Footer */}
        <div className="p-6 bg-slate-800 border-t border-white/10 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-white/70 uppercase tracking-wider">
                <span className="flex items-center gap-1"><ZoomIn size={14} /> Zoom</span>
                <span>{config.scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={config.scale}
                onChange={(e) => setConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                className="w-full accent-primary h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Rotation Control */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-white/70 uppercase tracking-wider">
                <span className="flex items-center gap-1"><RotateCw size={14} /> Rotación</span>
                <span>{config.rotate}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={config.rotate}
                onChange={(e) => setConfig(prev => ({ ...prev, rotate: parseInt(e.target.value) }))}
                className="w-full accent-primary h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={() => onSave(config)}
            className="w-full py-3 bg-primary text-background-dark font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Check size={20} /> Guardar Vista
          </button>
        </div>
      </div>
    </div>
  );
}
