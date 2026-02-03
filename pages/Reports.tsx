import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, DollarSign, ShoppingBag, Users, Calendar, Filter, Shield, AlertTriangle, RefreshCw, Search, Trash2, TrendingUp } from 'lucide-react';
import { Sale, InventoryItem, AuditLog, User } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const COLORS = ['#162836', '#00f24a', '#8884d8', '#ff8042', '#00C49F', '#FFBB28'];

// KPI Card
const KPICard = ({ title, value, subtext, icon: Icon, colorClass, bgClass }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
        <div className="flex justify-between items-start mb-3">
            <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
                <Icon size={22} />
            </div>
        </div>
        {subtext && <div className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-lg inline-block border border-gray-100">{subtext}</div>}
    </div>
);

type DateRange = 'today' | '7days' | '15days' | '30days' | '3months' | '6months' | '1year' | 'all';

export const Reports = () => {
    const [activeTab, setActiveTab] = useState<'Financial' | 'Audit'>('Financial');
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

             // Load Inventory (For category matching)
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
        
        filtered.forEach(s => {
            const d = new Date(s.date);
            const sortKey = d.toISOString().split('T')[0];
            dailyMap.set(sortKey, (dailyMap.get(sortKey) || 0) + s.total);
        });

        const sortedChartData = Array.from(dailyMap)
            .sort((a: any, b: any) => a[0].localeCompare(b[0]))
            .map(([key, total]) => {
                const [y, m, d] = key.split('-').map(Number);
                const dateObj = new Date(y, m-1, d);
                return {
                    name: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                    total
                };
            });

        setAreaData(sortedChartData);

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

    const handleCleanLogs = async () => {
        if (!confirm("¿Depurar registros antiguos? Se eliminarán eventos con más de 30 días de antigüedad.")) return;
        setIsCleaningLogs(true);
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const freshLogs = auditLogs.filter(log => new Date(log.timestamp) >= thirtyDaysAgo);
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

    const filteredAuditLogs = useMemo(() => {
        return auditLogs.filter(log => {
            const matchesUser = auditUserFilter === 'All' || log.user === auditUserFilter;
            const matchesAction = auditActionFilter === 'All' || log.action === auditActionFilter;
            const matchesModule = auditModuleFilter === 'All' || log.module === auditModuleFilter;
            return matchesUser && matchesAction && matchesModule;
        });
    }, [auditLogs, auditUserFilter, auditActionFilter, auditModuleFilter]);

    const uniqueUsers = useMemo(() => Array.from(new Set(auditLogs.map(l => l.user))), [auditLogs]);

    return (
        <div className="space-y-6 pb-safe-area">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reportes</h1>
                    <p className="text-sm text-gray-500">Inteligencia de negocios y seguridad</p>
                </div>
                
                <div className="flex w-full sm:w-auto bg-gray-100 p-1 rounded-xl overflow-x-auto">
                    <button onClick={() => setActiveTab('Financial')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'Financial' ? 'bg-white shadow text-brand-900' : 'text-gray-500 hover:text-gray-700'}`}>Financiero</button>
                    {currentUser?.role === 'Admin' && (
                        <button onClick={() => setActiveTab('Audit')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'Audit' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Shield size={14}/> Auditoría
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'Financial' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex justify-end">
                        <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
                            <div className="bg-white border border-gray-200 px-2 py-1 rounded-xl flex items-center shadow-sm w-full sm:w-auto min-h-[44px]">
                                <Calendar size={16} className="ml-2 text-gray-400 shrink-0"/>
                                <select 
                                    value={dateRange} 
                                    onChange={(e) => setDateRange(e.target.value as DateRange)}
                                    className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 outline-none py-1 pr-2 pl-2 cursor-pointer w-full"
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
                            <button onClick={handleExportSales} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg transition-all active:scale-95 min-h-[44px]">
                                <Download size={16} /> <span className="sm:hidden md:inline">Exportar Excel</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <KPICard title="Ingresos Totales" value={`Bs. ${totalRevenue.toLocaleString()}`} icon={DollarSign} colorClass="text-brand-900" bgClass="bg-brand-50"/>
                        <KPICard title="Transacciones" value={totalTx} icon={ShoppingBag} colorClass="text-blue-600" bgClass="bg-blue-50"/>
                        <KPICard title="Ticket Promedio" value={`Bs. ${avgTicket.toLocaleString(undefined, {maximumFractionDigits: 0})}`} icon={Users} colorClass="text-purple-600" bgClass="bg-purple-50"/>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[300px] md:min-h-[350px]">
                            <h3 className="font-bold text-gray-800 mb-6">Tendencia de Ingresos</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={areaData}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#162836" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#162836" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} minTickGap={30}/>
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} width={35}/>
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                        <Area type="monotone" dataKey="total" stroke="#162836" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[300px] md:min-h-[350px]">
                            <h3 className="font-bold text-gray-800 mb-6">Ventas por Categoría</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Logs */}
            {activeTab === 'Audit' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-3 w-full">
                            <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 flex items-center gap-2 w-full md:w-auto min-h-[44px]">
                                <Filter size={14} className="text-gray-400 shrink-0"/>
                                <select className="bg-transparent text-sm outline-none text-gray-700 w-full" value={auditModuleFilter} onChange={e => setAuditModuleFilter(e.target.value)}>
                                    <option value="All">Todos Módulos</option>
                                    <option value="Sales">Ventas</option>
                                    <option value="Quotes">Cotizaciones</option>
                                    <option value="Inventory">Inventario</option>
                                    <option value="Clients">Clientes</option>
                                    <option value="Projects">Proyectos</option>
                                </select>
                            </div>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 flex items-center gap-2 w-full md:w-auto min-h-[44px]">
                                <Users size={14} className="text-gray-400 shrink-0"/>
                                <select className="bg-transparent text-sm outline-none text-gray-700 w-full" value={auditUserFilter} onChange={e => setAuditUserFilter(e.target.value)}>
                                    <option value="All">Todos Usuarios</option>
                                    {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 flex items-center gap-2 w-full md:w-auto min-h-[44px]">
                                <Shield size={14} className="text-gray-400 shrink-0"/>
                                <select className="bg-transparent text-sm outline-none text-gray-700 w-full" value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)}>
                                    <option value="All">Todas Acciones</option>
                                    <option value="Create">Creación</option>
                                    <option value="Update">Edición</option>
                                    <option value="Delete">Eliminación</option>
                                    <option value="Login">Acceso</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                            <button onClick={handleCleanLogs} disabled={isCleaningLogs} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors min-h-[44px]">
                                {isCleaningLogs ? <RefreshCw className="animate-spin" size={16}/> : <Trash2 size={16}/>} <span className="hidden sm:inline">Depurar</span>
                            </button>
                            <button onClick={handleExportAudit} className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-bold hover:bg-brand-800 transition-colors shadow-sm min-h-[44px]">
                                <Download size={16}/> <span className="hidden sm:inline">Exportar</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-3 w-40">Fecha/Hora</th>
                                        <th className="px-6 py-3 w-32">Usuario</th>
                                        <th className="px-6 py-3 w-24 text-center">Módulo</th>
                                        <th className="px-6 py-3 w-24 text-center">Acción</th>
                                        <th className="px-6 py-3">Descripción</th>
                                        <th className="px-6 py-3">Metadata</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm">
                                    {filteredAuditLogs.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                                                <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                                                <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{log.user}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 bg-gray-100 rounded text-[10px] uppercase font-bold text-gray-600">{log.module}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${log.action === 'Delete' ? 'bg-red-100 text-red-600' : log.action === 'Create' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">{log.description}</td>
                                            <td className="px-6 py-4 text-gray-400 text-xs font-mono truncate max-w-xs" title={log.metadata || ''}>
                                                {log.metadata || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredAuditLogs.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">Sin registros de auditoría.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};