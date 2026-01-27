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
  ShoppingBag
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Proyectos', icon: Briefcase, path: '/projects' },
    { name: 'Cotizaciones', icon: FileText, path: '/quotes' },
    { name: 'Ventas', icon: ShoppingBag, path: '/sales' },
    { name: 'Clientes', icon: Users, path: '/clients' },
    { name: 'Catálogo', icon: Package, path: '/services' },
    { name: 'Comunicaciones', icon: MessageSquare, path: '/communications' },
    { name: 'Reportes', icon: BarChart2, path: '/reports' },
    { name: 'Ajustes', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-20 px-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
           <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-200">
             <PenTool size={20} />
           </div>
           <div>
             <span className="text-lg font-bold text-gray-900 tracking-tight block leading-none">Bráma</span>
             <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Studio</span>
           </div>
        </div>
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
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                  isActive(item.path) ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
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
                  <div className="w-2 h-2 bg-green-500 rounded-full absolute top-0 right-0 animate-pulse"></div>
                  <Printer size={20} className="text-gray-700" />
                </div>
                <div>
                   <h4 className="font-semibold text-xs text-gray-900">Impresora Lista</h4>
                   <p className="text-[10px] text-gray-500">Sistema Conectado</p>
                </div>
             </div>
             <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-full rounded-full"></div>
             </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
          <LogOut className="mr-2 h-5 w-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};