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
    
    // Dynamic Settings
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#162836');
    const [companyName, setCompanyName] = useState('Bráma Studio');

    const syncUsers = async () => {
        setSyncStatus('loading');
        try {
            // Fetch Users - CRITICAL: Always prefer Cloud data
            const docRef = doc(db, 'crm_data', 'users');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const cloudUsers = docSnap.data().list as User[];
                if (cloudUsers && Array.isArray(cloudUsers) && cloudUsers.length > 0) {
                    localStorage.setItem('crm_users', JSON.stringify(cloudUsers));
                    console.log("Usuarios sincronizados desde la nube.");
                }
            } else {
                // Initial Seeding if DB is empty
                const local = localStorage.getItem('crm_users');
                if (!local) {
                    const defaultUsers = [
                        { id: '1', name: 'Admin Principal', email: 'admin@brama.com.bo', role: 'Admin', active: true, password: 'admin' }
                    ];
                    localStorage.setItem('crm_users', JSON.stringify(defaultUsers));
                }
            }

            // Fetch Settings
            const settingsRef = doc(db, 'crm_data', 'settings');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const s = settingsSnap.data();
                if(s.systemLogoUrl) setLogoUrl(s.systemLogoUrl);
                if(s.primaryColor) setPrimaryColor(s.primaryColor);
                if(s.companyName) setCompanyName(s.companyName);
                localStorage.setItem('crm_settings', JSON.stringify(s));
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
        
        try {
            if (storedUsers) {
                users = JSON.parse(storedUsers);
            }
        } catch(e) {
            setError("Error en datos locales. Recargue la página.");
            return;
        }

        const foundUser = users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
        let isAuthenticated = false;

        if (foundUser) {
            if (foundUser.active) {
                // Strict password check
                // NOTE: For production, passwords should be hashed (e.g., bcrypt) not plain text.
                if (foundUser.password && foundUser.password === password) {
                    isAuthenticated = true;
                } else {
                    setError('Contraseña incorrecta');
                }
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
            <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl border border-gray-100 relative overflow-hidden" style={{ boxShadow: `0 25px 50px -12px ${primaryColor}20` }}>
                {/* Sync Status Indicator */}
                <div className={`absolute top-0 left-0 w-full h-1 ${syncStatus === 'loading' ? 'bg-blue-500 animate-pulse' : syncStatus === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                
                <div className="text-center mb-8 flex flex-col items-center">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-24 w-auto object-contain mb-4" />
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto mb-4" style={{ backgroundColor: primaryColor }}>
                                <PenTool size={32} />
                            </div>
                            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>{companyName}</h1>
                        </>
                    )}
                    <p className="text-gray-500 text-sm mt-2">Ingresa a tu espacio de trabajo</p>
                    
                    <div className="flex justify-center items-center gap-2 mt-4 h-6">
                        {syncStatus === 'loading' && <span className="text-xs text-blue-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Sincronizando usuarios...</span>}
                        {syncStatus === 'success' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> Sistema conectado</span>}
                        {syncStatus === 'error' && (
                            <button onClick={syncUsers} className="text-xs text-red-500 flex items-center gap-1 hover:underline bg-red-50 px-2 py-0.5 rounded cursor-pointer">
                                <AlertTriangle size={12}/> Sin conexión. Usando datos locales.
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
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-gray-900"
                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                placeholder="nombre@empresa.com"
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
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-gray-900"
                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
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
                        className={`w-full text-white py-3.5 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group ${syncStatus === 'loading' ? 'opacity-70 cursor-wait' : 'hover:opacity-90 active:scale-95'}`}
                        style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}40` }}
                    >
                        {syncStatus === 'loading' ? 'Cargando...' : 'Iniciar Sesión'}
                        {syncStatus !== 'loading' && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>Desarrollado por {companyName}</p>
                </div>
            </div>
        </div>
    );
};