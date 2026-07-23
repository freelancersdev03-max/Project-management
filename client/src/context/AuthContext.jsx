import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [currentOrg, setCurrentOrg] = useState(null);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [availableOrgs, setAvailableOrgs] = useState([]);
  const [availableWorkspaces, setAvailableWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch current user detail and permissions
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setPermissions({});
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch user details
      const userRes = await API.get('/me/');
      setUser(userRes.data);

      // 2. Fetch permissions
      const permRes = await API.get('/permissions/me/');
      setPermissions(permRes.data.permissions || {});

      // 3. Fetch org/workspace context
      const ctxRes = await API.get('/organizations/current-context/');
      setCurrentOrg(ctxRes.data.current_organization);
      setCurrentWorkspace(ctxRes.data.current_workspace);
      setAvailableOrgs(ctxRes.data.available_organizations || []);
      setAvailableWorkspaces(ctxRes.data.available_workspaces || []);
    } catch (err) {
      console.error('[AuthContext] Error loading user context:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Permission check helper
  const hasPermission = useCallback((codename) => {
    if (!user) return false;
    if (user.role === 'ADMIN' || user.is_superuser) return true;
    const scope = permissions[codename];
    return scope && scope !== 'denied';
  }, [user, permissions]);

  // Get specific scope level ('all', 'assigned', 'owned', 'project', 'denied')
  const getPermissionScope = useCallback((codename) => {
    if (!user) return 'denied';
    if (user.role === 'ADMIN' || user.is_superuser) return 'all';
    return permissions[codename] || 'denied';
  }, [user, permissions]);

  // Switch Organization
  const switchOrg = async (orgId) => {
    try {
      const res = await API.post(`/organizations/organizations/${orgId}/switch/`);
      setCurrentOrg(res.data.organization);
      if (res.data.organization?.slug) {
        localStorage.setItem('org_slug', res.data.organization.slug);
      }
      // Re-fetch context after switch
      await refreshUser();
      return true;
    } catch (err) {
      console.error('[AuthContext] Error switching org:', err);
      return false;
    }
  };

  // Switch Workspace
  const switchWorkspace = async (workspaceId) => {
    try {
      const res = await API.post(`/organizations/workspaces/${workspaceId}/switch/`);
      setCurrentWorkspace(res.data.workspace);
      if (res.data.workspace?.slug) {
        localStorage.setItem('workspace_slug', res.data.workspace.slug);
      }
      await refreshUser();
      return true;
    } catch (err) {
      console.error('[AuthContext] Error switching workspace:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await API.post('/logout/');
    } catch (err) {
      console.warn('[AuthContext] Logout audit notification error:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('org_slug');
      localStorage.removeItem('workspace_slug');
      setUser(null);
      setPermissions({});
      setCurrentOrg(null);
      setCurrentWorkspace(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      permissions,
      currentOrg,
      currentWorkspace,
      availableOrgs,
      availableWorkspaces,
      loading,
      hasPermission,
      getPermissionScope,
      switchOrg,
      switchWorkspace,
      refreshUser,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
