import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { Calendar, Download, TrendingUp, Users, DollarSign, Package } from 'lucide-react';

const weekData = [
  { name: 'Lun', sales: 4000 },
  { name: 'Mar', sales: 3000 },
  { name: 'Mie', sales: 2000 },
  { name: 'Jue', sales: 2780 },
  { name: 'Vie', sales: 1890 },
  { name: 'Sab', sales: 2390 },
  { name: 'Dom', sales: 3490 },
];

const monthData = [
    { name: 'Sem 1', sales: 12000 },
    { name: 'Sem 2', sales: 15400 },
    { name: 'Sem 3', sales: 11200 },
    { name: 'Sem 4', sales: 18900 },
];

const yearData = [
    { name: 'Ene', sales: 45000 },
    { name: 'Feb', sales: 52000 },
    { name: 'Mar', sales: 48000 },
    { name: 'Abr', sales: 61000 },
    { name: 'May', sales: 55000 },
    { name: 'Jun', sales: 67000 },
    { name: 'Jul', sales: 72000 },
    { name: 'Ago', sales: 68000 },
    { name: 'Sep', sales: 74000 },
    { name: 'Oct', sales: 81000 },
    { name: 'Nov', sales: 85000 },
    { name: 'Dic', sales: 92000 },
];

const categoryData = [
    { name: 'Diseño', value: 45 },
    { name: 'Soporte', value: 25 },
    { name: 'Insumos', value: 20 },
    { name: 'Otros', value: 10 },
];

export const Reports = () => {
    const [timeRange, setTimeRange] = useState<'Week' | 'Month' | 'Year'>('Week');

    const getCurrentData = () => {
        switch(timeRange) {
            case 'Week': return weekData;
            case 'Month': return monthData;
            case 'Year': return yearData;
            default: return weekData;
        }
    };

    const handleExport = () => {
        const data = getCurrentData();
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Periodo,Ventas\n"
            + data.map(e => `${e.name},${e.sales}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_ventas_${timeRange.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reportes</h1>
                    <p className="text-sm text-gray-500">Análisis y métricas de rendimiento</p>
                </div>
                <div className="flex gap-3">
                     <div className="flex bg-white border border-gray-200 rounded-xl p-1">
                        {['Week', 'Month', 'Year'].map((range) => (
                            <button 
                                key={range}
                                onClick={() => setTimeRange(range as any)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${timeRange === range ? 'bg-brand-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                {range === 'Week' ? 'Semana' : range === 'Month' ? 'Mes' : 'Año'}
                            </button>
                        ))}
                     </div>
                     <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 shadow-lg shadow-brand-900/20 active:scale-95 transition-all">
                         <Download size={16} /> Exportar
                     </button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-green-50 text-green-600 rounded-xl"><DollarSign size={24} /></div>
                         <span className="text-green-600 text-sm font-bold bg-green-50 px-2 py-1 rounded-lg">+12.5%</span>
                     </div>
                     <h3 className="text-gray-500 text-sm font-medium">Ventas Totales</h3>
                     <p className="text-3xl font-bold text-gray-900 mt-1">Bs. 45,231</p>
                 </div>
                 <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
                         <span className="text-blue-600 text-sm font-bold bg-blue-50 px-2 py-1 rounded-lg">+5.2%</span>
                     </div>
                     <h3 className="text-gray-500 text-sm font-medium">Nuevos Clientes</h3>
                     <p className="text-3xl font-bold text-gray-900 mt-1">124</p>
                 </div>
                 <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Package size={24} /></div>
                         <span className="text-purple-600 text-sm font-bold bg-purple-50 px-2 py-1 rounded-lg">+8.1%</span>
                     </div>
                     <h3 className="text-gray-500 text-sm font-medium">Proyectos Completados</h3>
                     <p className="text-3xl font-bold text-gray-900 mt-1">32</p>
                 </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Chart */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Rendimiento de Ventas ({timeRange === 'Week' ? 'Semanal' : timeRange === 'Month' ? 'Mensual' : 'Anual'})</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getCurrentData()}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#162836" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#162836" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                <Area type="monotone" dataKey="sales" stroke="#162836" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Categories Chart */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Ingresos por Categoría</h3>
                    <div className="h-80 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 13, fontWeight: 500}} width={80} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                                <Bar dataKey="value" fill="#00f24a" radius={[0, 6, 6, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};