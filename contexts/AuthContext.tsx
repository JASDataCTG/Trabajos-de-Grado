
import React, { createContext, useState, useContext, useEffect } from 'react';
import { db, AuthFailureReason } from '../services/database';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  lastAuthError: AuthFailureReason | null;
  canEditProject: (projectId: string) => Promise<boolean>;
  canGradeProject: (projectId: string) => Promise<{ canGrade: boolean, reviewerRole: string | null }>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [lastAuthError, setLastAuthError] = useState<AuthFailureReason | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('degreeProjectManagerUser');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.id && parsed.role) {
          setUser({ ...parsed, password: '' });
        }
      }
    } catch {
      localStorage.removeItem('degreeProjectManagerUser');
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setLastAuthError(null);
    try {
        const result = await db.authenticateUserWithReason(username, password);
        if (result.user) {
          const safeSessionUser: User = { ...result.user, password: '' };
          setUser(safeSessionUser);
          localStorage.setItem('degreeProjectManagerUser', JSON.stringify(safeSessionUser));
          return true;
        }
        setLastAuthError(result.reason || 'invalid_credentials');
    } catch (e) {
        console.error("Error en proceso de login:", e);
        setLastAuthError('invalid_credentials');
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('degreeProjectManagerUser');
  };

  const getProjectRolesForCurrentUser = async (projectId: string): Promise<string[]> => {
    if (!user || !user.teacherId) return [];
    const projectTeachers = await db.getProjectTeachers();
    const roles = await db.getTeacherRoles();
    const userAssignments = projectTeachers.filter(
      pt => pt.projectId === projectId && pt.teacherId === user.teacherId
    );
    return userAssignments.map(assignment => {
      return roles.find(r => r.id === assignment.roleId)?.name || '';
    }).filter(Boolean);
  };

  const canEditProject = async (projectId: string): Promise<boolean> => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role !== 'teacher') return false;
    const userRoles = await getProjectRolesForCurrentUser(projectId);
    return userRoles.some(role => role.toLowerCase().includes('director'));
  };

  const canGradeProject = async (projectId: string): Promise<{ canGrade: boolean, reviewerRole: string | null }> => {
      if (!user) return { canGrade: false, reviewerRole: null };
      if (user.role === 'admin') return { canGrade: true, reviewerRole: 'admin' };
      if (user.role !== 'teacher') return { canGrade: false, reviewerRole: null };
      
      const userRoles = await getProjectRolesForCurrentUser(projectId);
      const reviewerRole = userRoles.find(role => role.toLowerCase().includes('evaluador'));
      
      return {
          canGrade: !!reviewerRole,
          reviewerRole: reviewerRole || null
      };
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, isTeacher, isStudent, lastAuthError, login, logout, canEditProject, canGradeProject }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
