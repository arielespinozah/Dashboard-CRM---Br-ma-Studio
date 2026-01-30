import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
    const navigate = useNavigate();
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#f4f6f7] p-4 text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6 text-gray-400">
                <FileQuestion size={48}/>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Página no encontrada</h2>
            <p className="text-gray-500 max-w-sm mb-8">La sección que buscas no existe o ha sido movida.</p>
            <button 
                onClick={() => navigate('/')} 
                className="flex items-center gap-2 bg-brand-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-800 transition-all active:scale-95"
            >
                <ArrowLeft size={20}/> Volver al Dashboard
            </button>
        </div>
    );
};