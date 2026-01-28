import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Download, DollarSign, ShoppingBag, Users, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { Sale } from '../types';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const COLORS = ['#00f24a', '#162836', '#8884d8', '#ff8042', '#00C49F', '#FFBB28'];

// KPI Card Component
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
        {subtext && (
            <div className="flex items-center gap-1 text-sm font-medium text-gray-400">
                <TrendingUp size={14} className="text-green-500" />
                <span className="text-green-600 font-bold">+12%</span>
                <span className="ml-1">vs mes anterior</span>
            </div>
        )}
    </div>
);

export const Reports = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [weekData, setWeekData] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [avgTicket, setAvgTicket] = useState(0);

    useEffect(() => {
        const loadData = async () => {
             const sDoc = await getDoc(doc(db, 'crm_data', 'sales_history'));
             let salesData: Sale[] = [];
             if (sDoc.exists()) {
                 salesData = sDoc.data().list;
             } else {
                 const s = localStorage.getItem('crm_sales_history');
                 if(s) salesData = JSON.parse(s);
             }
             setSales(salesData);

             // KPIs
             const revenue = salesData.reduce((acc, s) => acc + s.total, 0);
             setTotalRevenue(revenue);
             setAvgTicket(salesData.length > 0 ? revenue / salesData.length : 0);

             // Weekly Data
             const daysMap = new Map();
             const today = new Date();
             for(let i=6; i>=0; i--) {
                 const d = new Date(today);
                 d.setDate(today.getDate() - i);
                 const key = d.toLocaleDateString('es-ES', {weekday: 'short'});
                 daysMap.set(key, 0);
             }
             salesData.forEach(s => {
                 const d = new Date(s.date);
                 if ((today.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 7) {
                     const key = d.toLocaleDateString('es-ES', {weekday: 'short'});
                     if (daysMap.has(key)) daysMap.set(key, daysMap.get(key) + s.total);
                 }
             });
             setWeekData(Array.from(daysMap).map(([name, total]) => ({ name, total })));

             // Top Products Logic
             const prodMap = new Map();
             salesData.forEach(s => {
                 s.items.forEach(i => {
                     prodMap.set(i.description, (prodMap.get(i.description) || 0) + i.quantity);
                 });
             });
             const sorted = Array.from(prodMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
             setTopProducts(sorted.map(([name, value]) => ({ name, value })));
        };
        loadData();
    }, []);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reportes Financieros</h1>
                    <p className="text-sm text-gray-500">Resumen ejecutivo del rendimiento del negocio</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 flex items-center gap-2 shadow-sm">
                        <Calendar size={16}/> Últimos 30 días
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg transition-all active:scale-95">
                        <Download size={16} /> Exportar
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard 
                    title="Ingresos Totales" 
                    value={`Bs. ${totalRevenue.toLocaleString()}`} 
                    subtext={true}
                    icon={DollarSign} 
                    bgClass="bg-green-50"
                    colorClass="text-green-600"
                />
                <KPICard 
                    title="Ventas Realizadas" 
                    value={sales.length} 
                    subtext={true}
                    icon={ShoppingBag} 
                    bgClass="bg-blue-50"
                    colorClass="text-blue-600"
                />
                <KPICard 
                    title="Ticket Promedio" 
                    value={`Bs. ${avgTicket.toFixed(2)}`} 
                    subtext={false}
                    icon={Users} 
                    bgClass="bg-purple-50"
                    colorClass="text-purple-600"
                />
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 text-lg">Tendencia de Ingresos</h3>
                        <button className="text-gray-400 hover:text-brand-900"><ArrowRight size={20}/></button>
                    </div>
                    {/* Explicit height wrapper to prevent Recharts -1 warning */}
                    <div className="w-full h-[350px] min-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weekData}>
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
                                    cursor={{stroke: '#162836', strokeWidth: 1, strokeDasharray: '4 4'}}
                                />
                                <Area type="monotone" dataKey="total" stroke="#162836" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 text-lg">Top Productos</h3>
                        <button className="text-gray-400 hover:text-brand-900"><ArrowRight size={20}/></button>
                    </div>
                    <div className="w-full h-[350px] min-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 600}} width={120} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Bar dataKey="value" fill="#00f24a" radius={[0, 4, 4, 0]} barSize={24}>
                                    {topProducts.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#162836' : '#00f24a'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};