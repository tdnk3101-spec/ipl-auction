import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { auth } from '../lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInAnonymously,
  updateProfile,
  linkWithPopup
} from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

import PageLoader from '../components/PageLoader';

const AuthContext = createContext({
  user: null,
  loading: true,
  loginWithGoogle: async () => { },
  loginAsGuest: async () => { },
  linkAccountWithGoogle: async () => { },
  isOnlineVerified: false,
  logout: async () => { }
});

const googleProvider = new GoogleAuthProvider();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // AuthProvider check failed
  }
  return context || {};
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedGuest = sessionStorage.getItem('ipl_local_guest');
      if (savedGuest) {
        try {
          return JSON.parse(savedGuest);
        } catch {
          // ignore corrupted session
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasSeen = sessionStorage.getItem('ipl_has_seen_loader');
      if (hasSeen) return false;
    }
    return true;
  });

  const markLoaderSeen = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ipl_has_seen_loader', 'true');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!auth) {
      setTimeout(markLoaderSeen, 500);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        sessionStorage.removeItem('ipl_local_guest');
      }
      const isLandingPage = typeof window !== 'undefined' && window.location.pathname === '/';
      if (!isLandingPage) {
        setTimeout(markLoaderSeen, 1500);
      }
    });

    return unsubscribe;
  }, [markLoaderSeen]);

  // Listen to manual skip/continue event from PageLoader
  useEffect(() => {
    const handleSkip = () => {
      markLoaderSeen();
    };
    document.addEventListener('skipIntro', handleSkip);
    return () => document.removeEventListener('skipIntro', handleSkip);
  }, [markLoaderSeen]);

  const loginWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    const result = await signInWithPopup(auth, googleProvider);
    sessionStorage.removeItem('ipl_local_guest');
    setUser(result.user);
    return result.user;
  };

  const loginAsGuest = async (displayName) => {
    const chosenName = displayName?.trim() || 'Guest Manager';
    if (auth) {
      try {
        const result = await signInAnonymously(auth);
        await updateProfile(result.user, { displayName: chosenName });
        const updatedUser = { ...result.user, displayName: chosenName };
        sessionStorage.removeItem('ipl_local_guest');
        setUser(updatedUser);
        return updatedUser;
      } catch (authErr) {
        console.warn('[auth] Firebase anonymous sign-in unavailable, using local guest session:', authErr.message);
      }
    }
    // Fallback local guest session (always succeeds even if Firebase Auth is not yet activated)
    const localGuest = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 10),
      displayName: chosenName,
      isAnonymous: true,
      email: null,
    };
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ipl_local_guest', JSON.stringify(localGuest));
    }
    setUser(localGuest);
    return localGuest;
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ipl_local_guest');
    }
    setUser(null);
    if (auth) {
      try {
        await signOut(auth);
      } catch {
        // ignore sign-out network error
      }
    }
  };

  const linkAccountWithGoogle = async () => {
    if (!auth || !auth.currentUser) throw new Error('No user is currently signed in to link');
    const result = await linkWithPopup(auth.currentUser, googleProvider);
    sessionStorage.removeItem('ipl_local_guest');
    setUser(result.user);
    return result.user;
  };

  const isOnlineVerified = Boolean(user && !user.uid?.startsWith('guest_'));

  const value = {
    user,
    loading,
    loginWithGoogle,
    loginAsGuest,
    linkAccountWithGoogle,
    isOnlineVerified,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeIn" }}
            className="fixed inset-0 z-[9999]"
          >
            <PageLoader />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
};
