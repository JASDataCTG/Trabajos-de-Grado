
import { createClient } from '@supabase/supabase-js';
import { Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program, User } from '../types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Inicializar de forma segura para evitar el error de "URL required" en entornos sin configurar
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null as any;

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

// Fix: Export initializeDB as a named export for App.tsx
export const initializeDB = () => { 
    if (!isSupabaseConfigured) {
        console.warn('Supabase no está configurado. Por favor, añade SUPABASE_URL y SUPABASE_ANON_KEY a tus variables de entorno.');
    }
};

export const db = {
    // Auth & Users
    getUsers: async () => {
        if (!supabase) return [];
        const { data } = await supabase.from('users').select('*');
        return data || [];
    },
    getUserByUsername: async (username: string) => {
        if (!supabase) return null;
        const { data } = await supabase.from('users').select('*').ilike('username', username).single();
        return data;
    },
    deleteUser: async (id: string) => {
        if (!supabase) return;
        await supabase.from('users').delete().eq('id', id);
    },

    // Projects
    getProjects: async () => {
        if (!supabase) return [];
        const { data } = await supabase.from('projects').select('*');
        return data || [];
    },
    getProjectById: async (id: string) => {
        if (!supabase) return null;
        const { data } = await supabase.from('projects').select('*').eq('id', id).single();
        return data;
    },
    addProject: async (project: Omit<Project, 'id'>) => {
        if (!supabase) throw new Error("Database not configured");
        const id = generateId();
        const { data } = await supabase.from('projects').insert([{ ...project, id }]).select().single();
        return data;
    },
    updateProject: async (project: Project) => {
        if (!supabase) throw new Error("Database not configured");
        const { data } = await supabase.from('projects').update(project).eq('id', project.id).select().single();
        return data;
    },
    deleteProject: async (id: string) => {
        if (!supabase) return;
        await supabase.from('projects').delete().eq('id', id);
    },

    // Students
    getStudents: async () => {
        if (!supabase) return [];
        const { data } = await supabase.from('students').select('*');
        return data || [];
    },
    getStudentById: async (id: string) => {
        if (!supabase) return null;
        const { data } = await supabase.from('students').select('*').eq('id', id).single();
        return data;
    },
    addStudent: async (student: Omit<Student, 'id'>) => {
        if (!supabase) throw new Error("Database not configured");
        const id = generateId();
        const { data: newStudent } = await supabase.from('students').insert([{ ...student, id }]).select().single();
        
        // Crear usuario automático
        const userId = generateId();
        await supabase.from('users').insert([{
            id: userId,
            username: student.email.split('@')[0],
            password: student.cedula,
            role: 'student',
            studentId: id
        }]);
        
        return newStudent;
    },
    updateStudent: async (student: Student) => {
        if (!supabase) throw new Error("Database not configured");
        const { data } = await supabase.from('students').update(student).eq('id', student.id).select().single();
        await supabase.from('users').update({
            username: student.email.split('@')[0],
            password: student.cedula
        }).eq('studentId', student.id);
        return data;
    },
    deleteStudent: async (id: string) => {
        if (!supabase) return;
        await supabase.from('users').delete().eq('studentId', id);
        await supabase.from('students').delete().eq('id', id);
    },

    // Teachers
    getTeachers: async () => {
        if (!supabase) return [];
        const { data } = await supabase.from('teachers').select('*');
        return data || [];
    },
    getTeacherById: async (id: string) => {
        if (!supabase) return null;
        const { data } = await supabase.from('teachers').select('*').eq('id', id).single();
        return data;
    },
    addTeacher: async (teacher: Omit<Teacher, 'id'>) => {
        if (!supabase) throw new Error("Database not configured");
        const id = generateId();
        const { data: newTeacher } = await supabase.from('teachers').insert([{ ...teacher, id }]).select().single();
        
        // Crear usuario automático
        const userId = generateId();
        await supabase.from('users').insert([{
            id: userId,
            username: teacher.email.split('@')[0],
            password: teacher.cedula,
            role: 'teacher',
            teacherId: id
        }]);
        
        return newTeacher;
    },
    updateTeacher: async (teacher: Teacher) => {
        if (!supabase) throw new Error("Database not configured");
        const { data } = await supabase.from('teachers').update(teacher).eq('id', teacher.id).select().single();
        await supabase.from('users').update({
            username: teacher.email.split('@')[0],
            password: teacher.cedula
        }).eq('teacherId', teacher.id);
        return data;
    },
    deleteTeacher: async (id: string) => {
        if (!supabase) return;
        await supabase.from('users').delete().eq('teacherId', id);
        await supabase.from('teachers').delete().eq('id', id);
    },

    // Project Teachers (Union Table)
    getProjectTeachers: async () => {
        if (!supabase) return [];
        const { data } = await supabase.from('project_teachers').select('*');
        return data || [];
    },
    addProjectTeacher: async (pt: Omit<ProjectTeacher, 'id'>) => {
        if (!supabase) throw new Error("Database not configured");
        const id = generateId();
        const { data } = await supabase.from('project_teachers').insert([{ ...pt, id }]).select().single();
        return data;
    },
    deleteProjectTeacher: async (id: string) => {
        if (!supabase) return;
        await supabase.from('project_teachers').delete().eq('id', id);
    },
    deleteProjectTeachersByProject: async (projectId: string) => {
        if (!supabase) return;
        await supabase.from('project_teachers').delete().eq('project_id', projectId);
    },

    // Catalogs
    getPrograms: async () => {
        if (!supabase) return [];
        return (await supabase.from('programs').select('*')).data || [];
    },
    getStatuses: async () => {
        if (!supabase) return [];
        return (await supabase.from('statuses').select('*')).data || [];
    },
    getFormats: async () => {
        if (!supabase) return [];
        return (await supabase.from('formats').select('*')).data || [];
    },
    getTeacherRoles: async () => {
        if (!supabase) return [];
        return (await supabase.from('teacher_roles').select('*')).data || [];
    },
    
    addProgram: async (p: Omit<Program, 'id'>) => {
        if (!supabase) return null;
        return (await supabase.from('programs').insert([{...p, id: generateId()}]).select().single()).data;
    },
    updateProgram: async (p: Program) => {
        if (!supabase) return null;
        return (await supabase.from('programs').update(p).eq('id', p.id).select().single()).data;
    },
    deleteProgram: async (id: string) => {
        if (!supabase) return;
        await supabase.from('programs').delete().eq('id', id);
    },

    addStatus: async (p: Omit<Status, 'id'>) => {
        if (!supabase) return null;
        return (await supabase.from('statuses').insert([{...p, id: generateId()}]).select().single()).data;
    },
    updateStatus: async (p: Status) => {
        if (!supabase) return null;
        return (await supabase.from('statuses').update(p).eq('id', p.id).select().single()).data;
    },
    deleteStatus: async (id: string) => {
        if (!supabase) return;
        await supabase.from('statuses').delete().eq('id', id);
    },

    addFormat: async (p: Omit<Format, 'id'>) => {
        if (!supabase) return null;
        return (await supabase.from('formats').insert([{...p, id: generateId()}]).select().single()).data;
    },
    updateFormat: async (p: Format) => {
        if (!supabase) return null;
        return (await supabase.from('formats').update(p).eq('id', p.id).select().single()).data;
    },
    deleteFormat: async (id: string) => {
        if (!supabase) return;
        await supabase.from('formats').delete().eq('id', id);
    },

    addTeacherRole: async (p: Omit<TeacherRole, 'id'>) => {
        if (!supabase) return null;
        return (await supabase.from('teacher_roles').insert([{...p, id: generateId()}]).select().single()).data;
    },
    updateTeacherRole: async (p: TeacherRole) => {
        if (!supabase) return null;
        return (await supabase.from('teacher_roles').update(p).eq('id', p.id).select().single()).data;
    },
    deleteTeacherRole: async (id: string) => {
        if (!supabase) return;
        await supabase.from('teacher_roles').delete().eq('id', id);
    },

    getCurrentDB: async () => {
        const [users, projects, programs, students, teachers, projectTeachers, formats, teacherRoles, statuses] = await Promise.all([
            db.getUsers(), db.getProjects(), db.getPrograms(), db.getStudents(), db.getTeachers(),
            db.getProjectTeachers(), db.getFormats(), db.getTeacherRoles(), db.getStatuses()
        ]);
        return { users, projects, programs, students, teachers, projectTeachers, formats, teacherRoles, statuses };
    },

    initializeDB
};
