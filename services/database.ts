
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

const LOCAL_STORAGE_KEY = 'uninunez_db';

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

const getLocalDB = () => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return initialDB;
    try {
        return { ...initialDB, ...JSON.parse(data) };
    } catch {
        return initialDB;
    }
};

const setLocalDB = (db: any) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
};

export const initializeDB = () => {
    // Siempre inicializamos LocalStorage si está vacío o incompleto
    const current = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!current) {
        setLocalDB(initialDB);
    } else {
        // Asegurar que existan todas las tablas básicas
        const db = getLocalDB();
        let changed = false;
        Object.keys(initialDB).forEach(key => {
            if (!db[key]) {
                db[key] = (initialDB as any)[key];
                changed = true;
            }
        });
        if (changed) setLocalDB(db);
    }
};

const safeQuery = async (queryPromise: Promise<any>, tableName: string) => {
    if (supabase) {
        try {
            const result = await queryPromise;
            if (result.error) throw result.error;
            if (result.data && result.data.length > 0) return result;
        } catch (error) {
            console.warn(`Supabase falló o está vacío para ${tableName}, usando local:`, error);
        }
    }
    const db = getLocalDB();
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
        if (supabase) {
            await supabase.from('users').delete().eq('id', id);
        }
        const db_local = getLocalDB();
        db_local.users = db_local.users.filter((u: any) => u.id !== id);
        setLocalDB(db_local);
    },
    getProjects: async () => {
        const { data } = await safeQuery(supabase?.from('projects').select('*').order('created_at', { ascending: false }) || Promise.resolve({}), 'projects');
        return (data || []).map(mapProjectFromDB);
    },
    getProjectById: async (id: string) => {
        const projects = await db.getProjects();
        return projects.find(p => p.id === id) || null;
    },
    addProject: async (project: Omit<Project, 'id'>) => {
        const id = generateId();
        const newProject = { ...project, id } as Project;
        
        // Guardar local primero para garantizar persistencia
        const db_local = getLocalDB();
        db_local.projects.push(newProject);
        setLocalDB(db_local);

        if (supabase) {
            try {
                const { error } = await supabase.from('projects').insert([mapProjectToDB(newProject)]);
                if (error) console.error("Error Supabase addProject:", error);
            } catch (e) {
                console.error("Fallo crítico Supabase addProject:", e);
            }
        }
        return newProject;
    },
    updateProject: async (project: Project) => {
        // Actualizar local
        const db_local = getLocalDB();
        const idx = db_local.projects.findIndex((p: any) => p.id === project.id);
        if (idx !== -1) {
            db_local.projects[idx] = project;
            setLocalDB(db_local);
        }

        if (supabase) {
            try {
                const { error } = await supabase.from('projects').update(mapProjectToDB(project)).eq('id', project.id);
                if (error) console.error("Error Supabase updateProject:", error);
            } catch (e) {
                console.error("Fallo crítico Supabase updateProject:", e);
            }
        }
        return project;
    },
    deleteProject: async (id: string) => {
        const db_local = getLocalDB();
        db_local.projects = db_local.projects.filter((p: any) => p.id !== id);
        setLocalDB(db_local);

        if (supabase) {
            await supabase.from('projects').delete().eq('id', id);
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
        const newStudent = { ...student, id } as Student;
        const newUser = { id: generateId(), username: student.name, password: student.cedula, role: 'student' as const, studentId: id, teacherId: null };

        const db_local = getLocalDB();
        db_local.students.push(newStudent);
        db_local.users.push(newUser);
        setLocalDB(db_local);

        if (supabase) {
            await supabase.from('students').insert([{ id, name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId }]);
            await supabase.from('users').insert([{ id: newUser.id, username: newUser.username, password: newUser.password, role: 'student', student_id: id }]);
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
            await supabase.from('students').update({ name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId }).eq('id', student.id);
            await supabase.from('users').update({ username: student.name, password: student.cedula }).eq('student_id', student.id);
        }
        return student;
    },
    deleteStudent: async (id: string) => {
        const db_local = getLocalDB();
        db_local.students = db_local.students.filter((s: any) => s.id !== id);
        db_local.users = db_local.users.filter((u: any) => u.studentId !== id);
        setLocalDB(db_local);

        if (supabase) {
            await supabase.from('users').delete().eq('student_id', id);
            await supabase.from('students').delete().eq('id', id);
        }
    },
    getTeachers: async () => {
        const { data } = await safeQuery(supabase?.from('teachers').select('*') || Promise.resolve({}), 'teachers');
        return data || [];
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
            await supabase.from('teachers').insert([{ ...teacher, id }]);
            await supabase.from('users').insert([{ id: newUser.id, username: newUser.username, password: newUser.password, role: 'teacher', teacher_id: id }]);
        }
        return newTeacher;
    },
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
            await supabase.from('teachers').update(teacher).eq('id', teacher.id);
            await supabase.from('users').update({ username: teacher.name, password: teacher.cedula }).eq('teacher_id', teacher.id);
        }
        return teacher;
    },
    deleteTeacher: async (id: string) => {
        const db_local = getLocalDB();
        db_local.teachers = db_local.teachers.filter((t: any) => t.id !== id);
        db_local.users = db_local.users.filter((u: any) => u.teacherId !== id);
        setLocalDB(db_local);

        if (supabase) {
            await supabase.from('users').delete().eq('teacher_id', id);
            await supabase.from('teachers').delete().eq('id', id);
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
        const newPT = { ...pt, id } as ProjectTeacher;
        
        const db_local = getLocalDB();
        db_local.projectTeachers.push(newPT);
        setLocalDB(db_local);

        if (supabase) {
            await supabase.from('project_teachers').insert([{ id, project_id: pt.projectId, teacher_id: pt.teacherId, role_id: pt.roleId }]);
        }
        return newPT;
    },
    deleteProjectTeachersByProject: async (projectId: string) => {
        const db_local = getLocalDB();
        db_local.projectTeachers = db_local.projectTeachers.filter((pt: any) => pt.projectId !== projectId);
        setLocalDB(db_local);

        if (supabase) {
            await supabase.from('project_teachers').delete().eq('project_id', projectId);
        }
    },
    getPrograms: async () => (await safeQuery(supabase?.from('programs').select('*') || Promise.resolve({}), 'programs')).data || [],
    getStatuses: async () => (await safeQuery(supabase?.from('statuses').select('*') || Promise.resolve({}), 'statuses')).data || [],
    getFormats: async () => (await safeQuery(supabase?.from('formats').select('*') || Promise.resolve({}), 'formats')).data || [],
    getTeacherRoles: async () => (await safeQuery(supabase?.from('teacher_roles').select('*') || Promise.resolve({}), 'teacherRoles')).data || [],
    
    addProgram: async (p: Omit<Program, 'id'>) => {
        const id = generateId();
        const item = {...p, id};
        const db_l = getLocalDB(); db_l.programs.push(item); setLocalDB(db_l);
        if (supabase) await supabase.from('programs').insert([item]);
        return item;
    },
    addStatus: async (p: Omit<Status, 'id'>) => { 
        const id = generateId(); const item = {...p, id};
        const db_l = getLocalDB(); db_l.statuses.push(item); setLocalDB(db_l);
        if (supabase) await supabase.from('statuses').insert([item]);
        return item;
    },
    addFormat: async (p: Omit<Format, 'id'>) => { 
        const id = generateId(); const item = {...p, id};
        const db_l = getLocalDB(); db_l.formats.push(item); setLocalDB(db_l);
        if (supabase) await supabase.from('formats').insert([item]);
        return item;
    },
    addTeacherRole: async (p: Omit<TeacherRole, 'id'>) => { 
        const id = generateId(); const item = {...p, id};
        const db_l = getLocalDB(); db_l.teacherRoles.push(item); setLocalDB(db_l);
        if (supabase) await supabase.from('teacher_roles').insert([item]);
        return item;
    },

    updateStatus: async (p: Status) => { 
        const db_l = getLocalDB(); const idx = db_l.statuses.findIndex((x:any)=>x.id===p.id); if(idx!==-1) db_l.statuses[idx]=p; setLocalDB(db_l);
        if(supabase) await supabase.from('statuses').update({name: p.name}).eq('id', p.id); return p; 
    },
    deleteStatus: async (id: string) => { 
        const db_l = getLocalDB(); db_l.statuses = db_l.statuses.filter((x:any)=>x.id!==id); setLocalDB(db_l);
        if(supabase) await supabase.from('statuses').delete().eq('id', id); 
    },
    updateFormat: async (p: Format) => { 
        const db_l = getLocalDB(); const idx = db_l.formats.findIndex((x:any)=>x.id===p.id); if(idx!==-1) db_l.formats[idx]=p; setLocalDB(db_l);
        if(supabase) await supabase.from('formats').update({name: p.name}).eq('id', p.id); return p; 
    },
    deleteFormat: async (id: string) => { 
        const db_l = getLocalDB(); db_l.formats = db_l.formats.filter((x:any)=>x.id!==id); setLocalDB(db_l);
        if(supabase) await supabase.from('formats').delete().eq('id', id); 
    },
    updateTeacherRole: async (p: TeacherRole) => { 
        const db_l = getLocalDB(); const idx = db_l.teacherRoles.findIndex((x:any)=>x.id===p.id); if(idx!==-1) db_l.teacherRoles[idx]=p; setLocalDB(db_l);
        if(supabase) await supabase.from('teacher_roles').update({name: p.name}).eq('id', p.id); return p; 
    },
    deleteTeacherRole: async (id: string) => { 
        const db_l = getLocalDB(); db_l.teacherRoles = db_l.teacherRoles.filter((x:any)=>x.id!==id); setLocalDB(db_l);
        if(supabase) await supabase.from('teacher_roles').delete().eq('id', id); 
    },
    updateProgram: async (p: Program) => { 
        const db_l = getLocalDB(); const idx = db_l.programs.findIndex((x:any)=>x.id===p.id); if(idx!==-1) db_l.programs[idx]=p; setLocalDB(db_l);
        if(supabase) await supabase.from('programs').update({name: p.name}).eq('id', p.id); return p; 
    },
    deleteProgram: async (id: string) => { 
        const db_l = getLocalDB(); db_l.programs = db_l.programs.filter((x:any)=>x.id!==id); setLocalDB(db_l);
        if(supabase) await supabase.from('programs').delete().eq('id', id); 
    },

    initializeDB
};
