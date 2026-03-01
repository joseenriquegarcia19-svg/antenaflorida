import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
      <SEO title="404 - Página no encontrada" />
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-bounce">
            <AlertTriangle size={48} className="text-primary" />
          </div>
        </div>
        
        <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-2">404</h1>
        <h2 className="text-2xl font-bold text-slate-700 dark:text-white/80 mb-6">Página no encontrada</h2>
        
        <p className="text-slate-600 dark:text-white/60 mb-8">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
          Por favor verifica la URL o regresa a la página de inicio.
        </p>
        
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-background-dark font-bold rounded-xl hover:brightness-110 transition-all shadow-lg hover:shadow-primary/20"
        >
          <Home size={20} />
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
