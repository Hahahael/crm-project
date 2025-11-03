import { createContext, useContext, useState, useEffect } from 'react';
import { apiBackendFetch } from '../services/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await apiBackendFetch("/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setError(null);
      } else {
        // Don't treat auth failures as errors - user might not be logged in
        setCurrentUser(null);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch current user", err);
      setCurrentUser(null);
      setError(null); // Don't set error for network issues
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setError(null);
  };

  const isCurrentUser = (userId) => {
    return currentUser && currentUser.id === userId;
  };

  const isAssignedTo = (assignedToId) => {
    return currentUser && currentUser.id === assignedToId;
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const value = {
    currentUser,
    loading,
    error,
    fetchCurrentUser,
    logout,
    isCurrentUser,
    isAssignedTo,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;