
// @ts-ignore - Importación directa desde CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program, User } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

// @ts-ignore
export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

const LOCAL_STORAGE_KEY = 'uninunez_db_v3'; // Nueva versión para evitar conflictos

const initialDB = {
    users: [{ id: 'admin-id', username: 'admin', password: 'admin123', role: 'admin', teacherId: null, studentId: null }],
    projects: [],
    programs: [{ id: '1', name: 'Ingeniería de Sistemas' }, { id: '2', name: 'Derecho' }, { id: '3', name: 'Medicina' }],
    students: [],
    teachers: [],
    projectTeachers: [],
    formats: [{ id: '1', name: 'Anteproyecto' }, { id: '2', name: 'Proyecto Final' }],
    teacherRoles: [{ id: '1', name: 'Director' }, { id: '2', name: 'Co-Director' }, { id: '3', name: 'Evaluador 1' }, { id: '4', name: 'Evaluador 2' }],
    statuses: [{ id: '1', name: 'En Proceso' }, { id: '2', name: 'Aprobado' }, { id: '3', name: 'Sustentado' }, { id: '4', name: 'Rechazado' }]
};

const getLocalDB = (): any => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return initialDB;
    try {
        const parsed = JSON.parse(data);
        // Mezclamos con initialDB para asegurar que todas las tablas existan
        return { ...initialDB, ...parsed };
    } catch {
        return initialDB;
    }
};

const setLocalDB = (db: any) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
};

export const initializeDB = () => {
    const current = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!current) {
        setLocalDB(initialDB);
    }
};

// Mapeos de campos para compatibilidad con bases de datos SQL
const mapProjectToDB = (p: Partial<Project>) => ({
    id: p.id,
    title: p.title,
    presentation_date: p.presentationDate,
    files_url: p.filesUrl,
    status_id: p.statusId,
    format_id: p.formatId,
    is_approved_by_director: p.isApprovedByDirector,
    written_grade_reviewer1: p.writtenGradeReviewer1,
    presentation_grade_reviewer1: p.presentationGradeReviewer1,
    written_grade_reviewer2: p.writtenGradeReviewer2,
    presentation_grade_reviewer2: p.presentationGradeReviewer2
});

const mapProjectFromDB = (p: any): Project => ({
    id: p.id,
    title: p.title,
    presentationDate: p.presentation_date || p.presentationDate,
    filesUrl: p.files_url || p.filesUrl,
    statusId: p.status_id || p.statusId,
    formatId: p.format_id || p.formatId,
    isApprovedByDirector: p.is_approved_by_director ?? p.isApprovedByDirector ?? false,
    writtenGradeReviewer1: p.written_grade_reviewer1 ?? p.writtenGradeReviewer1 ?? null,
    presentationGradeReviewer1: p.presentation_grade_reviewer1 ?? p.presentationGradeReviewer1 ?? null,
    writtenGradeReviewer2: p.written_grade_reviewer2 ?? p.writtenGradeReviewer2 ?? null,
    presentationGradeReviewer2: p.presentation_grade_reviewer2 ?? p.presentationGradeReviewer2 ?? null
});

export const db = {
    checkConnection: async () => {
        if (!supabase) return true;
        try {
            const { error } = await supabase.from('users').select('id').limit(1);
            return !error;
        } catch {
            return false;
        }
    },

    // --- OPERACIONES DE LECTURA (Priorizan Local) ---
    getUsers: async () => getLocalDB().users,
    getUserByUsername: async (username: string) => {
        const users = await db.getUsers();
        return users.find((u: User) => u.username.toLowerCase() === username.toLowerCase().trim()) || null;
    },
    getProjects: async () => getLocalDB().projects,
    getProjectById: async (id: string) => (await db.getProjects()).find(p => p.id === id) || null,
    getStudents: async () => getLocalDB().students,
    getStudentById: async (id: string) => (await db.getStudents()).find(s => s.id === id) || null,
    getTeachers: async () => getLocalDB().teachers,
    getProjectTeachers: async () => getLocalDB().projectTeachers,
    getPrograms: async () => getLocalDB().programs,
    getStatuses: async () => getLocalDB().statuses,
    getFormats: async () => getLocalDB().formats,
    getTeacherRoles: async () => getLocalDB().teacherRoles,

    // --- OPERACIONES DE ESCRITURA (Local + Mirror Supabase) ---
    addProject: async (project: Omit<Project, 'id'>) => {
        const id = generateId();
        const newProject = { ...project, id } as Project;
        const db_local = getLocalDB();
        db_local.projects.unshift(newProject);
        setLocalDB(db_local);

        if (supabase) {
            supabase.from('projects').insert([mapProjectToDB(newProject)]).then(({error}) => {
                if (error) console.error("Sync Error (addProject):", error);
            });
        }
        return newProject;
    },

    updateProject: async (project: Project) => {
        const db_local = getLocalDB();
        const idx = db_local.projects.findIndex((p: any) => p.id === project.id);
        if (idx !== -1) {
            db_local.projects[idx] = project;
            setLocalDB(db_local);
        }

        if (supabase) {
            supabase.from('projects').update(mapProjectToDB(project)).eq('id', project.id).then(({error}) => {
                if (error) console.error("Sync Error (updateProject):", error);
            });
        }
        return project;
    },

    deleteProject: async (id: string) => {
        const db_local = getLocalDB();
        db_local.projects = db_local.projects.filter((p: any) => p.id !== id);
        setLocalDB(db_local);
        if (supabase) supabase.from('projects').delete().eq('id', id).then();
    },

    addStudent: async (student: Omit<Student, 'id'>) => {
        const id = generateId();
        const newStudent = { ...student, id } as Student;
        const newUser = { id: generateId(), username: student.name, password: student.cedula, role: 'student' as const, studentId: id, teacherId: null };
        
        const db_local = getLocalDB();
        db_local.students.push(newStudent);
        db_local.users.push(newUser);
        setLocalDB(db_local);

        if (supabase) {
            supabase.from('students').insert([{ id, name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId }]).then();
            supabase.from('users').insert([{ id: newUser.id, username: newUser.username, password: newUser.password, role: 'student', student_id: id }]).then();
        }
        return newStudent;
    },

    updateStudent: async (student: Student) => {
        const db_local = getLocalDB();
        const idx = db_local.students.findIndex((s: any) => s.id === student.id);
        if (idx !== -1) {
            db_local.students[idx] = student;
            const uIdx = db_local.users.findIndex((u: any) => u.studentId === student.id);
            if (uIdx !== -1) {
                db_local.users[uIdx].username = student.name;
                db_local.users[uIdx].password = student.cedula;
            }
            setLocalDB(db_local);
        }
        if (supabase) {
            supabase.from('students').update({ name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId }).eq('id', student.id).then();
        }
        return student;
    },

    // Fix: Added deleteStudent to remove student records and their associated user accounts
    deleteStudent: async (id: string) => {
        const db_local = getLocalDB();
        db_local.students = db_local.students.filter((s: any) => s.id !== id);
        db_local.users = db_local.users.filter((u: any) => u.studentId !== id);
        setLocalDB(db_local);
        if (supabase) {
            supabase.from('students').delete().eq('id', id).then();
            supabase.from('users').delete().eq('student_id', id).then();
        }
    },

    addTeacher: async (teacher: Omit<Teacher, 'id'>) => {
        const id = generateId();
        const newTeacher = { ...teacher, id } as Teacher;
        const newUser = { id: generateId(), username: teacher.name, password: teacher.cedula, role: 'teacher' as const, teacherId: id, studentId: null };

        const db_local = getLocalDB();
        db_local.teachers.push(newTeacher);
        db_local.users.push(newUser);
        setLocalDB(db_local);

        if (supabase) {
            supabase.from('teachers').insert([{ ...teacher, id }]).then();
            supabase.from('users').insert([{ id: newUser.id, username: newUser.username, password: newUser.password, role: 'teacher', teacher_id: id }]).then();
        }
        return newTeacher;
    },

    // Fix: Added updateTeacher to handle profile modifications and sync with the associated user
    updateTeacher: async (teacher: Teacher) => {
        const db_local = getLocalDB();
        const idx = db_local.teachers.findIndex((t: any) => t.id === teacher.id);
        if (idx !== -1) {
            db_local.teachers[idx] = teacher;
            const uIdx = db_local.users.findIndex((u: any) => u.teacherId === teacher.id);
            if (uIdx !== -1) {
                db_local.users[uIdx].username = teacher.name;
                db_local.users[uIdx].password = teacher.cedula;
            }
            setLocalDB(db_local);
        }
        if (supabase) {
            supabase.from('teachers').update({ name: teacher.name, email: teacher.email, cedula: teacher.cedula }).eq('id', teacher.id).then();
        }
        return teacher;
    },

    // Fix: Added deleteTeacher to remove teacher records and their associated user accounts
    deleteTeacher: async (id: string) => {
        const db_local = getLocalDB();
        db_local.teachers = db_local.teachers.filter((t: any) => t.id !== id);
        db_local.users = db_local.users.filter((u: any) => u.teacherId !== id);
        setLocalDB(db_local);
        if (supabase) {
            supabase.from('teachers').delete().eq('id', id).then();
            supabase.from('users').delete().eq('teacher_id', id).then();
        }
    },

    addProjectTeacher: async (pt: Omit<ProjectTeacher, 'id'>) => {
        const id = generateId();
        const newPT = { ...pt, id } as ProjectTeacher;
        const db_local = getLocalDB();
        db_local.projectTeachers.push(newPT);
        setLocalDB(db_local);
        if (supabase) supabase.from('project_teachers').insert([{ id, project_id: pt.projectId, teacher_id: pt.teacherId, role_id: pt.roleId }]).then();
        return newPT;
    },

    deleteProjectTeachersByProject: async (projectId: string) => {
        const db_local = getLocalDB();
        db_local.projectTeachers = db_local.projectTeachers.filter((pt: any) => pt.projectId !== projectId);
        setLocalDB(db_local);
        if (supabase) supabase.from('project_teachers').delete().eq('project_id', projectId).then();
    },

    // Fix: Added deleteUser to allow administrative removal of system access accounts
    deleteUser: async (id: string) => {
        const db_local = getLocalDB();
        db_local.users = db_local.users.filter((u: any) => u.id !== id);
        setLocalDB(db_local);
        if (supabase) supabase.from('users').delete().eq('id', id).then();
    },

    // --- CONFIGURACIONES (Mantenidas locales por simplicidad) ---
    addStatus: async (p: Omit<Status, 'id'>) => { const id=generateId(); const item={...p, id}; const db=getLocalDB(); db.statuses.push(item); setLocalDB(db); return item; },
    addFormat: async (p: Omit<Format, 'id'>) => { const id=generateId(); const item={...p, id}; const db=getLocalDB(); db.formats.push(item); setLocalDB(db); return item; },
    addProgram: async (p: Omit<Program, 'id'>) => { const id=generateId(); const item={...p, id}; const db=getLocalDB(); db.programs.push(item); setLocalDB(db); return item; },
    addTeacherRole: async (p: Omit<TeacherRole, 'id'>) => { const id=generateId(); const item={...p, id}; const db=getLocalDB(); db.teacherRoles.push(item); setLocalDB(db); return item; },
    
    updateStatus: async (p: Status) => { const db=getLocalDB(); const i=db.statuses.findIndex((x:any)=>x.id===p.id); if(i!==-1) db.statuses[i]=p; setLocalDB(db); return p; },
    deleteStatus: async (id: string) => { const db=getLocalDB(); db.statuses=db.statuses.filter((x:any)=>x.id!==id); setLocalDB(db); },
    updateFormat: async (p: Format) => { const db=getLocalDB(); const i=db.formats.findIndex((x:any)=>x.id===p.id); if(i!==-1) db.formats[i]=p; setLocalDB(db); return p; },
    deleteFormat: async (id: string) => { const db=getLocalDB(); db.formats=db.formats.filter((x:any)=>x.id!==id); setLocalDB(db); },
    updateProgram: async (p: Program) => { const db=getLocalDB(); const i=db.programs.findIndex((x:any)=>x.id===p.id); if(i!==-1) db.programs[i]=p; setLocalDB(db); return p; },
    deleteProgram: async (id: string) => { const db=getLocalDB(); db.programs=db.programs.filter((x:any)=>x.id!==id); setLocalDB(db); },
    updateTeacherRole: async (p: TeacherRole) => { const db=getLocalDB(); const i=db.teacherRoles.findIndex((x:any)=>x.id===p.id); if(i!==-1) db.teacherRoles[i]=p; setLocalDB(db); return p; },
    deleteTeacherRole: async (id: string) => { const db=getLocalDB(); db.teacherRoles=db.teacherRoles.filter((x:any)=>x.id!==id); setLocalDB(db); },

    initializeDB
};
