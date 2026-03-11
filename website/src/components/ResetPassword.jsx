import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthProvider';

function ResetPassword() {
  const { supabase } = useContext(AuthContext);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const navigate = useNavigate();

  // Supabase fires PASSWORD_RECOVERY auth event when user arrives via reset link.
  // Wait for that event to confirm the recovery session is active.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
      }
    });

    // Also check if there is already a session (e.g. page refresh after recovery)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleReset = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(`Failed to update password: ${error.message}`);
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!validSession) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="glass-card p-8 text-center w-full max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying reset link...</p>
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
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Set New Password</h1>
            <p className="text-gray-600 text-sm">Enter a new password for your account</p>
            <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-blue-700 mx-auto mt-4 rounded-full"></div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-3 slide-in">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {success ? (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
              Password updated successfully! Redirecting to login...
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4 text-left">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

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
                    Updating...
                  </span>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          © {new Date().getFullYear()} SRM Institute of Science and Technology. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
