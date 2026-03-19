
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  teacherId: string | null;
  studentId: string | null;
}

export interface Faculty {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface Project {
  id: string;
  title: string;
  presentationDate: string;
  filesUrl: string;
  statusId: string;
  formatId: string;
  programId: string;
  isApprovedByDirector: boolean;
  writtenGradeReviewer1: number | null;
  presentationGradeReviewer1: number | null;
  writtenGradeReviewer2: number | null;
  presentationGradeReviewer2: number | null;
  finalGrade: number | null;
  observation: string;
}

export interface Program {
  id: string;
  name: string;
  facultyId?: string;
  sortOrder?: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  cedula: string;
  projectId: string | null;
  programId?: string;
  password?: string;
}

export interface Teacher {
  id:string;
  name: string;
  email: string;
  cedula: string;
  password?: string;
}

export interface ProjectTeacher {
    id: string;
    projectId: string;
    teacherId: string;
    roleId: string;
}

export interface Format {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface TeacherRole {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface Status {
  id: string;
  name: string;
  sortOrder?: number;
}

export type Page = 'dashboard' | 'projects' | 'students' | 'teachers' | 'settings' | 'reports' | 'users' | 'profile';
