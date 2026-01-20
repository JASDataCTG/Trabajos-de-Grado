
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  teacherId: string | null;
  studentId: string | null;
}

export interface Project {
  id: string;
  title: string;
  presentationDate: string;
  filesUrl: string;
  statusId: string;
  formatId: string;
  programId: string; // Movido de Student a Project
  isApprovedByDirector: boolean;
  writtenGradeReviewer1: number | null;
  presentationGradeReviewer1: number | null;
  writtenGradeReviewer2: number | null;
  presentationGradeReviewer2: number | null;
  finalGrade: number | null;
}

export interface Program {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  cedula: string;
  projectId: string | null; // Mantenido por compatibilidad, pero la lógica ahora es múltiple
  programId?: string; // Opcional ahora que reside en Project
}

export interface Teacher {
  id:string;
  name: string;
  email: string;
  cedula: string;
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
}

export interface TeacherRole {
  id: string;
  name: string;
}

export interface Status {
  id: string;
  name: string;
}

export interface AppDatabase {
    users: User[];
    projects: Project[];
    programs: Program[];
    students: Student[];
    teachers: Teacher[];
    projectTeachers: ProjectTeacher[];
    formats: Format[];
    teacherRoles: TeacherRole[];
    statuses: Status[];
}
