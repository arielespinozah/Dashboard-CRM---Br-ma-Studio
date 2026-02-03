import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, Bell, ChevronDown, User as UserIcon, LogOut, Settings, CheckCircle2, AlertTriangle, Info, Clock, Calendar } from 'lucide-react';
import { User, AppSettings, CalendarEvent } from '../types';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface LayoutProps {
  children: React.ReactNode;
  user?: User | null;
  onLogout?: () => void;
}

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    read: boolean;
    time: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load basic settings
  const [settings] = useState<AppSettings>(() => {
      const s = localStorage.getItem('crm_settings');
      return s ? JSON.parse(s) : { companyName: 'Bráma Studio' };
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Clock Timer
  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

  // Fetch Real Notifications
  useEffect(() => {
      const fetchNotifications = async () => {
          let newNotifs: Notification[] = [];
          
          try {
              let events: CalendarEvent[] = [];
              const calDoc = await getDoc(doc(db, 'crm_data', 'calendar'));
              if(calDoc.exists()) events = (calDoc.data() as any).list;
              else {
                  const local = localStorage.getItem('crm_data_calendar'); 
                  if(local) events = JSON.parse(local).list || [];
              }

              const now = new Date();
              const todayStr = now.toISOString().split('T')[0];
              const tomorrow = new Date(now);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const tomorrowStr = tomorrow.toISOString().split('T')[0];

              events.forEach(ev => {
                  if (ev.date === todayStr) {
                      newNotifs.push({
                          id: `ev-${ev.id}`,
                          title: 'Agenda: Hoy',
                          message: `${ev.title} a las ${ev.time || 'todo el día'}`,
                          type: 'info',
                          read: false,
                          time: 'Hoy'
                      });
                  } else if (ev.date === tomorrowStr) {
                      newNotifs.push({
                          id: `ev-${ev.id}`,
                          title: 'Agenda: Mañana',
                          message: `${ev.title}`,
                          type: 'info',
                          read: false,
                          time: 'Mañana'
                      });
                  }
              });
          } catch(e) {}
          
          setNotifications(newNotifs);
      };

      fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
              setNotifOpen(false);
          }
          if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
              setProfileOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="flex h-screen bg-[#f4f6f7] overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-brand-900/50 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[70] w-64 transform bg-white border-r border-gray-200 transition-transform duration-300 ease-out lg:static lg:translate-x-0 shadow-2xl lg:shadow-none ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
            onCloseMobile={() => setMobileMenuOpen(false)} 
            user={user} 
            onLogout={onLogout || (() => {})} 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 md:h-20 px-4 md:px-6 flex items-center justify-between shadow-sm z-30 relative shrink-0">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-transform"
                >
                    <Menu size={24} />
                </button>
                <div className="overflow-hidden">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-none truncate">
                        {settings.companyName}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] md:text-xs text-gray-500 hidden sm:block">
                            {currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <span className="text-[10px] md:text-xs font-mono text-brand-900 bg-gray-100 px-1.5 rounded hidden sm:block">
                            {currentTime.toLocaleTimeString()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button 
                        onClick={() => setNotifOpen(!notifOpen)}
                        className={`relative p-2 rounded-xl transition-colors ${notifOpen ? 'bg-gray-100 text-brand-900' : 'text-gray-400 hover:text-brand-900 hover:bg-gray-50'}`}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
                    </button>

                    {notifOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 md:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-sm text-gray-900">Recordatorios</h3>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAsRead} className="text-[10px] text-blue-600 hover:underline font-medium">Marcar leídas</button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length > 0 ? notifications.map(n => (
                                    <div key={n.id} className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${!n.read ? 'bg-blue-50/30' : ''}`}>
                                        <div className={`mt-1 flex-shrink-0 ${n.type === 'success' ? 'text-green-500' : n.type === 'warning' ? 'text-orange-500' : 'text-blue-500'}`}>
                                            {n.title.includes('Agenda') ? <Calendar size={16}/> : n.type === 'warning' ? <AlertTriangle size={16}/> : <Info size={16}/>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{n.title}</p>
                                            <p className="text-xs text-gray-600 leading-snug">{n.message}</p>
                                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Clock size={10}/> {n.time}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-gray-400 text-sm">No tienes recordatorios pendientes.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div className="relative" ref={profileRef}>
                    <button 
                        onClick={() => setProfileOpen(!profileOpen)}
                        className={`flex items-center gap-2 md:gap-3 pl-1 pr-2 py-1 rounded-xl transition-colors border ${profileOpen ? 'bg-gray-50 border-gray-200' : 'border-transparent hover:bg-gray-50 hover:border-gray-100'}`}
                    >
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-900/20">
                            {user?.name.charAt(0)}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-bold text-gray-900 leading-none">{user?.name}</p>
                            <p className="text-[10px] text-gray-500 font-medium capitalize mt-0.5">{user?.role === 'Sales' ? 'Vendedor' : user?.role}</p>
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 hidden md:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Profile Dropdown */}
                    {profileOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Conectado como</p>
                                <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                            </div>
                            <div className="p-2 space-y-1">
                                <button onClick={() => { navigate('/settings?tab=profile'); setProfileOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors">
                                    <UserIcon size={16} className="text-gray-400" /> Mi Perfil
                                </button>
                                {user?.role === 'Admin' && (
                                    <button onClick={() => { navigate('/settings?tab=general'); setProfileOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors">
                                        <Settings size={16} className="text-gray-400" /> Configuración Global
                                    </button>
                                )}
                            </div>
                            <div className="p-2 border-t border-gray-50">
                                <button 
                                    onClick={onLogout}
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors font-medium"
                                >
                                    <LogOut size={16} /> Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-[#f4f6f7] scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
};