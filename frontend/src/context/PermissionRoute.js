import React, { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

/**
 * PermissionRoute - Wraps a page component and checks if the logged-in
 * employee has been granted the required permission string.
 *
 * ADMIN / MANAGER roles bypass the check (full access).
 * EMPLOYEE / CALLER roles are validated against their `permissions` array
 * that comes from the auth context (loaded on login / token verify).
 *
 * Usage:
 *   <PermissionRoute permission="Leads"><LeadsPage /></PermissionRoute>
 */
export const PermissionRoute = ({ permission, children }) => {
  const { user, loading } = useContext(AuthContext);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Wait until auth loading is finished
    if (!loading) setChecking(false);
  }, [loading]);

  // Still loading auth
  if (checking || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not logged in  
  if (!user) {
    return <Navigate to="/login" />;
  }

  // ADMIN and MANAGER have full access to every page
  const role = user.role?.toUpperCase();
  if (role === 'ADMIN' || role === 'MANAGER') {
    return children;
  }

  // Profile is always accessible to everyone
  if (permission === 'Profile') {
    return children;
  }

  // For EMPLOYEE / CALLER – check the permissions array
  const userPermissions = user.permissions || [];
  const hasAccess = userPermissions.includes(permission);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">
            You don't have permission to access <span className="font-semibold text-red-600">{permission}</span>. Please contact your manager to request access.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};
