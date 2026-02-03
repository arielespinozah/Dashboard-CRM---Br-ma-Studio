
import React, { useState, useEffect } from 'react';
import { PenTool, Lock, Mail, ArrowRight, RefreshCw, CheckCircle2, AlertTriangle, Smartphone, ArrowLeft } from 'lucide-react';
import { User } from '../types';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

interface LoginProps {
    onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    // Stage 1: Credentials
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [syncStatus, setSyncStatus] = useState<'loading' | 'success' | 'error'>('loading');
    
    // Stage 2: 2FA
    const [loginStep, setLoginStep] = useState<'credentials' | '2fa'>('credentials');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [tempUser, setTempUser] = useState<User | null>(null);
    
    // In-memory users list (SECURITY FIX: Do not store this in localStorage)
    const [fetchedUsers, setFetchedUsers] = useState<User[]>([]);
    
    // Dynamic Settings
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#162836');
    const [companyName, setCompanyName] = useState('Bráma Studio');

    const syncUsers = async () => {
        setSyncStatus('loading');
        localStorage.removeItem('crm_users');

        try {
            // Ensure Authentication exists before fetching
            if (!auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch(authErr) {
                    console.warn("Auth attempt failed in Login", authErr);
                    // Continue anyway, maybe rules allow public access or we handle error below
                }
            }

            // Fetch Users - Always prefer Cloud data
            const docRef = doc(db, 'crm_data', 'users');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const cloudUsers = docSnap.data().list as User[];
                if (cloudUsers && Array.isArray(cloudUsers) && cloudUsers.length > 0) {
                    setFetchedUsers(cloudUsers); 
                    console.log("Usuarios sincronizados (Seguro).");
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
        } catch (e: any) {
            console.error("Sync failed", e);
            if (e.code === 'permission-denied') {
                setError("Acceso denegado a la base de datos.");
            }
            setSyncStatus('error');
        }
    };

    useEffect(() => {
        syncUsers();
    }, []);

    const handleSubmitCredentials = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const users = fetchedUsers;
        if (users.length === 0) {
             // Fallback for demo/dev mode if no users in DB or sync failed
             // Allow a default admin if sync failed due to permissions/network (Prototype mode)
             if (email === 'admin@bramastudio.com' && password === 'admin123') {
                 const fallbackUser: User = {
                     id: 'admin-fallback',
                     name: 'Admin Local',
                     email: 'admin@bramastudio.com',
                     role: 'Admin',
                     active: true,
                     permissions: ['all']
                 };
                 completeLogin(fallbackUser);
                 return;
             }
             
             if (syncStatus === 'error') {
                 setError("Error de conexión. No se pueden validar credenciales.");
                 return;
             }
        }

        const foundUser = users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());

        if (foundUser) {
            if (foundUser.active) {
                if (foundUser.password && foundUser.password === password) {
                    // Password Correct
                    if (foundUser.twoFactorEnabled) {
                        // 2FA Challenge
                        const code = Math.floor(100000 + Math.random() * 900000).toString();
                        setGeneratedCode(code);
                        setTempUser(foundUser);
                        setLoginStep('2fa');
                        // SIMULATION: In a real app, this sends an email via backend.
                        setTimeout(() => {
                            alert(`SIMULACIÓN DE EMAIL (Seguridad):\n\nTu código de verificación es: ${code}\n\n(En producción, esto llegaría a ${foundUser.email})`);
                        }, 500);
                    } else {
                        // Direct Login
                        completeLogin(foundUser);
                    }
                } else {
                    setError('Contraseña incorrecta');
                }
            } else {
                setError('Usuario desactivado. Contacte al administrador.');
            }
        } else {
            setError('Usuario no encontrado.');
        }
    };

    const handleVerify2FA = (e: React.FormEvent) => {
        e.preventDefault();
        if (twoFactorCode === generatedCode && tempUser) {
            completeLogin(tempUser);
        } else {
            setError("Código incorrecto. Intente de nuevo.");
        }
    };

    const completeLogin = (userToLogin: User) => {
        const { password: _, ...safeUser } = userToLogin;
        onLogin(safeUser as User);
    };

    const handleResendCode = () => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(code);
        setError('');
        alert(`NUEVO CÓDIGO:\n\n${code}`);
    };

    return (
        <div className="h-[100dvh] md:min-h-screen flex items-center justify-center bg-white md:bg-[#f4f6f7] md:p-4">
            <div className="bg-white w-full h-full md:h-auto md:max-w-md p-8 md:rounded-3xl md:shadow-2xl md:border border-gray-100 relative overflow-hidden flex flex-col justify-center" style={{ boxShadow: `0 25px 50px -12px ${primaryColor}20` }}>
                {/* Sync Status Indicator */}
                <div className={`absolute top-0 left-0 w-full h-1 ${syncStatus === 'loading' ? 'bg-blue-500 animate-pulse' : syncStatus === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                
                {/* Header Section */}
                <div className="text-center mb-8 flex flex-col items-center">
                    {loginStep === '2fa' && (
                        <button onClick={() => { setLoginStep('credentials'); setError(''); }} className="absolute left-6 top-6 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                            <ArrowLeft size={20}/>
                        </button>
                    )}

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
                    <p className="text-gray-500 text-sm mt-2">
                        {loginStep === 'credentials' ? 'Ingresa a tu espacio de trabajo' : 'Verificación de Seguridad'}
                    </p>
                    
                    {loginStep === 'credentials' && (
                        <div className="flex justify-center items-center gap-2 mt-4 h-6">
                            {syncStatus === 'loading' && <span className="text-xs text-blue-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Sincronizando usuarios...</span>}
                            {syncStatus === 'success' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> Sistema conectado</span>}
                            {syncStatus === 'error' && (
                                <button onClick={syncUsers} className="text-xs text-red-500 flex items-center gap-1 hover:underline bg-red-50 px-2 py-0.5 rounded cursor-pointer">
                                    <AlertTriangle size={12}/> Error de conexión
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* FORM: CREDENTIALS */}
                {loginStep === 'credentials' ? (
                    <form onSubmit={handleSubmitCredentials} className="space-y-5 animate-in slide-in-from-left duration-300 w-full">
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

                        {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg border border-red-100">{error}</div>}

                        <button 
                            type="submit" 
                            disabled={syncStatus === 'loading'}
                            className={`w-full text-white py-3.5 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group ${syncStatus === 'loading' ? 'opacity-70 cursor-wait' : 'hover:opacity-90 active:scale-95'}`}
                            style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}40` }}
                        >
                            {syncStatus === 'loading' ? 'Cargando...' : 'Continuar'}
                            {syncStatus !== 'loading' && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>
                ) : (
                    /* FORM: 2FA */
                    <form onSubmit={handleVerify2FA} className="space-y-6 animate-in slide-in-from-right duration-300 w-full">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                            <Smartphone className="text-blue-600 flex-shrink-0" size={24}/>
                            <div>
                                <p className="text-sm text-blue-900 font-bold mb-1">Código de Verificación</p>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Hemos enviado un código de 6 dígitos a <strong>{email}</strong>.
                                </p>
                            </div>
                        </div>

                        <div>
                            <input 
                                type="text" 
                                maxLength={6}
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g,''))}
                                className="w-full text-center text-3xl tracking-[0.5em] font-mono py-4 border-b-2 border-gray-200 focus:border-brand-900 outline-none bg-transparent transition-all"
                                placeholder="000000"
                                autoFocus
                            />
                        </div>

                        {error && <div className="text-red-500 text-sm text-center font-bold">{error}</div>}

                        <button 
                            type="submit" 
                            className="w-full text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:opacity-90 active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Verificar y Entrar
                        </button>
                        
                        <div className="text-center">
                            <button type="button" onClick={handleResendCode} className="text-xs text-gray-500 hover:text-brand-900 underline">
                                ¿No recibiste el código? Reenviar
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>Desarrollado por {companyName}</p>
                </div>
            </div>
        </div>
    );
};
