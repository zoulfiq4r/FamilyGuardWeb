import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

export function SessionWarningModal() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleWarning = () => {
      setIsVisible(true);
    };

    const handleExpired = () => {
      setIsVisible(false);
    };

    window.addEventListener('sessionWarning', handleWarning);
    window.addEventListener('sessionExpired', handleExpired);

    return () => {
      window.removeEventListener('sessionWarning', handleWarning);
      window.removeEventListener('sessionExpired', handleExpired);
    };
  }, []);

  const handleContinue = () => {
    setIsVisible(false);
    // Trigger activity to reset timer
    document.dispatchEvent(new Event('mousedown', { bubbles: true }));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsVisible(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AlertDialog open={isVisible} onOpenChange={setIsVisible}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in 1 minute due to inactivity. Would you like to continue your session?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel onClick={handleLogout}>Log Out</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue}>Continue Session</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
