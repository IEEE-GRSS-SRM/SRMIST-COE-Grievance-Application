import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthProvider';

function Login() {
  const { session, supabase, authError, loading: authLoading } = useContext(AuthContext);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  // Handle redirect after successful login
  useEffect(() => {
    if (session && session.user) {
      console.log('User is logged in, redirecting to home');
      navigate('/home', { replace: true });
    }
  }, [session, navigate]);

  // Handle auth errors from AuthProvider
  useEffect(() => {
    if (authError) {
      setErrorMessage(authError);
    }
  }, [authError]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('Login error:', error);
        setErrorMessage(`Login failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Unexpected error during login:', error);
      setErrorMessage('An unexpected error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMessage(`Failed to send reset email: ${error.message}`);
      } else {
        setResetSent(true);
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading if auth is still initializing
  if (authLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container flex items-center justify-center">
      <div className="w-full max-w-md fade-in">
        <div className="glass-card p-8 text-center shadow-xl border border-white border-opacity-20">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-6 shadow-lg">
              SRM
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Controller of Examinations</h1>
            <h3 className="text-2xl text-gray-800 mb-2">Grievance Redressal Portal</h3>
            <p className="text-gray-600">Access your examination support services</p>
            <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-blue-700 mx-auto mt-4 rounded-full"></div>
          </div>
          
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-3 slide-in">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={showForgotPassword ? handleForgotPassword : handleLogin} className="space-y-4 text-left">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourid@srmist.edu.in"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {!showForgotPassword && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="mt-1 text-right">
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setErrorMessage(null); setResetSent(false); }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            )}

            {resetSent ? (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm text-center">
                Password reset email sent! Check your inbox and follow the link.
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="primary-button w-full flex items-center justify-center gap-2 py-3 text-base"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {showForgotPassword ? 'Sending...' : 'Signing in...'}
                  </span>
                ) : (
                  showForgotPassword ? 'Send Reset Email' : 'Sign In'
                )}
              </button>
            )}

            {showForgotPassword && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setErrorMessage(null); setResetSent(false); }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <svg className="w-5 h-5 text-blue-500 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
            Only @srmist.edu.in and @srmist.in email domains are permitted
          </div>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-600">
          © {new Date().getFullYear()} SRM Institute of Science and Technology. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default Login;