
import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ClientProjectView } from './pages/ClientProjectView';
import { DocumentViewer } from './pages/DocumentViewer';
import { NotFound } from './pages/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary'; // Import ErrorBoundary
import { User } from './types';
import { auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- LAZY LOAD PAGES (Code Splitting) ---
// This ensures the main bundle is small and pages load only when needed
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Projects = React.lazy(() => import('./pages/Projects').then(module => ({ default: module.Projects })));
const Quotations = React.lazy(() => import('./pages/Quotations').then(module => ({ default: module.Quotations })));
const Clients = React.lazy(() => import('./pages/Clients').then(module => ({ default: module.Clients })));
const Services = React.lazy(() => import('./pages/Services').then(module => ({ default: module.Services })));
const Settings = React.lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Communications = React.lazy(() => import('./pages/Communications').then(module => ({ default: module.Communications })));
const Reports = React.lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const Sales = React.lazy(() => import('./pages/Sales').then(module => ({ default: module.Sales })));
const Inventory = React.lazy(() => import('./pages/Inventory').then(module => ({ default: module.Inventory })));
const Finance = React.lazy(() => import('./pages/Finance').then(module => ({ default: module.Finance })));
const Calendar = React.lazy(() => import('./pages/Calendar').then(module => ({ default: module.Calendar })));

// Loading Component
const PageLoader = () => (
    <div className="h-full w-full flex flex-col items-center justify-center p-10">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-900 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm font-medium animate-pulse">Cargando módulo...</p>
    </div>
);

// Auth Guard
interface ProtectedRouteProps {
  user: User | null;
  children?: React.ReactNode;
  roles?: string[]; 
}

const ProtectedRoute = ({ user, children, roles }: ProtectedRouteProps) => {
    if (!user) return <Navigate to="/login" replace />;
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
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setAuthError(null);
            }
        });

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

  const handleLogin = (validatedUser: User) => {
      // SECURITY FIX: User is already validated and sanitized by Login.tsx
      setUser(validatedUser);
      localStorage.setItem('crm_active_user', JSON.stringify(validatedUser));
      
      // Ensure firebase connection for DB writes
      if (!auth.currentUser) signInAnonymously(auth).catch(() => {});
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('crm_active_user');
      // Clean up potentially sensitive cached lists if any (optional but safer)
      localStorage.removeItem('crm_users'); 
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-brand-900 font-medium animate-pulse">Iniciando Sistema...</div>;

  return (
    <Router>
      <ErrorBoundary>
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            
            {/* PUBLIC ROUTES */}
            <Route path="/p/:token" element={<Suspense fallback={<PageLoader/>}><ClientProjectView /></Suspense>} />
            <Route path="/view/:type/:id" element={<Suspense fallback={<PageLoader/>}><DocumentViewer /></Suspense>} />

            <Route path="/" element={
                <ProtectedRoute user={user}>
                    <Layout user={user} onLogout={handleLogout}>
                        <Suspense fallback={<PageLoader/>}>
                            <Dashboard />
                        </Suspense>
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/*" element={
                <ProtectedRoute user={user}>
                    <Layout user={user} onLogout={handleLogout}>
                        <Suspense fallback={<PageLoader/>}>
                            <Routes>
                                <Route path="/projects" element={<Projects />} />
                                <Route path="/quotes" element={<Quotations />} />
                                <Route path="/sales" element={<Sales />} />
                                <Route path="/inventory" element={<Inventory />} />
                                <Route path="/finance" element={<Finance />} />
                                <Route path="/clients" element={<Clients />} />
                                <Route path="/services" element={<Services />} />
                                <Route path="/communications" element={<Communications />} />
                                <Route path="/calendar" element={<Calendar />} />
                                <Route path="/reports" element={<Reports />} />
                                <Route path="/settings" element={<Settings />} />
                                
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </Suspense>
                    </Layout>
                </ProtectedRoute>
            } />
          </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
