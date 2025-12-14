import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

export function useSessionTimeout(isAuthenticated: boolean) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetSessionTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    if (!isAuthenticated) return;

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
      return;
    }

    // Set initial timer
    resetSessionTimer();

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
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
