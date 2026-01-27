import React from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user?: User | null;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-[#f4f6f7] overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-brand-900/50 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
            onCloseMobile={() => setMobileMenuOpen(false)} 
            user={user} 
            onLogout={onLogout || (() => {})} 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
          <div className="font-bold text-lg text-brand-900">Bráma Studio</div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
          >
            <Menu size={24} />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};