
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  canEditProject: (projectId: string) => Promise<boolean>;
  canGradeProject: (projectId: string) => Promise<{ canGrade: boolean, reviewerRole: string | null, reviewerSlot: 1 | 2 | 'admin' | null }>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('degreeProjectManagerUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
        const foundUser = await db.getUserByUsername(username.trim());
        if (foundUser && String(foundUser.password).trim() === String(password).trim()) {
          setUser(foundUser);
          localStorage.setItem('degreeProjectManagerUser', JSON.stringify(foundUser));
          return true;
        }
    } catch (e) {
        console.error("Error en proceso de login:", e);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('degreeProjectManagerUser');
  };

  const getProjectAssignmentsForCurrentUser = async (projectId: string) => {
    if (!user || !user.teacherId) return [];
    const projectTeachers = await db.getProjectTeachers();
    const roles = await db.getTeacherRoles();
    return projectTeachers
      .filter(pt => pt.projectId === projectId && pt.teacherId === user.teacherId)
      .map(pt => ({
        roleName: roles.find(r => r.id === pt.roleId)?.name || '',
        roleId: pt.roleId
      }));
  };

  const canEditProject = async (projectId: string): Promise<boolean> => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role !== 'teacher') return false;
    const assignments = await getProjectAssignmentsForCurrentUser(projectId);
    return assignments.some(a => a.roleName.toLowerCase().includes('director'));
  };

  const canGradeProject = async (projectId: string): Promise<{ canGrade: boolean, reviewerRole: string | null, reviewerSlot: 1 | 2 | 'admin' | null }> => {
      if (!user) return { canGrade: false, reviewerRole: null, reviewerSlot: null };
      if (user.role === 'admin') return { canGrade: true, reviewerRole: 'admin', reviewerSlot: 'admin' };
      if (user.role !== 'teacher') return { canGrade: false, reviewerRole: null, reviewerSlot: null };
      
      const assignments = await getProjectAssignmentsForCurrentUser(projectId);
      const eval1 = assignments.find(a => a.roleName.toLowerCase().includes('evaluador 1'));
      if (eval1) return { canGrade: true, reviewerRole: eval1.roleName, reviewerSlot: 1 };
      
      const eval2 = assignments.find(a => a.roleName.toLowerCase().includes('evaluador 2'));
      if (eval2) return { canGrade: true, reviewerRole: eval2.roleName, reviewerSlot: 2 };
      
      return { canGrade: false, reviewerRole: null, reviewerSlot: null };
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
