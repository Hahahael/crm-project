// Session storage utilities for user data management

/**
 * Session Storage Keys
 */
export const SESSION_KEYS = {
  CURRENT_USER: 'currentUser',
  USER_PREFERENCES: 'userPreferences',
  LAST_LOGIN: 'lastLogin',
};

/**
 * Save user data to session storage
 * @param {Object} userData - User object to store
 */
export const saveUserSession = (userData) => {
  try {
    sessionStorage.setItem(SESSION_KEYS.CURRENT_USER, JSON.stringify(userData));
    sessionStorage.setItem(SESSION_KEYS.LAST_LOGIN, new Date().toISOString());
    console.log('✅ User session saved');
  } catch (error) {
    console.error('❌ Failed to save user session:', error);
  }
};

/**
 * Get user data from session storage
 * @returns {Object|null} User object or null if not found
 */
export const getUserSession = () => {
  try {
    const userData = sessionStorage.getItem(SESSION_KEYS.CURRENT_USER);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('❌ Failed to get user session:', error);
    return null;
  }
};

/**
 * Clear user session data
 */
export const clearUserSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEYS.CURRENT_USER);
    sessionStorage.removeItem(SESSION_KEYS.LAST_LOGIN);
    sessionStorage.removeItem(SESSION_KEYS.USER_PREFERENCES);
    console.log('✅ User session cleared');
  } catch (error) {
    console.error('❌ Failed to clear user session:', error);
  }
};

/**
 * Check if user session exists and is valid
 * @returns {boolean} True if valid session exists
 */
export const hasValidSession = () => {
  const userData = getUserSession();
  const lastLogin = sessionStorage.getItem(SESSION_KEYS.LAST_LOGIN);
  
  if (!userData || !lastLogin) return false;
  
  // Optional: Check if session is too old (e.g., older than 8 hours)
  const loginTime = new Date(lastLogin);
  const now = new Date();
  const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
  
  return hoursSinceLogin < 8; // Session expires after 8 hours of inactivity
};

/**
 * Save user preferences to session
 * @param {Object} preferences - User preferences object
 */
export const saveUserPreferences = (preferences) => {
  try {
    sessionStorage.setItem(SESSION_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.error('❌ Failed to save user preferences:', error);
  }
};

/**
 * Get user preferences from session
 * @returns {Object|null} Preferences object or null
 */
export const getUserPreferences = () => {
  try {
    const prefs = sessionStorage.getItem(SESSION_KEYS.USER_PREFERENCES);
    return prefs ? JSON.parse(prefs) : null;
  } catch (error) {
    console.error('❌ Failed to get user preferences:', error);
    return null;
  }
};

/**
 * Update user session data (partial update)
 * @param {Object} updates - Partial user data to update
 */
export const updateUserSession = (updates) => {
  const currentUser = getUserSession();
  if (currentUser) {
    const updatedUser = { ...currentUser, ...updates };
    saveUserSession(updatedUser);
  }
};

export default {
  saveUserSession,
  getUserSession,
  clearUserSession,
  hasValidSession,
  saveUserPreferences,
  getUserPreferences,
  updateUserSession,
  SESSION_KEYS,
};