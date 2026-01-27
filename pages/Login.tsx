import React, { useState, useEffect } from 'react';
import { PenTool, Lock, Mail, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { User } from '../types';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface LoginProps {
    onLogin: (email: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [syncStatus, setSyncStatus] = useState<'loading' | 'success' | 'error'>('loading');

    // Sync users from Cloud on mount
    useEffect(() => {
        const syncUsers = async () => {
            try {
                const docRef = doc(db, 'crm_data', 'users');
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const cloudUsers = docSnap.data().list as User[];
                    if (cloudUsers && cloudUsers.length > 0) {
                        localStorage.setItem('crm_users', JSON.stringify(cloudUsers));
                    }
                }
                setSyncStatus('success');
            } catch (e) {
                setSyncStatus('error');
            }
        };
        
        syncUsers();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // 1. Get stored users (updated from cloud) or use defaults if empty
        const storedUsers = localStorage.getItem('crm_users');
        let users: User[] = [];
        
        if (storedUsers) {
            users = JSON.parse(storedUsers);
        } else {
            // Only set defaults if absolutely no users exist in storage and cloud fetch failed/empty
            users = [
                { id: '1', name: 'Admin Principal', email: 'admin@brama.com.bo', role: 'Admin', active: true },
                { id: '2', name: 'Vendedor 1', email: 'ventas@brama.com.bo', role: 'Sales', active: true }
            ];
            // Save defaults to persist them immediately
            localStorage.setItem('crm_users', JSON.stringify(users));
        }

        // 2. Find user
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        // 3. Auth Check
        let isAuthenticated = false;

        if (foundUser) {
            if (foundUser.active) {
                // Hardcoded check for default admins
                if (email === 'admin@brama.com.bo' && password === 'admin') isAuthenticated = true;
                else if (email === 'ventas@brama.com.bo' && password === 'ventas') isAuthenticated = true;
                // Generic check for custom users (Simulation: any password > 3 chars)
                // In a real app, you would verify hashed password here
                else if (password.length > 3) isAuthenticated = true; 
                else setError('Contraseña incorrecta');
            } else {
                setError('Usuario desactivado. Contacte al administrador.');
            }
        } else {
            setError('Usuario no encontrado.');
        }

        if (isAuthenticated) {
            onLogin(email);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f6f7] p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl shadow-brand-900/10 border border-gray-100 relative overflow-hidden">
                {/* Sync Status Indicator */}
                <div className={`absolute top-0 left-0 w-full h-1 ${syncStatus === 'loading' ? 'bg-blue-500 animate-pulse' : syncStatus === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-brand-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-900/30 mx-auto mb-4">
                        <PenTool size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-brand-900">Bráma Studio</h1>
                    <p className="text-gray-500 text-sm mt-2">Ingresa a tu espacio de trabajo</p>
                    
                    <div className="flex justify-center items-center gap-2 mt-4">
                        {syncStatus === 'loading' && <span className="text-xs text-blue-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Sincronizando usuarios...</span>}
                        {syncStatus === 'success' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> Base de datos conectada</span>}
                    </div>
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
                        disabled={syncStatus === 'loading'}
                        className={`w-full bg-brand-900 text-white py-3.5 rounded-xl font-bold hover:bg-brand-800 transition-all shadow-lg shadow-brand-900/20 flex items-center justify-center gap-2 group ${syncStatus === 'loading' ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {syncStatus === 'loading' ? 'Cargando...' : 'Iniciar Sesión'}
                        {syncStatus !== 'loading' && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>Credenciales por defecto:</p>
                    <p>admin@brama.com.bo / admin</p>
                </div>
            </div>
        </div>
    );
};