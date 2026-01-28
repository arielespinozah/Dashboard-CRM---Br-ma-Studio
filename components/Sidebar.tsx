import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Briefcase, 
  Package, 
  MessageSquare, 
  BarChart2, 
  Settings,
  Printer,
  PenTool,
  ShoppingBag,
  Boxes,
  Wallet,
  Calendar
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  onCloseMobile: () => void;
  user?: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile, user, onLogout }) => {
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
      const s = localStorage.getItem('crm_settings');
      if (s) {
          const settings = JSON.parse(s);
          if (settings.logoUrl) setLogoUrl(settings.logoUrl);
      }
  }, []);

  const isActive = (path: string) => location.pathname === path;

  // Granular Permission Logic
  const hasPermission = (perm: string) => {
      if (!user) return false;
      if (user.role === 'Admin') return true; 
      if (user.permissions?.includes('all')) return true;
      return user.permissions?.includes(perm) || false;
  };

  const allNavItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', permission: 'view_dashboard' },
    { name: 'Agenda', icon: Calendar, path: '/calendar', permission: 'view_calendar' }, // New
    { name: 'Finanzas', icon: Wallet, path: '/finance', permission: 'view_finance' },
    { name: 'Ventas', icon: ShoppingBag, path: '/sales', permission: 'view_sales' },
    { name: 'Cotizaciones', icon: FileText, path: '/quotes', permission: 'view_quotes' },
    { name: 'Proyectos', icon: Briefcase, path: '/projects', permission: 'view_projects' },
    { name: 'Catálogo', icon: Package, path: '/services', permission: 'view_catalog' },
    { name: 'Insumos', icon: Boxes, path: '/inventory', permission: 'view_inventory' }, 
    { name: 'Clientes', icon: Users, path: '/clients', permission: 'view_clients' },
    { name: 'Comunicaciones', icon: MessageSquare, path: '/communications', permission: 'view_communications' },
    { name: 'Reportes', icon: BarChart2, path: '/reports', permission: 'view_reports' },
    { name: 'Ajustes', icon: Settings, path: '/settings', permission: 'manage_settings' },
  ];

  const navItems = allNavItems.filter(item => hasPermission(item.permission));

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-24 px-6 border-b border-gray-100">
        {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="max-h-16 w-auto object-contain" />
        ) : (
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 bg-brand-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-900/20 flex-shrink-0">
                 <PenTool size={18} />
               </div>
               <div>
                 <span className="text-lg font-bold text-brand-900 tracking-tight block leading-none">Bráma</span>
                 <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-bold">Studio</span>
               </div>
            </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto py-6">
        <nav className="flex-1 px-4 space-y-1.5">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={onCloseMobile}
              className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-brand-900 text-white shadow-md shadow-brand-900/20'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-brand-900'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                  isActive(item.path) ? 'text-brand-500' : 'text-gray-400 group-hover:text-brand-900'
                }`}
              />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="px-4 mt-8 mb-4">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
             <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full absolute top-0 right-0 animate-pulse ring-2 ring-white"></div>
                  <Printer size={20} className="text-brand-900" />
                </div>
                <div>
                   <h4 className="font-bold text-xs text-brand-900">Impresora Lista</h4>
                   <p className="text-[10px] text-gray-500">Sistema Conectado</p>
                </div>
             </div>
             <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 w-full rounded-full"></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};