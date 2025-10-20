
export interface Project {
  id: string;
  title: string;
  presentationDate: string;
  filesUrl: string;
  statusId: string;
  formatId: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  projectId: string | null;
}

export interface Teacher {
  id:string;
  name: string;
  email: string;
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
    projects: Project[];
    students: Student[];
    teachers: Teacher[];
    projectTeachers: ProjectTeacher[];
    formats: Format[];
    teacherRoles: TeacherRole[];
    statuses: Status[];
}
