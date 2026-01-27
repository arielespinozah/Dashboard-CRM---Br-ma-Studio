import React, { useState } from 'react';
import { PenTool, Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginProps {
    onLogin: (email: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // Simple auth simulation
        if (email === 'admin@brama.com.bo' && password === 'admin') {
            onLogin(email);
        } else if (email === 'ventas@brama.com.bo' && password === 'ventas') {
            onLogin(email);
        } else {
            setError('Credenciales incorrectas. Intenta: admin@brama.com.bo / admin');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f6f7] p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl shadow-brand-900/10 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-brand-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-900/30 mx-auto mb-4">
                        <PenTool size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-brand-900">Bráma Studio</h1>
                    <p className="text-gray-500 text-sm mt-2">Ingresa a tu espacio de trabajo</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 focus:border-transparent outline-none transition-all text-brand-900"
                                placeholder="nombre@brama.com.bo"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 focus:border-transparent outline-none transition-all text-brand-900"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="w-full bg-brand-900 text-white py-3.5 rounded-xl font-bold hover:bg-brand-800 transition-all shadow-lg shadow-brand-900/20 flex items-center justify-center gap-2 group"
                    >
                        Iniciar Sesión
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-gray-400">
                    © 2024 Bráma Studio System v2.0
                </div>
            </div>
        </div>
    );
};