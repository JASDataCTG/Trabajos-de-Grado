
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

const LOCAL_STORAGE_KEY = 'uninunez_db_v4_final';

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

const getLocalDB = (): any => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return initialDB;
    try {
        const parsed = JSON.parse(data);
        return { ...initialDB, ...parsed };
    } catch {
        return initialDB;
    }
};

const setLocalDB = (db: any) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
};

// --- Mapeos Estrictos según Esquema ER proporcionado ---
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
    presentation_grade_reviewer2: p.presentationGradeReviewer2
});

const mapProjectFromDB = (p: any): Project => ({
    id: p.id,
    title: p.title,
    presentationDate: p.presentation_date || p.presentationDate || '',
    filesUrl: p.files_url || p.filesUrl || '',
    statusId: p.status_id || p.statusId || '',
    formatId: p.format_id || p.formatId || '',
    isApprovedByDirector: p.is_approved_by_director ?? p.isApprovedByDirector ?? false,
    writtenGradeReviewer1: p.written_grade_reviewer1 ?? p.writtenGradeReviewer1 ?? null,
    presentationGradeReviewer1: p.presentation_grade_reviewer1 ?? p.presentationGradeReviewer1 ?? null,
    writtenGradeReviewer2: p.written_grade_reviewer2 ?? p.writtenGradeReviewer2 ?? null,
    presentationGradeReviewer2: p.presentation_grade_reviewer2 ?? p.presentationGradeReviewer2 ?? null
});

export const db = {
    initializeDB: async () => {
        const current = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!current) setLocalDB(initialDB);
    },

    checkConnection: async () => {
        if (!supabase) return true;
        try {
            const { error } = await supabase.from('users').select('id').limit(1);
            return !error;
        } catch {
            return false;
        }
    },

    // --- Lectura Inteligente (Merge Local + Cloud) ---
    getProjects: async () => {
        const local = getLocalDB().projects;
        if (supabase) {
            try {
                // Eliminado .order('created_at') porque no existe en el esquema del usuario
                const { data, error } = await supabase.from('projects').select('*');
                if (!error && data && data.length > 0) {
                    const cloudProjects = data.map(mapProjectFromDB);
                    const db_l = getLocalDB();
                    db_l.projects = cloudProjects;
                    setLocalDB(db_l);
                    return cloudProjects;
                }
            } catch (e) {
                console.warn("Supabase Fetch Error:", e);
            }
        }
        return local;
    },

    getUsers: async () => {
        if (supabase) {
            const { data } = await supabase.from('users').select('*');
            if (data && data.length > 0) {
                const users = data.map((u: any) => ({ ...u, teacherId: u.teacher_id, studentId: u.student_id }));
                const db_l = getLocalDB(); db_l.users = users; setLocalDB(db_l);
                return users;
            }
        }
        return getLocalDB().users;
    },

    getUserByUsername: async (username: string) => {
        const users = await db.getUsers();
        return users.find((u: User) => u.username.toLowerCase() === username.toLowerCase().trim()) || null;
    },

    getStudents: async () => {
        if (supabase) {
            const { data } = await supabase.from('students').select('*');
            if (data && data.length > 0) {
                const students = data.map((s: any) => ({ ...s, projectId: s.project_id, programId: s.program_id }));
                const db_l = getLocalDB(); db_l.students = students; setLocalDB(db_l);
                return students;
            }
        }
        return getLocalDB().students;
    },

    getTeachers: async () => {
        if (supabase) {
            const { data } = await supabase.from('teachers').select('*');
            if (data && data.length > 0) {
                const db_l = getLocalDB(); db_l.teachers = data; setLocalDB(db_l);
                return data;
            }
        }
        return getLocalDB().teachers;
    },

    getProjectTeachers: async () => {
        if (supabase) {
            const { data } = await supabase.from('project_teachers').select('*');
            if (data && data.length > 0) {
                const pts = data.map((pt: any) => ({ id: pt.id, projectId: pt.project_id, teacherId: pt.teacher_id, roleId: pt.role_id }));
                const db_l = getLocalDB(); db_l.projectTeachers = pts; setLocalDB(db_l);
                return pts;
            }
        }
        return getLocalDB().projectTeachers;
    },

    // --- Escritura Atómica ---
    addProject: async (project: Omit<Project, 'id'>) => {
        const id = generateId();
        const newProject = { ...project, id } as Project;
        const db_l = getLocalDB();
        db_l.projects.unshift(newProject);
        setLocalDB(db_l);

        if (supabase) await supabase.from('projects').insert([mapProjectToDB(newProject)]);
        return newProject;
    },

    updateProject: async (project: Project) => {
        const db_l = getLocalDB();
        const idx = db_l.projects.findIndex((p: any) => p.id === project.id);
        if (idx !== -1) {
            db_l.projects[idx] = project;
            setLocalDB(db_l);
        }
        if (supabase) await supabase.from('projects').update(mapProjectToDB(project)).eq('id', project.id);
        return project;
    },

    deleteProject: async (id: string) => {
        if (supabase) await supabase.from('projects').delete().eq('id', id);
        const db_l = getLocalDB();
        db_l.projects = db_l.projects.filter((p: any) => p.id !== id);
        setLocalDB(db_l);
    },

    addStudent: async (student: Omit<Student, 'id'>) => {
        const id = generateId();
        const newStudent = { ...student, id } as Student;
        const userId = generateId();

        if (supabase) {
            await supabase.from('students').insert([{ id, name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId }]);
            await supabase.from('users').insert([{ id: userId, username: student.name, password: student.cedula, role: 'student', student_id: id }]);
        }

        const db_l = getLocalDB();
        db_l.students.push(newStudent);
        db_l.users.push({ id: userId, username: student.name, password: student.cedula, role: 'student', studentId: id, teacherId: null });
        setLocalDB(db_l);
        return newStudent;
    },

    updateStudent: async (student: Student) => {
        if (supabase) {
            await supabase.from('students').update({ name: student.name, email: student.email, cedula: student.cedula, project_id: student.projectId, program_id: student.programId }).eq('id', student.id);
            await supabase.from('users').update({ username: student.name, password: student.cedula }).eq('student_id', student.id);
        }
        const db_l = getLocalDB();
        const idx = db_l.students.findIndex((s: any) => s.id === student.id);
        if (idx !== -1) {
            db_l.students[idx] = student;
            const uIdx = db_l.users.findIndex((u: any) => u.studentId === student.id);
            if (uIdx !== -1) {
                db_l.users[uIdx].username = student.name;
                db_l.users[uIdx].password = student.cedula;
            }
            setLocalDB(db_l);
        }
        return student;
    },

    addTeacher: async (teacher: Omit<Teacher, 'id'>) => {
        const id = generateId();
        const userId = generateId();
        if (supabase) {
            await supabase.from('teachers').insert([{ id, ...teacher }]);
            await supabase.from('users').insert([{ id: userId, username: teacher.name, password: teacher.cedula, role: 'teacher', teacher_id: id }]);
        }
        const db_l = getLocalDB();
        db_l.teachers.push({ id, ...teacher });
        db_l.users.push({ id: userId, username: teacher.name, password: teacher.cedula, role: 'teacher', teacherId: id, studentId: null });
        setLocalDB(db_l);
        return { id, ...teacher };
    },

    updateTeacher: async (teacher: Teacher) => {
        if (supabase) {
            await supabase.from('teachers').update(teacher).eq('id', teacher.id);
            await supabase.from('users').update({ username: teacher.name, password: teacher.cedula }).eq('teacher_id', teacher.id);
        }
        const db_l = getLocalDB();
        const idx = db_l.teachers.findIndex((t: any) => t.id === teacher.id);
        if (idx !== -1) {
            db_l.teachers[idx] = teacher;
            const uIdx = db_l.users.findIndex((u: any) => u.teacherId === teacher.id);
            if (uIdx !== -1) {
                db_l.users[uIdx].username = teacher.name;
                db_l.users[uIdx].password = teacher.cedula;
            }
            setLocalDB(db_l);
        }
        return teacher;
    },

    // --- Maestros y Configuraciones ---
    getStatuses: async () => getLocalDB().statuses,
    getFormats: async () => getLocalDB().formats,
    getTeacherRoles: async () => getLocalDB().teacherRoles,
    getPrograms: async () => getLocalDB().programs,

    addStatus: async (p: Omit<Status, 'id'>) => { const id=generateId(); if(supabase) await supabase.from('statuses').insert([{id, ...p}]); const db=getLocalDB(); db.statuses.push({id, ...p}); setLocalDB(db); return {id, ...p}; },
    addFormat: async (p: Omit<Format, 'id'>) => { const id=generateId(); if(supabase) await supabase.from('formats').insert([{id, ...p}]); const db=getLocalDB(); db.formats.push({id, ...p}); setLocalDB(db); return {id, ...p}; },
    addProgram: async (p: Omit<Program, 'id'>) => { const id=generateId(); if(supabase) await supabase.from('programs').insert([{id, ...p}]); const db=getLocalDB(); db.programs.push({id, ...p}); setLocalDB(db); return {id, ...p}; },
    addTeacherRole: async (p: Omit<TeacherRole, 'id'>) => { const id=generateId(); if(supabase) await supabase.from('teacher_roles').insert([{id, ...p}]); const db=getLocalDB(); db.teacherRoles.push({id, ...p}); setLocalDB(db); return {id, ...p}; },

    updateStatus: async (p: Status) => { if(supabase) await supabase.from('statuses').update({name: p.name}).eq('id', p.id); const db=getLocalDB(); const idx=db.statuses.findIndex((s:any)=>s.id===p.id); if(idx!==-1) db.statuses[idx]=p; setLocalDB(db); return p; },
    updateFormat: async (p: Format) => { if(supabase) await supabase.from('formats').update({name: p.name}).eq('id', p.id); const db=getLocalDB(); const idx=db.formats.findIndex((s:any)=>s.id===p.id); if(idx!==-1) db.formats[idx]=p; setLocalDB(db); return p; },
    updateTeacherRole: async (p: TeacherRole) => { if(supabase) await supabase.from('teacher_roles').update({name: p.name}).eq('id', p.id); const db=getLocalDB(); const idx=db.teacherRoles.findIndex((s:any)=>s.id===p.id); if(idx!==-1) db.teacherRoles[idx]=p; setLocalDB(db); return p; },
    updateProgram: async (p: Program) => { if(supabase) await supabase.from('programs').update({name: p.name}).eq('id', p.id); const db=getLocalDB(); const idx=db.programs.findIndex((s:any)=>s.id===p.id); if(idx!==-1) db.programs[idx]=p; setLocalDB(db); return p; },

    deleteStatus: async (id: string) => { if(supabase) await supabase.from('statuses').delete().eq('id', id); const db=getLocalDB(); db.statuses=db.statuses.filter((s:any)=>s.id!==id); setLocalDB(db); },
    deleteFormat: async (id: string) => { if(supabase) await supabase.from('formats').delete().eq('id', id); const db=getLocalDB(); db.formats=db.formats.filter((s:any)=>s.id!==id); setLocalDB(db); },
    deleteTeacherRole: async (id: string) => { if(supabase) await supabase.from('teacher_roles').delete().eq('id', id); const db=getLocalDB(); db.teacherRoles=db.teacherRoles.filter((s:any)=>s.id!==id); setLocalDB(db); },
    deleteProgram: async (id: string) => { if(supabase) await supabase.from('programs').delete().eq('id', id); const db=getLocalDB(); db.programs=db.programs.filter((s:any)=>s.id!==id); setLocalDB(db); },

    // --- Otros métodos auxiliares ---
    addProjectTeacher: async (pt: Omit<ProjectTeacher, 'id'>) => {
        const id = generateId();
        if (supabase) await supabase.from('project_teachers').insert([{ id, project_id: pt.projectId, teacher_id: pt.teacherId, role_id: pt.roleId }]);
        const db_l = getLocalDB();
        db_l.projectTeachers.push({ ...pt, id });
        setLocalDB(db_l);
        return { ...pt, id };
    },
    deleteProjectTeachersByProject: async (projectId: string) => {
        if (supabase) await supabase.from('project_teachers').delete().eq('project_id', projectId);
        const db_l = getLocalDB();
        db_l.projectTeachers = db_l.projectTeachers.filter((pt: any) => pt.projectId !== projectId);
        setLocalDB(db_l);
    },
    deleteStudent: async (id: string) => { if (supabase) { await supabase.from('users').delete().eq('student_id', id); await supabase.from('students').delete().eq('id', id); } const db=getLocalDB(); db.students=db.students.filter((s:any)=>s.id!==id); db.users=db.users.filter((u:any)=>u.studentId!==id); setLocalDB(db); },
    deleteTeacher: async (id: string) => { if (supabase) { await supabase.from('users').delete().eq('teacher_id', id); await supabase.from('teachers').delete().eq('id', id); } const db=getLocalDB(); db.teachers=db.teachers.filter((t:any)=>t.id!==id); db.users=db.users.filter((u:any)=>u.teacherId!==id); setLocalDB(db); },
    deleteUser: async (id: string) => { if (supabase) await supabase.from('users').delete().eq('id', id); const db=getLocalDB(); db.users=db.users.filter((u:any)=>u.id!==id); setLocalDB(db); },
    getProjectById: async (id: string) => (await db.getProjects()).find(p => p.id === id) || null,
    getStudentById: async (id: string) => (await db.getStudents()).find(s => s.id === id) || null,
};
