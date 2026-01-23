
import { createClient } from '@supabase/supabase-js';
import { Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program, User, Faculty } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

// @ts-ignore
export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

const initialSeeds = {
    faculties: [{ id: 'f1', name: 'Facultad de Ingeniería' }, { id: 'f2', name: 'Facultad de Salud' }],
    programs: [{ id: '1', name: 'Tecnología en Sistemas', faculty_id: 'f1' }, { id: '2', name: 'Ingeniería de Sistemas', faculty_id: 'f1' }],
    formats: [{ id: '1', name: 'Anteproyecto' }, { id: '2', name: 'Proyecto Final' }],
    teacherRoles: [{ id: '1', name: 'Director' }, { id: '2', name: 'Co-Director' }, { id: '3', name: 'Evaluador 1' }, { id: '4', name: 'Evaluador 2' }],
    statuses: [{ id: '1', name: 'En Proceso' }, { id: '2', name: 'Aprobado' }, { id: '3', name: 'Sustentado' }, { id: '4', name: 'Rechazado' }]
};

export const db = {
    initializeDB: async () => {
        if (!supabase) return;
        try {
            const checkAndSeed = async (table: string, data: any[]) => {
                const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
                if (count === 0) await supabase.from(table).insert(data);
            };
            await checkAndSeed('faculties', initialSeeds.faculties);
            await checkAndSeed('statuses', initialSeeds.statuses);
            await checkAndSeed('formats', initialSeeds.formats);
            await checkAndSeed('programs', initialSeeds.programs);
            await checkAndSeed('teacher_roles', initialSeeds.teacherRoles);
        } catch (e) { console.error("Error init Supabase:", e); }
    },

    checkConnection: async () => {
        if (!supabase) return false;
        try {
            const { error } = await supabase.from('statuses').select('id').limit(1);
            return !error;
        } catch { return false; }
    },

    getFaculties: async (): Promise<Faculty[]> => {
        if (!supabase) return initialSeeds.faculties;
        const { data } = await supabase.from('faculties').select('*').order('name');
        return data || [];
    },

    getPrograms: async (): Promise<Program[]> => {
        if (!supabase) return initialSeeds.programs.map(p => ({ id: p.id, name: p.name, facultyId: p.faculty_id }));
        const { data } = await supabase.from('programs').select('*').order('name');
        return (data || []).map((p: any) => ({ id: p.id, name: p.name, facultyId: p.faculty_id }));
    },

    addFaculty: async (f: { name: string }) => {
        const id = generateId();
        await supabase?.from('faculties').insert([{ id, name: f.name }]);
        return { id, ...f };
    },

    updateFaculty: async (f: Faculty) => {
        await supabase?.from('faculties').update({ name: f.name }).eq('id', f.id);
        return f;
    },

    deleteFaculty: async (id: string) => {
        await supabase?.from('faculties').delete().eq('id', id);
    },

    addProgram: async (p: { name: string, facultyId: string }) => {
        const id = generateId();
        await supabase?.from('programs').insert([{ id, name: p.name, faculty_id: p.facultyId }]);
        return { id, ...p };
    },

    updateProgram: async (p: Program) => {
        await supabase?.from('programs').update({ name: p.name, faculty_id: p.facultyId }).eq('id', p.id);
        return p;
    },

    // ... (resto de métodos existentes se mantienen iguales, solo asegurando consistencia)
    getProjects: async (): Promise<Project[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('projects').select('*').order('presentation_date', { ascending: false });
        if (error) return [];
        return (data || []).map(p => ({
            id: p.id, title: p.title, presentationDate: p.presentation_date, filesUrl: p.files_url,
            statusId: p.status_id, formatId: p.format_id, programId: p.program_id,
            isApprovedByDirector: p.is_approved_by_director, finalGrade: p.final_grade,
            writtenGradeReviewer1: p.written_grade_reviewer1, presentationGradeReviewer1: p.presentation_grade_reviewer1,
            writtenGradeReviewer2: p.written_grade_reviewer2, presentationGradeReviewer2: p.presentation_grade_reviewer2
        }));
    },
    getStudents: async (): Promise<Student[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('students').select('*');
        return (data || []).map((s: any) => ({ id: s.id, name: s.name, email: s.email, cedula: s.cedula, projectId: s.project_id, programId: s.program_id }));
    },
    getTeachers: async (): Promise<Teacher[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('teachers').select('*');
        return data || [];
    },
    getStatuses: async () => { const { data } = await supabase!.from('statuses').select('*'); return data || []; },
    getFormats: async () => { const { data } = await supabase!.from('formats').select('*'); return data || []; },
    getTeacherRoles: async () => { const { data } = await supabase!.from('teacher_roles').select('*'); return data || []; },
    getProjectTeachers: async () => { const { data } = await supabase!.from('project_teachers').select('*'); return (data || []).map((pt: any) => ({ id: pt.id, projectId: pt.project_id, teacherId: pt.teacher_id, roleId: pt.role_id })); },
    addProject: async (p: any) => { const id = generateId(); await supabase!.from('projects').insert([{ id, title: p.title, presentation_date: p.presentationDate, files_url: p.filesUrl, status_id: p.statusId, format_id: p.formatId, program_id: p.programId }]); return { ...p, id }; },
    updateProject: async (p: any) => { await supabase!.from('projects').update({ title: p.title, presentation_date: p.presentationDate, files_url: p.filesUrl, status_id: p.statusId, format_id: p.formatId, program_id: p.programId, final_grade: p.finalGrade, written_grade_reviewer1: p.writtenGradeReviewer1, presentation_grade_reviewer1: p.presentationGradeReviewer1, written_grade_reviewer2: p.writtenGradeReviewer2, presentation_grade_reviewer2: p.presentationGradeReviewer2 }).eq('id', p.id); return p; },
    deleteProject: async (id: string) => { await supabase!.from('projects').delete().eq('id', id); },
    addStudent: async (s: any) => { const id = generateId(); await supabase!.from('students').insert([{ id, name: s.name, email: s.email, cedula: s.cedula, program_id: s.programId }]); return { ...s, id }; },
    updateStudent: async (s: any) => { await supabase!.from('students').update({ name: s.name, email: s.email, cedula: s.cedula, program_id: s.programId, project_id: s.projectId }).eq('id', s.id); return s; },
    addTeacher: async (t: any) => { const id = generateId(); await supabase!.from('teachers').insert([{ id, name: t.name, email: t.email, cedula: t.cedula }]); return { ...t, id }; },
    updateTeacher: async (t: any) => { await supabase!.from('teachers').update({ name: t.name, email: t.email, cedula: t.cedula }).eq('id', t.id); return t; },
    addProjectTeacher: async (pt: any) => { const id = generateId(); await supabase!.from('project_teachers').insert([{ id, project_id: pt.projectId, teacher_id: pt.teacherId, role_id: pt.roleId }]); return { ...pt, id }; },
    deleteProjectTeachersByProject: async (id: string) => { await supabase!.from('project_teachers').delete().eq('project_id', id); },
    getUserByUsername: async (u: string) => { const { data } = await supabase!.from('users').select('*').eq('username', u).single(); return data ? { ...data, teacherId: data.teacher_id, studentId: data.student_id } : null; },
    getUsers: async () => { const { data } = await supabase!.from('users').select('*'); return (data || []).map((u: any) => ({ ...u, teacherId: u.teacher_id, studentId: u.student_id })); },
    deleteUser: async (id: string) => { await supabase!.from('users').delete().eq('id', id); },
    deleteStudent: async (id: string) => { await supabase!.from('students').delete().eq('id', id); },
    deleteTeacher: async (id: string) => { await supabase!.from('teachers').delete().eq('id', id); },
    getStudentById: async (id: string) => { const { data } = await supabase!.from('students').select('*').eq('id', id).single(); return data ? { id: data.id, name: data.name, email: data.email, cedula: data.cedula, projectId: data.project_id, programId: data.program_id } : null; },
    getProjectById: async (id: string) => { const { data } = await supabase!.from('projects').select('*').eq('id', id).single(); return data ? { id: data.id, title: data.title, presentationDate: data.presentation_date, statusId: data.status_id, filesUrl: data.files_url, finalGrade: data.final_grade } : null; },
    // Removed duplicate getTeacherRoles method from here
    addStatus: async (p: any) => { const id = generateId(); await supabase!.from('statuses').insert([{ id, name: p.name }]); return { ...p, id }; },
    addFormat: async (p: any) => { const id = generateId(); await supabase!.from('formats').insert([{ id, name: p.name }]); return { ...p, id }; },
    addTeacherRole: async (p: any) => { const id = generateId(); await supabase!.from('teacher_roles').insert([{ id, name: p.name }]); return { ...p, id }; },
    updateStatus: async (p: any) => { await supabase!.from('statuses').update({ name: p.name }).eq('id', p.id); return p; },
    updateFormat: async (p: any) => { await supabase!.from('formats').update({ name: p.name }).eq('id', p.id); return p; },
    updateTeacherRole: async (p: any) => { await supabase!.from('teacher_roles').update({ name: p.name }).eq('id', p.id); return p; },
    deleteStatus: async (id: string) => { await supabase!.from('statuses').delete().eq('id', id); },
    deleteFormat: async (id: string) => { await supabase!.from('formats').delete().eq('id', id); },
    deleteProgram: async (id: string) => { await supabase!.from('programs').delete().eq('id', id); },
    deleteTeacherRole: async (id: string) => { await supabase!.from('teacher_roles').delete().eq('id', id); }
};
