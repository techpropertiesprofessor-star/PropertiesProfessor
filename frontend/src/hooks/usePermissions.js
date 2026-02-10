import { useState, useCallback, useEffect } from 'react';

export function usePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  const apiBase = process.env.REACT_APP_API_URL || '/api';

  useEffect(() => {
    loadMyPermissions();
  }, []);

  const loadMyPermissions = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/permissions/my-permissions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions);
        setGroupedPermissions(data.grouped);
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const hasPermission = useCallback((permissionKey) => {
    return permissions.includes(permissionKey);
  }, [permissions]);

  const canViewDashboard = useCallback(() => hasPermission('view_dashboard'), [hasPermission]);
  const canViewAttendance = useCallback(() => hasPermission('view_attendance'), [hasPermission]);
  const canMarkAttendance = useCallback(() => hasPermission('mark_attendance'), [hasPermission]);
  const canViewTasks = useCallback(() => hasPermission('view_tasks'), [hasPermission]);
  const canCreateTasks = useCallback(() => hasPermission('create_tasks'), [hasPermission]);
  const canViewContent = useCallback(() => hasPermission('view_content'), [hasPermission]);
  const canCreateContent = useCallback(() => hasPermission('create_content'), [hasPermission]);
  const canViewEmployees = useCallback(() => hasPermission('view_employees'), [hasPermission]);
  const canViewChat = useCallback(() => hasPermission('view_chat'), [hasPermission]);
  const canSendChat = useCallback(() => hasPermission('send_chat'), [hasPermission]);
  const canManagePermissions = useCallback(() => hasPermission('manage_permissions'), [hasPermission]);

  return {
    permissions,
    groupedPermissions,
    loading,
    hasPermission,
    canViewDashboard,
    canViewAttendance,
    canMarkAttendance,
    canViewTasks,
    canCreateTasks,
    canViewContent,
    canCreateContent,
    canViewEmployees,
    canViewChat,
    canSendChat,
    canManagePermissions
  };
}
