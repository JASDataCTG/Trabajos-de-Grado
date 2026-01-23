
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

// Semillas iniciales solo para bootstrapping en Supabase (si las tablas están vacías)
const bootstrapData = {
    faculties: [{ id: 'f1', name: 'Facultad de Ingeniería' }, { id: 'f2', name: 'Facultad de Salud' }],
    programs: [{ id: '1', name: 'Tecnología en Sistemas', faculty_id: 'f1' }, { id: '2', name: 'Ingeniería de Sistemas', faculty_id: 'f1' }],
    formats: [{ id: '1', name: 'Anteproyecto' }, { id: '2', name: 'Proyecto Final' }],
    teacherRoles: [{ id: '1', name: 'Director' }, { id: '2', name: 'Co-Director' }, { id: '3', name: 'Evaluador 1' }, { id: '4', name: 'Evaluador 2' }],
    statuses: [{ id: '1', name: 'En Proceso' }, { id: '2', name: 'Aprobado' }, { id: '3', name: 'Sustentado' }, { id: '4', name: 'Rechazado' }]
};

export const db = {
    initializeDB: async () => {
        if (!supabase) {
            console.error("Supabase no configurado. El sistema no funcionará sin conexión remota.");
            return;
        }
        try {
            const checkAndSeed = async (table: string, data: any[]) => {
                const { count, error } = await supabase!.from(table).select('*', { count: 'exact', head: true });
                if (!error && count === 0) {
                    console.log(`Poblando tabla ${table} en Supabase...`);
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
        const { data, error } = await supabase.from('faculties').select('*').order('name');
        if (error) { console.error(error); return []; }
        return data || [];
    },
    addFaculty: async (f: { name: string }) => {
        const id = generateId();
        if (!supabase) throw new Error("Sin conexión a Supabase");
        const { error } = await supabase.from('faculties').insert([{ id, name: f.name }]);
        if (error) throw error;
        return { id, ...f };
    },
    updateFaculty: async (f: Faculty) => {
        if (!supabase) throw new Error("Sin conexión a Supabase");
        const { error } = await supabase.from('faculties').update({ name: f.name }).eq('id', f.id);
        if (error) throw error;
        return f;
    },
    deleteFaculty: async (id: string) => {
        if (!supabase) throw new Error("Sin conexión a Supabase");
        const { error } = await supabase.from('faculties').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Programas ---
    getPrograms: async (): Promise<Program[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('programs').select('*').order('name');
        if (error) { console.error(error); return []; }
        return (data || []).map((p: any) => ({ id: p.id, name: p.name, facultyId: p.faculty_id }));
    },
    addProgram: async (p: { name: string, facultyId: string }) => {
        const id = generateId();
        if (!supabase) throw new Error("Sin conexión a Supabase");
        const { error } = await supabase.from('programs').insert([{ id, name: p.name, faculty_id: p.facultyId }]);
        if (error) throw error;
        return { id, ...p };
    },
    updateProgram: async (p: Program) => {
        if (!supabase) throw new Error("Sin conexión a Supabase");
        const { error } = await supabase.from('programs').update({ name: p.name, faculty_id: p.facultyId }).eq('id', p.id);
        if (error) throw error;
        return p;
    },
    deleteProgram: async (id: string) => {
        if (!supabase) throw new Error("Sin conexión a Supabase");
        const { error } = await supabase.from('programs').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Proyectos ---
    getProjects: async (): Promise<Project[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('projects').select('*').order('presentation_date', { ascending: false });
        if (error) { console.error(error); return []; }
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
        const id = generateId();
        if (!supabase) throw new Error("Sin conexión a Supabase");
        const { error } = await supabase.from('projects').insert([{ 
            id, title: p.title, presentation_date: p.presentationDate, files_url: p.filesUrl, 
            status_id: p.statusId, format_id: p.formatId, program_id: p.programId 
        }]);
        if (error) throw error;
        return { ...p, id } as Project;
    },
    updateProject: async (p: Project) => {
        if (!supabase) throw new Error("Sin conexión a Supabase");
        const { error } = await supabase.from('projects').update({ 
            title: p.title, presentation_date: p.presentationDate, files_url: p.filesUrl, 
            status_id: p.statusId, format_id: p.formatId, program_id: p.programId, 
            final_grade: p.finalGrade, written_grade_reviewer1: p.writtenGradeReviewer1, 
            presentation_grade_reviewer1: p.presentationGradeReviewer1, 
            written_grade_reviewer2: p.writtenGradeReviewer2, 
            presentation_grade_reviewer2: p.presentationGradeReviewer2 
        }).eq('id', p.id);
        if (error) throw error;
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
        const { data, error } = await supabase.from('students').select('*');
        if (error) return [];
        return (data || []).map((s: any) => ({ id: s.id, name: s.name, email: s.email, cedula: s.cedula, projectId: s.project_id, programId: s.program_id }));
    },
    getStudentById: async (id: string): Promise<Student | null> => {
        if (!supabase) return null;
        const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
        if (error || !data) return null;
        return { id: data.id, name: data.name, email: data.email, cedula: data.cedula, projectId: data.project_id, programId: data.program_id };
    },
    addStudent: async (s: Omit<Student, 'id'>) => {
        if (!supabase) throw new Error("Sin conexión");
        const id = generateId();
        const userId = generateId();
        const { error: sError } = await supabase.from('students').insert([{ id, name: s.name, email: s.email, cedula: s.cedula, program_id: s.programId }]);
        if (sError) throw sError;
        await supabase.from('users').insert([{ id: userId, username: s.name, password: s.cedula, role: 'student', student_id: id }]);
        return { ...s, id } as Student;
    },
    updateStudent: async (s: Student) => {
        if (!supabase) throw new Error("Sin conexión");
        const { error } = await supabase.from('students').update({ name: s.name, email: s.email, cedula: s.cedula, program_id: s.programId, project_id: s.projectId }).eq('id', s.id);
        if (error) throw error;
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
        const { data, error } = await supabase.from('teachers').select('*');
        if (error) return [];
        return data || [];
    },
    addTeacher: async (t: Omit<Teacher, 'id'>) => {
        if (!supabase) throw new Error("Sin conexión");
        const id = generateId();
        const userId = generateId();
        const { error: tError } = await supabase.from('teachers').insert([{ id, name: t.name, email: t.email, cedula: t.cedula }]);
        if (tError) throw tError;
        await supabase.from('users').insert([{ id: userId, username: t.name, password: t.cedula, role: 'teacher', teacher_id: id }]);
        return { ...t, id } as Teacher;
    },
    updateTeacher: async (t: Teacher) => {
        if (!supabase) throw new Error("Sin conexión");
        const { error } = await supabase.from('teachers').update({ name: t.name, email: t.email, cedula: t.cedula }).eq('id', t.id);
        if (error) throw error;
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
        const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
        if (error || !data) return null;
        return { ...data, teacherId: data.teacher_id, studentId: data.student_id };
    },
    getUsers: async (): Promise<User[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('users').select('*');
        if (error) return [];
        return (data || []).map((u: any) => ({ ...u, teacherId: u.teacher_id, studentId: u.student_id }));
    },
    deleteUser: async (id: string) => {
        if (supabase) await supabase.from('users').delete().eq('id', id);
    },

    // --- Relación Proyecto-Docente ---
    getProjectTeachers: async (): Promise<ProjectTeacher[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('project_teachers').select('*');
        if (error) return [];
        return (data || []).map((pt: any) => ({ id: pt.id, projectId: pt.project_id, teacherId: pt.teacher_id, roleId: pt.role_id }));
    },
    addProjectTeacher: async (pt: Omit<ProjectTeacher, 'id'>) => {
        if (!supabase) throw new Error("Sin conexión");
        const id = generateId();
        const { error } = await supabase.from('project_teachers').insert([{ id, project_id: pt.projectId, teacher_id: pt.teacherId, role_id: pt.roleId }]);
        if (error) throw error;
        return { ...pt, id };
    },
    deleteProjectTeachersByProject: async (projectId: string) => {
        if (supabase) await supabase.from('project_teachers').delete().eq('project_id', projectId);
    },

    // --- Catálogos (Status, Format, Role) ---
    getStatuses: async () => { 
        if (!supabase) return [];
        const { data, error } = await supabase.from('statuses').select('*'); 
        if (error) return [];
        return data || []; 
    },
    getFormats: async () => { 
        if (!supabase) return [];
        const { data, error } = await supabase.from('formats').select('*'); 
        if (error) return [];
        return data || []; 
    },
    getTeacherRoles: async () => { 
        if (!supabase) return [];
        const { data, error } = await supabase.from('teacher_roles').select('*'); 
        if (error) return [];
        return data || []; 
    },
    
    addStatus: async (p: {name: string}) => { const id = generateId(); if(supabase) await supabase.from('statuses').insert([{ id, name: p.name }]); return { ...p, id }; },
    addFormat: async (p: {name: string}) => { const id = generateId(); if(supabase) await supabase.from('formats').insert([{ id, name: p.name }]); return { ...p, id }; },
    addTeacherRole: async (p: {name: string}) => { const id = generateId(); if(supabase) await supabase.from('teacher_roles').insert([{ id, name: p.name }]); return { ...p, id }; },
    
    updateStatus: async (p: Status) => { if(supabase) await supabase.from('statuses').update({ name: p.name }).eq('id', p.id); return p; },
    updateFormat: async (p: Format) => { if(supabase) await supabase.from('formats').update({ name: p.name }).eq('id', p.id); return p; },
    updateTeacherRole: async (p: TeacherRole) => { if(supabase) await supabase.from('teacher_roles').update({ name: p.name }).eq('id', p.id); return p; },
    
    deleteStatus: async (id: string) => { if(supabase) await supabase.from('statuses').delete().eq('id', id); },
    deleteFormat: async (id: string) => { if(supabase) await supabase.from('formats').delete().eq('id', id); },
    deleteTeacherRole: async (id: string) => { if(supabase) await supabase.from('teacher_roles').delete().eq('id', id); }
};
