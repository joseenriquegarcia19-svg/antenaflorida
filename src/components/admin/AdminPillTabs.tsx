import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: any; // Using any to support string or union types from various pages
  label: string;
  icon?: LucideIcon;
  badge?: number;
}

interface AdminPillTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: any) => void;
  className?: string;
}

export function AdminPillTabs({ tabs, activeTab, onTabChange, className = '' }: AdminPillTabsProps) {
  return (
    <div className={`flex items-center p-1 bg-slate-100/50 dark:bg-white/5 rounded-full w-fit mb-6 overflow-x-auto no-scrollbar max-w-full gap-1 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap
              ${isActive 
                ? 'bg-white dark:bg-primary/20 text-primary shadow-sm scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-700 dark:text-white/60 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }
            `}
          >
            {Icon && <Icon size={18} className={isActive ? 'text-primary' : ''} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`
                flex items-center justify-center size-5 rounded-full text-[10px] font-black min-w-[20px]
                ${isActive ? 'bg-primary text-white shadow-sm' : 'bg-red-500 text-white animate-pulse'}
              `}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
