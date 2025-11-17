// Custom hook for direct session storage access
import { useState, useEffect } from 'react';
import { getUserSession, hasValidSession } from '../utils/sessionStorage';

/**
 * Hook that provides direct access to session storage user data
 * Unlike useUser, this doesn't re-render when user changes via context
 * @returns {Object} - { user, isValid, refresh }
 */
export const useSessionUser = () => {
  const [user, setUser] = useState(() => getUserSession());
  const [isValid, setIsValid] = useState(() => hasValidSession());

  // Function to manually refresh from session
  const refresh = () => {
    setUser(getUserSession());
    setIsValid(hasValidSession());
  };

  // Optional: Auto-refresh on storage events (if user logs out in another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'currentUser' || e.key === 'lastLogin') {
        refresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { user, isValid, refresh };
};

/**
 * Simple function to get current user synchronously
 * @returns {Object|null} Current user or null
 */
export const getCurrentUser = () => {
  return getUserSession();
};

/**
 * Check if user has specific role/permission from session
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermissionInSession = (permission) => {
  const user = getUserSession();
  if (!user) return false;
  
  const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
  return userRoles.includes(permission) || userRoles.includes('all');
};

export default {
  useSessionUser,
  getCurrentUser,
  hasPermissionInSession,
};