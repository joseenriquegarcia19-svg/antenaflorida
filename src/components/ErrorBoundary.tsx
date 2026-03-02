import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const ErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  return (
    <div className="min-h-[300px] w-full flex flex-col items-center justify-center p-8 text-center transition-all animate-in fade-in zoom-in duration-500">
      <div className="mb-6">
        <div className="w-24 h-24 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-white/10" />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
          Ups, algo no va bien
        </h2>
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
