
import { createClient } from '@supabase/supabase-js';
import { Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program, User, Faculty, ProjectFormatHistory } from '../types';
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
    try {
        let { data, error } = await supabase.from(table).select('*').order('name', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`Error fetchCatalog ${table}:`, e);
        return [];
    }
}

const isEmptySecret = (val: unknown): boolean => {
    if (val === null || val === undefined) return true;
    const str = String(val).trim();
    return str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined';
};

const normalizeDocument = (val: unknown): string => {
    if (isEmptySecret(val)) return '';
    return String(val).replace(/[\s.,\-]/g, '').trim();
};

const isDocumentLike = (val: string): boolean => {
    const trimmed = val.trim();
    return trimmed.length > 0 && /^[\d\s.,\-]+$/.test(trimmed);
};

const secretMatches = (expected: unknown, provided: string): boolean => {
    if (isEmptySecret(expected)) return false;
    const expStr = String(expected).trim();
    const provStr = String(provided).trim();
    if (!expStr || !provStr) return false;
    if (expStr === provStr) return true;
    if (isDocumentLike(expStr) && isDocumentLike(provStr)) {
        const normExp = normalizeDocument(expStr);
        const normProv = normalizeDocument(provStr);
        return normExp.length > 0 && normExp === normProv;
    }
    return false;
};

const normalizeTextKey = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim().replace(/\s+/g, ' ').toLowerCase();
};

const isMissingPasswordColumnError = (error: any): boolean => {
    if (!error) return false;
    const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
    return error.code === 'PGRST204' || error.code === '42703' || (msg.includes('password') && (msg.includes('column') || msg.includes('schema')));
};

async function findTeacherUserRows(teacher: { id: string; name?: string; email?: string; cedula?: string }) {
    if (!supabase) return [];
    const { data: allUsers } = await supabase.from('users').select('*');
    if (!allUsers || allUsers.length === 0) return [];

    const byTeacherId = allUsers.filter((u: any) => u.teacher_id === teacher.id);
    if (byTeacherId.length > 0) return byTeacherId;

    const nameKey = normalizeTextKey(teacher.name);
    const emailKey = normalizeTextKey(teacher.email);
    const cedulaNorm = normalizeDocument(teacher.cedula);

    return allUsers.filter((u: any) => {
        if (u.role === 'admin') return false;
        const uKey = normalizeTextKey(u.username);
        const uDoc = normalizeDocument(u.username);
        return (
            (nameKey !== '' && uKey === nameKey) ||
            (emailKey !== '' && uKey === emailKey) ||
            (cedulaNorm !== '' && uDoc === cedulaNorm)
        );
    });
}

export const db = {
    initializeDB: async function() {
        if (!supabase) return;
        try {
            await supabase!.from('statuses').select('id', { count: 'exact', head: true });
        } catch (e) { console.error("DB Init Error:", e); }
    },

    checkConnection: async function() {
        if (!supabase) return false;
        try {
            const { error } = await supabase.from('statuses').select('id').limit(1);
            return !error;
        } catch { return false; }
    },

    async getProjectContext(projectId: string) {
        const [allStudents, allPT, allTeachers, allRoles] = await Promise.all([
            this.getStudents(),
            this.getProjectTeachers(),
            this.getTeachers(),
            this.getTeacherRoles()
        ]);
        
        const projectStudents = allStudents.filter(s => s.projectId === projectId);
        const ptForProject = allPT.filter(pt => pt.projectId === projectId);
        
        const teachersWithRoles = ptForProject.map(pt => ({
            teacher: allTeachers.find(t => t.id === pt.teacherId)!,
            role: allRoles.find(r => r.id === pt.roleId)!
        })).filter(item => item.teacher && item.role);

        return { students: projectStudents, teachers: teachersWithRoles };
    },

    getProjects: async function(): Promise<Project[]> {
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

    getProjectById: async function(id: string): Promise<Project | null> {
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

    addProject: async function(p: Omit<Project, 'id'>) {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const { error } = await supabase.from('projects').insert([{ 
            id, title: p.title, presentation_date: p.presentationDate, files_url: p.filesUrl, 
            status_id: p.statusId, format_id: p.formatId, program_id: p.programId
        }]);
        if (error) throw error;
        return { ...p, id } as Project;
    },

    updateProject: async function(p: Project) {
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
            this.getProjectContext(p.id).then(async context => {
                const statuses = await this.getStatuses();
                const statusName = statuses.find(s => s.id === p.statusId)?.name;
                notificationService.notifyProjectChange(
                    oldProject.final_grade !== p.finalGrade ? 'grade' : 'update',
                    p, context.students, context.teachers, statusName
                );
            });
        }
        return p;
    },

    deleteProject: async function(id: string) {
        if (!supabase) return;
        const context = await this.getProjectContext(id);
        const { data: project } = await supabase.from('projects').select('*').eq('id', id).single();
        await supabase.from('project_teachers').delete().eq('project_id', id);
        await supabase.from('students').update({ project_id: null }).eq('project_id', id);
        await supabase.from('projects').delete().eq('id', id);
        if (project) {
            notificationService.notifyProjectChange('delete', project as any, context.students, context.teachers);
        }
    },

    getStudents: async function(): Promise<Student[]> {
        if (!supabase) return [];
        const { data } = await supabase.from('students').select('*').order('name', { ascending: true });
        return (data || []).map((s: any) => ({ id: s.id, name: s.name, email: s.email, cedula: s.cedula !== null && s.cedula !== undefined ? String(s.cedula).trim() : '', projectId: s.project_id, programId: s.program_id, password: s.password }));
    },
    
    getStudentById: async function(id: string): Promise<Student | null> {
        if (!supabase) return null;
        const { data } = await supabase.from('students').select('*').eq('id', id).maybeSingle();
        if (!data) return null;
        return { id: data.id, name: data.name, email: data.email, cedula: data.cedula !== null && data.cedula !== undefined ? String(data.cedula).trim() : '', projectId: data.project_id, programId: data.program_id, password: data.password };
    },
    
    addStudent: async function(s: Omit<Student, 'id'>) {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const cleanName = String(s.name || '').trim();
        const cleanEmail = String(s.email || '').trim();
        const cleanCedula = String(s.cedula || '').trim();
        const password = !isEmptySecret(s.password) ? String(s.password).trim() : cleanCedula;

        let { error } = await supabase.from('students').insert([{ id, name: cleanName, email: cleanEmail, cedula: cleanCedula, program_id: s.programId, password }]);
        if (isMissingPasswordColumnError(error)) {
            const retry = await supabase.from('students').insert([{ id, name: cleanName, email: cleanEmail, cedula: cleanCedula, program_id: s.programId }]);
            error = retry.error;
        }
        if (error) throw error;

        await supabase.from('users').insert([{ id: generateId(), username: cleanName, password, role: 'student', student_id: id }]);
        return { ...s, id, name: cleanName, email: cleanEmail, cedula: cleanCedula } as Student;
    },
    
    updateStudent: async function(s: Student) {
        if (!supabase) throw new Error("Supabase no configurado");
        const cleanName = String(s.name || '').trim();
        const cleanEmail = String(s.email || '').trim();
        const cleanCedula = String(s.cedula || '').trim();

        let { error } = await supabase.from('students').update({ name: cleanName, email: cleanEmail, cedula: cleanCedula, program_id: s.programId, project_id: s.projectId, password: s.password }).eq('id', s.id);
        if (isMissingPasswordColumnError(error)) {
            const retry = await supabase.from('students').update({ name: cleanName, email: cleanEmail, cedula: cleanCedula, program_id: s.programId, project_id: s.projectId }).eq('id', s.id);
            error = retry.error;
        }
        if (error) throw error;

        if (!isEmptySecret(s.password)) {
            await supabase.from('users').update({ username: cleanName, password: String(s.password).trim() }).eq('student_id', s.id);
        }
        return s;
    },

    getTeachers: async function(): Promise<Teacher[]> {
        if (!supabase) return [];
        const { data } = await supabase.from('teachers').select('*').order('name', { ascending: true });
        return (data || []).map((t: any) => ({
            ...t,
            name: t.name !== null && t.name !== undefined ? String(t.name) : '',
            email: t.email !== null && t.email !== undefined ? String(t.email) : '',
            cedula: t.cedula !== null && t.cedula !== undefined ? String(t.cedula).trim() : '',
        }));
    },
    
    getTeacherById: async function(id: string): Promise<Teacher | null> {
        if (!supabase) return null;
        const { data } = await supabase.from('teachers').select('*').eq('id', id).maybeSingle();
        if (!data) return null;
        return {
            ...data,
            name: data.name !== null && data.name !== undefined ? String(data.name) : '',
            email: data.email !== null && data.email !== undefined ? String(data.email) : '',
            cedula: data.cedula !== null && data.cedula !== undefined ? String(data.cedula).trim() : '',
        };
    },
    
    addTeacher: async function(t: Omit<Teacher, 'id'>) {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const cleanName = String(t.name || '').trim();
        const cleanEmail = String(t.email || '').trim();
        const cleanCedula = String(t.cedula || '').trim();
        const effectivePassword = !isEmptySecret(t.password) ? String(t.password).trim() : cleanCedula;

        let { error: teacherError } = await supabase
            .from('teachers')
            .insert([{ id, name: cleanName, email: cleanEmail, cedula: cleanCedula, password: effectivePassword }]);

        if (isMissingPasswordColumnError(teacherError)) {
            const retry = await supabase
                .from('teachers')
                .insert([{ id, name: cleanName, email: cleanEmail, cedula: cleanCedula }]);
            teacherError = retry.error;
        }
        if (teacherError) throw teacherError;

        const existingUsers = await findTeacherUserRows({ id, name: cleanName, email: cleanEmail, cedula: cleanCedula });
        if (existingUsers.length > 0) {
            await supabase
                .from('users')
                .update({ username: cleanName, password: effectivePassword, role: 'teacher', teacher_id: id })
                .eq('id', existingUsers[0].id);
        } else {
            await supabase
                .from('users')
                .insert([{ id: generateId(), username: cleanName, password: effectivePassword, role: 'teacher', teacher_id: id }]);
        }

        return { ...t, id, name: cleanName, email: cleanEmail, cedula: cleanCedula, password: effectivePassword } as Teacher;
    },
    
    updateTeacher: async function(t: Teacher, options?: { resetPasswordToCedula?: boolean }) {
        if (!supabase) throw new Error("Supabase no configurado");
        const cleanName = String(t.name || '').trim();
        const cleanEmail = String(t.email || '').trim();
        const cleanCedula = String(t.cedula || '').trim();

        const { data: prevTeacher } = await supabase
            .from('teachers')
            .select('*')
            .eq('id', t.id)
            .maybeSingle();

        const existingUsers = await findTeacherUserRows({
            id: t.id,
            name: prevTeacher?.name || cleanName,
            email: prevTeacher?.email || cleanEmail,
            cedula: prevTeacher?.cedula || cleanCedula
        });
        const existingUser = existingUsers[0] || null;

        const prevCedula = String(prevTeacher?.cedula ?? '').trim();
        const prevPass = !isEmptySecret(existingUser?.password)
            ? String(existingUser.password).trim()
            : (!isEmptySecret(prevTeacher?.password) ? String(prevTeacher.password).trim() : '');

        const shouldSyncToCedula =
            !!options?.resetPasswordToCedula ||
            !prevPass ||
            secretMatches(prevPass, prevCedula);

        const effectivePassword = shouldSyncToCedula ? cleanCedula : prevPass;

        let { error: teacherError } = await supabase
            .from('teachers')
            .update({ name: cleanName, email: cleanEmail, cedula: cleanCedula, password: effectivePassword })
            .eq('id', t.id);

        if (isMissingPasswordColumnError(teacherError)) {
            const retry = await supabase
                .from('teachers')
                .update({ name: cleanName, email: cleanEmail, cedula: cleanCedula })
                .eq('id', t.id);
            teacherError = retry.error;
        }
        if (teacherError) throw teacherError;

        if (existingUser) {
            await supabase
                .from('users')
                .update({ username: cleanName, password: effectivePassword, role: 'teacher', teacher_id: t.id })
                .eq('id', existingUser.id);
        } else {
            await supabase
                .from('users')
                .insert([{ id: generateId(), username: cleanName, password: effectivePassword, role: 'teacher', teacher_id: t.id }]);
        }

        return { ...t, name: cleanName, email: cleanEmail, cedula: cleanCedula, password: effectivePassword };
    },
    
    updateTeacherPassword: async function(id: string, newPassword: string) {
        if (!supabase) return;
        const cleanPass = String(newPassword).trim();
        const teacher = await this.getTeacherById(id);

        const { error: teacherErr } = await supabase
            .from('teachers')
            .update({ password: cleanPass })
            .eq('id', id);
        if (teacherErr && !isMissingPasswordColumnError(teacherErr)) {
            throw teacherErr;
        }

        const existingUsers = await findTeacherUserRows({
            id,
            name: teacher?.name,
            email: teacher?.email,
            cedula: teacher?.cedula
        });

        if (existingUsers.length > 0) {
            const { error: userErr } = await supabase
                .from('users')
                .update({ password: cleanPass, teacher_id: id, ...(teacher?.name ? { username: teacher.name.trim() } : {}) })
                .eq('id', existingUsers[0].id);
            if (userErr) throw userErr;
        } else if (teacher) {
            const { error: insertErr } = await supabase
                .from('users')
                .insert([{ id: generateId(), username: teacher.name.trim(), password: cleanPass, role: 'teacher', teacher_id: id }]);
            if (insertErr) throw insertErr;
        }
    },
    
    updateStudentPassword: async function(id: string, newPassword: string) {
        if (!supabase) return;
        const cleanPass = String(newPassword).trim();
        const { error: studentErr } = await supabase.from('students').update({ password: cleanPass }).eq('id', id);
        if (studentErr && !isMissingPasswordColumnError(studentErr)) {
            throw studentErr;
        }
        await supabase.from('users').update({ password: cleanPass }).eq('student_id', id);
    },
    
    deleteTeacher: async function(id: string) {
        if (!supabase) return;
        await supabase.from('users').delete().eq('teacher_id', id);
        await supabase.from('teachers').delete().eq('id', id);
    },

    authenticateTeacherById: async function(teacherId: string, rawPassword: string): Promise<User | null> {
        if (!supabase || !teacherId || !rawPassword) return null;

        const { data: rawTeacher } = await supabase
            .from('teachers')
            .select('*')
            .eq('id', teacherId)
            .maybeSingle();

        if (!rawTeacher) return null;

        const teacherName = String(rawTeacher.name ?? '').trim();
        const teacherEmail = String(rawTeacher.email ?? '').trim();
        const teacherCedula = String(rawTeacher.cedula ?? '').trim();
        const hasPasswordColumn = 'password' in rawTeacher;
        const teacherPassword = hasPasswordColumn && !isEmptySecret(rawTeacher.password)
            ? String(rawTeacher.password).trim()
            : '';

        const matchedUserRows = await findTeacherUserRows({
            id: rawTeacher.id,
            name: teacherName,
            email: teacherEmail,
            cedula: teacherCedula
        });

        const validUserRow = matchedUserRows.find((u: any) => secretMatches(u.password, rawPassword));
        const matchesTeacherPassword = teacherPassword !== '' && secretMatches(teacherPassword, rawPassword);

        const hasCustomTeacherPassword =
            teacherPassword !== '' &&
            !secretMatches(teacherPassword, teacherCedula);

        const existingUserWithPass = matchedUserRows.find((u: any) => !isEmptySecret(u.password));
        const hasCustomUserOnlyPassword =
            !hasPasswordColumn &&
            !!existingUserWithPass &&
            !isDocumentLike(String(existingUserWithPass.password)) &&
            !secretMatches(existingUserWithPass.password, teacherCedula);

        const canUseCedula = !hasCustomTeacherPassword && !hasCustomUserOnlyPassword;
        const matchesCedula = canUseCedula && secretMatches(teacherCedula, rawPassword);

        if (!validUserRow && !matchesTeacherPassword && !matchesCedula) {
            return null;
        }

        const primaryUser = validUserRow || matchedUserRows[0] || null;
        const syncedPassword = validUserRow
            ? String(validUserRow.password).trim()
            : (matchesTeacherPassword ? teacherPassword : teacherCedula);

        const userId = primaryUser?.id || generateId();

        try {
            if (primaryUser) {
                const needsSync =
                    primaryUser.teacher_id !== rawTeacher.id ||
                    normalizeTextKey(primaryUser.username) !== normalizeTextKey(teacherName) ||
                    isEmptySecret(primaryUser.password) ||
                    (matchesCedula && !secretMatches(primaryUser.password, syncedPassword));

                if (needsSync) {
                    await supabase
                        .from('users')
                        .update({
                            username: teacherName,
                            password: syncedPassword,
                            role: 'teacher',
                            teacher_id: rawTeacher.id
                        })
                        .eq('id', primaryUser.id);
                }
            } else {
                await supabase
                    .from('users')
                    .insert([{
                        id: userId,
                        username: teacherName,
                        password: syncedPassword,
                        role: 'teacher',
                        teacher_id: rawTeacher.id
                    }]);
            }
        } catch (syncErr) {
            console.warn('Error sincronizando usuario docente al iniciar sesión:', syncErr);
        }

        return {
            id: userId,
            username: teacherName,
            password: '',
            role: 'teacher',
            teacherId: rawTeacher.id,
            studentId: null
        };
    },

    authenticateUser: async function(identifier: string, password: string): Promise<User | null> {
        if (!supabase) return null;
        const rawIdentifier = String(identifier || '').trim();
        const rawPassword = String(password || '').trim();
        if (!rawIdentifier || !rawPassword) return null;

        if (rawIdentifier.startsWith('teacher:')) {
            const teacherId = rawIdentifier.slice('teacher:'.length).trim();
            return await this.authenticateTeacherById(teacherId, rawPassword);
        }

        const { data: allUsers } = await supabase.from('users').select('*');
        const usersList = allUsers || [];
        const idKey = normalizeTextKey(rawIdentifier);

        if (idKey === 'admin') {
            const adminMatch = usersList.find((u: any) =>
                (u.role === 'admin' || normalizeTextKey(u.username) === 'admin') &&
                !isEmptySecret(u.password) &&
                String(u.password).trim() === rawPassword
            );
            if (!adminMatch) return null;
            return {
                id: adminMatch.id,
                username: adminMatch.username,
                password: '',
                role: adminMatch.role,
                teacherId: adminMatch.teacher_id || null,
                studentId: adminMatch.student_id || null
            };
        }

        const teachers = await this.getTeachers();
        const idDoc = normalizeDocument(rawIdentifier);
        const matchedTeacher = teachers.find(t =>
            normalizeTextKey(t.name) === idKey ||
            (t.email && normalizeTextKey(t.email) === idKey) ||
            (idDoc !== '' && normalizeDocument(t.cedula) === idDoc)
        );
        if (matchedTeacher) {
            return await this.authenticateTeacherById(matchedTeacher.id, rawPassword);
        }

        const matchedUser = usersList.find((u: any) =>
            normalizeTextKey(u.username) === idKey &&
            secretMatches(u.password, rawPassword)
        );
        if (!matchedUser) return null;

        return {
            id: matchedUser.id,
            username: matchedUser.username,
            password: '',
            role: matchedUser.role,
            teacherId: matchedUser.teacher_id || null,
            studentId: matchedUser.student_id || null
        };
    },

    getUserByUsername: async function(username: string): Promise<User | null> {
        if (!supabase) return null;
        const targetKey = normalizeTextKey(username);
        if (!targetKey) return null;
        const { data } = await supabase.from('users').select('*');
        const found = (data || []).find((u: any) => normalizeTextKey(u.username) === targetKey);
        return found ? { ...found, teacherId: found.teacher_id, studentId: found.student_id } : null;
    },
    
    getUsers: async function(): Promise<User[]> {
        if (!supabase) return [];
        const { data } = await supabase.from('users').select('*');
        return (data || []).map((u: any) => ({ ...u, teacherId: u.teacher_id, studentId: u.student_id }));
    },
    
    deleteUser: async function(id: string) {
        if (supabase) await supabase.from('users').delete().eq('id', id);
    },

    getProjectTeachers: async function(): Promise<ProjectTeacher[]> {
        if (!supabase) return [];
        const { data } = await supabase.from('project_teachers').select('*');
        return (data || []).map((pt: any) => ({ id: pt.id, projectId: pt.project_id, teacherId: pt.teacher_id, roleId: pt.role_id }));
    },
    
    addProjectTeacher: async function(pt: Omit<ProjectTeacher, "id">) {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        await supabase.from('project_teachers').insert([{ id, project_id: pt.projectId, teacher_id: pt.teacherId, role_id: pt.roleId }]);
        return { ...pt, id };
    },
    
    deleteProjectTeachersByProject: async function(projectId: string) {
        if (supabase) await supabase.from('project_teachers').delete().eq('project_id', projectId);
    },

    getStatuses: async function() { return await fetchCatalog('statuses'); },
    getFormats: async function() { return await fetchCatalog('formats'); },
    getTeacherRoles: async function() { return await fetchCatalog('teacher_roles'); },
    getFaculties: async function() { return await fetchCatalog('faculties'); },
    getPrograms: async function() { return (await fetchCatalog('programs')).map((p: any) => ({ id: p.id, name: p.name, facultyId: p.faculty_id })); },
    
    addFaculty: async function(f: any) { 
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId(); 
        const { error } = await supabase.from('faculties').insert([{ id, name: f.name }]); 
        if (error) throw error;
        return { id, ...f }; 
    },
    addProgram: async function(p: any) { 
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId(); 
        const { error } = await supabase.from('programs').insert([{ id, name: p.name, faculty_id: p.facultyId }]); 
        if (error) throw error;
        return { id, ...p }; 
    },
    addStatus: async function(p: any) { 
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId(); 
        const { error } = await supabase.from('statuses').insert([{ id, name: p.name }]); 
        if (error) throw error;
        return { ...p, id }; 
    },
    addFormat: async function(p: any) { 
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId(); 
        const { error } = await supabase.from('formats').insert([{ id, name: p.name }]); 
        if (error) throw error;
        return { ...p, id }; 
    },
    addTeacherRole: async function(p: any) { 
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId(); 
        const { error } = await supabase.from('teacher_roles').insert([{ id, name: p.name }]); 
        if (error) throw error;
        return { ...p, id }; 
    },
    
    updateFaculty: async function(f: any) { 
        if (!supabase) throw new Error("Supabase no configurado");
        const { error } = await supabase.from('faculties').update({ name: f.name }).eq('id', f.id); 
        if (error) throw error;
        return f; 
    },
    updateProgram: async function(p: any) { 
        if (!supabase) throw new Error("Supabase no configurado");
        const { error } = await supabase.from('programs').update({ name: p.name, faculty_id: p.facultyId }).eq('id', p.id); 
        if (error) throw error;
        return p; 
    },
    updateStatus: async function(p: any) { 
        if (!supabase) throw new Error("Supabase no configurado");
        const { error } = await supabase.from('statuses').update({ name: p.name }).eq('id', p.id); 
        if (error) throw error;
        return p; 
    },
    updateFormat: async function(p: any) { 
        if (!supabase) throw new Error("Supabase no configurado");
        const { error } = await supabase.from('formats').update({ name: p.name }).eq('id', p.id); 
        if (error) throw error;
        return p; 
    },
    updateTeacherRole: async function(p: any) { 
        if (!supabase) throw new Error("Supabase no configurado");
        const { error } = await supabase.from('teacher_roles').update({ name: p.name }).eq('id', p.id); 
        if (error) throw error;
        return p; 
    },
    
    deleteFaculty: async function(id: string) { if (supabase) await supabase.from('faculties').delete().eq('id', id); },
    deleteProgram: async function(id: string) { if (supabase) await supabase.from('programs').delete().eq('id', id); },
    deleteStudent: async function(id: string) { if (supabase) { await supabase.from('users').delete().eq('student_id', id); await supabase.from('students').delete().eq('id', id); } },
    deleteStatus: async function(id: string) { if (supabase) await supabase.from('statuses').delete().eq('id', id); },
    deleteFormat: async function(id: string) { if (supabase) await supabase.from('formats').delete().eq('id', id); },
    deleteTeacherRole: async function(id: string) { if (supabase) await supabase.from('teacher_roles').delete().eq('id', id); },

    // --- HISTORIAL DE FORMATOS PRESENTADOS ---
    getProjectFormatHistory: async function(projectId: string): Promise<ProjectFormatHistory[]> {
        const localHistory = this.getFormatHistoriesLocal();
        const filtered = localHistory.filter(h => h.projectId === projectId);
        
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('project_format_history')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: true });
                if (!error && data && data.length > 0) {
                    return data.map((d: any) => ({
                        id: d.id,
                        projectId: d.project_id || d.projectId,
                        formatId: d.format_id || d.formatId,
                        statusId: d.status_id || d.statusId,
                        presentationDate: d.presentation_date || d.presentationDate,
                        filesUrl: d.files_url || d.filesUrl,
                        writtenGradeReviewer1: d.written_grade_reviewer1 !== undefined ? d.written_grade_reviewer1 : d.writtenGradeReviewer1,
                        presentationGradeReviewer1: d.presentation_grade_reviewer1 !== undefined ? d.presentation_grade_reviewer1 : d.presentationGradeReviewer1,
                        writtenGradeReviewer2: d.written_grade_reviewer2 !== undefined ? d.written_grade_reviewer2 : d.writtenGradeReviewer2,
                        presentationGradeReviewer2: d.presentation_grade_reviewer2 !== undefined ? d.presentation_grade_reviewer2 : d.presentationGradeReviewer2,
                        finalGrade: d.final_grade !== undefined ? d.final_grade : d.finalGrade,
                        createdAt: d.created_at || d.createdAt
                    }));
                }
            } catch (err) {
                console.warn("Error consultando project_format_history en Supabase, usando local:", err);
            }
        }
        return filtered.sort((a, b) => new Date(a.presentationDate).getTime() - new Date(b.presentationDate).getTime());
    },

    getFormatHistoriesLocal: function(): ProjectFormatHistory[] {
        try {
            const data = localStorage.getItem('uninunez_format_histories');
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    saveProjectFormatHistoryEntry: async function(entry: ProjectFormatHistory): Promise<ProjectFormatHistory> {
        const localHistory = this.getFormatHistoriesLocal();
        const idx = localHistory.findIndex(h => h.id === entry.id);
        if (idx !== -1) {
            localHistory[idx] = entry;
        } else {
            localHistory.push(entry);
        }
        localStorage.setItem('uninunez_format_histories', JSON.stringify(localHistory));

        if (supabase) {
            try {
                const dbEntry = {
                    id: entry.id,
                    project_id: entry.projectId,
                    format_id: entry.formatId,
                    status_id: entry.statusId,
                    presentation_date: entry.presentationDate,
                    files_url: entry.filesUrl,
                    written_grade_reviewer1: entry.writtenGradeReviewer1,
                    presentation_grade_reviewer1: entry.presentationGradeReviewer1,
                    written_grade_reviewer2: entry.writtenGradeReviewer2,
                    presentation_grade_reviewer2: entry.presentationGradeReviewer2,
                    final_grade: entry.finalGrade,
                    created_at: entry.createdAt || new Date().toISOString()
                };
                await supabase.from('project_format_history').upsert([dbEntry]);
            } catch (err) {
                console.warn("No se pudo upsertar en project_format_history de Supabase:", err);
            }
        }
        return entry;
    },

    deleteProjectFormatHistoryEntry: async function(id: string): Promise<void> {
        const localHistory = this.getFormatHistoriesLocal();
        const filtered = localHistory.filter(h => h.id !== id);
        localStorage.setItem('uninunez_format_histories', JSON.stringify(filtered));

        if (supabase) {
            try {
                await supabase.from('project_format_history').delete().eq('id', id);
            } catch (err) {
                console.warn("No se pudo borrar en project_format_history de Supabase:", err);
            }
        }
    }
};
