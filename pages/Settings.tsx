import React, { useState, useEffect } from 'react';
import { Save, Upload, Building, Palette, FileText, CreditCard, Users, Shield, Trash2, Plus, Check, DollarSign, Percent, Globe, Database } from 'lucide-react';
import { AppSettings, User } from '../types';
import { app } from '../firebase'; // Import firebase app to check connection

const defaultSettings: AppSettings = {
    companyName: 'Bráma Studio',
    address: 'Calle 27 de Mayo Nro. 113, Santa Cruz, Bolivia',
    website: 'www.brama.com.bo',
    phone: '+591 70000000',
    primaryColor: '#162836', 
    paymentInfo: 'Banco Ganadero\nCuenta: 123-45678-9\nTitular: Bráma Studio SRL\nNIT: 1234567015',
    termsAndConditions: '1. Validez de la oferta: 15 días calendario.\n2. Tiempo de entrega: A convenir según carga de trabajo.',
    currencySymbol: 'Bs',
    currencyName: 'Bolivianos',
    currencyPosition: 'before',
    decimals: 2,
    taxRate: 13,
    taxName: 'IVA'
};

const defaultUsers: User[] = [
    { id: '1', name: 'Admin Principal', email: 'admin@brama.com.bo', role: 'Admin', active: true },
    { id: '2', name: 'Vendedor 1', email: 'ventas@brama.com.bo', role: 'Sales', active: true },
];

export const Settings = () => {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [users, setUsers] = useState<User[]>(defaultUsers);
    const [activeTab, setActiveTab] = useState('company');
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Sales' });
    const [firebaseStatus, setFirebaseStatus] = useState<'Checking' | 'Connected' | 'Error'>('Checking');

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('crm_settings');
        if (saved) setSettings(JSON.parse(saved));
        
        const savedUsers = localStorage.getItem('crm_users');
        if (savedUsers) setUsers(JSON.parse(savedUsers));

        // Check Firebase
        try {
            if (app) {
                setFirebaseStatus('Connected');
            } else {
                setFirebaseStatus('Error');
            }
        } catch (e) {
            setFirebaseStatus('Error');
        }
    }, []);

    const handleChange = (field: keyof AppSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        localStorage.setItem('crm_settings', JSON.stringify(settings));
        localStorage.setItem('crm_users', JSON.stringify(users));
        // Force a reload of settings in other tabs/components event dispatch could be better but this is simple
        window.dispatchEvent(new Event('storage'));
        alert('Configuración guardada exitosamente.');
    };

    const handleImageUpload = (field: 'logoUrl' | 'qrCodeUrl', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange(field, reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        const user: User = {
            id: Math.random().toString(36).substr(2, 9),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role as any,
            active: true
        };
        const updatedUsers = [...users, user];
        setUsers(updatedUsers);
        // Save immediately to ensure login works
        localStorage.setItem('crm_users', JSON.stringify(updatedUsers));
        setNewUser({ name: '', email: '', role: 'Sales' });
        alert(`Usuario ${newUser.email} creado. Contraseña por defecto para demo: 123456`);
    };

    const handleDeleteUser = (id: string) => {
        if (confirm('¿Eliminar usuario?')) {
            const updatedUsers = users.filter(u => u.id !== id);
            setUsers(updatedUsers);
            localStorage.setItem('crm_users', JSON.stringify(updatedUsers));
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ajustes del Sistema</h1>
                    <p className="text-sm text-gray-500">Personaliza tu CRM, documentos y seguridad</p>
                </div>
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg shadow-brand-900/20 transition-all active:scale-95"
                >
                    <Save size={18} /> Guardar Cambios
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 space-y-1">
                    {[
                        { id: 'company', icon: Building, label: 'Perfil Empresa' },
                        { id: 'branding', icon: Palette, label: 'Marca & Logo' },
                        { id: 'finance', icon: DollarSign, label: 'Finanzas & Impuestos' },
                        { id: 'pdf', icon: FileText, label: 'Documentos PDF' },
                        { id: 'payment', icon: CreditCard, label: 'Pagos & QR' },
                        { id: 'users', icon: Users, label: 'Usuarios & Roles' },
                        { id: 'integrations', icon: Database, label: 'Integraciones' },
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-brand-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <tab.icon size={18} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 space-y-6">
                    
                    {/* COMPANY PROFILE */}
                    {activeTab === 'company' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Información de la Empresa</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                                    <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none text-gray-900 bg-white" 
                                        value={settings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Completa</label>
                                    <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none text-gray-900 bg-white" 
                                        value={settings.address} onChange={(e) => handleChange('address', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Web</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none text-gray-900 bg-white" 
                                            value={settings.website} onChange={(e) => handleChange('website', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none text-gray-900 bg-white" 
                                            value={settings.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BRANDING */}
                    {activeTab === 'branding' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Identidad Visual</h2>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo de la Empresa</label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative overflow-hidden group">
                                        {settings.logoUrl ? (
                                            <img src={settings.logoUrl} alt="Logo" className="h-20 object-contain mb-2" />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-2">
                                                <Upload size={24} />
                                            </div>
                                        )}
                                        <span className="text-sm text-brand-600 font-medium cursor-pointer">Subir imagen</span>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG (Max 2MB)</p>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload('logoUrl', e)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Color Principal (Corporate)</label>
                                    <div className="flex gap-3 items-center">
                                        <input type="color" className="w-12 h-12 rounded-lg cursor-pointer border-none" 
                                            value={settings.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} />
                                        <input type="text" className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none text-gray-900 bg-white uppercase" 
                                            value={settings.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Define el color base para toda la interfaz.</p>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* FINANCE */}
                    {activeTab === 'finance' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Configuración Financiera</h2>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Moneda Principal</label>
                                    <select 
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none"
                                        value={settings.currencySymbol}
                                        onChange={(e) => handleChange('currencySymbol', e.target.value)}
                                    >
                                        <option value="Bs">Bolivianos (Bs)</option>
                                        <option value="$us">Dólares Americanos ($us)</option>
                                        <option value="€">Euros (€)</option>
                                        <option value="MXN">Pesos Mexicanos (MXN)</option>
                                        <option value="COP">Pesos Colombianos (COP)</option>
                                        <option value="CLP">Pesos Chilenos (CLP)</option>
                                        <option value="ARS">Pesos Argentinos (ARS)</option>
                                        <option value="S/">Soles Peruanos (S/)</option>
                                        <option value="Gs">Guaraníes (Gs)</option>
                                    </select>
                                </div>
                                
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Posición del Símbolo</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="pos" checked={settings.currencyPosition === 'before'} onChange={() => handleChange('currencyPosition', 'before')} className="text-brand-900" />
                                            <span className="text-sm">Antes ($ 100)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="pos" checked={settings.currencyPosition === 'after'} onChange={() => handleChange('currencyPosition', 'after')} className="text-brand-900" />
                                            <span className="text-sm">Después (100 €)</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Impuesto</label>
                                    <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none" 
                                        placeholder="Ej: IVA, RUT, TAX, IGV"
                                        value={settings.taxName} onChange={(e) => handleChange('taxName', e.target.value)} />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tasa de Impuesto (%)</label>
                                    <div className="relative">
                                        <input type="number" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none" 
                                            value={settings.taxRate} onChange={(e) => handleChange('taxRate', Number(e.target.value))} />
                                        <Percent size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Decimales</label>
                                    <select 
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none"
                                        value={settings.decimals}
                                        onChange={(e) => handleChange('decimals', Number(e.target.value))}
                                    >
                                        <option value={0}>0 (Sin decimales)</option>
                                        <option value={2}>2 (Estándar)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PDF DOCS */}
                    {activeTab === 'pdf' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Configuración de PDF</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Términos y Condiciones (Pie de Página)</label>
                                <textarea 
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none text-gray-900 bg-white text-sm h-40 resize-none"
                                    placeholder="Ingrese los términos que aparecerán en todas las cotizaciones..."
                                    value={settings.termsAndConditions}
                                    onChange={(e) => handleChange('termsAndConditions', e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-2">Se recomienda incluir validez de oferta y tiempos de entrega.</p>
                            </div>
                        </div>
                    )}

                    {/* PAYMENT */}
                    {activeTab === 'payment' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Información de Pago</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Datos Bancarios</label>
                                    <textarea 
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none text-gray-900 bg-white text-sm h-40 resize-none"
                                        placeholder="Banco, Nro de Cuenta, Titular, NIT..."
                                        value={settings.paymentInfo}
                                        onChange={(e) => handleChange('paymentInfo', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Código QR para Pagos</label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative overflow-hidden h-40">
                                        {settings.qrCodeUrl ? (
                                            <img src={settings.qrCodeUrl} alt="QR" className="h-full object-contain" />
                                        ) : (
                                            <div className="text-gray-400">
                                                <CreditCard size={32} className="mx-auto mb-2" />
                                                <span className="text-sm font-medium">Subir imagen QR</span>
                                            </div>
                                        )}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload('qrCodeUrl', e)} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 text-center">Aparecerá junto a los datos bancarios en el PDF.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* USERS & ROLES */}
                    {activeTab === 'users' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Gestión de Usuarios</h2>
                            
                            {/* Create User Form */}
                            <form onSubmit={handleAddUser} className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Plus size={16}/> Agregar Usuario</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-1">
                                        <input type="text" placeholder="Nombre" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 outline-none" 
                                            value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}/>
                                    </div>
                                    <div className="md:col-span-1">
                                        <input type="email" placeholder="Email" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 outline-none" 
                                            value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}/>
                                    </div>
                                    <div className="md:col-span-1">
                                        <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 outline-none"
                                            value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                                            <option value="Admin">Administrador</option>
                                            <option value="Sales">Ventas</option>
                                            <option value="Viewer">Visualizador</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-800">Agregar</button>
                                </div>
                            </form>

                            {/* User List */}
                            <div className="overflow-hidden rounded-xl border border-gray-100">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Usuario</th>
                                            <th className="px-4 py-3">Rol</th>
                                            <th className="px-4 py-3">Estado</th>
                                            <th className="px-4 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {users.map(user => (
                                            <tr key={user.id} className="bg-white hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.role === 'Admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><Check size={12}/> Activo</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => handleDeleteUser(user.id)} className="text-gray-400 hover:text-red-600 p-1">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* INTEGRATIONS & STATUS */}
                    {activeTab === 'integrations' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Estado del Sistema</h2>
                            
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${firebaseStatus === 'Connected' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Firebase</h3>
                                        <p className="text-sm text-gray-500">
                                            {firebaseStatus === 'Connected' ? 'Conectado correctamente' : 'No conectado / Error de configuración'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${firebaseStatus === 'Connected' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                    {firebaseStatus}
                                </div>
                            </div>
                            
                            <p className="text-xs text-gray-400 mt-2">
                                Nota: Si el estado es "Error", verifica tu archivo <code>firebase.ts</code> y las credenciales en el archivo <code>metadata.json</code> o tu configuración de entorno.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};