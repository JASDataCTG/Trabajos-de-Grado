
import { createClient } from '@supabase/supabase-js';
import { Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program, User, Faculty } from '../types';

// Intentar obtener de process.env (Vercel/Node) o import.meta.env (Vite)
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

const bootstrapData = {
    faculties: [{ id: 'f1', name: 'Facultad de Ingeniería', sort_order: 1 }, { id: 'f2', name: 'Facultad de Salud', sort_order: 2 }],
    programs: [{ id: '1', name: 'Tecnología en Sistemas', faculty_id: 'f1', sort_order: 1 }, { id: '2', name: 'Ingeniería de Sistemas', faculty_id: 'f1', sort_order: 2 }],
    formats: [{ id: '1', name: 'Anteproyecto', sort_order: 1 }, { id: '2', name: 'Proyecto Final', sort_order: 2 }],
    teacherRoles: [{ id: '1', name: 'Director', sort_order: 1 }, { id: '2', name: 'Co-Director', sort_order: 2 }, { id: '3', name: 'Evaluador 1', sort_order: 3 }, { id: '4', name: 'Evaluador 2', sort_order: 4 }],
    statuses: [{ id: '1', name: 'En Proceso', sort_order: 1 }, { id: '2', name: 'Aprobado', sort_order: 2 }, { id: '3', name: 'Sustentado', sort_order: 3 }, { id: '4', name: 'Rechazado', sort_order: 4 }]
};

export const db = {
    initializeDB: async () => {
        if (!supabase) return;
        try {
            const checkAndSeed = async (table: string, data: any[]) => {
                const { count, error } = await supabase!.from(table).select('*', { count: 'exact', head: true });
                if (!error && count === 0) {
                    await supabase!.from(table).insert(data);
                }
            };
            await checkAndSeed('faculties', bootstrapData.faculties);
            await checkAndSeed('statuses', bootstrapData.statuses);
            await checkAndSeed('formats', bootstrapData.formats);
            await checkAndSeed('programs', bootstrapData.programs);
            await checkAndSeed('teacher_roles', bootstrapData.teacherRoles);
        } catch (e) { 
            console.error("Error al inicializar base de datos remota:", e); 
        }
    },

    checkConnection: async () => {
        if (!supabase) return false;
        try {
            const { error } = await supabase.from('statuses').select('id').limit(1);
            return !error;
        } catch { return false; }
    },

    // --- Facultades ---
    getFaculties: async (): Promise<Faculty[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('faculties').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true });
        return (data || []).map(f => ({ ...f, sortOrder: f.sort_order }));
    },
    addFaculty: async (f: { name: string, sortOrder?: number }) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        await supabase.from('faculties').insert([{ id, name: f.name, sort_order: f.sortOrder || 99 }]);
        return { id, ...f };
    },
    updateFaculty: async (f: Faculty) => {
        if (!supabase) throw new Error("Supabase no configurado");
        await supabase.from('faculties').update({ name: f.name, sort_order: f.sortOrder }).eq('id', f.id);
        return f;
    },
    deleteFaculty: async (id: string) => {
        if (supabase) await supabase.from('faculties').delete().eq('id', id);
    },

    // --- Programas ---
    getPrograms: async (): Promise<Program[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('programs').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true });
        return (data || []).map((p: any) => ({ id: p.id, name: p.name, facultyId: p.faculty_id, sortOrder: p.sort_order }));
    },
    addProgram: async (p: { name: string, facultyId: string, sortOrder?: number }) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        await supabase.from('programs').insert([{ id, name: p.name, faculty_id: p.facultyId, sort_order: p.sortOrder || 99 }]);
        return { id, ...p };
    },
    updateProgram: async (p: Program) => {
        if (!supabase) throw new Error("Supabase no configurado");
        await supabase.from('programs').update({ name: p.name, faculty_id: p.facultyId, sort_order: p.sortOrder }).eq('id', p.id);
        return p;
    },
    deleteProgram: async (id: string) => {
        if (supabase) await supabase.from('programs').delete().eq('id', id);
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
    getProjectById: async (id: string): Promise<Project | null> => {
        if (!supabase) return null;
        const { data } = await supabase.from('projects').select('*').eq('id', id).single();
        if (!data) return null;
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
        await supabase.from('projects').insert([{ 
            id, title: p.title, presentation_date: p.presentationDate, files_url: p.filesUrl, 
            status_id: p.statusId, format_id: p.formatId, program_id: p.programId 
        }]);
        return { ...p, id } as Project;
    },
    updateProject: async (p: Project) => {
        if (!supabase) throw new Error("Supabase no configurado");
        // FIX: changed p.status_id to p.statusId to match Project interface (Line 137)
        await supabase.from('projects').update({ 
            title: p.title, presentation_date: p.presentationDate, files_url: p.filesUrl, 
            status_id: p.statusId, format_id: p.formatId, program_id: p.programId, 
            final_grade: p.finalGrade, written_grade_reviewer1: p.writtenGradeReviewer1, 
            presentation_grade_reviewer1: p.presentationGradeReviewer1, 
            written_grade_reviewer2: p.writtenGradeReviewer2, 
            presentation_grade_reviewer2: p.presentationGradeReviewer2 
        }).eq('id', p.id);
        return p;
    },
    deleteProject: async (id: string) => {
        if (!supabase) return;
        await supabase.from('project_teachers').delete().eq('project_id', id);
        await supabase.from('students').update({ project_id: null }).eq('project_id', id);
        await supabase.from('projects').delete().eq('id', id);
    },

    // --- Estudiantes ---
    getStudents: async (): Promise<Student[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('students').select('*').order('name', { ascending: true });
        return (data || []).map((s: any) => ({ id: s.id, name: s.name, email: s.email, cedula: s.cedula, projectId: s.project_id, programId: s.program_id }));
    },
    getStudentById: async (id: string): Promise<Student | null> => {
        if (!supabase) return null;
        const { data } = await supabase.from('students').select('*').eq('id', id).single();
        if (!data) return null;
        return { id: data.id, name: data.name, email: data.email, cedula: data.cedula, projectId: data.project_id, programId: data.program_id };
    },
    addStudent: async (s: Omit<Student, 'id'>) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const userId = generateId();
        await supabase.from('students').insert([{ id, name: s.name, email: s.email, cedula: s.cedula, program_id: s.programId }]);
        await supabase.from('users').insert([{ id: userId, username: s.name, password: s.cedula, role: 'student', student_id: id }]);
        return { ...s, id } as Student;
    },
    updateStudent: async (s: Student) => {
        if (!supabase) throw new Error("Supabase no configurado");
        await supabase.from('students').update({ name: s.name, email: s.email, cedula: s.cedula, program_id: s.programId, project_id: s.projectId }).eq('id', s.id);
        return s;
    },
    deleteStudent: async (id: string) => {
        if (!supabase) return;
        await supabase.from('users').delete().eq('student_id', id);
        await supabase.from('students').delete().eq('id', id);
    },

    // --- Docentes ---
    getTeachers: async (): Promise<Teacher[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('teachers').select('*').order('name', { ascending: true });
        return data || [];
    },
    addTeacher: async (t: Omit<Teacher, 'id'>) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const userId = generateId();
        await supabase.from('teachers').insert([{ id, name: t.name, email: t.email, cedula: t.cedula }]);
        await supabase.from('users').insert([{ id: userId, username: t.name, password: t.cedula, role: 'teacher', teacher_id: id }]);
        return { ...t, id } as Teacher;
    },
    updateTeacher: async (t: Teacher) => {
        if (!supabase) throw new Error("Supabase no configurado");
        await supabase.from('teachers').update({ name: t.name, email: t.email, cedula: t.cedula }).eq('id', t.id);
        await supabase.from('users').update({ username: t.name, password: t.cedula }).eq('teacher_id', t.id);
        return t;
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
        return (data || []).map((pt: any) => ({ id: pt.id, projectId: pt.project_id, teacherId: pt.teacher_id, role_id: pt.role_id }));
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

    // --- Catálogos (Ordenados por sort_order) ---
    getStatuses: async () => { 
        if (!supabase) return [];
        const { data } = await supabase.from('statuses').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }); 
        return (data || []).map(d => ({ ...d, sortOrder: d.sort_order }));
    },
    getFormats: async () => { 
        if (!supabase) return [];
        const { data } = await supabase.from('formats').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }); 
        return (data || []).map(d => ({ ...d, sortOrder: d.sort_order }));
    },
    getTeacherRoles: async () => { 
        if (!supabase) return [];
        const { data } = await supabase.from('teacher_roles').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }); 
        return (data || []).map(d => ({ ...d, sortOrder: d.sort_order }));
    },
    
    addStatus: async (p: {name: string, sortOrder?: number}) => { if(!supabase) return; const id = generateId(); await supabase.from('statuses').insert([{ id, name: p.name, sort_order: p.sortOrder || 99 }]); return { ...p, id }; },
    addFormat: async (p: {name: string, sortOrder?: number}) => { if(!supabase) return; const id = generateId(); await supabase.from('formats').insert([{ id, name: p.name, sort_order: p.sortOrder || 99 }]); return { ...p, id }; },
    addTeacherRole: async (p: {name: string, sortOrder?: number}) => { if(!supabase) return; const id = generateId(); await supabase.from('teacher_roles').insert([{ id, name: p.name, sort_order: p.sortOrder || 99 }]); return { ...p, id }; },
    
    updateStatus: async (p: Status) => { if(supabase) await supabase.from('statuses').update({ name: p.name, sort_order: p.sortOrder }).eq('id', p.id); return p; },
    updateFormat: async (p: Format) => { if(supabase) await supabase.from('formats').update({ name: p.name, sort_order: p.sortOrder }).eq('id', p.id); return p; },
    updateTeacherRole: async (p: TeacherRole) => { if(supabase) await supabase.from('teacher_roles').update({ name: p.name, sort_order: p.sortOrder }).eq('id', p.id); return p; },
    
    deleteStatus: async (id: string) => { if(supabase) await supabase.from('statuses').delete().eq('id', id); },
    deleteFormat: async (id: string) => { if(supabase) await supabase.from('formats').delete().eq('id', id); },
    deleteTeacherRole: async (id: string) => { if(supabase) await supabase.from('teacher_roles').delete().eq('id', id); }
};
