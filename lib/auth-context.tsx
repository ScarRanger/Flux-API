'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { User } from '@/lib/types';
import { ApiClient } from '@/lib/api-client';

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshDbUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from database
  const fetchDbUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      return await ApiClient.createOrGetUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Refresh database user
  const refreshDbUser = async () => {
    if (user) {
      const userData = await fetchDbUser(user);
      setDbUser(userData);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Update last login in database
      await ApiClient.updateLastLogin(result.user.uid);
      
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setDbUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch or create user in database
        const userData = await fetchDbUser(firebaseUser);
        setDbUser(userData);
      } else {
        setDbUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    dbUser,
    loading,
    signInWithGoogle,
    logout,
    refreshDbUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for wallet operations
export function useWallet() {
  const { dbUser } = useAuth();

  const getWalletAddress = () => {
    return dbUser?.wallet_address || null;
  };

  const createWalletInstance = async () => {
    if (!dbUser) return null;

    try {
      return await ApiClient.getWalletInfo(dbUser.firebase_uid);
    } catch (error) {
      console.error('Error creating wallet instance:', error);
      return null;
    }
  };

  return {
    walletAddress: getWalletAddress(),
    createWalletInstance,
    hasWallet: !!dbUser?.wallet_address,
  };
}