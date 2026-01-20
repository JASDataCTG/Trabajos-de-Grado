
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

// --- Local Storage Implementation ---
const LOCAL_STORAGE_KEY = 'uninunez_db';

const getLocalDB = () => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
};

const setLocalDB = (db: any) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
};

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

export const initializeDB = () => {
    if (!isSupabaseConfigured && !localStorage.getItem(LOCAL_STORAGE_KEY)) {
        setLocalDB(initialDB);
    }
};

const safeQuery = async (queryPromise: Promise<any>, tableName: string) => {
    if (supabase) {
        try {
            const result = await queryPromise;
            if (result.error) throw result.error;
            return result;
        } catch (error) {
            console.error(`Error en Supabase (${tableName}):`, error);
        }
    }
    
    // Fallback a Local Storage
    const db = getLocalDB() || initialDB;
    return { data: db[tableName] || [], error: null };
};

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
    isApprovedByDirector: p.is_approved_by_director !== undefined ? p.is_approved_by_director : p.isApprovedByDirector,
    writtenGradeReviewer1: p.written_grade_reviewer1 !== undefined ? p.written_grade_reviewer1 : p.writtenGradeReviewer1,
    presentationGradeReviewer1: p.presentation_grade_reviewer1 !== undefined ? p.presentation_grade_reviewer1 : p.presentationGradeReviewer1,
    writtenGradeReviewer2: p.written_grade_reviewer2 !== undefined ? p.written_grade_reviewer2 : p.writtenGradeReviewer2,
    presentationGradeReviewer2: p.presentation_grade_reviewer2 !== undefined ? p.presentation_grade_reviewer2 : p.presentationGradeReviewer2
});

export const db = {
    checkConnection: async () => {
        if (!supabase) return true; // Si no hay Supabase, la conexión local siempre es válida
        try {
            const { error } = await supabase.from('users').select('id').limit(1);
            return !error;
        } catch {
            return false;
        }
    },

    getUsers: async () => {
        const { data } = await safeQuery(supabase?.from('users').select('*') || Promise.resolve({}), 'users');
        return (data || []).map((u: any) => ({
            ...u,
            teacherId: u.teacher_id || u.teacherId,
            studentId: u.student_id || u.studentId
        }));
    },
    getUserByUsername: async (username: string) => {
        const users = await db.getUsers();
        return users.find((u: User) => u.username.toLowerCase() === username.toLowerCase().trim()) || null;
    },
    deleteUser: async (id: string) => {
        if (supabase) await supabase.from('users').delete().eq('id', id);
        const db_local = getLocalDB();
        if (db_local) {
            db_local.users = db_local.users.filter((u: any) => u.id !== id);
            setLocalDB(db_local);
        }
    },
    getProjects: async () => {
        const { data } = await safeQuery(supabase?.from('projects').select('*') || Promise.resolve({}), 'projects');
        return (data || []).map(mapProjectFromDB);
    },
    getProjectById: async (id: string) => {
        const projects = await db.getProjects();
        return projects.find(p => p.id === id) || null;
    },
    addProject: async (project: Omit<Project, 'id'>) => {
        const id = generateId();
        const newProject = { ...project, id };
        if (supabase) await supabase.from('projects').insert([mapProjectToDB(newProject)]);
        const db_local = getLocalDB();
        if (db_local) {
            db_local.projects.push(newProject);
            setLocalDB(db_local);
        }
        return newProject as Project;
    },
    updateProject: async (project: Project) => {
        if (supabase) await supabase.from('projects').update(mapProjectToDB(project)).eq('id', project.id);
        const db_local = getLocalDB();
        if (db_local) {
            const idx = db_local.projects.findIndex((p: any) => p.id === project.id);
            if (idx !== -1) db_local.projects[idx] = project;
            setLocalDB(db_local);
        }
        return project;
    },
    deleteProject: async (id: string) => {
        if (supabase) await supabase.from('projects').delete().eq('id', id);
        const db_local = getLocalDB();
        if (db_local) {
            db_local.projects = db_local.projects.filter((p: any) => p.id !== id);
            setLocalDB(db_local);
        }
    },
    getStudents: async () => {
        const { data } = await safeQuery(supabase?.from('students').select('*') || Promise.resolve({}), 'students');
        return (data || []).map((s: any) => ({ ...s, projectId: s.project_id || s.projectId, programId: s.program_id || s.programId }));
    },
    getStudentById: async (id: string) => {
        const students = await db.getStudents();
        return students.find(s => s.id === id) || null;
    },
    addStudent: async (student: Omit<Student, 'id'>) => {
        const id = generateId();
        const newStudent = { ...student, id };
        if (supabase) {
            await supabase.from('students').insert([{ id, name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId }]);
            await supabase.from('users').insert([{ id: generateId(), username: student.name, password: student.cedula, role: 'student', student_id: id }]);
        }
        const db_local = getLocalDB();
        if (db_local) {
            db_local.students.push(newStudent);
            db_local.users.push({ id: generateId(), username: student.name, password: student.cedula, role: 'student', studentId: id, teacherId: null });
            setLocalDB(db_local);
        }
        return newStudent as Student;
    },
    updateStudent: async (student: Student) => {
        if (supabase) {
            await supabase.from('students').update({ name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId }).eq('id', student.id);
            await supabase.from('users').update({ username: student.name, password: student.cedula }).eq('student_id', student.id);
        }
        const db_local = getLocalDB();
        if (db_local) {
            const idx = db_local.students.findIndex((s: any) => s.id === student.id);
            if (idx !== -1) db_local.students[idx] = student;
            const uIdx = db_local.users.findIndex((u: any) => u.studentId === student.id);
            if (uIdx !== -1) {
                db_local.users[uIdx].username = student.name;
                db_local.users[uIdx].password = student.cedula;
            }
            setLocalDB(db_local);
        }
        return student;
    },
    deleteStudent: async (id: string) => {
        if (supabase) {
            await supabase.from('users').delete().eq('student_id', id);
            await supabase.from('students').delete().eq('id', id);
        }
        const db_local = getLocalDB();
        if (db_local) {
            db_local.users = db_local.users.filter((u: any) => u.studentId !== id);
            db_local.students = db_local.students.filter((s: any) => s.id !== id);
            setLocalDB(db_local);
        }
    },
    getTeachers: async () => {
        const { data } = await safeQuery(supabase?.from('teachers').select('*') || Promise.resolve({}), 'teachers');
        return data || [];
    },
    getTeacherById: async (id: string) => {
        const teachers = await db.getTeachers();
        return teachers.find(t => t.id === id) || null;
    },
    addTeacher: async (teacher: Omit<Teacher, 'id'>) => {
        const id = generateId();
        const newTeacher = { ...teacher, id };
        if (supabase) {
            await supabase.from('teachers').insert([{ ...teacher, id }]);
            await supabase.from('users').insert([{ id: generateId(), username: teacher.name, password: teacher.cedula, role: 'teacher', teacher_id: id }]);
        }
        const db_local = getLocalDB();
        if (db_local) {
            db_local.teachers.push(newTeacher);
            db_local.users.push({ id: generateId(), username: teacher.name, password: teacher.cedula, role: 'teacher', teacherId: id, studentId: null });
            setLocalDB(db_local);
        }
        return newTeacher as Teacher;
    },
    updateTeacher: async (teacher: Teacher) => {
        if (supabase) {
            await supabase.from('teachers').update(teacher).eq('id', teacher.id);
            await supabase.from('users').update({ username: teacher.name, password: teacher.cedula }).eq('teacher_id', teacher.id);
        }
        const db_local = getLocalDB();
        if (db_local) {
            const idx = db_local.teachers.findIndex((t: any) => t.id === teacher.id);
            if (idx !== -1) db_local.teachers[idx] = teacher;
            const uIdx = db_local.users.findIndex((u: any) => u.teacherId === teacher.id);
            if (uIdx !== -1) {
                db_local.users[uIdx].username = teacher.name;
                db_local.users[uIdx].password = teacher.cedula;
            }
            setLocalDB(db_local);
        }
        return teacher;
    },
    deleteTeacher: async (id: string) => {
        if (supabase) {
            await supabase.from('users').delete().eq('teacher_id', id);
            await supabase.from('teachers').delete().eq('id', id);
        }
        const db_local = getLocalDB();
        if (db_local) {
            db_local.users = db_local.users.filter((u: any) => u.teacherId !== id);
            db_local.teachers = db_local.teachers.filter((t: any) => t.id !== id);
            setLocalDB(db_local);
        }
    },
    getProjectTeachers: async () => {
        const { data } = await safeQuery(supabase?.from('project_teachers').select('*') || Promise.resolve({}), 'projectTeachers');
        return (data || []).map((pt: any) => ({ 
            id: pt.id, 
            projectId: pt.project_id || pt.projectId, 
            teacherId: pt.teacher_id || pt.teacherId, 
            roleId: pt.role_id || pt.roleId 
        }));
    },
    addProjectTeacher: async (pt: Omit<ProjectTeacher, 'id'>) => {
        const id = generateId();
        const newPT = { ...pt, id };
        if (supabase) await supabase.from('project_teachers').insert([{ id, project_id: pt.projectId, teacher_id: pt.teacherId, role_id: pt.roleId }]);
        const db_local = getLocalDB();
        if (db_local) {
            db_local.projectTeachers.push(newPT);
            setLocalDB(db_local);
        }
        return newPT;
    },
    deleteProjectTeacher: async (id: string) => {
        if (supabase) await supabase.from('project_teachers').delete().eq('id', id);
        const db_local = getLocalDB();
        if (db_local) {
            db_local.projectTeachers = db_local.projectTeachers.filter((pt: any) => pt.id !== id);
            setLocalDB(db_local);
        }
    },
    deleteProjectTeachersByProject: async (projectId: string) => {
        if (supabase) await supabase.from('project_teachers').delete().eq('project_id', projectId);
        const db_local = getLocalDB();
        if (db_local) {
            db_local.projectTeachers = db_local.projectTeachers.filter((pt: any) => pt.projectId !== projectId);
            setLocalDB(db_local);
        }
    },
    getPrograms: async () => (await safeQuery(supabase?.from('programs').select('*') || Promise.resolve({}), 'programs')).data || [],
    getStatuses: async () => (await safeQuery(supabase?.from('statuses').select('*') || Promise.resolve({}), 'statuses')).data || [],
    getFormats: async () => (await safeQuery(supabase?.from('formats').select('*') || Promise.resolve({}), 'formats')).data || [],
    getTeacherRoles: async () => (await safeQuery(supabase?.from('teacher_roles').select('*') || Promise.resolve({}), 'teacherRoles')).data || [],
    
    // Simplificación de agregación local para settings
    addProgram: async (p: Omit<Program, 'id'>) => {
        const id = generateId();
        if (supabase) await supabase.from('programs').insert([{...p, id}]);
        const db_local = getLocalDB(); if (db_local) { db_local.programs.push({...p, id}); setLocalDB(db_local); }
        return {...p, id};
    },
    updateProgram: async (p: Program) => {
        if (supabase) await supabase.from('programs').update(p).eq('id', p.id);
        const db_local = getLocalDB(); if (db_local) { const idx = db_local.programs.findIndex((i:any)=>i.id===p.id); if(idx!==-1) db_local.programs[idx]=p; setLocalDB(db_local); }
        return p;
    },
    deleteProgram: async (id: string) => {
        if (supabase) await supabase.from('programs').delete().eq('id', id);
        const db_local = getLocalDB(); if (db_local) { db_local.programs = db_local.programs.filter((i:any)=>i.id!==id); setLocalDB(db_local); }
    },
    // Métodos similares para status, format, role... (omitidos por brevedad o mapeados genéricamente)
    addStatus: async (p: Omit<Status, 'id'>) => { const id=generateId(); if(supabase) await supabase.from('statuses').insert([{...p, id}]); const db_l=getLocalDB(); if(db_l){db_l.statuses.push({...p, id}); setLocalDB(db_l);} return {...p, id}; },
    updateStatus: async (p: Status) => { if(supabase) await supabase.from('statuses').update(p).eq('id', p.id); const db_l=getLocalDB(); if(db_l){const idx=db_l.statuses.findIndex((i:any)=>i.id===p.id); if(idx!==-1) db_l.statuses[idx]=p; setLocalDB(db_l);} return p; },
    deleteStatus: async (id: string) => { if(supabase) await supabase.from('statuses').delete().eq('id', id); const db_l=getLocalDB(); if(db_l){db_l.statuses=db_l.statuses.filter((i:any)=>i.id!==id); setLocalDB(db_l);} },
    
    addFormat: async (p: Omit<Format, 'id'>) => { const id=generateId(); if(supabase) await supabase.from('formats').insert([{...p, id}]); const db_l=getLocalDB(); if(db_l){db_l.formats.push({...p, id}); setLocalDB(db_l);} return {...p, id}; },
    updateFormat: async (p: Format) => { if(supabase) await supabase.from('formats').update(p).eq('id', p.id); const db_l=getLocalDB(); if(db_l){const idx=db_l.formats.findIndex((i:any)=>i.id===p.id); if(idx!==-1) db_l.formats[idx]=p; setLocalDB(db_l);} return p; },
    deleteFormat: async (id: string) => { if(supabase) await supabase.from('formats').delete().eq('id', id); const db_l=getLocalDB(); if(db_l){db_l.formats=db_l.formats.filter((i:any)=>i.id!==id); setLocalDB(db_l);} },
    
    addTeacherRole: async (p: Omit<TeacherRole, 'id'>) => { const id=generateId(); if(supabase) await supabase.from('teacher_roles').insert([{...p, id}]); const db_l=getLocalDB(); if(db_l){db_l.teacherRoles.push({...p, id}); setLocalDB(db_l);} return {...p, id}; },
    updateTeacherRole: async (p: TeacherRole) => { if(supabase) await supabase.from('teacher_roles').update(p).eq('id', p.id); const db_l=getLocalDB(); if(db_l){const idx=db_l.teacherRoles.findIndex((i:any)=>i.id===p.id); if(idx!==-1) db_l.teacherRoles[idx]=p; setLocalDB(db_l);} return p; },
    deleteTeacherRole: async (id: string) => { if(supabase) await supabase.from('teacher_roles').delete().eq('id', id); const db_l=getLocalDB(); if(db_l){db_l.teacherRoles=db_l.teacherRoles.filter((i:any)=>i.id!==id); setLocalDB(db_l);} },

    getCurrentDB: async () => {
        const [users, projects, programs, students, teachers, projectTeachers, formats, teacherRoles, statuses] = await Promise.all([
            db.getUsers(), db.getProjects(), db.getPrograms(), db.getStudents(), db.getTeachers(),
            db.getProjectTeachers(), db.getFormats(), db.getTeacherRoles(), db.getStatuses()
        ]);
        return { users, projects, programs, students, teachers, projectTeachers, formats, teacherRoles, statuses };
    },
    initializeDB
};
