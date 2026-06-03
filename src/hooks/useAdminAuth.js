import { useCallback, useState } from 'react';

let sessionAuthenticated = false;

const ADMIN_PASSWORD = 'thedegens';

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(sessionAuthenticated);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState('');

  const requireAuth = useCallback((action) => {
    if (sessionAuthenticated) {
      action();
      return;
    }

    setPendingAction(() => action);
    setShowPasswordModal(true);
    setError('');
  }, []);

  const submitPassword = useCallback((password) => {
    if (password === ADMIN_PASSWORD) {
      sessionAuthenticated = true;
      setIsAuthenticated(true);
      setShowPasswordModal(false);
      setError('');
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } else {
      setError('Wrong password. Try again, degenerate.');
    }
  }, [pendingAction]);

  const dismissModal = useCallback(() => {
    setShowPasswordModal(false);
    setPendingAction(null);
    setError('');
  }, []);

  return {
    isAuthenticated,
    showPasswordModal,
    error,
    requireAuth,
    submitPassword,
    dismissModal,
  };
}
