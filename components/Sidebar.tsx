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
import { User, AppSettings } from '../types';

interface SidebarProps {
  onCloseMobile: () => void;
  user?: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile, user, onLogout }) => {
  const location = useLocation();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const loadSettings = () => {
      const s = localStorage.getItem('crm_settings');
      if (s) {
          setSettings(JSON.parse(s));
      }
  };

  useEffect(() => {
      loadSettings();
      // Listen for the custom event dispatched from Settings.tsx
      const handleSettingsUpdate = () => loadSettings();
      window.addEventListener('crm_settings_updated', handleSettingsUpdate);
      return () => window.removeEventListener('crm_settings_updated', handleSettingsUpdate);
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
    { name: 'Agenda', icon: Calendar, path: '/calendar', permission: 'view_calendar' }, 
    { name: 'Finanzas', icon: Wallet, path: '/finance', permission: 'view_finance' },
    { name: 'Ventas', icon: ShoppingBag, path: '/sales', permission: 'view_sales' },
    { name: 'Cotizaciones', icon: FileText, path: '/quotes', permission: 'view_quotes' },
    { name: 'Proyectos', icon: Briefcase, path: '/projects', permission: 'view_projects' },
    { name: 'Catálogo', icon: Package, path: '/services', permission: 'view_catalog' },
    { name: 'Inventario', icon: Boxes, path: '/inventory', permission: 'view_inventory' }, 
    { name: 'Clientes', icon: Users, path: '/clients', permission: 'view_clients' },
    { name: 'Comunicaciones', icon: MessageSquare, path: '/communications', permission: 'view_communications' },
    { name: 'Reportes', icon: BarChart2, path: '/reports', permission: 'view_reports' },
    { name: 'Ajustes', icon: Settings, path: '/settings', permission: 'manage_settings' },
  ];

  const navItems = allNavItems.filter(item => hasPermission(item.permission));

  const primaryColor = settings?.primaryColor || '#162836';
  const secondaryColor = settings?.secondaryColor || '#00f24a';

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center justify-start pl-6 h-24 border-b border-gray-100">
        {settings?.systemLogoUrl ? (
            <img src={settings.systemLogoUrl} alt="Logo" className="max-h-16 w-auto object-contain" />
        ) : (
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0" style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}40` }}>
                 <PenTool size={18} />
               </div>
               <div>
                 <span className="text-lg font-bold tracking-tight block leading-none" style={{ color: primaryColor }}>{settings?.companyName?.split(' ')[0] || 'Bráma'}</span>
                 <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-bold">{settings?.companyName?.split(' ')[1] || 'Studio'}</span>
               </div>
            </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto py-6">
        <nav className="flex-1 px-4 space-y-1.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onCloseMobile}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                style={active ? { backgroundColor: primaryColor, boxShadow: `0 4px 6px -1px ${primaryColor}40` } : {}}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                    active ? '' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                  style={active ? { color: secondaryColor } : {}}
                />
                <span style={active ? {} : {}} className={!active ? "group-hover:text-gray-900" : ""}>
                    {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 mt-8 mb-4">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
             <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full absolute top-0 right-0 animate-pulse ring-2 ring-white"></div>
                  <Printer size={20} style={{ color: primaryColor }} />
                </div>
                <div>
                   <h4 className="font-bold text-xs" style={{ color: primaryColor }}>Impresora Lista</h4>
                   <p className="text-[10px] text-gray-500">Sistema Conectado</p>
                </div>
             </div>
             <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-full rounded-full" style={{ backgroundColor: secondaryColor }}></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};