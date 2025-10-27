import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '../services/database';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  canEditProject: (projectId: string) => boolean;
  canGradeProject: (projectId: string) => { canGrade: boolean, reviewerRole: string | null };
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('degreeProjectManagerUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const users = db.getUsers();
    const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      sessionStorage.setItem('degreeProjectManagerUser', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('degreeProjectManagerUser');
  };

  const getProjectRolesForCurrentUser = (projectId: string): string[] => {
    if (!user || !user.teacherId) return [];
    const projectTeachers = db.getProjectTeachers();
    const roles = db.getTeacherRoles();
    const userAssignments = projectTeachers.filter(
      pt => pt.projectId === projectId && pt.teacherId === user.teacherId
    );
    return userAssignments.map(assignment => {
      return roles.find(r => r.id === assignment.roleId)?.name || '';
    }).filter(Boolean);
  };

  const canEditProject = (projectId: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role !== 'teacher') return false;
    const userRoles = getProjectRolesForCurrentUser(projectId);
    return userRoles.some(role => role.toLowerCase().includes('director'));
  };

  const canGradeProject = (projectId: string): { canGrade: boolean, reviewerRole: string | null } => {
      if (!user) return { canGrade: false, reviewerRole: null };
      if (user.role === 'admin') return { canGrade: true, reviewerRole: 'admin' };
      if (user.role !== 'teacher') return { canGrade: false, reviewerRole: null };
      
      const userRoles = getProjectRolesForCurrentUser(projectId);
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
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, isTeacher, isStudent, login, logout, canEditProject, canGradeProject }}>
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