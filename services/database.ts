
import { createClient } from '@supabase/supabase-js';
import { Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program, User } from '../types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const initializeDB = () => { 
    if (!isSupabaseConfigured) {
        console.error('CRÍTICO: Supabase no está configurado.');
    }
};

const safeQuery = async (queryPromise: Promise<any>) => {
    if (!supabase) return { data: null, error: new Error('Base de datos no configurada') };
    return await queryPromise;
};

export const db = {
    // Auth & Users
    getUsers: async () => {
        const { data } = await safeQuery(supabase?.from('users').select('*') || Promise.resolve({data: []}));
        return data || [];
    },
    getUserByUsername: async (username: string) => {
        const { data } = await safeQuery(supabase?.from('users').select('*').ilike('username', username).single() || Promise.resolve({data: null}));
        return data;
    },
    deleteUser: async (id: string) => {
        await safeQuery(supabase?.from('users').delete().eq('id', id) || Promise.resolve({}));
    },

    // Projects
    getProjects: async () => {
        const { data } = await safeQuery(supabase?.from('projects').select('*') || Promise.resolve({data: []}));
        return data || [];
    },
    getProjectById: async (id: string) => {
        const { data } = await safeQuery(supabase?.from('projects').select('*').eq('id', id).single() || Promise.resolve({data: null}));
        return data;
    },
    addProject: async (project: Omit<Project, 'id'>) => {
        const id = generateId();
        const { data } = await safeQuery(supabase?.from('projects').insert([{ ...project, id }]).select().single() || Promise.resolve({data: null}));
        return data;
    },
    updateProject: async (project: Project) => {
        const { data } = await safeQuery(supabase?.from('projects').update(project).eq('id', project.id).select().single() || Promise.resolve({data: null}));
        return data;
    },
    deleteProject: async (id: string) => {
        await safeQuery(supabase?.from('projects').delete().eq('id', id) || Promise.resolve({}));
    },

    // Students
    getStudents: async () => {
        const { data } = await safeQuery(supabase?.from('students').select('*') || Promise.resolve({data: []}));
        return data || [];
    },
    getStudentById: async (id: string) => {
        const { data } = await safeQuery(supabase?.from('students').select('*').eq('id', id).single() || Promise.resolve({data: null}));
        return data;
    },
    addStudent: async (student: Omit<Student, 'id'>) => {
        const id = generateId();
        const { data: newStudent } = await safeQuery(supabase?.from('students').insert([{ ...student, id }]).select().single() || Promise.resolve({data: null}));
        
        if (newStudent) {
            const userId = generateId();
            await safeQuery(supabase?.from('users').insert([{
                id: userId,
                username: student.name, // Nombre completo como usuario
                password: student.cedula, // Cédula como contraseña
                role: 'student',
                studentId: id
            }]) || Promise.resolve({}));
        }
        return newStudent;
    },
    updateStudent: async (student: Student) => {
        const { data } = await safeQuery(supabase?.from('students').update(student).eq('id', student.id).select().single() || Promise.resolve({data: null}));
        // Sincronizar credenciales si cambian
        await safeQuery(supabase?.from('users').update({
            username: student.name,
            password: student.cedula
        }).eq('studentId', student.id) || Promise.resolve({}));
        return data;
    },
    deleteStudent: async (id: string) => {
        await safeQuery(supabase?.from('users').delete().eq('student_id', id) || Promise.resolve({}));
        await safeQuery(supabase?.from('students').delete().eq('id', id) || Promise.resolve({}));
    },

    // Teachers
    getTeachers: async () => {
        const { data } = await safeQuery(supabase?.from('teachers').select('*') || Promise.resolve({data: []}));
        return data || [];
    },
    getTeacherById: async (id: string) => {
        const { data } = await safeQuery(supabase?.from('teachers').select('*').eq('id', id).single() || Promise.resolve({data: null}));
        return data;
    },
    addTeacher: async (teacher: Omit<Teacher, 'id'>) => {
        const id = generateId();
        const { data: newTeacher } = await safeQuery(supabase?.from('teachers').insert([{ ...teacher, id }]).select().single() || Promise.resolve({data: null}));
        
        if (newTeacher) {
            const userId = generateId();
            await safeQuery(supabase?.from('users').insert([{
                id: userId,
                username: teacher.name, // Nombre completo como usuario
                password: teacher.cedula, // Cédula como contraseña
                role: 'teacher',
                teacherId: id
            }]) || Promise.resolve({}));
        }
        return newTeacher;
    },
    updateTeacher: async (teacher: Teacher) => {
        const { data } = await safeQuery(supabase?.from('teachers').update(teacher).eq('id', teacher.id).select().single() || Promise.resolve({data: null}));
        // Sincronizar credenciales si cambian
        await safeQuery(supabase?.from('users').update({
            username: teacher.name,
            password: teacher.cedula
        }).eq('teacherId', teacher.id) || Promise.resolve({}));
        return data;
    },
    deleteTeacher: async (id: string) => {
        await safeQuery(supabase?.from('users').delete().eq('teacher_id', id) || Promise.resolve({}));
        await safeQuery(supabase?.from('teachers').delete().eq('id', id) || Promise.resolve({}));
    },

    // Project Teachers (Union Table)
    getProjectTeachers: async () => {
        const { data } = await safeQuery(supabase?.from('project_teachers').select('*') || Promise.resolve({data: []}));
        return data || [];
    },
    addProjectTeacher: async (pt: Omit<ProjectTeacher, 'id'>) => {
        const id = generateId();
        const { data } = await safeQuery(supabase?.from('project_teachers').insert([{ ...pt, id }]).select().single() || Promise.resolve({data: null}));
        return data;
    },
    deleteProjectTeacher: async (id: string) => {
        await safeQuery(supabase?.from('project_teachers').delete().eq('id', id) || Promise.resolve({}));
    },
    deleteProjectTeachersByProject: async (projectId: string) => {
        await safeQuery(supabase?.from('project_teachers').delete().eq('project_id', projectId) || Promise.resolve({}));
    },

    // Catalogs
    getPrograms: async () => (await safeQuery(supabase?.from('programs').select('*') || Promise.resolve({data: []}))).data || [],
    getStatuses: async () => (await safeQuery(supabase?.from('statuses').select('*') || Promise.resolve({data: []}))).data || [],
    getFormats: async () => (await safeQuery(supabase?.from('formats').select('*') || Promise.resolve({data: []}))).data || [],
    getTeacherRoles: async () => (await safeQuery(supabase?.from('teacher_roles').select('*') || Promise.resolve({data: []}))).data || [],
    
    addProgram: async (p: Omit<Program, 'id'>) => (await safeQuery(supabase?.from('programs').insert([{...p, id: generateId()}]).select().single() || Promise.resolve({data: null}))).data,
    updateProgram: async (p: Program) => (await safeQuery(supabase?.from('programs').update(p).eq('id', p.id).select().single() || Promise.resolve({data: null}))).data,
    deleteProgram: async (id: string) => await safeQuery(supabase?.from('programs').delete().eq('id', id) || Promise.resolve({})),

    addStatus: async (p: Omit<Status, 'id'>) => (await safeQuery(supabase?.from('statuses').insert([{...p, id: generateId()}]).select().single() || Promise.resolve({data: null}))).data,
    updateStatus: async (p: Status) => (await safeQuery(supabase?.from('statuses').update(p).eq('id', p.id).select().single() || Promise.resolve({data: null}))).data,
    deleteStatus: async (id: string) => await safeQuery(supabase?.from('statuses').delete().eq('id', id) || Promise.resolve({})),

    addFormat: async (p: Omit<Format, 'id'>) => (await safeQuery(supabase?.from('formats').insert([{...p, id: generateId()}]).select().single() || Promise.resolve({data: null}))).data,
    updateFormat: async (p: Format) => (await safeQuery(supabase?.from('formats').update(p).eq('id', p.id).select().single() || Promise.resolve({data: null}))).data,
    deleteFormat: async (id: string) => await safeQuery(supabase?.from('formats').delete().eq('id', id) || Promise.resolve({})),

    addTeacherRole: async (p: Omit<TeacherRole, 'id'>) => (await safeQuery(supabase?.from('teacher_roles').insert([{...p, id: generateId()}]).select().single() || Promise.resolve({data: null}))).data,
    updateTeacherRole: async (p: TeacherRole) => (await safeQuery(supabase?.from('teacher_roles').update(p).eq('id', p.id).select().single() || Promise.resolve({data: null}))).data,
    deleteTeacherRole: async (id: string) => await safeQuery(supabase?.from('teacher_roles').delete().eq('id', id) || Promise.resolve({})),

    getCurrentDB: async () => {
        const [users, projects, programs, students, teachers, projectTeachers, formats, teacherRoles, statuses] = await Promise.all([
            db.getUsers(), db.getProjects(), db.getPrograms(), db.getStudents(), db.getTeachers(),
            db.getProjectTeachers(), db.getFormats(), db.getTeacherRoles(), db.getStatuses()
        ]);
        return { users, projects, programs, students, teachers, projectTeachers, formats, teacherRoles, statuses };
    },

    initializeDB
};
