import React, { useState, useEffect } from 'react';
import { PenTool, Lock, Mail, ArrowRight, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
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
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    const syncUsers = async () => {
        setSyncStatus('loading');
        try {
            // Fetch Users
            const docRef = doc(db, 'crm_data', 'users');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const cloudUsers = docSnap.data().list as User[];
                if (cloudUsers && cloudUsers.length > 0) {
                    localStorage.setItem('crm_users', JSON.stringify(cloudUsers));
                }
            }

            // Fetch Settings for Logo
            const settingsRef = doc(db, 'crm_data', 'settings');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const s = settingsSnap.data();
                if(s.logoUrl) {
                    setLogoUrl(s.logoUrl);
                    localStorage.setItem('crm_settings', JSON.stringify(s));
                }
            } else {
                // Fallback to local
                const localSettings = localStorage.getItem('crm_settings');
                if (localSettings) {
                    const parsed = JSON.parse(localSettings);
                    if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
                }
            }

            setSyncStatus('success');
        } catch (e) {
            console.error("Sync failed", e);
            setSyncStatus('error');
        }
    };

    // Sync users from Cloud on mount
    useEffect(() => {
        syncUsers();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const storedUsers = localStorage.getItem('crm_users');
        let users: User[] = [];
        
        if (storedUsers) {
            users = JSON.parse(storedUsers);
        } else {
            users = [
                { id: '1', name: 'Admin Principal', email: 'admin@brama.com.bo', role: 'Admin', active: true },
                { id: '2', name: 'Vendedor 1', email: 'ventas@brama.com.bo', role: 'Sales', active: true }
            ];
            localStorage.setItem('crm_users', JSON.stringify(users));
        }

        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        let isAuthenticated = false;

        if (foundUser) {
            if (foundUser.active) {
                if (email === 'admin@brama.com.bo' && password === 'admin') isAuthenticated = true;
                else if (email === 'ventas@brama.com.bo' && password === 'ventas') isAuthenticated = true;
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
                
                <div className="text-center mb-8 flex flex-col items-center">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-24 w-auto object-contain mb-4" />
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-brand-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-900/30 mx-auto mb-4">
                                <PenTool size={32} />
                            </div>
                            <h1 className="text-2xl font-bold text-brand-900">Bráma Studio</h1>
                        </>
                    )}
                    <p className="text-gray-500 text-sm mt-2">Ingresa a tu espacio de trabajo</p>
                    
                    <div className="flex justify-center items-center gap-2 mt-4 h-6">
                        {syncStatus === 'loading' && <span className="text-xs text-blue-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Sincronizando usuarios...</span>}
                        {syncStatus === 'success' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> Base de datos conectada</span>}
                        {syncStatus === 'error' && (
                            <button onClick={syncUsers} className="text-xs text-red-500 flex items-center gap-1 hover:underline bg-red-50 px-2 py-0.5 rounded cursor-pointer">
                                <AlertTriangle size={12}/> Error de conexión. Reintentar
                            </button>
                        )}
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