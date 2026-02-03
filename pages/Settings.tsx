
import React, { useState, useEffect } from 'react';
import { Save, Building, CreditCard, Users, Trash2, Plus, Check, DollarSign, Database, Lock, User as UserIcon, Edit3, X, Shield, Printer, Link as LinkIcon, RefreshCw, Palette, AlertTriangle, HardDrive, Stethoscope, Crown, ExternalLink, Image as ImageIcon, Upload, Key, Smartphone, Eye, EyeOff, ShieldCheck, ChevronRight, ArrowLeft, Share2, Briefcase, Wallet, History } from 'lucide-react';
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
    secondaryColor: '#00f24a',
    systemLogoUrl: '',
    socialPreviewUrl: '', 
    socialShareTitle: 'Documento Digital | Bráma Studio',
    socialShareDescription: 'Visualiza y descarga tu cotización o recibo de manera segura.',
    pdfHeaderColor: '#162836',
    pdfSenderInfo: 'Bráma Studio\nSanta Cruz',
    pdfFooterText: 'www.brama.com.bo',
    paymentInfo: '',
    termsAndConditions: '1. Validez de la oferta: 15 días calendario.\n2. Tiempo de entrega: A convenir.',
    salesNote: 'Gracias por su compra.',
    receiptInfo: 'Este documento no tiene validez como crédito fiscal.',
    customQuotationLabel: 'FACTURADO',
    customReceiptLabel: 'ENTREGADO',
    currencySymbol: 'Bs',
    currencyName: 'Bolivianos',
    currencyPosition: 'before',
    decimals: 2,
    taxRate: 13,
    taxName: 'IVA',
    taxIdLabel: 'NIT',
    signatureName: 'Ariel Espinoza',
    signatureTitle: 'CEO',
    autoCleanupEnabled: true,
    retentionClients: 6, 
    retentionSales: 12, 
    retentionProjects: 6, 
    retentionQuotes: 3, 
    retentionFinance: 12 
};

// UI COMPONENTS
const MaintenanceRow = ({ title, description, icon: Icon, colorClass, bgClass, onAction, isDisabled, defaultMonths = 6 }: any) => {
    const [months, setMonths] = useState(defaultMonths);
    return (
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 rounded-xl gap-4 bg-white ${isDisabled ? 'opacity-50 pointer-events-none' : 'hover:border-brand-200 transition-colors'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${bgClass} ${colorClass}`}><Icon size={20}/></div>
                <div>
                    <h4 className="text-sm font-bold text-gray-900">{title}</h4>
                    <p className="text-xs text-gray-500">{description}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200 flex-1 sm:flex-none">
                    <span className="text-[10px] text-gray-400 font-bold pl-2 uppercase hidden xs:inline">Antigüedad</span>
                    <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="bg-transparent text-gray-700 text-xs font-bold outline-none cursor-pointer py-1 pr-1 w-full sm:w-auto">
                        <option value={1}>&gt; 1 Mes</option>
                        <option value={3}>&gt; 3 Meses</option>
                        <option value={6}>&gt; 6 Meses</option>
                        <option value={12}>&gt; 1 Año</option>
                        <option value={24}>&gt; 2 Años</option>
                    </select>
                </div>
                <button onClick={() => onAction(months)} className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap flex items-center gap-2">
                    <Trash2 size={14}/> Depurar
                </button>
            </div>
        </div>
    );
};

const ImageUploadOrLink = ({ label, value, onChange, helpText, icon: Icon, showPreview = true }: any) => {
    const [mode, setMode] = useState<'link' | 'upload'>('link');
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) { alert("La imagen es muy pesada (Máx 500KB)."); return; }
            const reader = new FileReader();
            reader.onloadend = () => onChange(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">{Icon && <Icon size={12}/>} {label}</label>
                <div className="flex bg-gray-100 rounded p-0.5">
                    <button onClick={() => setMode('link')} className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${mode === 'link' ? 'bg-white shadow text-brand-900' : 'text-gray-400'}`}>Link</button>
                    <button onClick={() => setMode('upload')} className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${mode === 'upload' ? 'bg-white shadow text-brand-900' : 'text-gray-400'}`}>Subir</button>
                </div>
            </div>
            {mode === 'link' ? (
                <div className="flex gap-2">
                    <input type="text" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-brand-900 outline-none" placeholder="https://..." value={value || ''} onChange={(e) => onChange(e.target.value)} />
                    {value && <a href={value} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 border border-gray-200"><ExternalLink size={20}/></a>}
                </div>
            ) : (
                <label className="flex-1 cursor-pointer group block">
                    <div className="w-full px-3 py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs bg-gray-50 group-hover:bg-white text-gray-500 flex items-center justify-center gap-2"><Upload size={16}/> <span>Seleccionar (Máx 500KB)</span></div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
            )}
            {showPreview && value && <div className="mt-3 p-2 bg-white border border-gray-200 rounded-xl shadow-sm inline-block"><img src={value} alt="Preview" className="max-h-24 w-auto object-contain mx-auto" /></div>}
        </div>
    );
};

export const Settings = () => {
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab');
    
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('crm_settings');
        return saved ? JSON.parse(saved) : defaultSettings;
    });
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState(initialTab === 'general' ? 'company' : initialTab || 'profile');
    const [showMobileMaster, setShowMobileMaster] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // User Modal
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    
    // Password Change
    const [myPassword, setMyPassword] = useState('');
    
    // Storage
    const [storageStats, setStorageStats] = useState<any>({});

    useEffect(() => {
        const fetchCloud = async () => {
             const u = localStorage.getItem('crm_active_user');
             if (u) setCurrentUser(JSON.parse(u));
             
             try {
                const sDoc = await getDoc(doc(db, 'crm_data', 'settings'));
                if (sDoc.exists()) setSettings({ ...defaultSettings, ...sDoc.data() as AppSettings });
                
                const uDoc = await getDoc(doc(db, 'crm_data', 'users'));
                if (uDoc.exists()) {
                    setUsers(uDoc.data().list);
                    localStorage.setItem('crm_users', JSON.stringify(uDoc.data().list));
                }
             } catch(e) {}
        };
        fetchCloud();
        calculateStorage();
    }, []);

    const calculateStorage = () => {
        const stats: any = {};
        ['clients', 'inventory', 'quotes', 'projects', 'sales_history', 'audit_logs'].forEach(col => {
            const data = localStorage.getItem(`crm_${col}`);
            stats[col] = data ? new Blob([data]).size : 0;
        });
        setStorageStats(stats);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            localStorage.setItem('crm_settings', JSON.stringify(settings));
            await setDoc(doc(db, 'crm_data', 'settings'), settings);
            window.dispatchEvent(new Event('crm_settings_updated'));
            alert('Configuración guardada.');
        } catch(e: any) { alert(`Error: ${e.message}`); }
        finally { setIsSaving(false); }
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser?.email) return;
        let updatedUsers = [...users];
        const newUser = {
            id: editingUser.id || Math.random().toString(36).substr(2, 9),
            name: editingUser.name!,
            email: editingUser.email!,
            role: editingUser.role || 'Sales',
            active: editingUser.active ?? true,
            permissions: editingUser.role === 'Admin' ? ['all'] : editingUser.permissions || [],
            password: passwordInput || editingUser.password || '123456',
            twoFactorEnabled: editingUser.twoFactorEnabled || false
        } as User;
        if (editingUser.id) updatedUsers = updatedUsers.map(u => u.id === editingUser.id ? newUser : u);
        else updatedUsers.push(newUser);
        setUsers(updatedUsers);
        setIsUserModalOpen(false);
        await setDoc(doc(db, 'crm_data', 'users'), { list: updatedUsers });
    };

    const handleGranularCleanup = async (type: string, months: number) => {
        if(!window.confirm(`¿Estás seguro de eliminar registros de ${type} con más de ${months} meses de antigüedad?`)) return;
        
        try {
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - months);
            const cutoffISO = cutoffDate.toISOString();
            
            let docId = '', listKey = '', dateField = '';
            
            switch(type) {
                case 'clients': docId = 'clients'; listKey = 'crm_clients'; dateField = 'lastContactDate'; break;
                case 'sales': docId = 'sales_history'; listKey = 'crm_sales_history'; dateField = 'date'; break;
                case 'quotes': docId = 'quotes'; listKey = 'crm_quotes'; dateField = 'date'; break;
                case 'projects': docId = 'projects'; listKey = 'crm_projects'; dateField = 'dueDate'; break;
                case 'finance': docId = 'finance_shifts'; listKey = 'crm_finance_shifts'; dateField = 'closeDate'; break;
                case 'audit': docId = 'audit_logs'; listKey = 'crm_audit_logs'; dateField = 'timestamp'; break;
                default: return;
            }

            const docRef = doc(db, 'crm_data', docId);
            const docSnap = await getDoc(docRef);
            let currentList: any[] = docSnap.exists() ? docSnap.data().list : [];
            
            const filteredList = currentList.filter(item => {
                let itemDateStr = item[dateField];
                if (type === 'finance' && item.status !== 'Closed') return true;
                if (type === 'projects' && item.status !== 'COMPLETED') return true;
                if (!itemDateStr) return true;
                return itemDateStr > cutoffISO;
            });

            await setDoc(docRef, { list: filteredList });
            localStorage.setItem(listKey, JSON.stringify(filteredList));
            calculateStorage();
            alert(`Limpieza completada. Eliminados: ${currentList.length - filteredList.length}`);

        } catch (e: any) {
            console.error("Cleanup error", e);
            alert(`Error crítico: ${e.message}`);
        }
    };

    const TAB_CONFIG = [
        { id: 'profile', label: 'Mi Perfil', icon: UserIcon },
        { id: 'company', label: 'Empresa', icon: Building },
        { id: 'pdf', label: 'PDF y Diseño', icon: Printer },
        { id: 'finance', label: 'Finanzas', icon: DollarSign },
        { id: 'users', label: 'Usuarios', icon: Users },
        { id: 'storage', label: 'Mantenimiento', icon: Database },
    ];

    const currentTabInfo = TAB_CONFIG.find(t => t.id === activeTab);

    return (
        <div className="flex h-full flex-col md:flex-row gap-6 pb-safe-area relative">
            {/* Sidebar Navigation */}
            <div className={`w-full md:w-64 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col shrink-0 ${!showMobileMaster ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Configuración</h2></div>
                <div className="p-2 space-y-1">
                    {TAB_CONFIG.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowMobileMaster(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === tab.id ? 'bg-brand-50 text-brand-900' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <tab.icon size={18} /> {tab.label} <ChevronRight size={16} className="ml-auto opacity-50"/>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-y-auto ${showMobileMaster ? 'hidden md:block' : 'block'}`}>
                {/* Mobile Header */}
                <div className="md:hidden flex items-center gap-3 mb-6">
                    <button onClick={() => setShowMobileMaster(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ArrowLeft size={24}/></button>
                    <h2 className="font-bold text-lg">{currentTabInfo?.label}</h2>
                </div>

                {/* --- PROFILE TAB --- */}
                {activeTab === 'profile' && (
                    <div className="space-y-6 max-w-lg">
                        <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl bg-gray-50">
                            <div className="w-16 h-16 bg-brand-900 rounded-full flex items-center justify-center text-white text-2xl font-bold">{currentUser?.name.charAt(0)}</div>
                            <div><h3 className="font-bold text-gray-900">{currentUser?.name}</h3><p className="text-sm text-gray-500">{currentUser?.email}</p><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{currentUser?.role}</span></div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900 border-b pb-2">Seguridad</h3>
                            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nueva Contraseña</label><input type="password" value={myPassword} onChange={e => setMyPassword(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="********"/></div>
                            <button className="bg-brand-900 text-white px-6 py-2 rounded-xl font-bold text-sm">Actualizar Clave</button>
                        </div>
                    </div>
                )}

                {/* --- COMPANY TAB --- */}
                {activeTab === 'company' && (
                    <div className="space-y-6 max-w-2xl">
                        <h3 className="font-bold text-gray-900 border-b pb-2">Datos Generales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre</label><input className="w-full border border-gray-200 rounded-xl px-4 py-2" value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Teléfono</label><input className="w-full border border-gray-200 rounded-xl px-4 py-2" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} /></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Dirección</label><input className="w-full border border-gray-200 rounded-xl px-4 py-2" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} /></div>
                        </div>
                        <h3 className="font-bold text-gray-900 border-b pb-2 pt-4">Marca y Redes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageUploadOrLink label="Logo del Sistema" value={settings.systemLogoUrl} onChange={(v:any) => setSettings({...settings, systemLogoUrl: v})} icon={ImageIcon} />
                            <ImageUploadOrLink label="Imagen Social (Link Preview)" value={settings.socialPreviewUrl} onChange={(v:any) => setSettings({...settings, socialPreviewUrl: v})} icon={Share2} />
                            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Color Principal</label><div className="flex gap-2"><div className="w-10 h-10 rounded border" style={{backgroundColor: settings.primaryColor}}></div><input className="flex-1 border border-gray-200 rounded-xl px-4 py-2" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} /></div></div>
                        </div>
                        <button onClick={handleSave} className="bg-brand-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><Save size={18}/> Guardar Cambios</button>
                    </div>
                )}

                {/* --- PDF TAB --- */}
                {activeTab === 'pdf' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 border-b pb-2">Apariencia Documentos</h3>
                                <ImageUploadOrLink label="Logo para Documentos" value={settings.logoUrl} onChange={(v:any) => setSettings({...settings, logoUrl: v})} icon={ImageIcon} />
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Color Cabecera PDF</label><div className="flex gap-2"><div className="w-10 h-10 rounded border" style={{backgroundColor: settings.pdfHeaderColor}}></div><input className="flex-1 border border-gray-200 rounded-xl px-4 py-2" value={settings.pdfHeaderColor} onChange={e => setSettings({...settings, pdfHeaderColor: e.target.value})} /></div></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Pie de Página</label><input className="w-full border border-gray-200 rounded-xl px-4 py-2" value={settings.pdfFooterText} onChange={e => setSettings({...settings, pdfFooterText: e.target.value})} /></div>
                            </div>
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                <div className="bg-gray-100 px-4 py-2 text-[10px] font-bold text-center uppercase tracking-widest text-gray-500">Vista Previa Cabecera</div>
                                <div className="h-32 flex items-center justify-between px-6 transition-colors" style={{backgroundColor: settings.pdfHeaderColor}}>
                                    {settings.logoUrl ? <img src={settings.logoUrl} className="h-16 object-contain"/> : <h1 className="text-2xl font-bold text-white uppercase">{settings.companyName}</h1>}
                                    <div className="text-right text-white opacity-80"><h2 className="text-xl font-bold">COTIZACIÓN</h2><p className="text-[10px]">NRO: 001</p></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4 pt-4">
                            <h3 className="font-bold text-gray-900 border-b pb-2">Configuración Cotizaciones</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Etiqueta Personalizada (Por defecto)</label>
                                    <input 
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2" 
                                        value={settings.customQuotationLabel || ''} 
                                        onChange={e => setSettings({...settings, customQuotationLabel: e.target.value})} 
                                        placeholder="Ej. FACTURADO"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Texto en rojo debajo del total. Puede activarse/desactivarse al crear la cotización.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="font-bold text-gray-900 border-b pb-2">Configuración Recibo de Venta</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Etiqueta Personalizada (Por defecto)</label>
                                    <input 
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2" 
                                        value={settings.customReceiptLabel || ''} 
                                        onChange={e => setSettings({...settings, customReceiptLabel: e.target.value})} 
                                        placeholder="Ej. ENTREGADO"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-gray-600 uppercase">Información / Aviso Legal (Recibos)</label>
                                        <span className={`text-[10px] font-bold ${settings.receiptInfo?.length && settings.receiptInfo.length > 330 ? 'text-red-500' : 'text-gray-400'}`}>{settings.receiptInfo?.length || 0}/330</span>
                                    </div>
                                    <textarea 
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2 h-20 text-sm outline-none focus:border-brand-900" 
                                        maxLength={330}
                                        value={settings.receiptInfo || ''} 
                                        onChange={e => setSettings({...settings, receiptInfo: e.target.value})} 
                                        placeholder="Ej: Este documento no tiene validez para crédito fiscal..."
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Esta información aparecerá en el pie de los recibos de venta.</p>
                                </div>
                            </div>
                        </div>

                        <h3 className="font-bold text-gray-900 border-b pb-2 pt-4">Datos Bancarios y Legales (Cotizaciones)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Información de Pago</label><textarea className="w-full border border-gray-200 rounded-xl px-4 py-2 h-20 text-sm" value={settings.paymentInfo} onChange={e => setSettings({...settings, paymentInfo: e.target.value})} /></div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Términos y Condiciones</label><textarea className="w-full border border-gray-200 rounded-xl px-4 py-2 h-20 text-sm" value={settings.termsAndConditions} onChange={e => setSettings({...settings, termsAndConditions: e.target.value})} /></div>
                            <ImageUploadOrLink label="Código QR" value={settings.qrCodeUrl} onChange={(v:any) => setSettings({...settings, qrCodeUrl: v})} icon={ImageIcon} />
                            <ImageUploadOrLink label="Firma Digital" value={settings.signatureUrl} onChange={(v:any) => setSettings({...settings, signatureUrl: v})} icon={Stethoscope} />
                        </div>
                        <button onClick={handleSave} className="bg-brand-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><Save size={18}/> Guardar Cambios</button>
                    </div>
                )}

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center"><h3 className="font-bold text-gray-900">Usuarios del Sistema</h3><button onClick={() => { setEditingUser({name:'', email:'', role:'Sales', active:true}); setIsUserModalOpen(true); }} className="bg-brand-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Agregar</button></div>
                        <div className="space-y-3">
                            {users.map(u => (
                                <div key={u.id} className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${u.active ? 'bg-brand-900' : 'bg-gray-400'}`}>{u.name.charAt(0)}</div>
                                        <div><p className="font-bold text-gray-900">{u.name}</p><p className="text-xs text-gray-500">{u.email} • {u.role}</p></div>
                                    </div>
                                    <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100"><Edit3 size={18}/></button>
                                </div>
                            ))}
                        </div>
                        {/* User Modal */}
                        {isUserModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
                                    <h3 className="font-bold text-lg mb-4">{editingUser?.id ? 'Editar' : 'Nuevo'} Usuario</h3>
                                    <form onSubmit={handleSaveUser} className="space-y-4">
                                        <input required className="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="Nombre" value={editingUser?.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                                        <input required className="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="Email" value={editingUser?.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                                        <div className="flex gap-2">
                                            <select className="flex-1 border border-gray-200 rounded-xl px-4 py-2 bg-white" value={editingUser?.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}><option value="Sales">Vendedor</option><option value="Admin">Admin</option></select>
                                            <select className="flex-1 border border-gray-200 rounded-xl px-4 py-2 bg-white" value={editingUser?.active ? 'active' : 'inactive'} onChange={e => setEditingUser({...editingUser, active: e.target.value === 'active'})}><option value="active">Activo</option><option value="inactive">Inactivo</option></select>
                                        </div>
                                        <input className="w-full border border-gray-200 rounded-xl px-4 py-2" type="password" placeholder="Contraseña (Opcional si edita)" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold">Cancelar</button>
                                            <button type="submit" className="px-4 py-2 bg-brand-900 text-white rounded-xl font-bold">Guardar</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- FINANCE TAB --- */}
                {activeTab === 'finance' && (
                    <div className="space-y-6 max-w-2xl">
                        <h3 className="font-bold text-gray-900 border-b pb-2">Moneda e Impuestos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre Moneda</label><input className="w-full border border-gray-200 rounded-xl px-4 py-2" value={settings.currencyName} onChange={e => setSettings({...settings, currencyName: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Símbolo</label><input className="w-full border border-gray-200 rounded-xl px-4 py-2" value={settings.currencySymbol} onChange={e => setSettings({...settings, currencySymbol: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre Impuesto (IVA)</label><input className="w-full border border-gray-200 rounded-xl px-4 py-2" value={settings.taxName} onChange={e => setSettings({...settings, taxName: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tasa Impuesto (%)</label><input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-2" value={settings.taxRate} onChange={e => setSettings({...settings, taxRate: Number(e.target.value)})} /></div>
                        </div>
                        <button onClick={handleSave} className="bg-brand-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><Save size={18}/> Guardar Cambios</button>
                    </div>
                )}

                {/* --- STORAGE & MAINTENANCE TAB --- */}
                {activeTab === 'storage' && (
                    <div className="space-y-8 animate-in fade-in">
                        <div className="bg-gradient-to-r from-brand-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-2"><Database size={24}/> Base de Datos</h2>
                            <p className="text-sm opacity-80">Gestión de almacenamiento y limpieza.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><HardDrive size={18}/> Almacenamiento Local</h3>
                                {Object.entries(storageStats).map(([k, v]: any) => (
                                    <div key={k} className="mb-2">
                                        <div className="flex justify-between text-xs mb-1 uppercase font-bold text-gray-500"><span>{k}</span><span>{(v/1024).toFixed(2)} KB</span></div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${Math.min(100, v/5000)}%`}}></div></div>
                                    </div>
                                ))}
                                <button onClick={calculateStorage} className="mt-4 w-full py-2 bg-gray-50 text-gray-600 font-bold rounded-xl text-xs flex items-center justify-center gap-2"><RefreshCw size={12}/> Refrescar</button>
                            </div>
                            
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Shield size={18}/> Arquitectura</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between p-2 bg-green-50 rounded-lg border border-green-100"><span className="text-xs font-bold text-green-800">Ventas</span><span className="text-[10px] bg-white px-2 rounded border border-green-200">Sharded (Anual)</span></div>
                                    <div className="flex justify-between p-2 bg-blue-50 rounded-lg border border-blue-100"><span className="text-xs font-bold text-blue-800">Finanzas</span><span className="text-[10px] bg-white px-2 rounded border border-blue-200">Sharded (Anual)</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg"><Stethoscope size={20} className="text-red-500"/> Consola de Mantenimiento Granular</h3>
                            <div className="space-y-3">
                                <MaintenanceRow title="Clientes Inactivos" description="Sin ventas, proyectos ni contacto reciente." icon={Users} colorClass="text-blue-600" bgClass="bg-blue-50" onAction={(m: number) => handleGranularCleanup('clients', m)}/>
                                <MaintenanceRow title="Ventas Históricas" description="Registros antiguos de ventas ya cerradas." icon={DollarSign} colorClass="text-green-600" bgClass="bg-green-50" onAction={(m: number) => handleGranularCleanup('sales', m)}/>
                                <MaintenanceRow title="Cotizaciones" description="Borradores y cotizaciones rechazadas." icon={Printer} colorClass="text-orange-600" bgClass="bg-orange-50" onAction={(m: number) => handleGranularCleanup('quotes', m)}/>
                                <MaintenanceRow title="Proyectos Finalizados" description="Proyectos con estado 'Completado'." icon={Briefcase} colorClass="text-purple-600" bgClass="bg-purple-50" onAction={(m: number) => handleGranularCleanup('projects', m)}/>
                                <MaintenanceRow title="Turnos de Caja" description="Turnos cerrados y conciliados." icon={Wallet} colorClass="text-emerald-600" bgClass="bg-emerald-50" onAction={(m: number) => handleGranularCleanup('finance', m)}/>
                                <MaintenanceRow title="Logs de Auditoría" description="Registros de actividad del sistema." icon={History} colorClass="text-gray-600" bgClass="bg-gray-50" onAction={(m: number) => handleGranularCleanup('audit', m)}/>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};