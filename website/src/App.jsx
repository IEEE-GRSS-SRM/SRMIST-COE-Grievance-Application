import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import AuthProvider, { AuthContext } from './components/AuthProvider';
import Login from './components/Login';
import Home from './components/Home';
import ProfileSetup from './components/ProfileSetup';
import AdminDashboard from './components/AdminDashboard';
import ProjectIndex from './components/ProjectIndex';
import './styles.css';

function ProtectedRoute({ element }) {
  const { session, loading } = useContext(AuthContext);
  
  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return session ? element : <Navigate to="/login" replace />;
}

function AppContent() {
  const { session, authError, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if we have a session and are on login page
    if (session && location.pathname === '/login') {
      console.log('User authenticated on login page, redirecting to home');
      navigate('/home', { replace: true });
    }
  }, [session, navigate, location.pathname]);

  // Show loading screen during auth initialization
  if (loading) {
    return (
      <div className="page-container flex justify-center items-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // Handle auth errors
  if (authError) {
    console.error('Auth error:', authError);
    return (
      <div className="page-container flex justify-center items-center">
        <div className="glass-card p-8 w-full max-w-md text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Error</h2>
          <p className="text-red-600 mb-6">{authError}</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="primary-button w-full"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/home" element={<ProtectedRoute element={<Home />} />} />
      <Route path="/profile-setup" element={<ProtectedRoute element={<ProfileSetup />} />} />
      <Route path="/admin" element={<ProtectedRoute element={<AdminDashboard />} />} />
      <Route path="/index" element={<ProjectIndex />} />
      <Route path="/" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </div>
  );
}

export default App;