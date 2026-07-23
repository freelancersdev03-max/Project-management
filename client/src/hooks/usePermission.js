import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for permission checks in functional components.
 * Returns { can, scope, isAdmin }
 *
 * Example:
 * const { can, scope } = usePermission('projects.create');
 * if (can) { ... }
 */
export const usePermission = (codename) => {
  const { hasPermission, getPermissionScope, user } = useAuth();

  const can = hasPermission(codename);
  const scope = getPermissionScope(codename);
  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser;

  return { can, scope, isAdmin };
};

export default usePermission;
