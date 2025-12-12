import { createContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export const AuthContext = createContext();

// Create Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Allowed email domains
const ALLOWED_DOMAINS = ['@srmist.edu.in', '@srmist.in'];

function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Centralized sign-out helper to avoid redirect loops on stale sessions
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.warn('Sign out warning:', error.message);
      }
    } catch (err) {
      console.warn('Sign out exception:', err);
    } finally {
      setSession(null);
      setAuthError(null);
    }
  };

  // Check if email domain is allowed
  const isAllowedEmail = (email) => {
    if (!email) return false;
    return ALLOWED_DOMAINS.some(domain => 
      email.toLowerCase().endsWith(domain)
    );
  };

  useEffect(() => {
    // Handle user session
    const handleSession = async (currentSession) => {
      if (!currentSession) {
        setSession(null);
        return;
      }
      
      const userEmail = currentSession?.user?.email;
      if (!userEmail) {
        console.log('No email found in session, signing out');
        await signOut();
        setSession(null);
        setAuthError('No email found in authentication');
        return;
      }
      
      if (isAllowedEmail(userEmail)) {
        console.log('Valid SRM email found:', userEmail);
        setSession(currentSession);
        setAuthError(null);
      } else {
        console.log('User email not from allowed domain:', userEmail);
        await signOut();
        setAuthError('Please use an SRM email (@srmist.edu.in or @srmist.in)');
      }
    };

    // Initial session check
    const fetchSession = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setAuthError(error.message);
          setSession(null);
        } else {
          await handleSession(data.session);
        }
      } catch (err) {
        console.error('Unexpected error in fetchSession:', err);
        setAuthError('Failed to initialize session');
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email);
        
        try {
          setLoading(true);
          
          switch (event) {
            case 'SIGNED_IN':
              console.log('User signed in');
              await handleSession(newSession);
              break;
            case 'TOKEN_REFRESHED':
              console.log('Token refreshed');
              await handleSession(newSession);
              break;
            case 'SIGNED_OUT':
              console.log('User signed out');
              setSession(null);
              setAuthError(null);
              break;
            case 'USER_UPDATED':
              console.log('User updated');
              setSession(newSession);
              break;
            default:
              console.log('Other auth event:', event);
              break;
          }
        } catch (err) {
          console.error('Error in auth state change:', err);
          setAuthError('Error processing authentication');
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Force loading to false after a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('Force ending loading state after timeout');
        setLoading(false);
      }
    }, 3000); // Reduced from 5000ms to 3000ms for better UX
    
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <AuthContext.Provider value={{ session, supabase, authError, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;