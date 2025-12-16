import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVE_KEY = 'session:lastActiveMs';

export function useSessionTimeout(isAuthenticated: boolean) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const persistLastActive = () => {
    try {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Unable to persist session activity timestamp', error);
    }
  };

  const resetSessionTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    if (!isAuthenticated) return;

    persistLastActive();

    // Set warning at 29 minutes (1 minute before logout)
    warningTimeoutRef.current = setTimeout(() => {
      console.warn('Session expiring in 1 minute');
      // You can dispatch a notification here if needed
      window.dispatchEvent(
        new CustomEvent('sessionWarning', {
          detail: { message: 'Your session will expire in 1 minute due to inactivity' }
        })
      );
    }, SESSION_TIMEOUT_MS - 60000);

    // Set logout at 30 minutes
    timeoutRef.current = setTimeout(async () => {
      console.warn('Session expired due to inactivity');
      try {
        await signOut(auth);
        window.dispatchEvent(
          new CustomEvent('sessionExpired', {
            detail: { message: 'Your session has expired. Please log in again.' }
          })
        );
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }, SESSION_TIMEOUT_MS);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      localStorage.removeItem(LAST_ACTIVE_KEY);
      return;
    }

    const now = Date.now();
    const lastActiveRaw = localStorage.getItem(LAST_ACTIVE_KEY);
    const lastActive = lastActiveRaw ? Number.parseInt(lastActiveRaw, 10) : null;

    if (lastActive && Number.isFinite(lastActive) && now - lastActive >= SESSION_TIMEOUT_MS) {
      // Exceeded inactivity window while away; sign out immediately
      signOut(auth).catch(error => console.error('Error signing out after stale session:', error));
      return;
    }

    // Set initial timer
    resetSessionTimer();

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      persistLastActive();
      resetSessionTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [isAuthenticated]);
}
