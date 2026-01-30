import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Algo salió mal</h2>
            <p className="text-gray-500 text-sm mb-6">
              Ha ocurrido un error inesperado en este módulo. No te preocupes, tus datos están seguros.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg text-xs text-left font-mono text-gray-600 mb-6 overflow-auto max-h-32 border border-gray-200">
                {this.state.error?.message}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => window.location.reload()} 
                className="flex-1 flex items-center justify-center gap-2 bg-brand-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-brand-800 transition-colors"
              >
                <RefreshCw size={18} /> Recargar
              </button>
              <button 
                onClick={() => window.location.href = '/'} 
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                <Home size={18} /> Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}