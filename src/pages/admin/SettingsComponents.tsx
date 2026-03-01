import React, { ChangeEvent } from 'react';
import { LucideIcon } from 'lucide-react';

interface BaseFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
}

export const InputField = ({ 
  label, 
  name, 
  value, 
  onChange, 
  type = 'text', 
  placeholder = '' 
}: BaseFieldProps & { type?: string }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-bold text-foreground mb-2">{label}</label>
    <input 
      id={name} 
      name={name} 
      type={type} 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary-orange" 
    />
  </div>
);

export const TextareaField = ({ 
  label, 
  name, 
  value, 
  onChange, 
  rows = 3, 
  placeholder = '' 
}: BaseFieldProps & { rows?: number }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-bold text-foreground mb-2">{label}</label>
    <textarea 
      id={name} 
      name={name} 
      value={value} 
      onChange={onChange} 
      rows={rows} 
      placeholder={placeholder} 
      className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary-orange" 
    />
  </div>
);

export const CheckboxField = ({ 
  label, 
  name, 
  checked, 
  onChange 
}: { 
  label: string; 
  name: string; 
  checked: boolean; 
  onChange: (e: ChangeEvent<HTMLInputElement>) => void 
}) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <input 
      type="checkbox" 
      name={name} 
      checked={checked} 
      onChange={onChange} 
      className="w-5 h-5 rounded border-border text-primary focus:ring-primary" 
    />
    <span className="text-sm font-bold text-foreground">{label}</span>
  </label>
);

export const TabButton = <T extends string>({ 
  name, 
  label, 
  icon: Icon, 
  activeTab, 
  setActiveTab 
}: { 
  name: T; 
  label: string; 
  icon: LucideIcon; 
  activeTab: T; 
  setActiveTab: (name: T) => void 
}) => {
  return (
    <button 
      type="button" 
      onClick={() => setActiveTab(name)} 
      className={`w-full text-left px-4 py-2 rounded-md flex items-center gap-3 transition-colors ${activeTab === name ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/50'}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
};

export const SelectField = ({ 
  label, 
  name, 
  value, 
  onChange, 
  options, 
  optionLabels 
}: { 
  label: string; 
  name: string; 
  value: string; 
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void; 
  options: string[]; 
  optionLabels?: Record<string, string> 
}) => (
  <div>
    <label htmlFor={name} className="block text-sm font-bold text-foreground mb-2">{label}</label>
    <select 
      id={name} 
      name={name} 
      value={value} 
      onChange={onChange} 
      className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary-orange"
    >
      {options.map(option => (
        <option key={option} value={option}>
          {optionLabels ? optionLabels[option] : option}
        </option>
      ))}
    </select>
  </div>
);

export const ColorField = ({ 
  label, 
  name, 
  value, 
  onChange 
}: BaseFieldProps) => (
  <div>
    <label htmlFor={name} className="block text-sm font-bold text-foreground mb-2">{label}</label>
    <div className="flex items-center gap-2">
      <input 
        id={name} 
        name={name} 
        type="color" 
        value={value} 
        onChange={onChange} 
        className="w-10 h-10 p-0 border-none rounded-md cursor-pointer" 
      />
      <input 
        type="text" 
        value={value} 
        onChange={onChange} 
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary-orange" 
        aria-label={`Código de color para ${label}`} 
      />
    </div>
  </div>
);
export const RangeField = ({ 
  label, 
  name, 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  unit = '' 
}: { 
  label: string; 
  name: string; 
  value: number; 
  onChange: (e: ChangeEvent<HTMLInputElement>) => void; 
  min?: number; 
  max?: number; 
  step?: number; 
  unit?: string; 
}) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label htmlFor={name} className="block text-sm font-bold text-foreground">{label}</label>
      <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
        {value}{unit}
      </span>
    </div>
    <input 
      id={name} 
      name={name} 
      type="range" 
      min={min} 
      max={max} 
      step={step} 
      value={value} 
      onChange={onChange} 
      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" 
    />
  </div>
);
