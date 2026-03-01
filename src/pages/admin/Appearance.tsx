import { usePalette } from '@/contexts/PaletteContext';
import { Palette, Check } from 'lucide-react';

export default function Appearance() {
  const { palette, setPalette } = usePalette();

  const palettes = [
    { name: 'default', label: 'Predeterminada' },
    { name: 'green', label: 'Verde Inmersivo' },
  ];

  return (
    <div className="space-y-8">
      <div className="invisible h-0 overflow-hidden">
        <Palette className="text-primary" size={32} />
        <h1 className="text-3xl font-black tracking-tight text-foreground">Ajustes de Apariencia</h1>
      </div>

      <div className="bg-card p-6 rounded-lg border border-border">
        <h2 className="text-xl font-bold text-card-foreground mb-4">Paleta de Colores</h2>
        <p className="text-muted-foreground mb-6">Selecciona la paleta de colores principal para toda la web, incluido el panel de administración.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {palettes.map((p) => (
            <button
              key={p.name}
              onClick={() => setPalette(p.name as 'default' | 'green')}
              className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                palette === p.name ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
              }`}>
              <h3 className="font-bold text-lg text-card-foreground">{p.label}</h3>
              {p.name === 'default' && <p className="text-sm text-muted-foreground mt-1">La experiencia original de la radio.</p>}
              {p.name === 'green' && <p className="text-sm text-muted-foreground mt-1">Un tema inspirado en la naturaleza y la tranquilidad.</p>}
              {palette === p.name && (
                <div className="absolute top-3 right-3 bg-primary text-white rounded-full p-1">
                  <Check size={16} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
