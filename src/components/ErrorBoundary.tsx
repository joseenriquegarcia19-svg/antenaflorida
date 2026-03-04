import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import versionData from '../../version.json';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const ErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const { config } = useSiteConfig();
  const siteName = config?.site_name || 'Antena Florida';
  const slogan = config?.slogan || 'La señal que nos une';

  return (
    <div className="min-h-[300px] w-full flex flex-col items-center justify-center p-8 text-center transition-all animate-in fade-in zoom-in duration-500">
      <div className="mb-6 flex flex-col items-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center overflow-hidden bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex-shrink-0">
          <Logo className="w-full h-full object-contain scale-110" />
        </div>
        <div className="mt-4 flex flex-col items-center gap-1">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white" style={{ fontFamily: '"Montserrat", "Helvetica Neue", Arial, sans-serif' }}>
            {siteName}
          </h2>
          <p className="text-xs font-bold text-primary dark:text-primary/90 tracking-[0.15em] uppercase" style={{ fontFamily: '"Montserrat", "Helvetica Neue", Arial, sans-serif' }}>
            {slogan}
          </p>
        </div>
        <p className="text-[10px] font-mono text-slate-400 dark:text-white/40 uppercase tracking-widest mt-2">
          Estudios Elíos
        </p>
        <p className="text-[10px] font-mono text-slate-400 dark:text-white/30 mt-1">
          v{versionData.version}
        </p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
          Ups, algo no va bien
        </h3>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          Ha ocurrido un inconveniente al cargar esta sección. Estamos trabajando para solucionarlo.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onRetry}
          className="group flex items-center gap-2 px-6 py-2.5 bg-primary text-background-dark font-black tracking-widest uppercase text-xs rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/25"
        >
          <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
          Reintentar Carga
        </button>
      </div>
    </div>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }

    return this.props.children;
  }
}
