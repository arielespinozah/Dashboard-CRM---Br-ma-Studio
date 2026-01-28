import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, DollarSign, ShoppingBag, Users, TrendingUp, Calendar, ArrowRight, Filter } from 'lucide-react';
import { Sale, InventoryItem } from '../types';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
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

type DateRange = 'today' | '7days' | '15days' | '30days' | '3months' | 'all';

export const Reports = () => {
    const [allSales, setAllSales] = useState<Sale[]>([]);
    const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    
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
        const loadData = async () => {
             // Load Sales
             const sDoc = await getDoc(doc(db, 'crm_data', 'sales_history'));
             if (sDoc.exists()) setAllSales(sDoc.data().list);
             else {
                 const s = localStorage.getItem('crm_sales_history');
                 if(s) setAllSales(JSON.parse(s));
             }

             // Load Inventory for Categories
             const iDoc = await getDoc(doc(db, 'crm_data', 'inventory'));
             if(iDoc.exists()) setInventory(iDoc.data().list);
        };
        loadData();
    }, []);

    // Filter Logic
    useEffect(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999); // End of today
        
        let startDate = new Date();
        startDate.setHours(0,0,0,0);

        switch (dateRange) {
            case 'today': break; // Start date is already today 00:00
            case '7days': startDate.setDate(now.getDate() - 7); break;
            case '15days': startDate.setDate(now.getDate() - 15); break;
            case '30days': startDate.setDate(now.getDate() - 30); break;
            case '3months': startDate.setMonth(now.getMonth() - 3); break;
            case 'all': startDate = new Date(0); break; // Epoch
        }

        const filtered = allSales.filter(s => {
            const d = new Date(s.date);
            return d >= startDate && d <= now;
        });

        setFilteredSales(filtered);

        // --- Calculate Metrics ---
        const rev = filtered.reduce((acc, s) => acc + s.total, 0);
        setTotalRevenue(rev);
        setTotalTx(filtered.length);
        setAvgTicket(filtered.length > 0 ? rev / filtered.length : 0);

        // --- Prepare Area Chart (Daily Revenue) ---
        const dailyMap = new Map();
        // Initialize map with 0 for the range (simplified for dynamic range)
        filtered.forEach(s => {
            const key = new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            dailyMap.set(key, (dailyMap.get(key) || 0) + s.total);
        });
        // Sort by date would require keeping raw date in key or separate sort, 
        // for simplicity we trust the natural order or user might see non-linear if random dates. 
        // Better approach:
        const sortedDaily = Array.from(dailyMap).map(([name, total]) => ({name, total}));
        // (In a real app, fill missing dates for smooth graph)
        setAreaData(sortedDaily);

        // --- Prepare Pie Chart (Categories) ---
        const catMap = new Map();
        filtered.forEach(s => {
            s.items.forEach(item => {
                // Find item category from inventory reference or fallback
                // NOTE: In a real app, store category in sale item snapshot
                const refItem = inventory.find(i => i.name === item.description);
                const cat = refItem ? refItem.category : 'General';
                catMap.set(cat, (catMap.get(cat) || 0) + item.total);
            });
        });
        const pieData = Array.from(catMap).map(([name, value]) => ({ name, value }));
        setCategoryData(pieData);

    }, [allSales, dateRange, inventory]);

    const handleExport = () => {
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

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reportes Financieros</h1>
                    <p className="text-sm text-gray-500">Análisis detallado de rendimiento</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="bg-white border border-gray-200 px-2 py-1 rounded-xl flex items-center shadow-sm">
                        <Calendar size={16} className="ml-2 text-gray-400"/>
                        <select 
                            value={dateRange} 
                            onChange={(e) => setDateRange(e.target.value as DateRange)}
                            className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 outline-none py-1 pr-2 pl-2 cursor-pointer"
                        >
                            <option value="today">Hoy</option>
                            <option value="7days">Últimos 7 días</option>
                            <option value="15days">Últimos 15 días</option>
                            <option value="30days">Últimos 30 días</option>
                            <option value="3months">Últimos 3 meses</option>
                            <option value="all">Todo el historial</option>
                        </select>
                    </div>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg transition-all active:scale-95">
                        <Download size={16} /> Exportar Excel
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard 
                    title="Ingresos (Periodo)" 
                    value={`Bs. ${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
                    subtext={`${filteredSales.length} transacciones`}
                    icon={DollarSign} 
                    bgClass="bg-green-50"
                    colorClass="text-green-600"
                />
                <KPICard 
                    title="Items Vendidos" 
                    value={filteredSales.reduce((acc, s) => acc + s.items.reduce((ac, i) => ac + i.quantity, 0), 0)} 
                    subtext="Volumen de producto"
                    icon={ShoppingBag} 
                    bgClass="bg-blue-50"
                    colorClass="text-blue-600"
                />
                <KPICard 
                    title="Ticket Promedio" 
                    value={`Bs. ${avgTicket.toFixed(2)}`} 
                    subtext="Ingreso por venta"
                    icon={Users} 
                    bgClass="bg-purple-50"
                    colorClass="text-purple-600"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 text-lg">Evolución de Ventas</h3>
                    </div>
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
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#1f2937' }}
                                />
                                <Area type="monotone" dataKey="total" stroke="#162836" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Pie */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 text-lg">Ventas por Categoría</h3>
                    </div>
                    <div className="w-full h-[350px] min-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};