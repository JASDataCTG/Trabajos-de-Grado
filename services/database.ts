
// @ts-ignore - Importación directa desde CDN para asegurar el build exitoso
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program } from '../types';

/**
 * IMPORTANTE PARA VERCEL/VITE:
 * Vite reemplaza estas cadenas de texto durante el 'build'. 
 * El acceso debe ser estático (escribir el nombre completo de la variable).
 */
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

// @ts-ignore
export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const initializeDB = () => { 
    if (!isSupabaseConfigured) {
        console.warn('Configuración de Supabase incompleta o no detectada en el entorno actual.');
    }
};

const safeQuery = async (queryPromise: Promise<any>) => {
    if (!supabase) return { data: null, error: new Error('Base de datos no configurada') };
    try {
        const result = await queryPromise;
        if (result.error) throw result.error;
        return result;
    } catch (error: any) {
        console.error("Error en consulta Supabase:", error);
        return { data: null, error };
    }
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
    // Fix typo: change snake_case property access to camelCase as defined in the Project interface.
    presentation_grade_reviewer2: p.presentationGradeReviewer2
});

const mapProjectFromDB = (p: any): Project => ({
    id: p.id,
    title: p.title,
    presentationDate: p.presentation_date,
    filesUrl: p.files_url,
    statusId: p.status_id,
    formatId: p.format_id,
    isApprovedByDirector: p.is_approved_by_director,
    writtenGradeReviewer1: p.written_grade_reviewer1,
    presentationGradeReviewer1: p.presentation_grade_reviewer1,
    writtenGradeReviewer2: p.written_grade_reviewer2,
    presentationGradeReviewer2: p.presentation_grade_reviewer2
});

export const db = {
    checkConnection: async () => {
        if (!supabase) return false;
        try {
            const { error } = await supabase.from('users').select('id').limit(1);
            return !error;
        } catch {
            return false;
        }
    },

    getUsers: async () => {
        const { data } = await safeQuery(supabase?.from('users').select('*') || Promise.resolve({data: []}));
        return (data || []).map((u: any) => ({
            ...u,
            teacherId: u.teacher_id,
            studentId: u.student_id
        }));
    },
    getUserByUsername: async (username: string) => {
        const { data, error } = await safeQuery(supabase?.from('users').select('*').ilike('username', username).single() || Promise.resolve({data: null}));
        if (error || !data) return null;
        return {
            ...data,
            teacherId: data.teacher_id,
            studentId: data.student_id
        };
    },
    deleteUser: async (id: string) => {
        await safeQuery(supabase?.from('users').delete().eq('id', id) || Promise.resolve({}));
    },
    getProjects: async () => {
        const { data } = await safeQuery(supabase?.from('projects').select('*') || Promise.resolve({data: []}));
        return (data || []).map(mapProjectFromDB);
    },
    getProjectById: async (id: string) => {
        const { data } = await safeQuery(supabase?.from('projects').select('*').eq('id', id).single() || Promise.resolve({data: null}));
        return data ? mapProjectFromDB(data) : null;
    },
    addProject: async (project: Omit<Project, 'id'>) => {
        const id = generateId();
        const dbProject = mapProjectToDB({ ...project, id });
        const { data } = await safeQuery(supabase?.from('projects').insert([dbProject]).select().single() || Promise.resolve({data: null}));
        return data ? mapProjectFromDB(data) : null;
    },
    updateProject: async (project: Project) => {
        const dbProject = mapProjectToDB(project);
        const { data } = await safeQuery(supabase?.from('projects').update(dbProject).eq('id', project.id).select().single() || Promise.resolve({data: null}));
        return data ? mapProjectFromDB(data) : null;
    },
    deleteProject: async (id: string) => {
        await safeQuery(supabase?.from('projects').delete().eq('id', id) || Promise.resolve({}));
    },
    getStudents: async () => {
        const { data } = await safeQuery(supabase?.from('students').select('*') || Promise.resolve({data: []}));
        return (data || []).map((s: any) => ({ ...s, projectId: s.project_id, programId: s.program_id }));
    },
    getStudentById: async (id: string) => {
        const { data } = await safeQuery(supabase?.from('students').select('*').eq('id', id).single() || Promise.resolve({data: null}));
        return data ? { ...data, projectId: data.project_id, programId: data.program_id } : null;
    },
    addStudent: async (student: Omit<Student, 'id'>) => {
        const id = generateId();
        const dbStudent = { id, name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId };
        const { data: newStudent } = await safeQuery(supabase?.from('students').insert([dbStudent]).select().single() || Promise.resolve({data: null}));
        if (newStudent) {
            await safeQuery(supabase?.from('users').insert([{ id: generateId(), username: student.name, password: student.cedula, role: 'student', student_id: id }]) || Promise.resolve({}));
        }
        return newStudent ? { ...newStudent, projectId: newStudent.project_id, programId: newStudent.program_id } : null;
    },
    updateStudent: async (student: Student) => {
        const dbStudent = { name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId };
        const { data } = await safeQuery(supabase?.from('students').update(dbStudent).eq('id', student.id).select().single() || Promise.resolve({data: null}));
        await safeQuery(supabase?.from('users').update({ username: student.name, password: student.cedula }).eq('student_id', student.id) || Promise.resolve({}));
        return data ? { ...data, projectId: data.project_id, programId: data.program_id } : null;
    },
    deleteStudent: async (id: string) => {
        await safeQuery(supabase?.from('users').delete().eq('student_id', id) || Promise.resolve({}));
        await safeQuery(supabase?.from('students').delete().eq('id', id) || Promise.resolve({}));
    },
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
            await safeQuery(supabase?.from('users').insert([{ id: generateId(), username: teacher.name, password: teacher.cedula, role: 'teacher', teacher_id: id }]) || Promise.resolve({}));
        }
        return newTeacher;
    },
    updateTeacher: async (teacher: Teacher) => {
        const { data } = await safeQuery(supabase?.from('teachers').update(teacher).eq('id', teacher.id).select().single() || Promise.resolve({data: null}));
        await safeQuery(supabase?.from('users').update({ username: teacher.name, password: teacher.cedula }).eq('teacher_id', teacher.id) || Promise.resolve({}));
        return data;
    },
    deleteTeacher: async (id: string) => {
        await safeQuery(supabase?.from('users').delete().eq('teacher_id', id) || Promise.resolve({}));
        await safeQuery(supabase?.from('teachers').delete().eq('id', id) || Promise.resolve({}));
    },
    getProjectTeachers: async () => {
        const { data } = await safeQuery(supabase?.from('project_teachers').select('*') || Promise.resolve({data: []}));
        return (data || []).map((pt: any) => ({ id: pt.id, projectId: pt.project_id, teacherId: pt.teacher_id, roleId: pt.role_id }));
    },
    addProjectTeacher: async (pt: Omit<ProjectTeacher, 'id'>) => {
        const id = generateId();
        const dbPT = { id, project_id: pt.projectId, teacher_id: pt.teacherId, role_id: pt.roleId };
        const { data } = await safeQuery(supabase?.from('project_teachers').insert([dbPT]).select().single() || Promise.resolve({data: null}));
        return data;
    },
    deleteProjectTeacher: async (id: string) => {
        await safeQuery(supabase?.from('project_teachers').delete().eq('id', id) || Promise.resolve({}));
    },
    deleteProjectTeachersByProject: async (projectId: string) => {
        await safeQuery(supabase?.from('project_teachers').delete().eq('project_id', projectId) || Promise.resolve({}));
    },
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
