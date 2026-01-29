import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Users, Briefcase, TrendingUp, Plus, ShoppingBag, Share2, Clock, CheckCircle2, RefreshCw, Wallet, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { AppSettings, Sale, Client, Project, Status, CashShift } from '../types';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const KPICard = ({ title, value, icon: Icon, trend, positive, colorClass, subtext }: any) => (
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
    {subtext && <p className="text-xs text-gray-400 mt-2 font-medium">{subtext}</p>}
  </div>
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  
  // Real Data States
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allShifts, setAllShifts] = useState<CashShift[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync Data
  const fetchDashboardData = async () => {
      setIsRefreshing(true);
      try {
          // 1. Load Sales (Income)
          const salesDoc = await getDoc(doc(db, 'crm_data', 'sales_history'));
          let salesList: Sale[] = [];
          if (salesDoc.exists()) {
              salesList = salesDoc.data().list;
              localStorage.setItem('crm_sales_history', JSON.stringify(salesList));
          } else {
              const s = localStorage.getItem('crm_sales_history');
              if (s) salesList = JSON.parse(s);
          }
          setAllSales(salesList);

          if (salesList.length > 0) {
              setRecentSales(salesList.slice(0, 5));
              setTotalSalesCount(salesList.length);
              
              const income = salesList.reduce((acc, sale) => acc + (sale.paymentStatus === 'Paid' ? sale.total : sale.amountPaid || 0), 0);
              setTotalIncome(income);
          }

          // 2. Load Finance Shifts (Expenses)
          const financeDoc = await getDoc(doc(db, 'crm_data', 'finance_shifts'));
          let shiftsList: CashShift[] = [];
          if (financeDoc.exists()) {
              shiftsList = financeDoc.data().list;
          }
          setAllShifts(shiftsList);
          
          // Calculate Total Expenses from all closed and open shifts
          let expenses = 0;
          shiftsList.forEach(shift => {
              const shiftExpenses = shift.transactions
                  .filter(t => t.type === 'Expense')
                  .reduce((acc, t) => acc + t.amount, 0);
              expenses += shiftExpenses;
          });
          setTotalExpenses(expenses);

          // 3. Load Clients
          const clientDoc = await getDoc(doc(db, 'crm_data', 'clients'));
          if(clientDoc.exists()) {
              const list = clientDoc.data().list;
              setTotalClients(list.length);
              localStorage.setItem('crm_clients', JSON.stringify(list));
          } else {
              const c = localStorage.getItem('crm_clients');
              if(c) setTotalClients(JSON.parse(c).length);
          }

          // 4. Load Projects
          const projDoc = await getDoc(doc(db, 'crm_data', 'projects'));
          if(projDoc.exists()) {
              const p = projDoc.data().list as Project[];
              setActiveProjects(p.filter(x => x.status !== Status.COMPLETED).length);
              localStorage.setItem('crm_projects', JSON.stringify(p));
          } else {
              const p = localStorage.getItem('crm_projects');
              if(p) setActiveProjects(JSON.parse(p).filter((x: Project) => x.status !== Status.COMPLETED).length);
          }

      } catch(e) { console.error("Dashboard sync error", e); }
      finally { setIsRefreshing(false); }
  };

  useEffect(() => {
      const saved = localStorage.getItem('crm_settings');
      if (saved) setSettings(JSON.parse(saved));
      fetchDashboardData();
  }, []);

  // Memoized Chart Data Calculation (Income vs Expenses)
  const chartData = useMemo(() => {
      const monthMap = new Map<string, { income: number, expense: number }>();
      
      // Initialize last 6 months
      for(let i=5; i>=0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap.set(sortKey, { income: 0, expense: 0 });
      }

      // Fill Income
      allSales.forEach(sale => {
          const d = new Date(sale.date);
          const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (monthMap.has(sortKey)) {
              const curr = monthMap.get(sortKey)!;
              monthMap.set(sortKey, { ...curr, income: curr.income + sale.total });
          }
      });

      // Fill Expenses
      allShifts.forEach(shift => {
          shift.transactions.forEach(t => {
              if (t.type === 'Expense') {
                  const d = new Date(t.date);
                  const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  if (monthMap.has(sortKey)) {
                      const curr = monthMap.get(sortKey)!;
                      monthMap.set(sortKey, { ...curr, expense: curr.expense + t.amount });
                  }
              }
          });
      });

      return Array.from(monthMap).map(([sortKey, data]) => {
          const [year, month] = sortKey.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return {
              name: date.toLocaleString('es-BO', { month: 'short' }),
              ...data
          };
      });
  }, [allSales, allShifts]);

  const currencySymbol = settings?.currencySymbol || 'Bs';
  
  const formatCompact = (val: number) => {
      return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const netProfit = totalIncome - totalExpenses;

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
           <button onClick={fetchDashboardData} disabled={isRefreshing} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">
             <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
           </button>
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
            title="Utilidad Neta" 
            value={`${currencySymbol} ${formatCompact(netProfit)}`} 
            icon={Wallet} 
            positive={netProfit >= 0} 
            colorClass={netProfit >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}
            subtext="Ingresos - Gastos"
        />
        <KPICard 
            title="Ingresos Totales" 
            value={`${currencySymbol} ${formatCompact(totalIncome)}`} 
            icon={DollarSign} 
            positive={true} 
            colorClass="bg-blue-50 text-blue-600" 
        />
        <KPICard 
            title="Gastos Totales" 
            value={`${currencySymbol} ${formatCompact(totalExpenses)}`} 
            icon={ArrowDown} 
            positive={false} 
            colorClass="bg-orange-50 text-orange-600" 
        />
        <KPICard 
            title="Proyectos Activos" 
            value={activeProjects} 
            icon={Briefcase} 
            positive={true} 
            colorClass="bg-purple-50 text-purple-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-lg font-bold text-gray-900">Flujo de Caja</h2>
                <p className="text-sm text-gray-400">Comparativa Ingresos vs Gastos</p>
            </div>
          </div>
          {/* Strict height using Tailwind classes to prevent -1 warning */}
          <div className="w-full h-[350px] min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={0} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#1e293b' }} itemStyle={{ fontWeight: 600 }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                <Bar dataKey="income" name="Ingresos" fill="#162836" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
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
              <h2 className="text-lg font-bold text-gray-900 mb-4">Ventas Recientes</h2>
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
                          <span className="text-sm font-bold text-brand-900">{currencySymbol} {formatCompact(sale.total)}</span>
                      </div>
                  )) : <p className="text-sm text-gray-400 text-center py-4">No hay ventas recientes.</p>}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};