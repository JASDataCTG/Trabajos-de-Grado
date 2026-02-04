
import { createClient } from '@supabase/supabase-js';
import { Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program, User, Faculty } from '../types';
import { notificationService } from './notificationService';

const getEnv = (key: string): string => {
    return (window as any).process?.env?.[key] || (import.meta as any).env?.[key] || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

// @ts-ignore
export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

async function fetchCatalog(table: string) {
    if (!supabase) return [];
    let { data, error } = await supabase.from(table).select('*').order('sort_order', { ascending: true }).order('name', { ascending: true });
    if (error) {
        const { data: fallbackData } = await supabase.from(table).select('*').order('name', { ascending: true });
        return fallbackData || [];
    }
    return data || [];
}

export const db = {
    initializeDB: async () => {
        if (!supabase) return;
        try {
            const { count } = await supabase!.from('statuses').select('*', { count: 'exact', head: true });
            if (count === 0) {
                // Seed logic here if needed
            }
        } catch (e) { console.error(e); }
    },

    checkConnection: async () => {
        if (!supabase) return false;
        try {
            const { error } = await supabase.from('statuses').select('id').limit(1);
            return !error;
        } catch { return false; }
    },

    // --- Auxiliares para Notificaciones ---
    async getProjectContext(projectId: string) {
        const allStudents = await this.getStudents();
        const projectStudents = allStudents.filter(s => s.projectId === projectId);
        
        const allPT = await this.getProjectTeachers();
        const ptForProject = allPT.filter(pt => pt.projectId === projectId);
        
        const allTeachers = await this.getTeachers();
        const allRoles = await db.getTeacherRoles();
        
        const teachersWithRoles = ptForProject.map(pt => ({
            teacher: allTeachers.find(t => t.id === pt.teacherId)!,
            role: allRoles.find(r => r.id === pt.roleId)!
        })).filter(item => item.teacher && item.role);

        return { students: projectStudents, teachers: teachersWithRoles };
    },

    // --- Proyectos ---
    getProjects: async (): Promise<Project[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('projects').select('*').order('presentation_date', { ascending: false });
        return (data || []).map(p => ({
            id: p.id, title: p.title, presentationDate: p.presentation_date, filesUrl: p.files_url,
            statusId: p.status_id, formatId: p.format_id, programId: p.program_id,
            isApprovedByDirector: p.is_approved_by_director, finalGrade: p.final_grade,
            writtenGradeReviewer1: p.written_grade_reviewer1, presentationGradeReviewer1: p.presentation_grade_reviewer1,
            writtenGradeReviewer2: p.written_grade_reviewer2, presentationGradeReviewer2: p.presentation_grade_reviewer2
        }));
    },

    // Fix: Added missing getProjectById method to retrieve a single project by ID
    getProjectById: async (id: string): Promise<Project | null> => {
        if (!supabase) return null;
        const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
        if (error || !data) return null;
        return {
            id: data.id, title: data.title, presentationDate: data.presentation_date, filesUrl: data.files_url,
            statusId: data.status_id, formatId: data.format_id, programId: data.program_id,
            isApprovedByDirector: data.is_approved_by_director, finalGrade: data.final_grade,
            writtenGradeReviewer1: data.written_grade_reviewer1, presentationGradeReviewer1: data.presentation_grade_reviewer1,
            writtenGradeReviewer2: data.written_grade_reviewer2, presentationGradeReviewer2: data.presentation_grade_reviewer2
        };
    },

    addProject: async (p: Omit<Project, 'id'>) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const { error } = await supabase.from('projects').insert([{ 
            id, title: p.title, presentation_date: p.presentationDate, files_url: p.filesUrl, 
            status_id: p.statusId, format_id: p.formatId, program_id: p.programId 
        }]);
        if (error) throw error;
        return { ...p, id } as Project;
    },

    updateProject: async (p: Project) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const { data: oldProject } = await supabase.from('projects').select('status_id, final_grade').eq('id', p.id).single();
        const { error } = await supabase.from('projects').update({ 
            title: p.title, presentation_date: p.presentationDate, files_url: p.filesUrl, 
            status_id: p.statusId, format_id: p.formatId, program_id: p.programId, 
            final_grade: p.finalGrade, written_grade_reviewer1: p.writtenGradeReviewer1, 
            presentation_grade_reviewer1: p.presentationGradeReviewer1, 
            written_grade_reviewer2: p.writtenGradeReviewer2, 
            presentation_grade_reviewer2: p.presentationGradeReviewer2 
        }).eq('id', p.id);
        if (error) throw error;
        if (oldProject && (oldProject.status_id !== p.statusId || oldProject.final_grade !== p.finalGrade)) {
            const context = await db.getProjectContext(p.id);
            const statuses = await db.getStatuses();
            const statusName = statuses.find(s => s.id === p.statusId)?.name;
            notificationService.notifyProjectChange(
                oldProject.final_grade !== p.finalGrade ? 'grade' : 'update',
                p, context.students, context.teachers, statusName
            );
        }
        return p;
    },

    deleteProject: async (id: string) => {
        if (!supabase) return;
        const context = await db.getProjectContext(id);
        const { data: project } = await supabase.from('projects').select('*').eq('id', id).single();
        await supabase.from('project_teachers').delete().eq('project_id', id);
        await supabase.from('students').update({ project_id: null }).eq('project_id', id);
        await supabase.from('projects').delete().eq('id', id);
        if (project) {
            notificationService.notifyProjectChange('delete', project as any, context.students, context.teachers);
        }
    },

    // --- Estudiantes ---
    getStudents: async (): Promise<Student[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('students').select('*').order('name', { ascending: true });
        return (data || []).map((s: any) => ({ id: s.id, name: s.name, email: s.email, cedula: s.cedula, projectId: s.project_id, programId: s.program_id, password: s.password }));
    },
    getStudentById: async (id: string): Promise<Student | null> => {
        if (!supabase) return null;
        const { data } = await supabase.from('students').select('*').eq('id', id).single();
        if (!data) return null;
        return { id: data.id, name: data.name, email: data.email, cedula: data.cedula, projectId: data.project_id, programId: data.program_id, password: data.password };
    },
    addStudent: async (s: Omit<Student, 'id'>) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const userId = generateId();
        const password = s.password || s.cedula;
        await supabase.from('students').insert([{ id, name: s.name, email: s.email, cedula: s.cedula, program_id: s.programId, password }]);
        await supabase.from('users').insert([{ id: userId, username: s.name, password, role: 'student', student_id: id }]);
        return { ...s, id } as Student;
    },
    updateStudent: async (s: Student) => {
        if (!supabase) throw new Error("Supabase no configurado");
        await supabase.from('students').update({ name: s.name, email: s.email, cedula: s.cedula, program_id: s.programId, project_id: s.projectId, password: s.password }).eq('id', s.id);
        if (s.password) {
            await supabase.from('users').update({ password: s.password }).eq('student_id', s.id);
        }
        return s;
    },

    // --- Docentes ---
    getTeachers: async (): Promise<Teacher[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('teachers').select('*').order('name', { ascending: true });
        return data || [];
    },
    getTeacherById: async (id: string): Promise<Teacher | null> => {
        if (!supabase) return null;
        const { data } = await supabase.from('teachers').select('*').eq('id', id).single();
        return data || null;
    },
    addTeacher: async (t: Omit<Teacher, 'id'>) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const userId = generateId();
        const password = t.password || t.cedula;
        await supabase.from('teachers').insert([{ id, name: t.name, email: t.email, cedula: t.cedula, password }]);
        await supabase.from('users').insert([{ id: userId, username: t.name, password, role: 'teacher', teacher_id: id }]);
        return { ...t, id } as Teacher;
    },
    updateTeacher: async (t: Teacher) => {
        if (!supabase) throw new Error("Supabase no configurado");
        await supabase.from('teachers').update({ name: t.name, email: t.email, cedula: t.cedula, password: t.password }).eq('id', t.id);
        // Sincronizar con tabla de usuarios
        await supabase.from('users').update({ username: t.name, password: t.password || t.cedula }).eq('teacher_id', t.id);
        return t;
    },
    updateTeacherPassword: async (id: string, newPassword: string) => {
        if (!supabase) return;
        await Promise.all([
            supabase.from('teachers').update({ password: newPassword }).eq('id', id),
            supabase.from('users').update({ password: newPassword }).eq('teacher_id', id)
        ]);
    },
    updateStudentPassword: async (id: string, newPassword: string) => {
        if (!supabase) return;
        await Promise.all([
            supabase.from('students').update({ password: newPassword }).eq('id', id),
            supabase.from('users').update({ password: newPassword }).eq('student_id', id)
        ]);
    },
    deleteTeacher: async (id: string) => {
        if (!supabase) return;
        await supabase.from('users').delete().eq('teacher_id', id);
        await supabase.from('teachers').delete().eq('id', id);
    },

    // --- Usuarios y Autenticación ---
    getUserByUsername: async (username: string): Promise<User | null> => {
        if (!supabase) return null;
        const { data } = await supabase.from('users').select('*').eq('username', username).single();
        return data ? { ...data, teacherId: data.teacher_id, studentId: data.student_id } : null;
    },
    getUsers: async (): Promise<User[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('users').select('*');
        return (data || []).map((u: any) => ({ ...u, teacherId: u.teacher_id, studentId: u.student_id }));
    },
    deleteUser: async (id: string) => {
        if (supabase) await supabase.from('users').delete().eq('id', id);
    },

    // --- Relación Proyecto-Docente ---
    getProjectTeachers: async (): Promise<ProjectTeacher[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('project_teachers').select('*');
        return (data || []).map((pt: any) => ({ id: pt.id, projectId: pt.project_id, teacherId: pt.teacher_id, roleId: pt.role_id }));
    },
    addProjectTeacher: async (pt: Omit<ProjectTeacher, "id">) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        await supabase.from('project_teachers').insert([{ id, project_id: pt.projectId, teacher_id: pt.teacherId, role_id: pt.roleId }]);
        return { ...pt, id };
    },
    deleteProjectTeachersByProject: async (projectId: string) => {
        if (supabase) await supabase.from('project_teachers').delete().eq('project_id', projectId);
    },

    // --- Catálogos (Con resiliencia de esquema) ---
    getStatuses: async () => { 
        const data = await fetchCatalog('statuses');
        return data.map((d: any) => ({ ...d, sortOrder: d.sort_order }));
    },
    getFormats: async () => { 
        const data = await fetchCatalog('formats');
        return data.map((d: any) => ({ ...d, sortOrder: d.sort_order }));
    },
    getTeacherRoles: async () => { 
        const data = await fetchCatalog('teacher_roles');
        return data.map((d: any) => ({ ...d, sortOrder: d.sort_order }));
    },
    getFaculties: async () => (await fetchCatalog('faculties')).map((f: any) => ({ ...f, sortOrder: f.sort_order })),
    getPrograms: async () => (await fetchCatalog('programs')).map((p: any) => ({ id: p.id, name: p.name, facultyId: p.faculty_id, sortOrder: p.sort_order })),
    
    addFaculty: async (f: any) => { const id = generateId(); await supabase!.from('faculties').insert([{ id, name: f.name, sort_order: f.sortOrder || 99 }]); return { id, ...f }; },
    addProgram: async (p: any) => { const id = generateId(); await supabase!.from('programs').insert([{ id, name: p.name, faculty_id: p.facultyId, sort_order: p.sortOrder || 99 }]); return { id, ...p }; },
    addStatus: async (p: any) => { const id = generateId(); await supabase!.from('statuses').insert([{ id, name: p.name, sort_order: p.sortOrder || 99 }]); return { ...p, id }; },
    addFormat: async (p: any) => { const id = generateId(); await supabase!.from('formats').insert([{ id, name: p.name, sort_order: p.sortOrder || 99 }]); return { ...p, id }; },
    addTeacherRole: async (p: any) => { const id = generateId(); await supabase!.from('teacher_roles').insert([{ id, name: p.name, sort_order: p.sortOrder || 99 }]); return { ...p, id }; },
    
    updateFaculty: async (f: any) => { await supabase!.from('faculties').update({ name: f.name, sort_order: f.sortOrder }).eq('id', f.id); return f; },
    updateProgram: async (p: any) => { await supabase!.from('programs').update({ name: p.name, faculty_id: p.facultyId, sort_order: p.sortOrder }).eq('id', p.id); return p; },
    updateStatus: async (p: any) => { await supabase!.from('statuses').update({ name: p.name, sort_order: p.sortOrder }).eq('id', p.id); return p; },
    updateFormat: async (p: any) => { await supabase!.from('formats').update({ name: p.name, sort_order: p.sortOrder }).eq('id', p.id); return p; },
    updateTeacherRole: async (p: any) => { await supabase!.from('teacher_roles').update({ name: p.name, sort_order: p.sortOrder }).eq('id', p.id); return p; },
    
    deleteFaculty: async (id: string) => { await supabase!.from('faculties').delete().eq('id', id); },
    deleteProgram: async (id: string) => { await supabase!.from('programs').delete().eq('id', id); },
    deleteStudent: async (id: string) => { await supabase!.from('users').delete().eq('student_id', id); await supabase!.from('students').delete().eq('id', id); },
    deleteStatus: async (id: string) => { await supabase!.from('statuses').delete().eq('id', id); },
    deleteFormat: async (id: string) => { await supabase!.from('formats').delete().eq('id', id); },
    deleteTeacherRole: async (id: string) => { await supabase!.from('teacher_roles').delete().eq('id', id); }
};
