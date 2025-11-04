import { useUser } from '../contexts/UserContext';

/**
 * Custom hook to check user permissions and assignments
 */
export const useUserPermissions = () => {
  const { currentUser, isAssignedTo, isCurrentUser } = useUser();

  /**
   * Check if the current user is assigned to a work order
   */
  const isMyWorkOrder = (workOrder) => {
    if (!currentUser || !workOrder) return false;
    return isAssignedTo(workOrder.assigned_to || workOrder.assignedTo);
  };

  /**
   * Check if the current user created a work order
   */
  const isMyCreatedWorkOrder = (workOrder) => {
    if (!currentUser || !workOrder) return false;
    return isCurrentUser(workOrder.created_by || workOrder.createdBy);
  };

  /**
   * Check if the current user can edit a work order
   * (either assigned to them or created by them)
   */
  const canEditWorkOrder = (workOrder) => {
    return isMyWorkOrder(workOrder) || isMyCreatedWorkOrder(workOrder);
  };

  /**
   * Get display name for current user
   */
  const getCurrentUserName = () => {
    return currentUser?.username || currentUser?.name || 'Unknown User';
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role) => {
    if (!currentUser) return false;
    return currentUser.role === role || currentUser.roles?.includes(role);
  };

  return {
    currentUser,
    isMyWorkOrder,
    isMyCreatedWorkOrder,
    canEditWorkOrder,
    getCurrentUserName,
    hasRole,
    isAssignedTo,
    isCurrentUser,
  };
};

export default useUserPermissions;