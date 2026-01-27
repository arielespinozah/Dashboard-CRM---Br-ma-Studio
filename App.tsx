import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Quotations } from './pages/Quotations';
import { Clients } from './pages/Clients';
import { Services } from './pages/Services';
import { Settings } from './pages/Settings';
import { Communications } from './pages/Communications';
import { Reports } from './pages/Reports';
import { Sales } from './pages/Sales';
import { Inventory } from './pages/Inventory';
import { Login } from './pages/Login';
import { User } from './types';
import { auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Auth Guard
interface ProtectedRouteProps {
  user: User | null;
  children?: React.ReactNode;
  roles?: string[];
}

const ProtectedRoute = ({ user, children, roles }: ProtectedRouteProps) => {
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
    // Fix: Ensure children are rendered if passed, otherwise Outlet (though here we wrap specific components)
    return <>{children}</>;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Initialize App
  useEffect(() => {
    const init = async () => {
        // 1. Restore Local Session
        const storedUser = localStorage.getItem('crm_active_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        // 2. Firebase Auth Handshake
        // We use onAuthStateChanged to react to auth state, but we trigger signInAnonymously explicitly if needed
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // Connection established silent
                setAuthError(null);
            } else {
                // Not authenticated yet
            }
        });

        // Attempt login if not already logged in firebase
        if (!auth.currentUser) {
            try {
                await signInAnonymously(auth);
            } catch (error: any) {
                if (error.code === 'auth/admin-restricted-operation') {
                    setAuthError("Modo Local (Nube desconectada)");
                }
            }
        }

        setLoading(false);
        return () => unsubscribe();
    };
    init();
  }, []);

  const handleLogin = (email: string) => {
      // Local Login Logic
      const savedUsers = localStorage.getItem('crm_users');
      let foundUser: User | undefined;
      
      if (savedUsers) {
          const parsedUsers: User[] = JSON.parse(savedUsers);
          foundUser = parsedUsers.find(u => u.email === email);
      }

      // Default Users Fallback
      if (!foundUser) {
          if (email === 'admin@brama.com.bo') {
              foundUser = { id: '1', name: 'Admin Principal', email, role: 'Admin', active: true };
          } else if (email === 'ventas@brama.com.bo') {
              foundUser = { id: '2', name: 'Vendedor 1', email, role: 'Sales', active: true };
          }
      }
      
      if (foundUser) {
          setUser(foundUser);
          localStorage.setItem('crm_active_user', JSON.stringify(foundUser));
          // Retry Firebase Auth on login just in case
          signInAnonymously(auth).catch(() => {});
      }
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('crm_active_user');
      auth.signOut();
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-brand-900 font-medium animate-pulse">Iniciando Sistema...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
        
        <Route path="/" element={
            <ProtectedRoute user={user}>
                <Layout user={user} onLogout={handleLogout}>
                    <Dashboard />
                </Layout>
            </ProtectedRoute>
        } />
        
        <Route path="/*" element={
            <ProtectedRoute user={user}>
                <Layout user={user} onLogout={handleLogout}>
                    <Routes>
                        <Route path="/projects" element={<Projects />} />
                        <Route path="/quotes" element={<Quotations />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/clients" element={<Clients />} />
                        <Route path="/services" element={<Services />} />
                        <Route path="/communications" element={<Communications />} />
                        
                        {/* Admin Only Routes */}
                        <Route path="/reports" element={
                            <ProtectedRoute user={user} roles={['Admin']}>
                                <Reports />
                            </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute user={user} roles={['Admin']}>
                                <Settings />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;