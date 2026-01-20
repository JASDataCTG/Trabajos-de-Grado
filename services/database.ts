
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

const initialSeeds = {
    programs: [{ id: '1', name: 'Ingeniería de Sistemas' }, { id: '2', name: 'Derecho' }, { id: '3', name: 'Medicina' }],
    formats: [{ id: '1', name: 'Anteproyecto' }, { id: '2', name: 'Proyecto Final' }],
    teacherRoles: [{ id: '1', name: 'Director' }, { id: '2', name: 'Co-Director' }, { id: '3', name: 'Evaluador 1' }, { id: '4', name: 'Evaluador 2' }],
    statuses: [{ id: '1', name: 'En Proceso' }, { id: '2', name: 'Aprobado' }, { id: '3', name: 'Sustentado' }, { id: '4', name: 'Rechazado' }]
};

const calculateAverage = (p: any) => {
    const g1w = p.written_grade_reviewer1;
    const g1p = p.presentation_grade_reviewer1;
    const g2w = p.written_grade_reviewer2;
    const g2p = p.presentation_grade_reviewer2;

    let avg1 = 0; let count1 = 0;
    if (g1w !== null && g1w !== undefined) { avg1 += Number(g1w); count1++; }
    if (g1p !== null && g1p !== undefined) { avg1 += Number(g1p); count1++; }
    const finalAvg1 = count1 > 0 ? avg1 / count1 : null;

    let avg2 = 0; let count2 = 0;
    if (g2w !== null && g2w !== undefined) { avg2 += Number(g2w); count2++; }
    if (g2p !== null && g2p !== undefined) { avg2 += Number(g2p); count2++; }
    const finalAvg2 = count2 > 0 ? avg2 / count2 : null;

    if (finalAvg1 !== null && finalAvg2 !== null) {
        return Number(((finalAvg1 + finalAvg2) / 2).toFixed(2));
    } else if (finalAvg1 !== null) {
        return Number(finalAvg1.toFixed(2));
    } else if (finalAvg2 !== null) {
        return Number(finalAvg2.toFixed(2));
    }
    return null;
};

const mapProjectToDB = (p: Partial<Project>) => ({
    id: p.id,
    title: p.title,
    presentation_date: p.presentationDate || null,
    files_url: p.filesUrl || '',
    status_id: p.statusId || null,
    format_id: p.formatId || null,
    is_approved_by_director: !!p.isApprovedByDirector,
    written_grade_reviewer1: p.writtenGradeReviewer1,
    presentation_grade_reviewer1: p.presentationGradeReviewer1,
    written_grade_reviewer2: p.writtenGradeReviewer2,
    presentation_grade_reviewer2: p.presentationGradeReviewer2,
    final_grade: p.finalGrade // Ahora se envía para persistencia
});

const mapProjectFromDB = (p: any): Project => ({
    id: p.id,
    title: p.title,
    presentationDate: p.presentation_date || '',
    filesUrl: p.files_url || '',
    statusId: p.status_id || '',
    formatId: p.format_id || '',
    isApprovedByDirector: !!p.is_approved_by_director,
    writtenGradeReviewer1: p.written_grade_reviewer1 ?? null,
    presentationGradeReviewer1: p.presentation_grade_reviewer1 ?? null,
    writtenGradeReviewer2: p.written_grade_reviewer2 ?? null,
    presentationGradeReviewer2: p.presentation_grade_reviewer2 ?? null,
    finalGrade: p.final_grade ?? calculateAverage(p) // Prioriza el guardado, si no existe lo calcula
});

export const db = {
    initializeDB: async () => {
        if (!supabase) return;
        try {
            const checkAndSeed = async (table: string, data: any[]) => {
                const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
                if (count === 0) await supabase.from(table).insert(data);
            };
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

    getProjects: async (): Promise<Project[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('projects').select('*').order('presentation_date', { ascending: false });
        if (error) return [];
        return (data || []).map(mapProjectFromDB);
    },

    getUsers: async (): Promise<User[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('users').select('*');
        return (data || []).map((u: any) => ({ ...u, teacherId: u.teacher_id, studentId: u.student_id }));
    },

    getUserByUsername: async (username: string) => {
        if (!supabase) return null;
        const { data } = await supabase.from('users').select('*').eq('username', username).single();
        if (!data) return null;
        return { ...data, teacherId: data.teacher_id, studentId: data.student_id } as User;
    },

    getStudents: async (): Promise<Student[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('students').select('*');
        return (data || []).map((s: any) => ({
            id: s.id, name: s.name, email: s.email, cedula: s.cedula,
            projectId: s.project_id, programId: s.program_id
        }));
    },

    getTeachers: async (): Promise<Teacher[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('teachers').select('*');
        return data || [];
    },

    getProjectTeachers: async (): Promise<ProjectTeacher[]> => {
        if (!supabase) return [];
        const { data } = await supabase.from('project_teachers').select('*');
        return (data || []).map((pt: any) => ({
            id: pt.id, projectId: pt.project_id, teacherId: pt.teacher_id, roleId: pt.role_id
        }));
    },

    addProject: async (project: Omit<Project, 'id'>) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const { error } = await supabase.from('projects').insert([mapProjectToDB({ ...project, id })]);
        if (error) throw error;
        return { ...project, id } as Project;
    },

    updateProject: async (project: Project) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const { error } = await supabase.from('projects').update(mapProjectToDB(project)).eq('id', project.id);
        if (error) throw error;
        return project;
    },

    deleteProject: async (id: string) => {
        if (!supabase) return;
        await supabase.from('project_teachers').delete().eq('project_id', id);
        await supabase.from('students').update({ project_id: null }).eq('project_id', id);
        await supabase.from('projects').delete().eq('id', id);
    },

    addStudent: async (student: Omit<Student, 'id'>) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const userId = generateId();
        await supabase.from('students').insert([{ id, name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId }]);
        await supabase.from('users').insert([{ id: userId, username: student.name, password: student.cedula, role: 'student', student_id: id }]);
        return { ...student, id } as Student;
    },

    updateStudent: async (student: Student) => {
        if (!supabase) return student;
        await supabase.from('students').update({ name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId }).eq('id', student.id);
        return student;
    },

    addTeacher: async (teacher: Omit<Teacher, 'id'>) => {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const userId = generateId();
        await supabase.from('teachers').insert([{ id, ...teacher }]);
        await supabase.from('users').insert([{ id: userId, username: teacher.name, password: teacher.cedula, role: 'teacher', teacher_id: id }]);
        return { id, ...teacher } as Teacher;
    },

    updateTeacher: async (teacher: Teacher) => {
        if (!supabase) return teacher;
        await supabase.from('teachers').update(teacher).eq('id', teacher.id);
        await supabase.from('users').update({ username: teacher.name, password: teacher.cedula }).eq('teacher_id', teacher.id);
        return teacher;
    },

    getStatuses: async () => {
        if (!supabase) return initialSeeds.statuses;
        const { data } = await supabase.from('statuses').select('*');
        return data || [];
    },

    getFormats: async () => {
        if (!supabase) return initialSeeds.formats;
        const { data } = await supabase.from('formats').select('*');
        return data || [];
    },

    getTeacherRoles: async () => {
        if (!supabase) return initialSeeds.teacherRoles;
        const { data } = await supabase.from('teacher_roles').select('*');
        return data || [];
    },

    getPrograms: async () => {
        if (!supabase) return initialSeeds.programs;
        const { data } = await supabase.from('programs').select('*');
        return data || [];
    },

    addProjectTeacher: async (pt: Omit<ProjectTeacher, 'id'>) => {
        const id = generateId();
        await supabase?.from('project_teachers').insert([{ id, project_id: pt.projectId, teacher_id: pt.teacherId, role_id: pt.roleId }]);
        return { ...pt, id };
    },

    deleteProjectTeachersByProject: async (projectId: string) => {
        await supabase?.from('project_teachers').delete().eq('project_id', projectId);
    },

    deleteStudent: async (id: string) => {
        await supabase?.from('users').delete().eq('student_id', id);
        await supabase?.from('students').delete().eq('id', id);
    },

    deleteTeacher: async (id: string) => {
        await supabase?.from('users').delete().eq('teacher_id', id);
        await supabase?.from('teachers').delete().eq('id', id);
    },

    deleteUser: async (id: string) => {
        await supabase?.from('users').delete().eq('id', id);
    },

    getProjectById: async (id: string) => {
        const { data } = await supabase!.from('projects').select('*').eq('id', id).single();
        return data ? mapProjectFromDB(data) : null;
    },

    getStudentById: async (id: string) => {
        const { data } = await supabase!.from('students').select('*').eq('id', id).single();
        if (!data) return null;
        return { id: data.id, name: data.name, email: data.email, cedula: data.cedula, projectId: data.project_id, programId: data.program_id };
    },

    addStatus: async (p: any) => { const id=generateId(); await supabase?.from('statuses').insert([{id, ...p}]); return {id, ...p}; },
    addFormat: async (p: any) => { const id=generateId(); await supabase?.from('formats').insert([{id, ...p}]); return {id, ...p}; },
    addProgram: async (p: any) => { const id=generateId(); await supabase?.from('programs').insert([{id, ...p}]); return {id, ...p}; },
    addTeacherRole: async (p: any) => { const id=generateId(); await supabase?.from('teacher_roles').insert([{id, ...p}]); return {id, ...p}; },
    updateStatus: async (p: any) => { await supabase?.from('statuses').update({name: p.name}).eq('id', p.id); return p; },
    updateFormat: async (p: any) => { await supabase?.from('formats').update({name: p.name}).eq('id', p.id); return p; },
    updateProgram: async (p: any) => { await supabase?.from('programs').update({name: p.name}).eq('id', p.id); return p; },
    updateTeacherRole: async (p: any) => { await supabase?.from('teacher_roles').update({name: p.name}).eq('id', p.id); return p; },
    deleteStatus: async (id: string) => { await supabase?.from('statuses').delete().eq('id', id); },
    deleteFormat: async (id: string) => { await supabase?.from('formats').delete().eq('id', id); },
    deleteProgram: async (id: string) => { await supabase?.from('programs').delete().eq('id', id); },
    deleteTeacherRole: async (id: string) => { await supabase?.from('teacher_roles').delete().eq('id', id); }
};
