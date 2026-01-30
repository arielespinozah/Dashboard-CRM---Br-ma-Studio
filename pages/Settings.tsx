import React, { useState, useEffect } from 'react';
import { Save, Upload, Building, FileText, CreditCard, Users, Trash2, Plus, Check, DollarSign, Database, MessageSquare, Download, Lock, User as UserIcon, Edit3, X, Shield, Printer, Mail, Link as LinkIcon, RefreshCw, Palette, FileJson, AlertTriangle, HardDrive, Activity, Brush, Stethoscope, CheckCircle2, AlertOctagon, Smartphone, HelpCircle, Info, ChevronRight, Crown, Server, Layers, Calendar, Clock, ToggleLeft, ToggleRight, Play } from 'lucide-react';
import { AppSettings, User, Quote, InventoryItem, Client, Sale, Project, CashShift, AuditLog } from '../types';
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
    taxIdLabel: 'NIT',
    signatureName: 'Ariel Espinoza Heredia',
    signatureTitle: 'CEO PROPIETARIO',
    
    // Default Cleanup Settings
    autoCleanupEnabled: true,
    retentionClients: 6, // 6 Months inactive
    retentionSales: 12, // 1 Year
    retentionProjects: 6, // 6 Months completed
    retentionQuotes: 3, // 3 Months drafts
    retentionFinance: 12 // 12 Months shifts
};

const defaultUsers: User[] = [
    { id: '1', name: 'Admin Principal', email: 'admin@brama.com.bo', role: 'Admin', active: true, password: 'admin', permissions: ['all'] },
    { id: '2', name: 'Vendedor 1', email: 'ventas@brama.com.bo', role: 'Sales', active: true, password: 'ventas', permissions: ['view_sales', 'view_quotes', 'view_clients', 'view_calendar', 'view_dashboard'] },
];

const availablePermissions = [
    { id: 'view_dashboard', label: 'Ver Dashboard' },
    { id: 'view_calendar', label: 'Ver Agenda' },
    { id: 'view_finance', label: 'Ver Finanzas' },
    { id: 'view_sales', label: 'Ver/Crear Ventas' },
    { id: 'delete_sales', label: 'Eliminar Ventas (Riesgo)' },
    { id: 'view_quotes', label: 'Gestionar Cotizaciones' },
    { id: 'view_projects', label: 'Gestionar Proyectos' },
    { id: 'view_inventory', label: 'Ver Inventario' },
    { id: 'manage_inventory', label: 'Crear/Borrar Productos' },
    { id: 'view_catalog', label: 'Ver Catálogo' },
    { id: 'view_clients', label: 'Ver Clientes' },
    { id: 'view_reports', label: 'Ver Reportes' },
    { id: 'manage_settings', label: 'Acceso a Ajustes Globales' },
];

// Helper to calculate bytes
const getSizeInBytes = (obj: any) => {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
};

// Componente de Barra de Almacenamiento Inteligente
const StorageBar = ({ label, size, limit = 1048576, planType }: { label: string, size: number, limit?: number, planType: 'Free' | 'Pro' }) => {
    const percentage = Math.min(100, (size / limit) * 100);
    
    // Logic: If Pro, limits are virtual/soft. If Free, limits are strict (Red).
    let color = 'bg-green-500';
    if (planType === 'Free') {
        if (percentage > 90) color = 'bg-red-500';
        else if (percentage > 70) color = 'bg-orange-500';
    } else {
        // Pro users see blue unless huge
        color = percentage > 90 ? 'bg-blue-600' : 'bg-blue-400';
    }
    
    return (
        <div className="mb-4">
            <div className="flex justify-between text-xs font-bold uppercase mb-1 text-gray-600">
                <span>{label}</span>
                <span>{(size / 1024).toFixed(2)} KB {planType === 'Free' ? '/ 1000 KB' : ''}</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
            </div>
            {planType === 'Free' && percentage > 80 && (
                <p className="text-[10px] text-red-500 mt-1 font-bold flex items-center gap-1">
                    <AlertTriangle size={10}/> Límite gratuito cerca. Archiva datos.
                </p>
            )}
        </div>
    );
};

const ArchitectureStatus = ({ module, status, strategy, year }: { module: string, status: 'Active' | 'Warning', strategy: string, year?: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                {status === 'Active' ? <Layers size={16}/> : <AlertTriangle size={16}/>}
            </div>
            <div>
                <p className="text-sm font-bold text-gray-800">{module}</p>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    {strategy} {year && <span className="bg-blue-100 text-blue-700 px-1 rounded text-[9px] font-mono">{new Date().getFullYear()}</span>}
                </p>
            </div>
        </div>
        <div className="text-right">
            <span className={`text-xs font-bold ${status === 'Active' ? 'text-green-600' : 'text-yellow-600'}`}>
                {status === 'Active' ? 'BLINDADO' : 'MONITOREADO'}
            </span>
        </div>
    </div>
);

const Switch = ({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled?: boolean }) => (
    <button 
        type="button"
        onClick={!disabled ? onChange : undefined} 
        className={`w-11 h-6 rounded-full flex items-center transition-colors duration-300 px-1 focus:outline-none ${checked ? 'bg-brand-500' : 'bg-gray-300'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

// --- MAINTENANCE ROW COMPONENT ---
const MaintenanceRow = ({ title, icon: Icon, description, onAction, isDisabled }: any) => {
    const [selectedTime, setSelectedTime] = useState<number>(6);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm border border-gray-100">
                    <Icon size={20}/>
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-800">{title}</p>
                    <p className="text-[10px] text-gray-500">{description}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] text-gray-400 font-bold uppercase whitespace-nowrap">Más de:</span>
                <select 
                    value={selectedTime} 
                    onChange={(e) => setSelectedTime(Number(e.target.value))}
                    disabled={isDisabled}
                    className="bg-white border border-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-brand-500 text-gray-700 cursor-pointer disabled:opacity-50"
                >
                    <option value={1}>1 Mes</option>
                    <option value={3}>3 Meses</option>
                    <option value={6}>6 Meses</option>
                    <option value={12}>1 Año</option>
                    <option value={24}>2 Años</option>
                </select>
                <button 
                    onClick={() => onAction(selectedTime)} 
                    disabled={isDisabled}
                    className="flex-1 sm:flex-none px-4 py-1.5 bg-white border border-gray-200 text-brand-900 rounded-lg text-xs font-bold hover:bg-brand-900 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                    <RefreshCw size={12}/> Analizar y Limpiar
                </button>
            </div>
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

    // Plan State (Persisted in Settings or separated key)
    const [planType, setPlanType] = useState<'Free' | 'Pro'>(() => {
        return localStorage.getItem('crm_plan_type') as 'Free' | 'Pro' || 'Free';
    });

    const [users, setUsers] = useState<User[]>(() => {
        const savedUsers = localStorage.getItem('crm_users');
        return savedUsers ? JSON.parse(savedUsers) : defaultUsers;
    });

    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const u = localStorage.getItem('crm_active_user');
        return u ? JSON.parse(u) : null;
    });

    const [activeTab, setActiveTab] = useState(initialTab === 'profile' ? 'profile' : 'company');
    const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // User Modal
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    
    // Password Change
    const [myPassword, setMyPassword] = useState('');
    const [myConfirmPassword, setMyConfirmPassword] = useState('');

    // Storage Metrics & Diagnostics
    const [storageStats, setStorageStats] = useState<any>({});
    const [diagnosticIssues, setDiagnosticIssues] = useState<string[]>([]);
    const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
    
    // Confirmation & Info Modals
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => void;
        itemCount?: number;
    }>({ isOpen: false, title: '', message: '', action: () => {} });

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab === 'general' ? 'company' : initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        const fetchCloud = async () => {
             try {
                const sDoc = await getDoc(doc(db, 'crm_data', 'settings'));
                if (sDoc.exists()) setSettings({ ...defaultSettings, ...sDoc.data() as AppSettings });
                
                const uDoc = await getDoc(doc(db, 'crm_data', 'users'));
                if (uDoc.exists()) {
                    const cloudUsers = uDoc.data().list;
                    setUsers(cloudUsers);
                    localStorage.setItem('crm_users', JSON.stringify(cloudUsers));
                }
             } catch(e) {}
        };
        fetchCloud();
        calculateStorage();
    }, []);

    const togglePlan = (type: 'Free' | 'Pro') => {
        setPlanType(type);
        localStorage.setItem('crm_plan_type', type);
        setShowToast({ message: `Modo ${type === 'Pro' ? 'Pro' : 'Gratuito'} activado.`, type: 'success' });
        setTimeout(() => setShowToast(null), 2000);
    };

    const calculateStorage = () => {
        const stats: any = {};
        const collections = ['clients', 'inventory', 'quotes', 'projects', 'sales_history', 'chat_history', 'audit_logs'];
        
        collections.forEach(col => {
            const data = localStorage.getItem(`crm_${col}`);
            if (data) {
                stats[col] = getSizeInBytes(JSON.parse(data));
            } else {
                stats[col] = 0;
            }
        });
        setStorageStats(stats);
    };

    // --- GRANULAR CLEANUP LOGIC ---
    const calculateCutoffDate = (months: number) => {
        const d = new Date();
        d.setMonth(d.getMonth() - months);
        return d;
    };

    const handleGranularCleanup = async (type: 'clients' | 'sales' | 'quotes' | 'projects' | 'logs' | 'finance', months: number) => {
        if (!settings.autoCleanupEnabled) {
            alert("Active el interruptor 'Permitir Mantenimiento' arriba para habilitar estas acciones.");
            return;
        }

        setIsRunningDiagnostics(true);
        try {
            const cutoff = calculateCutoffDate(months);
            let count = 0;
            let action: () => Promise<void> = async () => {};
            let message = '';

            // Load Data
            if (type === 'clients') {
                const clients: Client[] = JSON.parse(localStorage.getItem('crm_clients') || '[]');
                const sales: Sale[] = JSON.parse(localStorage.getItem('crm_sales_history') || '[]');
                const projects: Project[] = JSON.parse(localStorage.getItem('crm_projects') || '[]');
                
                // Smart Logic: No recent sales, no active projects
                const inactiveClients = clients.filter(c => {
                    const hasRecentSales = sales.some(s => (s.clientId === c.id || s.clientName === c.name) && new Date(s.date) >= cutoff);
                    const hasActiveProjects = projects.some(p => p.client === c.name && p.status !== 'COMPLETED');
                    // We assume creation date or last interaction isn't strictly tracked in Client object for now, 
                    // so we rely on transactional data. If they have NO sales and NO projects in the period, they are candidates.
                    // Ideally we'd check c.lastContactDate
                    const isOldContact = c.lastContactDate ? new Date(c.lastContactDate) < cutoff : true; 
                    
                    return !hasRecentSales && !hasActiveProjects && isOldContact;
                });
                
                count = inactiveClients.length;
                message = `Se han encontrado ${count} clientes inactivos por más de ${months} meses.`;
                action = async () => {
                    const idsToDelete = new Set(inactiveClients.map(c => c.id));
                    const newClients = clients.filter(c => !idsToDelete.has(c.id));
                    localStorage.setItem('crm_clients', JSON.stringify(newClients));
                    await setDoc(doc(db, 'crm_data', 'clients'), { list: newClients });
                };

            } else if (type === 'sales') {
                const sales: Sale[] = JSON.parse(localStorage.getItem('crm_sales_history') || '[]');
                const oldSales = sales.filter(s => new Date(s.date) < cutoff);
                count = oldSales.length;
                message = `Se han encontrado ${count} ventas con antigüedad mayor a ${months} meses.`;
                action = async () => {
                    const newSales = sales.filter(s => new Date(s.date) >= cutoff);
                    localStorage.setItem('crm_sales_history', JSON.stringify(newSales));
                    await setDoc(doc(db, 'crm_data', 'sales_history'), { list: newSales });
                };

            } else if (type === 'quotes') {
                const quotes: Quote[] = JSON.parse(localStorage.getItem('crm_quotes') || '[]');
                // Clean Drafts and Rejected
                const oldQuotes = quotes.filter(q => 
                    (q.status === 'Draft' || q.status === 'Rejected') && new Date(q.date) < cutoff
                );
                count = oldQuotes.length;
                message = `Se han encontrado ${count} cotizaciones (Borrador/Rechazadas) con antigüedad mayor a ${months} meses.`;
                action = async () => {
                    const idsToDelete = new Set(oldQuotes.map(q => q.id));
                    const newQuotes = quotes.filter(q => !idsToDelete.has(q.id));
                    localStorage.setItem('crm_quotes', JSON.stringify(newQuotes));
                    await setDoc(doc(db, 'crm_data', 'quotes'), { list: newQuotes });
                };

            } else if (type === 'projects') {
                const projects: Project[] = JSON.parse(localStorage.getItem('crm_projects') || '[]');
                const oldProjects = projects.filter(p => p.status === 'COMPLETED' && new Date(p.dueDate) < cutoff);
                count = oldProjects.length;
                message = `Se han encontrado ${count} proyectos completados hace más de ${months} meses.`;
                action = async () => {
                    const idsToDelete = new Set(oldProjects.map(p => p.id));
                    const newProjects = projects.filter(p => !idsToDelete.has(p.id));
                    localStorage.setItem('crm_projects', JSON.stringify(newProjects));
                    await setDoc(doc(db, 'crm_data', 'projects'), { list: newProjects });
                };

            } else if (type === 'logs') {
                const logs: AuditLog[] = JSON.parse(localStorage.getItem('crm_audit_logs') || '[]');
                const oldLogs = logs.filter(l => new Date(l.timestamp) < cutoff);
                count = oldLogs.length;
                message = `Se han encontrado ${count} registros de auditoría con antigüedad mayor a ${months} meses.`;
                action = async () => {
                    const newLogs = logs.filter(l => new Date(l.timestamp) >= cutoff);
                    localStorage.setItem('crm_audit_logs', JSON.stringify(newLogs));
                    await setDoc(doc(db, 'crm_data', 'audit_logs'), { list: newLogs });
                };
            } else if (type === 'finance') {
                // We assume 'finance_shifts' is the key
                const shifts: CashShift[] = JSON.parse(localStorage.getItem('crm_finance_shifts') || '[]'); 
                let loadedShifts: CashShift[] = [];
                // Try to get freshest from local or assume local is synced.
                // For deleting, we need to be careful.
                // Let's assume we clean from the MAIN loaded list which is usually `crm_finance_shifts` (legacy/current).
                try {
                    const snap = await getDoc(doc(db, 'crm_data', 'finance_shifts'));
                    if(snap.exists()) loadedShifts = snap.data().list;
                    else loadedShifts = shifts;
                } catch(e) {
                    loadedShifts = shifts;
                }
                
                const oldShifts = loadedShifts.filter(s => s.status === 'Closed' && s.closeDate && new Date(s.closeDate) < cutoff);
                count = oldShifts.length;
                message = `Se han encontrado ${count} turnos de caja cerrados con antigüedad mayor a ${months} meses.`;
                action = async () => {
                    const newShifts = loadedShifts.filter(s => !(s.status === 'Closed' && s.closeDate && new Date(s.closeDate) < cutoff));
                    localStorage.setItem('crm_finance_shifts', JSON.stringify(newShifts));
                    await setDoc(doc(db, 'crm_data', 'finance_shifts'), { list: newShifts });
                };
            }

            if (count === 0) {
                alert("✅ El sistema está limpio. No se encontraron registros que cumplan los criterios.");
                setIsRunningDiagnostics(false);
                return;
            }

            setConfirmAction({
                isOpen: true,
                title: 'Confirmar Eliminación',
                message: `${message}\n\n¿Eliminar ahora? Esta acción no se puede deshacer.`,
                itemCount: count,
                action: async () => {
                    await action();
                    calculateStorage();
                    setConfirmAction({...confirmAction, isOpen: false});
                    setShowToast({message: `Éxito. Se han eliminado ${count} registros.`, type: 'success'});
                    setIsRunningDiagnostics(false);
                }
            });

        } catch (e) {
            console.error(e);
            setIsRunningDiagnostics(false);
            alert("Error al analizar datos.");
        }
    };

    const handleChange = (field: keyof AppSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const cleanSettings = JSON.parse(JSON.stringify(settings));
            localStorage.setItem('crm_settings', JSON.stringify(cleanSettings));
            window.dispatchEvent(new Event('crm_settings_updated'));
            
            const cleanUsers = JSON.parse(JSON.stringify(users));
            localStorage.setItem('crm_users', JSON.stringify(cleanUsers));

            await setDoc(doc(db, 'crm_data', 'settings'), cleanSettings);
            await setDoc(doc(db, 'crm_data', 'users'), { list: cleanUsers });
            
            setShowToast({ message: `Configuración guardada exitosamente`, type: 'success' });
        } catch(e: any) {
            setShowToast({ message: `Error: ${e.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setShowToast(null), 3000);
        }
    };

    const handleImageUpload = (field: 'logoUrl' | 'systemLogoUrl' | 'qrCodeUrl' | 'signatureUrl', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) {
                setShowToast({ message: "La imagen es demasiado grande. Máximo 500KB.", type: 'error' });
                setTimeout(() => setShowToast(null), 3000);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange(field, reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // ... (User handling functions remain identical) ...
    const handleEditUser = (user: User) => {
        setEditingUser({ ...user, password: user.password || '' });
        setIsUserModalOpen(true);
    };

    const handleNewUser = () => {
        setEditingUser({ name: '', email: '', role: 'Sales', active: true, password: '', permissions: ['view_dashboard', 'view_sales', 'view_calendar'] });
        setIsUserModalOpen(true);
    };

    const sanitizeUser = (user: Partial<User>): User => {
        let finalPermissions = user.permissions || [];
        if (user.role === 'Admin') {
            finalPermissions = ['all']; 
        }
        return {
            id: user.id || Math.random().toString(36).substr(2, 9),
            name: user.name || '',
            email: user.email || '',
            role: user.role || 'Viewer',
            active: user.active ?? true,
            password: user.password || '', 
            permissions: finalPermissions,
            avatar: user.avatar || null as any
        };
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser?.email || !editingUser.name) return;

        if (currentUser && editingUser.id === currentUser.id) {
            if (editingUser.role !== 'Admin' || editingUser.active === false) {
                if (!confirm("ADVERTENCIA CRÍTICA: Estás a punto de quitarte permisos de Administrador o desactivar tu propia cuenta. ¿Estás seguro? Podrías perder acceso.")) {
                    return;
                }
            }
        }

        let updatedUsers = [...users];
        try {
            if (editingUser.id) {
                updatedUsers = users.map(u => u.id === editingUser.id ? sanitizeUser({ ...u, ...editingUser }) : u);
            } else {
                if (!editingUser.password) { alert("Debe establecer una contraseña"); return; }
                updatedUsers.push(sanitizeUser(editingUser));
            }

            setUsers(updatedUsers);
            localStorage.setItem('crm_users', JSON.stringify(updatedUsers));
            await setDoc(doc(db, 'crm_data', 'users'), { list: updatedUsers });

            setIsUserModalOpen(false);
            setShowToast({ message: 'Usuario guardado correctamente', type: 'success' });
        } catch (error: any) {
            setShowToast({ message: `Error al guardar: ${error.message}`, type: 'error' });
        }
        setTimeout(() => setShowToast(null), 3000);
    };

    const handleDeleteUser = async (id: string) => {
        if (currentUser && id === currentUser.id) {
            alert("No puedes eliminar tu propio usuario.");
            return;
        }
        if (confirm('¿Eliminar usuario?')) {
            const updated = users.filter(u => u.id !== id);
            setUsers(updated);
            localStorage.setItem('crm_users', JSON.stringify(updated));
            await setDoc(doc(db, 'crm_data', 'users'), { list: updated });
        }
    };

    const togglePermission = (perm: string) => {
        if (!editingUser || editingUser.role === 'Admin') return; 
        const currentPerms = editingUser.permissions || [];
        setEditingUser({ 
            ...editingUser, 
            permissions: currentPerms.includes(perm) ? currentPerms.filter(p => p !== perm) : [...currentPerms, perm] 
        });
    };

    const handleChangeMyPassword = () => {
        if (myPassword !== myConfirmPassword) { setShowToast({ message: "No coinciden", type: 'error' }); return; }
        if (currentUser) {
            const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: myPassword } : u);
            setUsers(updatedUsers);
            localStorage.setItem('crm_users', JSON.stringify(updatedUsers));
            setDoc(doc(db, 'crm_data', 'users'), { list: updatedUsers });
        }
        setShowToast({ message: "Contraseña actualizada.", type: 'success' });
        setMyPassword(''); setMyConfirmPassword('');
        setTimeout(() => setShowToast(null), 3000);
    };

    // ... (Backup/Restore logic remains same) ...
    const handleBackup = async () => {
        setIsSaving(true);
        const backupData: any = {
            metadata: { version: '1.0', date: new Date().toISOString(), appName: 'BramaStudioCRM' },
            data: {}
        };
        const collections = ['settings', 'users', 'clients', 'inventory', 'sales_history', 'quotes', 'projects', 'calendar', 'finance_shifts', 'categories'];
        
        for (const col of collections) {
            try {
                const snap = await getDoc(doc(db, 'crm_data', col));
                if (snap.exists()) {
                    backupData.data[col] = snap.data().list ? snap.data().list : snap.data(); 
                } else {
                    const local = localStorage.getItem(`crm_${col}`);
                    if (local) backupData.data[col] = JSON.parse(local);
                }
            } catch(e) {
                const local = localStorage.getItem(`crm_${col}`);
                if (local) backupData.data[col] = JSON.parse(local);
            }
        }
        if (backupData.data['settings'] && backupData.data['settings'].list) delete backupData.data['settings'];

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_brama_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsSaving(false);
    };

    const validateBackupSchema = (data: any) => {
        if (!data || typeof data !== 'object') return false;
        if (!data.settings && !data.users) return false;
        return true;
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if(!confirm("ADVERTENCIA: Esta acción REEMPLAZARÁ toda la información actual del sistema con la del archivo de respaldo. ¿Estás seguro de continuar?")) {
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                
                if (!json.metadata || json.metadata.appName !== 'BramaStudioCRM' || !validateBackupSchema(json.data)) {
                    throw new Error("Archivo de respaldo inválido o corrupto.");
                }

                setIsSaving(true);
                const data = json.data;
                const collections = ['settings', 'users', 'clients', 'inventory', 'sales_history', 'quotes', 'projects', 'calendar', 'finance_shifts', 'categories'];
                
                for (const col of collections) {
                    if (data[col]) {
                        if (col === 'settings') {
                            localStorage.setItem(`crm_${col}`, JSON.stringify(data[col]));
                            setSettings(data[col]); 
                        } else {
                            const list = Array.isArray(data[col]) ? data[col] : (data[col].list || []);
                            localStorage.setItem(`crm_${col}`, JSON.stringify(list));
                            if (col === 'users') {
                                setUsers(list);
                                const stillExists = list.find((u: User) => u.id === currentUser?.id);
                                if (stillExists) {
                                    localStorage.setItem('crm_active_user', JSON.stringify(stillExists));
                                }
                            }
                        }

                        try {
                            if (col === 'settings') await setDoc(doc(db, 'crm_data', col), data[col]);
                            else {
                                const list = Array.isArray(data[col]) ? data[col] : (data[col].list || []);
                                await setDoc(doc(db, 'crm_data', col), { list });
                            }
                        } catch (err) { console.error(`Restore cloud error ${col}`, err); }
                    }
                }

                setShowToast({ message: "Sistema restaurado correctamente. Recargando...", type: 'success' });
                setTimeout(() => window.location.reload(), 2000);

            } catch (err: any) {
                setShowToast({ message: `Error al restaurar: ${err.message}`, type: 'error' });
                setIsSaving(false);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; 
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
                {activeTab !== 'backup' && activeTab !== 'storage' && (
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg active:scale-95 disabled:opacity-50">
                        {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18} />} {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 space-y-1">
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Cuenta</p>
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-brand-900 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}><UserIcon size={18} /> Mi Perfil</button>
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6">Sistema</p>
                    {[
                        { id: 'company', icon: Building, label: 'Empresa & App' },
                        { id: 'pdf', icon: Printer, label: 'Documentos PDF' },
                        { id: 'users', icon: Users, label: 'Usuarios' },
                        { id: 'finance', icon: DollarSign, label: 'Moneda e Impuestos' },
                        { id: 'backup', icon: Database, label: 'Respaldo de Datos' },
                        { id: 'storage', icon: HardDrive, label: 'Salud del Sistema' },
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-brand-900 text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                            <tab.icon size={18} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 space-y-6">
                    {/* ... (Existing Tabs: profile, company, pdf, users, backup remain exactly as they were) ... */}
                    {activeTab === 'profile' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2"><Lock size={20}/> Seguridad Personal</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label><input type="password" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none bg-white text-gray-900" value={myPassword} onChange={(e) => setMyPassword(e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirmar</label><input type="password" className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none bg-white text-gray-900" value={myConfirmPassword} onChange={(e) => setMyConfirmPassword(e.target.value)} /></div>
                            </div>
                            <button onClick={handleChangeMyPassword} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 text-sm">Actualizar</button>
                        </div>
                    )}

                    {activeTab === 'company' && (
                       <div className="space-y-6">
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Datos Generales</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label><input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={settings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Sitio Web</label><input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={settings.website} onChange={(e) => handleChange('website', e.target.value)} /></div>
                                </div>
                            </div>
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2"><Palette size={20}/> Personalización</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Color Principal</label>
                                        <div className="flex gap-2"><input type="color" className="h-10 w-12 rounded cursor-pointer border-none" value={settings.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} /><input type="text" className="flex-1 px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={settings.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} /></div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Color Secundario</label>
                                        <div className="flex gap-2"><input type="color" className="h-10 w-12 rounded cursor-pointer border-none" value={settings.secondaryColor || '#00f24a'} onChange={(e) => handleChange('secondaryColor', e.target.value)} /><input type="text" className="flex-1 px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={settings.secondaryColor || '#00f24a'} onChange={(e) => handleChange('secondaryColor', e.target.value)} /></div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Logo del Sistema (Login/Sidebar)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 border border-gray-200 rounded-xl bg-white flex items-center justify-center relative overflow-hidden group shadow-sm">
                                            {settings.systemLogoUrl ? <img src={settings.systemLogoUrl} className="h-full object-contain p-1" alt="System Logo"/> : <Upload size={20} className="text-gray-400"/>}
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload('systemLogoUrl', e)} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
                                                <LinkIcon size={14} className="text-gray-400"/>
                                                <input type="text" placeholder="URL imagen..." className="flex-1 text-xs outline-none text-gray-700 bg-white" value={settings.systemLogoUrl || ''} onChange={(e) => handleChange('systemLogoUrl', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pdf' && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6 flex items-center gap-2"><Building size={20}/> Estilo de Documentos</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Logo para PDF</label>
                                        <div className="space-y-3">
                                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-800 h-32 relative overflow-hidden group hover:border-gray-400 transition-colors">
                                                {settings.logoUrl ? <img src={settings.logoUrl} className="h-full object-contain p-2" alt="PDF Logo"/> : <div className="text-gray-400 flex flex-col items-center"><Upload size={24}/><span className="text-xs mt-2">Subir Archivo (Max 500KB)</span></div>}
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload('logoUrl', e)} />
                                            </div>
                                            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
                                                <LinkIcon size={14} className="text-gray-400 flex-shrink-0"/>
                                                <input type="text" placeholder="Link directo..." className="flex-1 text-xs outline-none text-gray-700 bg-white" value={settings.logoUrl || ''} onChange={(e) => handleChange('logoUrl', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Color Fondo Cabecera</label><div className="flex gap-2"><input type="color" className="h-10 w-12 rounded cursor-pointer border-none" value={settings.pdfHeaderColor || settings.primaryColor} onChange={(e) => handleChange('pdfHeaderColor', e.target.value)} /><input type="text" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900" value={settings.pdfHeaderColor || settings.primaryColor} onChange={(e) => handleChange('pdfHeaderColor', e.target.value)} /></div></div>
                                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Información Emisor</label><textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-24 resize-none bg-white text-gray-900" value={settings.pdfSenderInfo} onChange={(e) => handleChange('pdfSenderInfo', e.target.value)} /></div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6 flex items-center gap-2"><FileText size={20}/> Footer & Legal</h2>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2 flex justify-between">
                                                Términos y Condiciones
                                                <span className={`text-xs ${settings.termsAndConditions.length > 600 ? 'text-red-500' : 'text-gray-400'}`}>{settings.termsAndConditions.length}/600</span>
                                            </label>
                                            <textarea 
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-32 bg-white text-gray-900" 
                                                value={settings.termsAndConditions} 
                                                maxLength={600}
                                                onChange={(e) => handleChange('termsAndConditions', e.target.value)} 
                                                placeholder="Máximo 600 caracteres para evitar desbordes."
                                            />
                                        </div>
                                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Métodos de Pago</label><textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-32 bg-white text-gray-900" value={settings.paymentInfo} onChange={(e) => handleChange('paymentInfo', e.target.value)} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Código QR</label>
                                            <div className="flex gap-4 items-center">
                                                <div className="h-20 w-20 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center relative overflow-hidden"><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload('qrCodeUrl', e)} />{settings.qrCodeUrl ? <img src={settings.qrCodeUrl} className="h-full object-contain"/> : <Upload size={20} className="text-gray-400"/>}</div>
                                                <input type="text" placeholder="URL imagen..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-900" value={settings.qrCodeUrl || ''} onChange={(e) => handleChange('qrCodeUrl', e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Firma Digital</label>
                                            <div className="flex gap-4 items-center">
                                                <div className="h-20 w-32 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center relative overflow-hidden"><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload('signatureUrl', e)} />{settings.signatureUrl ? <img src={settings.signatureUrl} className="h-full object-contain"/> : <Upload size={20} className="text-gray-400"/>}</div>
                                                <div className="flex-1 space-y-2">
                                                    <input type="text" placeholder="Nombre Firmante" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-900" value={settings.signatureName} onChange={(e) => handleChange('signatureName', e.target.value)} />
                                                    <input type="text" placeholder="Cargo" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-900" value={settings.signatureTitle} onChange={(e) => handleChange('signatureTitle', e.target.value)} />
                                                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5 bg-white"><LinkIcon size={12} className="text-gray-400"/><input type="text" placeholder="Link firma..." className="flex-1 text-xs outline-none text-gray-700 bg-white" value={settings.signatureUrl || ''} onChange={(e) => handleChange('signatureUrl', e.target.value)} /></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div><label className="block text-sm font-bold text-gray-700 mb-2">Texto Footer</label><input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900" value={settings.pdfFooterText} onChange={(e) => handleChange('pdfFooterText', e.target.value)} /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2"><DollarSign size={20}/> Moneda e Impuestos</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Moneda</label><input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={settings.currencyName} onChange={(e) => handleChange('currencyName', e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Símbolo</label><input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={settings.currencySymbol} onChange={(e) => handleChange('currencySymbol', e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Decimales</label><input type="number" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={settings.decimals} onChange={(e) => handleChange('decimals', Number(e.target.value))} /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Impuesto (ej. IVA)</label><input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={settings.taxName} onChange={(e) => handleChange('taxName', e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tasa Impuesto (%)</label><input type="number" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={settings.taxRate} onChange={(e) => handleChange('taxRate', Number(e.target.value))} /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta ID Fiscal (NIT, RUC, CI)</label><input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900" value={settings.taxIdLabel || 'NIT'} onChange={(e) => handleChange('taxIdLabel', e.target.value)} /></div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                                <h2 className="text-lg font-bold text-gray-900">Usuarios</h2>
                                <button onClick={handleNewUser} className="flex items-center gap-1 bg-brand-900 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-brand-800"><Plus size={16}/> Agregar</button>
                            </div>
                            <div className="space-y-3">
                                {users.map(u => (
                                    <div key={u.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-brand-300 transition-colors shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${u.active ? 'bg-brand-900' : 'bg-gray-400'}`}>{u.name.charAt(0)}</div>
                                            <div><p className="font-bold text-gray-900 flex items-center gap-2">{u.name} {!u.active && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactivo</span>} {u.role === 'Admin' && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full border border-purple-200">Admin</span>}</p><p className="text-xs text-gray-500">{u.email} • {u.role}</p></div>
                                        </div>
                                        <div className="flex gap-2"><button onClick={() => handleEditUser(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={18}/></button><button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><Database size={40} className="text-blue-600"/></div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">Respaldo y Restauración</h2>
                                <p className="text-gray-500 mb-8 max-w-lg mx-auto">Genera una copia de seguridad o restaura desde un archivo JSON.</p>
                                <div className="flex flex-col sm:flex-row justify-center gap-4">
                                    <button onClick={handleBackup} disabled={isSaving} className="flex items-center justify-center gap-2 px-6 py-4 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 shadow-lg disabled:opacity-50">{isSaving ? <RefreshCw className="animate-spin" size={20}/> : <Download size={20}/>} Descargar Copia</button>
                                    <div className="relative">
                                        <input type="file" accept=".json" onChange={handleRestore} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                        <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-dashed border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-all"><Upload size={20}/> Restaurar Copia</button>
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-100 flex items-start gap-3 text-left bg-yellow-50 p-4 rounded-xl">
                                    <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20}/>
                                    <div><h4 className="font-bold text-yellow-800 text-sm">Advertencia</h4><p className="text-xs text-yellow-700 mt-1">Al restaurar, <strong>toda la información actual será reemplazada</strong>. Usa archivos confiables.</p></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NEW STORAGE HEALTH & MAINTENANCE TAB */}
                    {activeTab === 'storage' && (
                        <div className="space-y-6 animate-in fade-in">
                            {/* PLAN SELECTOR HEADER */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-full ${planType === 'Pro' ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                        <Crown size={24}/>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">Modo de Plan</h3>
                                        <p className="text-xs text-gray-500">Ajusta los límites y alertas del sistema</p>
                                    </div>
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button onClick={() => togglePlan('Free')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${planType === 'Free' ? 'bg-white text-brand-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Plan Gratuito</button>
                                    <button onClick={() => togglePlan('Pro')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${planType === 'Pro' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Plan Pro / Ilimitado</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* 1. Storage Overview */}
                                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4 justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Activity size={24}/></div>
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900">Salud del Almacenamiento</h2>
                                                <p className="text-xs text-gray-500">Monitoreo de documentos.</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsInfoModalOpen(true)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors" title="Guía Informativa"><HelpCircle size={20}/></button>
                                    </div>
                                    <div className="space-y-4">
                                        <StorageBar label="Clientes" size={storageStats.clients || 0} planType={planType} />
                                        <StorageBar label="Inventario" size={storageStats.inventory || 0} planType={planType} />
                                        <StorageBar label="Cotizaciones" size={storageStats.quotes || 0} planType={planType} />
                                        <StorageBar label="Proyectos" size={storageStats.projects || 0} planType={planType} />
                                        <StorageBar label="Logs Auditoría" size={storageStats.audit_logs || 0} planType={planType} />
                                        
                                        <button onClick={() => { calculateStorage(); setShowToast({message: "Métricas actualizadas", type: 'success'}); setTimeout(()=>setShowToast(null), 2000); }} className="text-sm text-brand-900 font-bold hover:underline flex items-center gap-1 mt-4"><RefreshCw size={14}/> Refrescar Métricas</button>
                                    </div>
                                </div>

                                {/* 2. Architecture & Maintenance */}
                                <div className="space-y-6">
                                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Server size={24}/></div>
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900">Blindaje de Arquitectura</h2>
                                                <p className="text-xs text-gray-500">Estado de la estrategia de particionamiento.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <ArchitectureStatus module="Ventas" status="Active" strategy="Partición Anual (Sharding)" year={true} />
                                            <ArchitectureStatus module="Finanzas" status="Active" strategy="Partición Anual (Sharding)" year={true} />
                                            <ArchitectureStatus module="Comunicaciones" status="Active" strategy="Partición por Cliente (1:1)" />
                                            <ArchitectureStatus module="Cotizaciones" status="Warning" strategy="Archivo Único (Monitoreado)" />
                                        </div>
                                    </div>

                                    {/* Auto-Cleanup Configuration */}
                                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Brush size={24}/></div>
                                                <div>
                                                    <h2 className="text-lg font-bold text-gray-900">Permitir Mantenimiento</h2>
                                                    <p className="text-xs text-gray-500">Interruptor de seguridad global.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-500">{settings.autoCleanupEnabled ? 'ACTIVO' : 'BLOQUEADO'}</span>
                                                <button onClick={() => handleChange('autoCleanupEnabled', !settings.autoCleanupEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoCleanupEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoCleanupEnabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* GRANULAR CLEANUP CONSOLE */}
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><RefreshCw size={20}/> Consola de Mantenimiento Granular</h3>
                                
                                <div className="space-y-4">
                                    <MaintenanceRow 
                                        title="Clientes Inactivos" 
                                        description="Sin ventas, proyectos ni contacto reciente."
                                        icon={Users}
                                        onAction={(months: number) => handleGranularCleanup('clients', months)}
                                        isDisabled={!settings.autoCleanupEnabled || isRunningDiagnostics}
                                    />
                                    <MaintenanceRow 
                                        title="Ventas Históricas" 
                                        description="Registros antiguos de ventas ya cerradas."
                                        icon={DollarSign}
                                        onAction={(months: number) => handleGranularCleanup('sales', months)}
                                        isDisabled={!settings.autoCleanupEnabled || isRunningDiagnostics}
                                    />
                                    <MaintenanceRow 
                                        title="Cotizaciones" 
                                        description="Borradores y cotizaciones rechazadas."
                                        icon={FileText}
                                        onAction={(months: number) => handleGranularCleanup('quotes', months)}
                                        isDisabled={!settings.autoCleanupEnabled || isRunningDiagnostics}
                                    />
                                    <MaintenanceRow 
                                        title="Proyectos Finalizados" 
                                        description="Proyectos con estado 'Completado'."
                                        icon={Building}
                                        onAction={(months: number) => handleGranularCleanup('projects', months)}
                                        isDisabled={!settings.autoCleanupEnabled || isRunningDiagnostics}
                                    />
                                    <MaintenanceRow 
                                        title="Turnos de Caja (Finanzas)" 
                                        description="Turnos cerrados y conciliados."
                                        icon={Lock}
                                        onAction={(months: number) => handleGranularCleanup('finance', months)}
                                        isDisabled={!settings.autoCleanupEnabled || isRunningDiagnostics}
                                    />
                                    <MaintenanceRow 
                                        title="Logs de Auditoría" 
                                        description="Registros de actividad del sistema."
                                        icon={Shield}
                                        onAction={(months: number) => handleGranularCleanup('logs', months)}
                                        isDisabled={!settings.autoCleanupEnabled || isRunningDiagnostics}
                                    />
                                </div>
                                
                                {!settings.autoCleanupEnabled && (
                                    <p className="text-center text-xs text-orange-500 mt-6 flex items-center justify-center gap-1 font-bold">
                                        <Lock size={12}/> Las acciones están bloqueadas por el interruptor de seguridad superior.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* INFO MODAL */}
            {isInfoModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
                        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10 flex justify-between items-center">
                            <h3 className="font-bold text-xl text-brand-900 flex items-center gap-2"><HelpCircle size={24} className="text-blue-600"/> Guía de Mantenimiento</h3>
                            <button onClick={() => setIsInfoModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} className="text-gray-500"/></button>
                        </div>
                        <div className="p-8 space-y-6 text-gray-700 leading-relaxed">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-900 mb-6">
                                <strong>Resumen:</strong> Esta sección te permite monitorear y optimizar el uso de tu base de datos para mantener el sistema rápido y, si lo deseas, dentro de los límites gratuitos de Google.
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-900 text-lg mb-2">1. ¿Qué es el límite de 1MB?</h4>
                                <p className="text-sm text-gray-600">
                                    En Firestore (la base de datos que usamos), cada "Documento" tiene un límite máximo de 1 Megabyte (aprox. 1 millón de caracteres). 
                                    Para evitar costos excesivos por "Lecturas", este sistema agrupa muchos datos (ej. Clientes) en un solo documento.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-gray-200 rounded-xl">
                                    <h5 className="font-bold text-sm mb-2 text-green-700">Plan Gratuito</h5>
                                    <p className="text-xs text-gray-500">Ideal para freelancers. Debes vigilar que las barras no lleguen al rojo. Si se llenan, usa las herramientas de "Limpieza" para borrar datos viejos.</p>
                                </div>
                                <div className="p-4 border border-gray-200 rounded-xl">
                                    <h5 className="font-bold text-sm mb-2 text-blue-700">Plan Pro (Pago)</h5>
                                    <p className="text-xs text-gray-500">Si pagas por Firestore, el límite de 1MB sigue existiendo por documento técnico, pero el sistema escala automáticamente. Puedes ignorar las advertencias amarillas.</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-900 text-lg mb-2">2. Estrategia de "Sharding" (Particionamiento)</h4>
                                <p className="text-sm text-gray-600">
                                    Para que nunca te quedes sin espacio en lo importante, el sistema usa una técnica avanzada:
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-600">
                                    <li><strong>Ventas y Finanzas:</strong> Se crea un documento nuevo automáticamente cada año. (Nunca se llenará).</li>
                                    <li><strong>Chats:</strong> Se crea un documento individual por cada Cliente. (Infinito).</li>
                                    <li><strong>Clientes e Inventario:</strong> Usan documentos simples. Capacidad aprox: 2,500 clientes y 3,000 productos. Si llegas a ese límite, ¡felicidades! Es hora de pagar el plan Pro de Google ($0.18/GB).</li>
                                </ul>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-200 text-right">
                            <button onClick={() => setIsInfoModalOpen(false)} className="px-6 py-2 bg-brand-900 text-white rounded-xl font-bold">Entendido</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION MODAL */}
            {confirmAction.isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <AlertTriangle size={32}/>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmAction.title}</h3>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed whitespace-pre-line">
                            {confirmAction.message}
                        </p>
                        
                        {confirmAction.itemCount !== undefined && (
                            <div className="bg-gray-50 py-2 px-4 rounded-lg mb-6 inline-block border border-gray-200">
                                <span className="text-xs font-bold text-gray-500 uppercase">Registros afectados</span>
                                <p className="text-2xl font-black text-gray-800">{confirmAction.itemCount}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmAction({ ...confirmAction, isOpen: false })} 
                                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmAction.action} 
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg transition-colors"
                            >
                                Confirmar y Borrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Modal (Same as before) */}
            {isUserModalOpen && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center"><h3 className="font-bold text-lg text-gray-900">{editingUser.id ? 'Editar Usuario' : 'Nuevo Usuario'}</h3><button onClick={() => setIsUserModalOpen(false)}><X size={20} className="text-gray-500"/></button></div>
                        <form onSubmit={handleSaveUser} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Nombre</label><input required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Rol</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}><option value="Sales" className="bg-white text-gray-900">Vendedor</option><option value="Admin" className="bg-white text-gray-900">Admin</option></select></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Email</label><input required type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} /></div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center mb-3"><label className="block text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Shield size={12}/> Permisos</label><div className="text-[10px] text-gray-400">{editingUser.role === 'Admin' ? 'Acceso Total' : 'Personalizable'}</div></div>
                                <div className="grid grid-cols-1 gap-y-3 max-h-48 overflow-y-auto pr-2">
                                    {availablePermissions.map(perm => {
                                        const isChecked = editingUser.role === 'Admin' || editingUser.permissions?.includes('all') || editingUser.permissions?.includes(perm.id) || false;
                                        return (
                                            <div key={perm.id} className="flex items-center justify-between py-1 hover:bg-gray-100 rounded px-1">
                                                <span className={`text-xs font-medium ${perm.id.includes('delete') || perm.id.includes('manage') ? 'text-red-700' : 'text-gray-700'}`}>{perm.label}</span>
                                                <Switch checked={isChecked} onChange={() => togglePermission(perm.id)} disabled={editingUser.role === 'Admin'}/>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1"><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">{editingUser.id ? 'Nueva Clave' : 'Clave'}</label><input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" placeholder={editingUser.id ? "Opcional" : "Requerido"} value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} required={!editingUser.id} /></div>
                                <div className="w-1/3"><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Estado</label><select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" value={editingUser.active ? 'active' : 'inactive'} onChange={e => setEditingUser({...editingUser, active: e.target.value === 'active'})}><option value="active" className="bg-white text-gray-900">Activo</option><option value="inactive" className="bg-white text-gray-900">Inactivo</option></select></div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-brand-900 text-white rounded-xl font-bold hover:bg-brand-800 mt-2">Guardar Usuario</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};