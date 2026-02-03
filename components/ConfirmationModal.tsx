
import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean; // New prop
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  showCancel = true // Default true
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: { bg: 'bg-red-50', icon: 'text-red-600', button: 'bg-red-600 hover:bg-red-700', iconComponent: AlertTriangle },
    success: { bg: 'bg-green-50', icon: 'text-green-600', button: 'bg-green-600 hover:bg-green-700', iconComponent: CheckCircle2 },
    info: { bg: 'bg-blue-50', icon: 'text-brand-900', button: 'bg-brand-900 hover:bg-brand-800', iconComponent: CheckCircle2 }
  };

  const theme = colors[type];
  const Icon = theme.iconComponent;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${theme.bg} ${theme.icon}`}>
            <Icon size={28} />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {message}
          </p>

          <div className="flex gap-3 w-full">
            {showCancel && (
              <button 
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button 
              onClick={() => { onConfirm(); if(!showCancel) onClose(); }}
              className={`flex-1 py-3 px-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 ${theme.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
