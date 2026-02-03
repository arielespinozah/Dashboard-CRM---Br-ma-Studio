import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Users, Briefcase, TrendingUp, Plus, ShoppingBag, Share2, Clock, CheckCircle2, RefreshCw, Wallet, ArrowDown, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { AppSettings, Sale, Client, Project, Status, CashShift, CalendarEvent } from '../types';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const KPICard = ({ title, value, icon: Icon, trend, positive, colorClass, subtext }: any) => (
  <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
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
    <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 tracking-tight">{value}</p>
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
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  
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
              salesList = (salesDoc.data() as any).list;
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
              shiftsList = (financeDoc.data() as any).list;
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
              const list = (clientDoc.data() as any).list;
              setTotalClients(list.length);
              localStorage.setItem('crm_clients', JSON.stringify(list));
          } else {
              const c = localStorage.getItem('crm_clients');
              if(c) setTotalClients(JSON.parse(c).length);
          }

          // 4. Load Projects
          const projDoc = await getDoc(doc(db, 'crm_data', 'projects'));
          if(projDoc.exists()) {
              const p = (projDoc.data() as any).list as Project[];
              setActiveProjects(p.filter(x => x.status !== Status.COMPLETED).length);
              localStorage.setItem('crm_projects', JSON.stringify(p));
          } else {
              const p = localStorage.getItem('crm_projects');
              if(p) setActiveProjects(JSON.parse(p).filter((x: Project) => x.status !== Status.COMPLETED).length);
          }

          // 5. Load Calendar Events (Today & Upcoming)
          const calDoc = await getDoc(doc(db, 'crm_data', 'calendar'));
          if (calDoc.exists()) {
              const events = (calDoc.data() as any).list as CalendarEvent[];
              const nowStr = new Date().toLocaleDateString('en-CA');
              const nextWeek = new Date();
              nextWeek.setDate(nextWeek.getDate() + 7);
              const nextWeekStr = nextWeek.toLocaleDateString('en-CA');

              const filtered = events.filter(e => e.date >= nowStr && e.date <= nextWeekStr)
                                     .sort((a,b) => a.date.localeCompare(b.date))
                                     .slice(0, 5);
              setUpcomingEvents(filtered);
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
      return (Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const netProfit = totalIncome - totalExpenses;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
              Bienvenido a <span className="font-bold text-brand-900">{settings?.companyName || 'Bráma Studio'}</span>
          </p>
        </div>
        {/* Mobile-optimized button group */}
        <div className="grid grid-cols-4 sm:flex gap-2 sm:gap-3 w-full sm:w-auto">
           <button onClick={fetchDashboardData} disabled={isRefreshing} className="col-span-1 flex items-center justify-center gap-2 px-3 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 min-h-[48px]">
             <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
           </button>
           <button onClick={() => navigate('/reports')} className="col-span-1 flex items-center justify-center gap-2 px-3 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm min-h-[48px]">
             <Share2 size={20} />
           </button>
           <button onClick={() => navigate('/quotes')} className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-brand-900 text-white rounded-xl text-sm font-medium hover:bg-brand-800 transition-colors shadow-lg shadow-brand-900/20 min-h-[48px]">
             <Plus size={20} /> <span className="font-bold">Cotizar</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Sidebar Actions & Activity - ORDER FIRST ON MOBILE */}
        <div className="space-y-6 order-1 lg:order-2">
          {/* Agenda Widget */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><CalendarIcon size={18} className="text-brand-900"/> Agenda</h2>
                <button onClick={() => navigate('/calendar')} className="text-xs text-brand-900 font-bold hover:underline flex items-center">Ver todo <ChevronRight size={14}/></button>
            </div>
            <div className="space-y-3">
                {upcomingEvents.length > 0 ? upcomingEvents.map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-colors cursor-pointer" onClick={() => navigate('/calendar')}>
                        <div className="flex flex-col items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-200 shadow-sm shrink-0">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{new Date(ev.date).toLocaleString('es-ES', { weekday: 'short' }).slice(0,3)}</span>
                            <span className="text-sm font-black text-gray-900">{new Date(ev.date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{ev.title}</p>
                            <p className="text-xs text-gray-500 truncate">{ev.time || 'Todo el día'} {ev.linkedClientName ? `• ${ev.linkedClientName}` : ''}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${ev.priority === 'High' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    </div>
                )) : <p className="text-sm text-gray-400 text-center py-4">Sin eventos próximos.</p>}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              <button onClick={() => navigate('/projects')} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all text-left group bg-gray-50/50 min-h-[56px] active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-gray-200 text-purple-600 p-2 rounded-lg group-hover:scale-105 transition-transform shadow-sm"><Plus size={20} /></div>
                  <span className="font-bold text-gray-800">Crear Proyecto</span>
                </div>
              </button>
              <button onClick={() => navigate('/sales')} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all text-left group bg-gray-50/50 min-h-[56px] active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-gray-200 text-green-600 p-2 rounded-lg group-hover:scale-105 transition-transform shadow-sm"><DollarSign size={20} /></div>
                  <span className="font-bold text-gray-800">Registrar Venta</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Ventas Recientes</h2>
              <div className="space-y-4">
                  {recentSales.length > 0 ? recentSales.map(sale => (
                      <div key={sale.id} className="flex items-center justify-between pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                              <div className="bg-green-50 p-2 rounded-full text-green-600"><CheckCircle2 size={18}/></div>
                              <div>
                                  <p className="text-sm font-bold text-gray-900">#{sale.id.replace('VTA-', '')}</p>
                                  <p className="text-xs text-gray-500 max-w-[120px] truncate">{sale.clientName}</p>
                              </div>
                          </div>
                          <span className="text-sm font-bold text-brand-900 whitespace-nowrap">{currencySymbol} {formatCompact(sale.total)}</span>
                      </div>
                  )) : <p className="text-sm text-gray-400 text-center py-4">No hay ventas recientes.</p>}
              </div>
          </div>
        </div>

        {/* Main Chart - ORDER SECOND ON MOBILE */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col order-2 lg:order-1">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
                <h2 className="text-lg font-bold text-gray-900">Flujo de Caja</h2>
                <p className="text-sm text-gray-400">Comparativa Ingresos vs Gastos</p>
            </div>
          </div>
          {/* Mobile height adjusted */}
          <div className="w-full h-[250px] sm:h-[350px] min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={0} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 500}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#1e293b' }} itemStyle={{ fontWeight: 600 }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}/>
                <Bar dataKey="income" name="Ingresos" fill="#162836" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};