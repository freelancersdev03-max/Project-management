import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Declarative UI Permission Guard.
 * Usage:
 * <PermissionGuard permission="projects.create" fallback={<p>Access Denied</p>}>
 *   <CreateProjectButton />
 * </PermissionGuard>
 */
const PermissionGuard = ({ permission, fallback = null, children }) => {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!hasPermission(permission)) {
    return fallback;
  }

  return <>{children}</>;
};

export default PermissionGuard;
