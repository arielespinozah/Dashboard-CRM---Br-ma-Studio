import React, { useState, useEffect } from 'react';
import { DollarSign, Users, Briefcase, TrendingUp, Plus, ShoppingBag, Share2, Clock, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { AppSettings, Sale, Client, Project, Status } from '../types';

const KPICard = ({ title, value, icon: Icon, trend, positive, colorClass }: any) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon size={22} />
      </div>
      {trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center ${positive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {positive ? '+' : ''}{trend}%
            <TrendingUp size={12} className="ml-1" />
          </span>
      )}
    </div>
    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
    <p className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">{value}</p>
  </div>
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  
  // Real Data States
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
      // 1. Load Settings
      const saved = localStorage.getItem('crm_settings');
      if (saved) setSettings(JSON.parse(saved));

      // 2. Load Sales for Stats & Chart
      const savedSales = localStorage.getItem('crm_sales_history');
      if (savedSales) {
          const sales: Sale[] = JSON.parse(savedSales);
          setRecentSales(sales.slice(0, 5)); // Top 5
          setTotalSalesCount(sales.length);
          
          // Calculate Total Income (Paid Only)
          const income = sales.reduce((acc, sale) => acc + (sale.paymentStatus === 'Paid' ? sale.total : sale.amountPaid || 0), 0);
          setTotalIncome(income);

          // Prepare Chart Data (Group by Month)
          const monthMap = new Map<string, number>();
          // Initialize last 6 months
          for(let i=5; i>=0; i--) {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const key = d.toLocaleString('es-BO', { month: 'short' });
              monthMap.set(key, 0);
          }

          sales.forEach(sale => {
              const d = new Date(sale.date);
              const key = d.toLocaleString('es-BO', { month: 'short' });
              if (monthMap.has(key)) {
                  monthMap.set(key, monthMap.get(key)! + sale.total);
              }
          });

          const cData = Array.from(monthMap).map(([name, income]) => ({ name, income }));
          setChartData(cData);
      }

      // 3. Load Clients
      const savedClients = localStorage.getItem('crm_clients');
      if (savedClients) {
          const clients: Client[] = JSON.parse(savedClients);
          setTotalClients(clients.length);
      }

      // 4. Load Projects
      const savedProjects = localStorage.getItem('crm_projects');
      if (savedProjects) {
          const projects: Project[] = JSON.parse(savedProjects);
          const active = projects.filter(p => p.status !== Status.COMPLETED).length;
          setActiveProjects(active);
      }

  }, []);

  const currencySymbol = settings?.currencySymbol || 'Bs';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
              Bienvenido a <span className="font-bold text-brand-900">{settings?.companyName || 'Bráma Studio'}</span>
          </p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => navigate('/reports')} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
             <Share2 size={18} /> Reportes
           </button>
           <button onClick={() => navigate('/quotes')} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 transition-colors shadow-lg shadow-brand-900/20">
             <Plus size={18} /> Nueva Cotización
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
            title="Ingresos Totales" 
            value={`${currencySymbol} ${totalIncome.toLocaleString()}`} 
            icon={DollarSign} 
            positive={true} 
            colorClass="bg-green-50 text-green-600" 
        />
        <KPICard 
            title="Total Clientes" 
            value={totalClients} 
            icon={Users} 
            positive={true} 
            colorClass="bg-blue-50 text-blue-600" 
        />
        <KPICard 
            title="Proyectos Activos" 
            value={activeProjects} 
            icon={Briefcase} 
            positive={true} 
            colorClass="bg-purple-50 text-purple-600" 
        />
        <KPICard 
            title="Ventas Realizadas" 
            value={totalSalesCount} 
            icon={ShoppingBag} 
            positive={true} 
            colorClass="bg-orange-50 text-orange-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-lg font-bold text-gray-900">Resumen de Ingresos</h2>
                <p className="text-sm text-gray-400">Comportamiento últimos 6 meses</p>
            </div>
          </div>
          {/* CRITICAL FIX: Explicit Height Container for Recharts */}
          <div className="w-full h-[320px] min-h-[320px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#1e293b' }} itemStyle={{ color: '#111827', fontWeight: 600 }} />
                <Bar dataKey="income" fill="#1e293b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Actions & Activity */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              <button onClick={() => navigate('/projects')} className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all text-left group bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-gray-200 text-purple-600 p-2 rounded-lg group-hover:scale-105 transition-transform shadow-sm"><Plus size={18} /></div>
                  <span className="font-semibold text-gray-700">Crear Proyecto</span>
                </div>
              </button>
              <button onClick={() => navigate('/sales')} className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all text-left group bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-gray-200 text-green-600 p-2 rounded-lg group-hover:scale-105 transition-transform shadow-sm"><DollarSign size={18} /></div>
                  <span className="font-semibold text-gray-700">Registrar Venta</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Actividad Reciente</h2>
              <div className="space-y-4">
                  {recentSales.length > 0 ? recentSales.map(sale => (
                      <div key={sale.id} className="flex items-center justify-between pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                              <div className="bg-green-50 p-2 rounded-full text-green-600"><CheckCircle2 size={16}/></div>
                              <div>
                                  <p className="text-sm font-bold text-gray-900">Venta #{sale.id.replace('VTA-', '')}</p>
                                  <p className="text-xs text-gray-500">{sale.clientName}</p>
                              </div>
                          </div>
                          <span className="text-sm font-bold text-brand-900">{currencySymbol} {sale.total}</span>
                      </div>
                  )) : <p className="text-sm text-gray-400 text-center py-4">No hay ventas recientes.</p>}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
