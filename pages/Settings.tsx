import React, { useState, useEffect } from 'react';
import { Save, Upload, Building, FileText, CreditCard, Users, Trash2, Plus, Check, DollarSign, Database, MessageSquare, Download, Lock, User as UserIcon, Edit3, X, Shield, Printer, Mail, Link as LinkIcon } from 'lucide-react';
import { AppSettings, User } from '../types';
import { db } from '../firebase'; 
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';

const defaultSettings: AppSettings = {
    companyName: 'Bráma Studio',
    address: 'Calle 27 de Mayo Nro. 113',
    website: 'www.brama.com.bo',
    phone: '+591 70000000',
    primaryColor: '#162836', 
    pdfHeaderColor: '#162836',
    pdfSenderInfo: 'Bráma Studio\nCalle 27 de Mayo\nSanta Cruz\n+591 70000000',
    pdfFooterText: 'www.brama.com.bo • Calle 27 de Mayo Nro. 113',
    paymentInfo: 'Banco Ganadero\nCuenta: 123-45678-9\nTitular: Bráma Studio SRL\nNIT: 1234567015',
    termsAndConditions: '1. Validez de la oferta: 15 días calendario.\n\n2. Tiempo de entrega: A convenir según carga de trabajo.',
    currencySymbol: 'Bs',
    currencyName: 'Bolivianos',
    currencyPosition: 'before',
    decimals: 2,
    taxRate: 13,
    taxName: 'IVA',
    signatureName: 'Ariel Espinoza Heredia',
    signatureTitle: 'CEO PROPIETARIO'
};

const defaultUsers: User[] = [
    { id: '1', name: 'Admin Principal', email: 'admin@brama.com.bo', role: 'Admin', active: true, password: 'admin', permissions: ['all'] },
    { id: '2', name: 'Vendedor 1', email: 'ventas@brama.com.bo', role: 'Sales', active: true, password: 'ventas', permissions: ['sales', 'quotes'] },
];

export const Settings = () => {
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab');

    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('crm_settings');
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    const [users, setUsers] = useState<User[]>(() => {
        const savedUsers = localStorage.getItem('crm_users');
        return savedUsers ? JSON.parse(savedUsers) : defaultUsers;
    });

    const [activeTab, setActiveTab] = useState(initialTab === 'profile' ? 'profile' : 'company');
    const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    
    // User Mgmt State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [waToken, setWaToken] = useState(() => localStorage.getItem('crm_wa_token') || '');
    
    // Profile State
    const [myPassword, setMyPassword] = useState('');
    const [myConfirmPassword, setMyConfirmPassword] = useState('');

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab === 'general' ? 'company' : initialTab);
        }
    }, [initialTab]);

    // --- SYNC ---
    useEffect(() => {
        const fetchCloud = async () => {
             try {
                const sDoc = await getDoc(doc(db, 'crm_data', 'settings'));
                if (sDoc.exists()) setSettings({ ...defaultSettings, ...sDoc.data() as AppSettings });
                
                const uDoc = await getDoc(doc(db, 'crm_data', 'users'));
                if (uDoc.exists()) setUsers(uDoc.data().list);
             } catch(e) {}
        };
        fetchCloud();
    }, []);

    useEffect(() => {
        localStorage.setItem('crm_settings', JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('crm_users', JSON.stringify(users));
    }, [users]);

    // --- HANDLERS ---
    const handleChange = (field: keyof AppSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            localStorage.setItem('crm_settings', JSON.stringify(settings));
            localStorage.setItem('crm_users', JSON.stringify(users));
            localStorage.setItem('crm_wa_token', waToken);
            await setDoc(doc(db, 'crm_data', 'settings'), settings);
            await setDoc(doc(db, 'crm_data', 'users'), { list: users });
            setShowToast({ message: `Configuración guardada exitosamente`, type: 'success' });
        } catch(e) {
            setShowToast({ message: `Error al guardar en la nube`, type: 'error' });
        }
    };

    const handleImageUpload = (field: 'logoUrl' | 'qrCodeUrl' | 'signatureUrl', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange(field, reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // --- BACKUP ---
    const handleExportBackup = () => {
        const backupData = {
            settings: localStorage.getItem('crm_settings'),
            users: localStorage.getItem('crm_users'),
            clients: localStorage.getItem('crm_clients'),
            projects: localStorage.getItem('crm_projects'),
            quotes: localStorage.getItem('crm_quotes'),
            sales: localStorage.getItem('crm_sales_history'),
            inventory: localStorage.getItem('crm_inventory'),
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brama_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if(!confirm('ADVERTENCIA: Esto sobrescribirá todos los datos actuales. ¿Continuar?')) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if(data.settings) localStorage.setItem('crm_settings', data.settings);
                if(data.users) localStorage.setItem('crm_users', data.users);
                if(data.clients) localStorage.setItem('crm_clients', data.clients);
                if(data.projects) localStorage.setItem('crm_projects', data.projects);
                if(data.quotes) localStorage.setItem('crm_quotes', data.quotes);
                if(data.sales) localStorage.setItem('crm_sales_history', data.sales);
                if(data.inventory) localStorage.setItem('crm_inventory', data.inventory);
                window.location.reload();
            } catch (err) {
                alert('Archivo inválido.');
            }
        };
        reader.readAsText(file);
    };

    // --- USER MGMT ---
    const handleEditUser = (user: User) => {
        setEditingUser({ ...user, password: '' });
        setIsUserModalOpen(true);
    };

    const handleNewUser = () => {
        setEditingUser({ name: '', email: '', role: 'Sales', active: true, password: '', permissions: [] });
        setIsUserModalOpen(true);
    };

    const handleSaveUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser?.email || !editingUser.name) return;

        let updatedUsers = [...users];
        if (editingUser.id) {
            updatedUsers = users.map(u => {
                if (u.id === editingUser.id) {
                    return { ...u, ...editingUser, password: editingUser.password ? editingUser.password : u.password } as User;
                }
                return u;
            });
        } else {
            if (!editingUser.password) { alert("Debe establecer una contraseña"); return; }
            const newUser: User = {
                id: Math.random().toString(36).substr(2, 9),
                name: editingUser.name!,
                email: editingUser.email!,
                role: editingUser.role as any,
                active: editingUser.active ?? true,
                password: editingUser.password,
                permissions: editingUser.permissions || []
            };
            updatedUsers.push(newUser);
        }
        setUsers(updatedUsers);
        setIsUserModalOpen(false);
        setShowToast({ message: 'Usuario guardado', type: 'success' });
    };

    const handleDeleteUser = (id: string) => {
        if (confirm('¿Eliminar usuario?')) setUsers(users.filter(u => u.id !== id));
    };

    const togglePermission = (perm: string) => {
        if (!editingUser) return;
        const currentPerms = editingUser.permissions || [];
        setEditingUser({ 
            ...editingUser, 
            permissions: currentPerms.includes(perm) ? currentPerms.filter(p => p !== perm) : [...currentPerms, perm] 
        });
    };

    const handleChangeMyPassword = () => {
        if (myPassword !== myConfirmPassword) { setShowToast({ message: "No coinciden", type: 'error' }); return; }
        setShowToast({ message: "Contraseña actualizada", type: 'success' });
        setMyPassword(''); setMyConfirmPassword('');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 relative text-gray-900">
            {showToast && (
                <div className={`fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300`}>
                    <div className={`${showToast.type === 'success' ? 'bg-brand-900' : 'bg-red-600'} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3`}>
                        <div className="bg-white/20 rounded-full p-1"><Check size={16} className="text-white"/></div>
                        <div><h4 className="font-bold text-sm">{showToast.type === 'success' ? 'Éxito' : 'Error'}</h4><p className="text-xs opacity-90">{showToast.message}</p></div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración</h1>
                    <p className="text-sm text-gray-500">Administra el sistema</p>
                </div>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg active:scale-95">
                    <Save size={18} /> Guardar Cambios
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-64 space-y-1">
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Cuenta</p>
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-brand-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}><UserIcon size={18} /> Mi Perfil</button>
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6">Sistema</p>
                    {[
                        { id: 'company', icon: Building, label: 'Empresa' },
                        { id: 'pdf', icon: Printer, label: 'Documentos PDF' },
                        { id: 'users', icon: Users, label: 'Usuarios' },
                        { id: 'finance', icon: DollarSign, label: 'Finanzas' },
                        { id: 'integrations', icon: Database, label: 'Integraciones' },
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-brand-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                            <tab.icon size={18} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 space-y-6">
                    {/* PROFILE */}
                    {activeTab === 'profile' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2"><Lock size={20}/> Seguridad Personal</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label><input type="password" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none" value={myPassword} onChange={(e) => setMyPassword(e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirmar</label><input type="password" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none" value={myConfirmPassword} onChange={(e) => setMyConfirmPassword(e.target.value)} /></div>
                            </div>
                            <button onClick={handleChangeMyPassword} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 text-sm">Actualizar</button>
                        </div>
                    )}

                    {/* COMPANY */}
                    {activeTab === 'company' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Datos Generales</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label><input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl" value={settings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} /></div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Color Principal</label>
                                    <div className="flex gap-2"><input type="color" className="h-10 w-12 rounded cursor-pointer border-none" value={settings.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} /><input type="text" className="flex-1 px-4 py-2 border border-gray-200 rounded-xl" value={settings.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PDF RESTORED STRUCTURE */}
                    {activeTab === 'pdf' && (
                        <div className="space-y-6">
                            {/* HEADER SECTION */}
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6 flex items-center gap-2"><Building size={20}/> Estilo & Cabecera</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* LOGO */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Logo de la Empresa</label>
                                        <div className="flex flex-col gap-3">
                                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 h-32 relative overflow-hidden group">
                                                {settings.logoUrl ? <img src={settings.logoUrl} className="h-full object-contain" alt="Logo"/> : <div className="text-gray-400 flex flex-col items-center"><Upload size={24}/><span className="text-xs mt-2">Subir Imagen</span></div>}
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload('logoUrl', e)} />
                                            </div>
                                            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
                                                <LinkIcon size={14} className="text-gray-400"/>
                                                <input type="text" placeholder="O pegar URL de imagen..." className="flex-1 text-xs outline-none text-gray-700" value={settings.logoUrl || ''} onChange={(e) => handleChange('logoUrl', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    {/* COLORS & INFO */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Color Fondo Cabecera</label>
                                            <div className="flex gap-2">
                                                <input type="color" className="h-10 w-12 rounded cursor-pointer border-none" value={settings.pdfHeaderColor || settings.primaryColor} onChange={(e) => handleChange('pdfHeaderColor', e.target.value)} />
                                                <input type="text" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" value={settings.pdfHeaderColor || settings.primaryColor} onChange={(e) => handleChange('pdfHeaderColor', e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Información del Emisor (Derecha)</label>
                                            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-24 resize-none" value={settings.pdfSenderInfo} onChange={(e) => handleChange('pdfSenderInfo', e.target.value)} placeholder="Dirección, Teléfono, Ciudad..." />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BODY & FOOTER SECTION */}
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6 flex items-center gap-2"><FileText size={20}/> Contenido & Pie de Página</h2>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Términos y Condiciones</label>
                                            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-32" value={settings.termsAndConditions} onChange={(e) => handleChange('termsAndConditions', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Métodos de Pago / Banco</label>
                                            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-32" value={settings.paymentInfo} onChange={(e) => handleChange('paymentInfo', e.target.value)} />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Código QR (Pago/Info)</label>
                                            <div className="flex gap-4 items-center">
                                                <div className="h-20 w-20 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center relative overflow-hidden">
                                                    {settings.qrCodeUrl ? <img src={settings.qrCodeUrl} className="h-full object-contain"/> : <Upload size={20} className="text-gray-400"/>}
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload('qrCodeUrl', e)} />
                                                </div>
                                                <div className="flex-1">
                                                    <input type="text" placeholder="URL de la imagen..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs mb-1" value={settings.qrCodeUrl || ''} onChange={(e) => handleChange('qrCodeUrl', e.target.value)} />
                                                    <p className="text-[10px] text-gray-400">Aparecerá en el pie del documento.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Firma Digital</label>
                                            <div className="flex gap-4 items-center">
                                                <div className="h-20 w-32 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center relative overflow-hidden">
                                                    {settings.signatureUrl ? <img src={settings.signatureUrl} className="h-full object-contain"/> : <Upload size={20} className="text-gray-400"/>}
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload('signatureUrl', e)} />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <input type="text" placeholder="Nombre Firmante" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs" value={settings.signatureName} onChange={(e) => handleChange('signatureName', e.target.value)} />
                                                    <input type="text" placeholder="Cargo / Título" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs" value={settings.signatureTitle} onChange={(e) => handleChange('signatureTitle', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Texto Legal (Footer)</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={settings.pdfFooterText} onChange={(e) => handleChange('pdfFooterText', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* USERS */}
                    {activeTab === 'users' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                                <h2 className="text-lg font-bold text-gray-900">Usuarios del Sistema</h2>
                                <button onClick={handleNewUser} className="flex items-center gap-1 bg-brand-900 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-brand-800"><Plus size={16}/> Agregar</button>
                            </div>
                            <div className="space-y-3">
                                {users.map(u => (
                                    <div key={u.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-brand-300 transition-colors shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${u.active ? 'bg-brand-900' : 'bg-gray-400'}`}>{u.name.charAt(0)}</div>
                                            <div><p className="font-bold text-gray-900 flex items-center gap-2">{u.name} {!u.active && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactivo</span>}</p><p className="text-xs text-gray-500">{u.email} • {u.role}</p></div>
                                        </div>
                                        <div className="flex gap-2"><button onClick={() => handleEditUser(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={18}/></button><button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* FINANCE */}
                    {activeTab === 'finance' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Finanzas</h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Impuesto</label><input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl" value={settings.taxName} onChange={(e) => handleChange('taxName', e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tasa (%)</label><input type="number" className="w-full px-4 py-2 border border-gray-200 rounded-xl" value={settings.taxRate} onChange={(e) => handleChange('taxRate', Number(e.target.value))} /></div>
                            </div>
                        </div>
                    )}

                    {/* INTEGRATIONS RESTORED */}
                    {activeTab === 'integrations' && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Conexiones y Datos</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-5 bg-green-50 rounded-xl border border-green-100">
                                        <h3 className="font-bold text-green-800 flex items-center gap-2 mb-3"><MessageSquare size={18}/> WhatsApp API</h3>
                                        <input type="password" className="w-full px-3 py-2 border border-green-200 rounded-lg bg-white text-sm mb-2" placeholder="Token Meta Developers..." value={waToken} onChange={(e) => setWaToken(e.target.value)} />
                                        <p className="text-xs text-green-700">Token para envío automático de mensajes.</p>
                                    </div>
                                    <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
                                        <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-3"><Database size={18}/> Copia de Seguridad</h3>
                                        <div className="flex gap-2">
                                            <button onClick={handleExportBackup} className="flex-1 py-2 bg-white text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center justify-center gap-1"><Download size={14}/> Exportar</button>
                                            <label className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1 cursor-pointer"><Upload size={14}/> Restaurar <input type="file" className="hidden" accept=".json" onChange={handleImportBackup}/></label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* USER EDIT MODAL */}
            {isUserModalOpen && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
                            <h3 className="font-bold text-lg text-gray-900">{editingUser.id ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                            <button onClick={() => setIsUserModalOpen(false)}><X size={20} className="text-gray-500"/></button>
                        </div>
                        <form onSubmit={handleSaveUser} className="p-6 space-y-5 bg-white text-gray-900">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Nombre</label><input required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-brand-900 outline-none text-gray-900" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Rol</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-brand-900 outline-none text-gray-900" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}><option value="Sales">Vendedor</option><option value="Admin">Admin</option></select></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Email</label><input required type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-brand-900 outline-none text-gray-900" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} /></div>
                            
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1"><Shield size={12}/> Permisos</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={editingUser.permissions?.includes('delete_records')} onChange={() => togglePermission('delete_records')} className="rounded text-brand-900 focus:ring-brand-900" /> Eliminar Registros</label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={editingUser.permissions?.includes('view_reports')} onChange={() => togglePermission('view_reports')} className="rounded text-brand-900 focus:ring-brand-900" /> Ver Reportes</label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={editingUser.permissions?.includes('manage_settings')} onChange={() => togglePermission('manage_settings')} className="rounded text-brand-900 focus:ring-brand-900" /> Acceso Configuración</label>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1"><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">{editingUser.id ? 'Nueva Clave' : 'Clave'}</label><input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:border-brand-900 outline-none" placeholder={editingUser.id ? "Opcional" : "Requerido"} value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} required={!editingUser.id} /></div>
                                <div className="w-1/3"><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Estado</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:border-brand-900 outline-none" value={editingUser.active ? 'active' : 'inactive'} onChange={e => setEditingUser({...editingUser, active: e.target.value === 'active'})}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 mt-2">Guardar Usuario</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};