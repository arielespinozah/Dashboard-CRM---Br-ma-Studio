import React from 'react';
import { 
  DollarSign, 
  Users, 
  Briefcase, 
  TrendingUp, 
  Plus, 
  ShoppingBag, 
  Share2,
  FileText,
  Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const data = [
  { name: 'Ene', income: 4200 },
  { name: 'Feb', income: 3800 },
  { name: 'Mar', income: 5100 },
  { name: 'Abr', income: 4780 },
  { name: 'May', income: 5890 },
  { name: 'Jun', income: 6390 },
  { name: 'Jul', income: 7490 },
];

const KPICard = ({ title, value, icon: Icon, trend, positive, colorClass }: any) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon size={22} />
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center ${positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
        {positive ? '+' : ''}{trend}%
        <TrendingUp size={12} className="ml-1" />
      </span>
    </div>
    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
    <p className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">{value}</p>
  </div>
);

export const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen general de Bráma Studio</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => navigate('/reports')}
             className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
             <Share2 size={18} />
             Ver Reportes
           </button>
           <button 
             onClick={() => navigate('/quotes')}
             className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
            >
             <Plus size={18} />
             Nueva Cotización
           </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Ingresos del Mes" value="Bs. 7,490" icon={DollarSign} trend={12.5} positive={true} colorClass="bg-green-50 text-green-600" />
        <KPICard title="Nuevos Clientes" value="24" icon={Users} trend={8.2} positive={true} colorClass="bg-blue-50 text-blue-600" />
        <KPICard title="Proyectos Activos" value="12" icon={Briefcase} trend={2.1} positive={true} colorClass="bg-purple-50 text-purple-600" />
        <KPICard title="Ventas Totales" value="156" icon={ShoppingBag} trend={5.4} positive={true} colorClass="bg-orange-50 text-orange-600" />
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-lg font-bold text-gray-900">Resumen de Ingresos</h2>
                <p className="text-sm text-gray-400">Comportamiento financiero anual</p>
            </div>
            <select className="text-sm border border-gray-200 rounded-lg text-gray-700 focus:ring-brand-500 focus:border-brand-500 px-3 py-1.5 bg-white outline-none cursor-pointer hover:bg-gray-50">
              <option>Últimos 6 meses</option>
              <option>Este año</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#111827', fontWeight: 600 }}
                />
                <Bar dataKey="income" fill="#1e293b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & Tasks */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              <button onClick={() => navigate('/projects')} className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all text-left group bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-gray-200 text-purple-600 p-2 rounded-lg group-hover:scale-105 transition-transform shadow-sm">
                    <Plus size={18} />
                  </div>
                  <span className="font-semibold text-gray-700">Crear Proyecto</span>
                </div>
              </button>
              
              <button onClick={() => navigate('/sales')} className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all text-left group bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-gray-200 text-green-600 p-2 rounded-lg group-hover:scale-105 transition-transform shadow-sm">
                    <DollarSign size={18} />
                  </div>
                  <span className="font-semibold text-gray-700">Registrar Venta</span>
                </div>
              </button>

              <button onClick={() => navigate('/quotes')} className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all text-left group bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-gray-200 text-blue-600 p-2 rounded-lg group-hover:scale-105 transition-transform shadow-sm">
                    <FileText size={18} />
                  </div>
                  <span className="font-semibold text-gray-700">Ver Cotizaciones</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-lg font-bold text-gray-900">Pendientes</h2>
               <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">Hoy</span>
            </div>
            <div className="space-y-4">
               <div className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                  <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  </div>
                  <div>
                      <p className="text-sm font-semibold text-gray-900">Entrega Branding "Solar"</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                         <Clock size={12} /> 15:00 PM
                      </div>
                  </div>
               </div>
               <div className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                  <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  </div>
                  <div>
                      <p className="text-sm font-semibold text-gray-900">Reunión con Constructora S.A.</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                         <Clock size={12} /> 10:00 AM
                      </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};