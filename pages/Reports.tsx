import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, DollarSign, ShoppingBag, Users, Calendar, Filter, Shield, AlertTriangle, RefreshCw, Search, Trash2, Edit3, PlusCircle, Archive, Box } from 'lucide-react';
import { Sale, InventoryItem, AuditLog, User } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const COLORS = ['#162836', '#00f24a', '#8884d8', '#ff8042', '#00C49F', '#FFBB28'];

// KPI Card
const KPICard = ({ title, value, subtext, icon: Icon, colorClass, bgClass }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
                <Icon size={24} />
            </div>
        </div>
        {subtext && <div className="text-sm font-medium text-gray-400">{subtext}</div>}
    </div>
);

type DateRange = 'today' | '7days' | '15days' | '30days' | '3months' | '6months' | '1year' | 'all';

export const Reports = () => {
    const [activeTab, setActiveTab] = useState<'Financial' | 'Inventory' | 'Audit'>('Financial');
    const [allSales, setAllSales] = useState<Sale[]>([]);
    const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    
    // Audit Filters
    const [auditUserFilter, setAuditUserFilter] = useState<string>('All');
    const [auditActionFilter, setAuditActionFilter] = useState<string>('All');
    const [auditModuleFilter, setAuditModuleFilter] = useState<string>('All');
    const [isCleaningLogs, setIsCleaningLogs] = useState(false);
    
    // Metrics
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalTx, setTotalTx] = useState(0);
    const [avgTicket, setAvgTicket] = useState(0);
    
    // Charts Data
    const [areaData, setAreaData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    
    // Filter State
    const [dateRange, setDateRange] = useState<DateRange>('30days');

    useEffect(() => {
        const u = localStorage.getItem('crm_active_user');
        if (u) setCurrentUser(JSON.parse(u));

        const loadData = async () => {
             // Load Sales
             const sDoc = await getDoc(doc(db, 'crm_data', 'sales_history'));
             if (sDoc.exists()) setAllSales(sDoc.data().list);
             else {
                 const s = localStorage.getItem('crm_sales_history');
                 if(s) setAllSales(JSON.parse(s));
             }

             // Load Inventory
             const iDoc = await getDoc(doc(db, 'crm_data', 'inventory'));
             if(iDoc.exists()) setInventory(iDoc.data().list);

             // Load Audit Logs (Admin Only)
             try {
                 const auditDoc = await getDoc(doc(db, 'crm_data', 'audit_logs'));
                 if (auditDoc.exists()) setAuditLogs(auditDoc.data().list.reverse()); // Newest first
                 else {
                     const localLogs = localStorage.getItem('crm_audit_logs');
                     if (localLogs) setAuditLogs(JSON.parse(localLogs));
                 }
             } catch(e) {}
        };
        loadData();
    }, []);

    // Filter Logic Financial
    useEffect(() => {
        const now = new Date();
        // Fix: Use exact boundaries for comparison
        now.setHours(23, 59, 59, 999); 
        
        let startDate = new Date();
        startDate.setHours(0,0,0,0);

        switch (dateRange) {
            case 'today': break;
            case '7days': startDate.setDate(now.getDate() - 7); break;
            case '15days': startDate.setDate(now.getDate() - 15); break;
            case '30days': startDate.setDate(now.getDate() - 30); break;
            case '3months': startDate.setMonth(now.getMonth() - 3); break;
            case '6months': startDate.setMonth(now.getMonth() - 6); break;
            case '1year': startDate.setFullYear(now.getFullYear() - 1); break;
            case 'all': startDate = new Date(0); break;
        }

        const filtered = allSales.filter(s => {
            const d = new Date(s.date);
            return d >= startDate && d <= now;
        });

        setFilteredSales(filtered);

        // Metrics
        const rev = filtered.reduce((acc, s) => acc + s.total, 0);
        setTotalRevenue(rev);
        setTotalTx(filtered.length);
        setAvgTicket(filtered.length > 0 ? rev / filtered.length : 0);

        // Charts
        const dailyMap = new Map();
        // Sort sales by date first for chart flow
        const sortedSales = [...filtered].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        sortedSales.forEach(s => {
            const key = new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            dailyMap.set(key, (dailyMap.get(key) || 0) + s.total);
        });
        setAreaData(Array.from(dailyMap).map(([name, total]) => ({name, total})));

        const catMap = new Map();
        filtered.forEach(s => {
            s.items.forEach(item => {
                const refItem = inventory.find(i => i.name === item.description);
                const cat = refItem ? refItem.category : 'General';
                catMap.set(cat, (catMap.get(cat) || 0) + item.total);
            });
        });
        setCategoryData(Array.from(catMap).map(([name, value]) => ({ name, value })));

    }, [allSales, dateRange, inventory]);

    const handleExportSales = () => {
        const data = filteredSales.map(s => ({
            ID: s.id,
            Fecha: new Date(s.date).toLocaleDateString(),
            Cliente: s.clientName,
            Total: s.total,
            Estado: s.paymentStatus,
            Items: s.items.map(i => `${i.quantity}x ${i.description}`).join(', ')
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte_Ventas");
        XLSX.writeFile(wb, `Reporte_Ventas_${dateRange}.xlsx`);
    };

    const handleExportInventory = () => {
        const data = inventory.map(i => ({
            Nombre: i.name,
            SKU: i.sku,
            Categoria: i.category,
            Cantidad: i.quantity,
            Costo: i.price,
            ValorTotal: i.quantity * i.price,
            Estado: i.status
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario_Valorizado");
        XLSX.writeFile(wb, `Reporte_Inventario_${new Date().toLocaleDateString().replace(/\//g,'-')}.xlsx`);
    };

    const handleExportAudit = () => {
        const data = auditLogs.map(l => ({
            Fecha: new Date(l.timestamp).toLocaleString(),
            Usuario: l.user,
            Accion: l.action,
            Modulo: l.module,
            Descripcion: l.description,
            Detalles: l.metadata
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
        XLSX.writeFile(wb, `Reporte_Auditoria.xlsx`);
    };

    // --- Audit Functions ---
    const handleCleanLogs = async () => {
        if (!confirm("¿Depurar registros antiguos? Se eliminarán eventos con más de 30 días de antigüedad para liberar espacio.")) return;
        
        setIsCleaningLogs(true);
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            // Filter locally first since we store as a single array
            const freshLogs = auditLogs.filter(log => new Date(log.timestamp) >= thirtyDaysAgo);
            
            // Simulate batching for large lists to prevent memory freeze (conceptually)
            // In a real Firestore collection per log, we'd use batch.delete()
            
            await setDoc(doc(db, 'crm_data', 'audit_logs'), { list: freshLogs });
            setAuditLogs(freshLogs);
            localStorage.setItem('crm_audit_logs', JSON.stringify(freshLogs));
            alert("Depuración completada.");
        } catch (e) {
            console.error(e);
            alert("Error al depurar registros.");
        } finally {
            setIsCleaningLogs(false);
        }
    };

    // Optimize filtering
    const filteredAuditLogs = useMemo(() => {
        return auditLogs.filter(log => {
            const matchesUser = auditUserFilter === 'All' || log.user === auditUserFilter;
            const matchesAction = auditActionFilter === 'All' || log.action === auditActionFilter;
            const matchesModule = auditModuleFilter === 'All' || log.module === auditModuleFilter;
            return matchesUser && matchesAction && matchesModule;
        });
    }, [auditLogs, auditUserFilter, auditActionFilter, auditModuleFilter]);

    const uniqueUsers = useMemo(() => Array.from(new Set(auditLogs.map(l => l.user))), [auditLogs]);
    const deletedCount = useMemo(() => filteredAuditLogs.filter(l => l.action === 'Delete').length, [filteredAuditLogs]);

    // Inventory Metrics
    const inventoryValuation = useMemo(() => inventory.reduce((acc, item) => acc + (item.quantity * item.price), 0), [inventory]);
    const lowStockCount = useMemo(() => inventory.filter(i => i.status === 'Low Stock' || i.status === 'Critical').length, [inventory]);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reportes</h1>
                    <p className="text-sm text-gray-500">Inteligencia de negocios y seguridad</p>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('Financial')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'Financial' ? 'bg-white shadow text-brand-900' : 'text-gray-500 hover:text-gray-700'}`}>Financiero</button>
                    <button onClick={() => setActiveTab('Inventory')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'Inventory' ? 'bg-white shadow text-brand-900' : 'text-gray-500 hover:text-gray-700'}`}>Inventario</button>
                    {currentUser?.role === 'Admin' && (
                        <button onClick={() => setActiveTab('Audit')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'Audit' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Shield size={14}/> Auditoría
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'Financial' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-end">
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="bg-white border border-gray-200 px-2 py-1 rounded-xl flex items-center shadow-sm">
                                <Calendar size={16} className="ml-2 text-gray-400"/>
                                <select 
                                    value={dateRange} 
                                    onChange={(e) => setDateRange(e.target.value as DateRange)}
                                    className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 outline-none py-1 pr-2 pl-2 cursor-pointer"
                                >
                                    <option value="today" className="bg-white text-gray-900">Hoy</option>
                                    <option value="7days" className="bg-white text-gray-900">Últimos 7 días</option>
                                    <option value="15days" className="bg-white text-gray-900">Últimos 15 días</option>
                                    <option value="30days" className="bg-white text-gray-900">Últimos 30 días</option>
                                    <option value="3months" className="bg-white text-gray-900">Últimos 3 meses</option>
                                    <option value="6months" className="bg-white text-gray-900">Últimos 6 meses</option>
                                    <option value="1year" className="bg-white text-gray-900">Último Año</option>
                                    <option value="all" className="bg-white text-gray-900">Todo el historial</option>
                                </select>
                            </div>
                            <button onClick={handleExportSales} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg transition-all active:scale-95">
                                <Download size={16} /> Exportar Excel
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KPICard title="Ingresos (Periodo)" value={`Bs. ${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`} subtext={`${filteredSales.length} transacciones`} icon={DollarSign} bgClass="bg-green-50" colorClass="text-green-600"/>
                        <KPICard title="Items Vendidos" value={filteredSales.reduce((acc, s) => acc + s.items.reduce((ac, i) => ac + i.quantity, 0), 0)} subtext="Volumen de producto" icon={ShoppingBag} bgClass="bg-blue-50" colorClass="text-blue-600"/>
                        <KPICard title="Ticket Promedio" value={`Bs. ${avgTicket.toFixed(2)}`} subtext="Ingreso por venta" icon={Users} bgClass="bg-purple-50" colorClass="text-purple-600"/>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                            <h3 className="font-bold text-gray-900 text-lg mb-6">Evolución de Ventas</h3>
                            <div className="w-full h-[350px] min-h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={areaData}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#162836" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#162836" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10}/>
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#1f2937' }}/>
                                        <Area type="monotone" dataKey="total" stroke="#162836" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                            <h3 className="font-bold text-gray-900 text-lg mb-6">Ventas por Categoría</h3>
                            <div className="w-full h-[350px] min-h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                            {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Inventory' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-end">
                        <button onClick={handleExportInventory} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg transition-all active:scale-95">
                            <Download size={16} /> Exportar Inventario
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <KPICard 
                            title="Valor Total Inventario" 
                            value={`Bs. ${inventoryValuation.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
                            subtext="Capital inmovilizado (Costo)" 
                            icon={DollarSign} 
                            bgClass="bg-blue-50" 
                            colorClass="text-blue-600"
                        />
                        <KPICard 
                            title="Stock Bajo / Crítico" 
                            value={lowStockCount} 
                            subtext="Ítems que requieren atención" 
                            icon={AlertTriangle} 
                            bgClass="bg-orange-50" 
                            colorClass="text-orange-600"
                        />
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 text-lg mb-4">Top Productos por Valor</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3 text-right">Cantidad</th>
                                        <th className="px-4 py-3 text-right">Costo Unit.</th>
                                        <th className="px-4 py-3 text-right">Valor Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm">
                                    {[...inventory].sort((a,b) => (b.quantity*b.price) - (a.quantity*a.price)).slice(0, 10).map(item => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right">Bs. {item.price}</td>
                                            <td className="px-4 py-3 text-right font-bold text-brand-900">Bs. {(item.quantity * item.price).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* AUDIT LOG VIEWER */}
            {activeTab === 'Audit' && currentUser?.role === 'Admin' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex justify-end mb-4">
                         <button onClick={handleExportAudit} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">
                            <Download size={16} /> Descargar Logs
                        </button>
                    </div>
                    {/* Security Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-red-600 font-bold text-sm uppercase">Alertas de Eliminación</p>
                                    <h3 className="text-3xl font-bold text-red-900 mt-1">{deletedCount}</h3>
                                </div>
                                <div className="p-3 bg-white rounded-xl shadow-sm text-red-500"><Trash2 size={24}/></div>
                            </div>
                            <p className="text-xs text-red-600/70 mt-2">Documentos borrados permanentemente.</p>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-blue-700 font-bold text-sm uppercase">Modificaciones</p>
                                    <h3 className="text-3xl font-bold text-blue-900 mt-1">{filteredAuditLogs.filter(l => l.action === 'Update').length}</h3>
                                </div>
                                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600"><Edit3 size={24}/></div>
                            </div>
                            <p className="text-xs text-blue-700/70 mt-2">Cambios en montos o detalles.</p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-purple-700 font-bold text-sm uppercase">Total Eventos</p>
                                    <h3 className="text-3xl font-bold text-purple-900 mt-1">{filteredAuditLogs.length}</h3>
                                </div>
                                <div className="p-3 bg-white rounded-xl shadow-sm text-purple-600"><Shield size={24}/></div>
                            </div>
                            <p className="text-xs text-purple-700/70 mt-2">Total de acciones registradas.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Shield size={24} className="text-brand-900"/> Registro Forense</h2>
                                <p className="text-gray-500 text-sm mt-1">Supervisión de actividad de usuarios.</p>
                            </div>
                            
                            {/* FILTERS */}
                            <div className="flex flex-wrap gap-2">
                                <select className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500" value={auditUserFilter} onChange={e => setAuditUserFilter(e.target.value)}>
                                    <option value="All" className="bg-white text-gray-900">Todos los Usuarios</option>
                                    {uniqueUsers.map(u => <option key={u} value={u} className="bg-white text-gray-900">{u}</option>)}
                                </select>
                                <select className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500" value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)}>
                                    <option value="All" className="bg-white text-gray-900">Todas las Acciones</option>
                                    <option value="Delete" className="bg-white text-gray-900">Eliminaciones</option>
                                    <option value="Update" className="bg-white text-gray-900">Ediciones</option>
                                    <option value="Create" className="bg-white text-gray-900">Creaciones</option>
                                </select>
                                <select className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500" value={auditModuleFilter} onChange={e => setAuditModuleFilter(e.target.value)}>
                                    <option value="All" className="bg-white text-gray-900">Todos los Módulos</option>
                                    <option value="Sales" className="bg-white text-gray-900">Ventas</option>
                                    <option value="Quotes" className="bg-white text-gray-900">Cotizaciones</option>
                                    <option value="Inventory" className="bg-white text-gray-900">Inventario</option>
                                </select>
                                
                                <button onClick={handleCleanLogs} disabled={isCleaningLogs} className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors">
                                    {isCleaningLogs ? <RefreshCw className="animate-spin" size={14}/> : <Archive size={14}/>} Depurar Antiguos
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Fecha / Hora</th>
                                            <th className="px-6 py-4">Usuario</th>
                                            <th className="px-6 py-4">Acción</th>
                                            <th className="px-6 py-4">Módulo</th>
                                            <th className="px-6 py-4">Detalle</th>
                                            <th className="px-6 py-4">Evidencia (Metadata)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {filteredAuditLogs.map((log) => (
                                            <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${log.action === 'Delete' ? 'bg-red-50/40' : ''}`}>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleDateString()} <span className="text-gray-400">|</span> {new Date(log.timestamp).toLocaleTimeString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700">{log.user.charAt(0)}</div>
                                                        <span className="font-bold text-gray-900">{log.user}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 w-fit ${log.action === 'Delete' ? 'bg-red-100 text-red-700 border border-red-200' : log.action === 'Update' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                                        {log.action === 'Delete' ? <Trash2 size={10}/> : log.action === 'Update' ? <Edit3 size={10}/> : <PlusCircle size={10}/>}
                                                        {log.action === 'Delete' ? 'Eliminación' : log.action === 'Update' ? 'Edición' : 'Creación'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 font-medium">{log.module}</td>
                                                <td className="px-6 py-4 text-gray-800">{log.description}</td>
                                                <td className="px-6 py-4 text-xs font-mono text-gray-500 max-w-xs break-all" title={log.metadata}>
                                                    {log.metadata || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredAuditLogs.length === 0 && (
                                            <tr><td colSpan={6} className="text-center py-12 text-gray-400">Sin registros que coincidan con los filtros.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};