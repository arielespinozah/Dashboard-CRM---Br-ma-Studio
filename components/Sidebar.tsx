import React from 'react';
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
  LogOut,
  Printer,
  PenTool,
  ShoppingBag,
  Boxes
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  onCloseMobile: () => void;
  user?: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile, user, onLogout }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Filter menu items based on role
  const allNavItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['Admin', 'Sales', 'Viewer'] },
    { name: 'Proyectos', icon: Briefcase, path: '/projects', roles: ['Admin', 'Sales', 'Viewer'] },
    { name: 'Cotizaciones', icon: FileText, path: '/quotes', roles: ['Admin', 'Sales'] },
    { name: 'Ventas', icon: ShoppingBag, path: '/sales', roles: ['Admin', 'Sales'] },
    { name: 'Clientes', icon: Users, path: '/clients', roles: ['Admin', 'Sales'] },
    { name: 'Inventario', icon: Boxes, path: '/inventory', roles: ['Admin', 'Sales'] },
    { name: 'Catálogo', icon: Package, path: '/services', roles: ['Admin', 'Sales', 'Viewer'] },
    { name: 'Comunicaciones', icon: MessageSquare, path: '/communications', roles: ['Admin', 'Sales'] },
    { name: 'Reportes', icon: BarChart2, path: '/reports', roles: ['Admin'] },
    { name: 'Ajustes', icon: Settings, path: '/settings', roles: ['Admin'] },
  ];

  const navItems = allNavItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center h-24 px-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-brand-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-900/20 flex-shrink-0">
             <PenTool size={20} />
           </div>
           <div>
             <span className="text-xl font-bold text-brand-900 tracking-tight block leading-none">Bráma</span>
             <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Studio</span>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto py-6">
        {user && (
            <div className="px-6 mb-6">
                <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-brand-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate capitalize">{user.role === 'Sales' ? 'Vendedor' : user.role}</p>
                    </div>
                </div>
            </div>
        )}

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

        <div className="px-4 mt-8">
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

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={onLogout}
          className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};