
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

export type AuthFailureReason = 'invalid_credentials' | 'missing_cedula' | 'not_found' | 'offline';

export interface AuthResult {
    user: User | null;
    reason?: AuthFailureReason;
}

const cleanInvisibleChars = (val: string): string =>
    val
        .normalize('NFKC')
        .replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\u00A0]/g, '')
        .replace(/[\u2010-\u2015\u2212]/g, '-');

const isEmptySecret = (val: unknown): boolean => {
    if (val === null || val === undefined) return true;
    const str = cleanInvisibleChars(String(val)).trim();
    return str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined';
};

const extractDocumentDigits = (val: unknown, allowEmbeddedDigits = false): string => {
    if (isEmptySecret(val)) return '';
    let str = cleanInvisibleChars(String(val)).trim();
    // Strip float export suffix like "3907877.0" or "3907877.00" (preserves thousands ".000")
    str = str.replace(/^(\d+)[.,]0{1,2}$/, '$1');
    // Strip one or more common document prefixes like CC, C.C., No., Cédula, Doc., #
    str = str.replace(/^(?:(?:c\.?\s*c\.?|c\.?\s*e\.?|t\.?\s*i\.?|p\.?\s*a\.?|n\.?\s*i\.?\s*t\.?|c[eé]dula|doc(?:umento)?|no\.?|n[°º]|#)\s*[:.\-\s]*)+/i, '');
    // Strip trailing expedition notes like "de Cartagena" or "(Cartagena)"
    str = str.replace(/\s+(?:de\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+|\([^)]*\))$/i, '').trim();

    if (/^[\d\s.,'’\-]+$/.test(str)) {
        return str.replace(/\D/g, '');
    }
    if (allowEmbeddedDigits) {
        const digits = str.replace(/\D/g, '');
        if (digits.length >= 5) return digits;
    }
    return '';
};

const normalizeDocument = (val: unknown): string => extractDocumentDigits(val, true);

const secretMatches = (expected: unknown, provided: string, treatExpectedAsDocument = false): boolean => {
    if (isEmptySecret(expected)) return false;
    const expStr = cleanInvisibleChars(String(expected)).trim();
    const provStr = cleanInvisibleChars(String(provided)).trim();
    if (!expStr || !provStr) return false;
    if (expStr === provStr) return true;

    const expDigits = extractDocumentDigits(expStr, treatExpectedAsDocument);
    const provDigits = extractDocumentDigits(provStr, false);
    if (expDigits.length > 0 && provDigits.length > 0) {
        if (expDigits === provDigits) return true;
        const expNoZero = expDigits.replace(/^0+/, '');
        const provNoZero = provDigits.replace(/^0+/, '');
        if (expNoZero.length >= 5 && expNoZero === provNoZero) return true;
    }
    return false;
};

const normalizeTextKey = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    return cleanInvisibleChars(String(val)).trim().replace(/\s+/g, ' ').toLowerCase();
};

const isMissingPasswordColumnError = (error: any): boolean => {
    if (!error) return false;
    const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
    return error.code === 'PGRST204' || error.code === '42703' || (msg.includes('password') && (msg.includes('column') || msg.includes('schema')));
};

async function findTeacherUserRows(teacher: { id: string; name?: string; email?: string; cedula?: string }) {
    if (!supabase) return [];

    // 1. Direct query by teacher_id (avoids PostgREST 1000-row cap on large users tables)
    const { data: directById } = await supabase
        .from('users')
        .select('*')
        .eq('teacher_id', teacher.id);
    if (directById && directById.length > 0) return directById;

    // 2. Scoped query of teacher-role users
    const { data: teacherUsers } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher');

    const nameKey = normalizeTextKey(teacher.name);
    const emailKey = normalizeTextKey(teacher.email);
    const cedulaNorm = normalizeDocument(teacher.cedula);

    const filterCandidates = (rows: any[]) =>
        rows.filter((u: any) => {
            if (u.role === 'admin') return false;
            const uKey = normalizeTextKey(u.username);
            const uDoc = normalizeDocument(u.username);
            return (
                (nameKey !== '' && uKey === nameKey) ||
                (emailKey !== '' && uKey === emailKey) ||
                (cedulaNorm !== '' && uDoc === cedulaNorm)
            );
        });

    const fromTeacherRole = filterCandidates(teacherUsers || []);
    if (fromTeacherRole.length > 0) return fromTeacherRole;

    // 3. Fallback exact username lookup (for legacy rows with unexpected role casing)
    const cleanName = cleanInvisibleChars(String(teacher.name || '')).trim();
    if (cleanName) {
        const { data: byName } = await supabase
            .from('users')
            .select('*')
            .eq('username', cleanName);
        const filtered = filterCandidates(byName || []);
        if (filtered.length > 0) return filtered;
    }

    return [];
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
        const toNumOrNull = (val: unknown): number | null => {
            if (val === null || val === undefined || val === '') return null;
            const n = Number(val);
            return Number.isFinite(n) ? n : null;
        };
        return (data || []).map(p => ({
            id: p.id, title: p.title, presentationDate: p.presentation_date, filesUrl: p.files_url,
            statusId: p.status_id, formatId: p.format_id, programId: p.program_id,
            isApprovedByDirector: p.is_approved_by_director,
            finalGrade: toNumOrNull(p.final_grade),
            writtenGradeReviewer1: toNumOrNull(p.written_grade_reviewer1),
            presentationGradeReviewer1: toNumOrNull(p.presentation_grade_reviewer1),
            writtenGradeReviewer2: toNumOrNull(p.written_grade_reviewer2),
            presentationGradeReviewer2: toNumOrNull(p.presentation_grade_reviewer2)
        }));
    },

    getProjectById: async function(id: string): Promise<Project | null> {
        if (!supabase) return null;
        const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
        if (error || !data) return null;
        const toNumOrNull = (val: unknown): number | null => {
            if (val === null || val === undefined || val === '') return null;
            const n = Number(val);
            return Number.isFinite(n) ? n : null;
        };
        return {
            id: data.id, title: data.title, presentationDate: data.presentation_date, filesUrl: data.files_url,
            statusId: data.status_id, formatId: data.format_id, programId: data.program_id,
            isApprovedByDirector: data.is_approved_by_director,
            finalGrade: toNumOrNull(data.final_grade),
            writtenGradeReviewer1: toNumOrNull(data.written_grade_reviewer1),
            presentationGradeReviewer1: toNumOrNull(data.presentation_grade_reviewer1),
            writtenGradeReviewer2: toNumOrNull(data.written_grade_reviewer2),
            presentationGradeReviewer2: toNumOrNull(data.presentation_grade_reviewer2)
        };
    },

    addProject: async function(p: Omit<Project, 'id'>) {
        if (!supabase) throw new Error("Supabase no configurado");
        const id = generateId();
        const { error } = await supabase.from('projects').insert([{ 
            id, title: p.title, presentation_date: p.presentationDate, files_url: p.filesUrl, 
            status_id: p.statusId, format_id: p.formatId, program_id: p.programId,
            final_grade: p.finalGrade ?? null,
            written_grade_reviewer1: p.writtenGradeReviewer1 ?? null,
            presentation_grade_reviewer1: p.presentationGradeReviewer1 ?? null,
            written_grade_reviewer2: p.writtenGradeReviewer2 ?? null,
            presentation_grade_reviewer2: p.presentationGradeReviewer2 ?? null
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
            name: t.name !== null && t.name !== undefined ? cleanInvisibleChars(String(t.name)).trim() : '',
            email: t.email !== null && t.email !== undefined ? cleanInvisibleChars(String(t.email)).trim() : '',
            cedula: cleanInvisibleChars(String(t.cedula ?? t.documento ?? t.identification ?? '')).trim(),
        }));
    },
    
    getTeacherById: async function(id: string): Promise<Teacher | null> {
        if (!supabase) return null;
        const { data } = await supabase.from('teachers').select('*').eq('id', id).maybeSingle();
        if (!data) return null;
        return {
            ...data,
            name: data.name !== null && data.name !== undefined ? cleanInvisibleChars(String(data.name)).trim() : '',
            email: data.email !== null && data.email !== undefined ? cleanInvisibleChars(String(data.email)).trim() : '',
            cedula: cleanInvisibleChars(String(data.cedula ?? data.documento ?? data.identification ?? '')).trim(),
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
        const cleanName = cleanInvisibleChars(String(t.name || '')).trim();
        const cleanEmail = cleanInvisibleChars(String(t.email || '')).trim();
        const cleanCedula = cleanInvisibleChars(String(t.cedula || '')).trim();

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

        const prevCedula = cleanInvisibleChars(String(prevTeacher?.cedula ?? '')).trim();
        const prevPass = !isEmptySecret(existingUser?.password)
            ? cleanInvisibleChars(String(existingUser.password)).trim()
            : (!isEmptySecret(prevTeacher?.password) ? cleanInvisibleChars(String(prevTeacher.password)).trim() : '');

        const shouldSyncToCedula =
            !!options?.resetPasswordToCedula ||
            !prevPass ||
            secretMatches(prevPass, prevCedula, true);

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

        if (existingUsers.length > 0) {
            for (const u of existingUsers) {
                await supabase
                    .from('users')
                    .update({ username: cleanName, password: effectivePassword, role: 'teacher', teacher_id: t.id })
                    .eq('id', u.id);
            }
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

    authenticateTeacherByIdWithReason: async function(teacherId: string, rawPassword: string): Promise<AuthResult> {
        if (!supabase) return { user: null, reason: 'offline' };
        if (!teacherId || !rawPassword) return { user: null, reason: 'invalid_credentials' };

        let { data: rawTeacher } = await supabase
            .from('teachers')
            .select('*')
            .eq('id', teacherId)
            .maybeSingle();

        const allTeachers = await this.getTeachers();
        if (!rawTeacher) {
            rawTeacher = allTeachers.find(t => String(t.id) === String(teacherId)) || null;
        }
        if (!rawTeacher) return { user: null, reason: 'not_found' };

        // Include sibling duplicate teacher rows sharing the exact same normalized name
        const targetNameKey = normalizeTextKey(rawTeacher.name);
        const siblingTeachers = targetNameKey
            ? allTeachers.filter(t => String(t.id) !== String(rawTeacher.id) && normalizeTextKey(t.name) === targetNameKey)
            : [];
        const candidates: any[] = [rawTeacher, ...siblingTeachers];

        let anyCredentialConfigured = false;

        for (const cand of candidates) {
            const teacherName = cleanInvisibleChars(String(cand.name ?? '')).trim();
            const teacherEmail = cleanInvisibleChars(String(cand.email ?? '')).trim();
            const teacherCedula = cleanInvisibleChars(
                String(cand.cedula ?? cand.documento ?? cand.identification ?? '')
            ).trim();
            const teacherPassword = !isEmptySecret(cand.password)
                ? cleanInvisibleChars(String(cand.password)).trim()
                : '';

            const matchedUserRows = await findTeacherUserRows({
                id: String(cand.id),
                name: teacherName,
                email: teacherEmail,
                cedula: teacherCedula
            });

            const hasAnyUserPass = matchedUserRows.some((u: any) => !isEmptySecret(u.password));
            if (teacherCedula !== '' || teacherPassword !== '' || hasAnyUserPass) {
                anyCredentialConfigured = true;
            }

            const validUserRow = matchedUserRows.find((u: any) => secretMatches(u.password, rawPassword, false));
            const matchesTeacherPassword = teacherPassword !== '' && secretMatches(teacherPassword, rawPassword, false);
            const matchesCedula = teacherCedula !== '' && secretMatches(teacherCedula, rawPassword, true);

            if (!validUserRow && !matchesTeacherPassword && !matchesCedula) {
                continue;
            }

            const primaryUser = validUserRow || matchedUserRows[0] || null;
            const syncedPassword = validUserRow
                ? cleanInvisibleChars(String(validUserRow.password)).trim()
                : (matchesTeacherPassword ? teacherPassword : teacherCedula);
            const userId = primaryUser?.id || generateId();

            try {
                if (primaryUser) {
                    const needsSync =
                        String(primaryUser.teacher_id || '') !== String(cand.id) ||
                        normalizeTextKey(primaryUser.username) !== normalizeTextKey(teacherName) ||
                        isEmptySecret(primaryUser.password) ||
                        (matchesCedula && !secretMatches(primaryUser.password, teacherCedula));

                    if (needsSync) {
                        await supabase
                            .from('users')
                            .update({
                                username: teacherName,
                                password: syncedPassword,
                                role: 'teacher',
                                teacher_id: cand.id
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
                            teacher_id: cand.id
                        }]);
                }
            } catch (syncErr) {
                console.warn('Error sincronizando usuario docente al iniciar sesión:', syncErr);
            }

            return {
                user: {
                    id: userId,
                    username: teacherName,
                    password: '',
                    role: 'teacher',
                    teacherId: String(cand.id),
                    studentId: null
                }
            };
        }

        return {
            user: null,
            reason: anyCredentialConfigured ? 'invalid_credentials' : 'missing_cedula'
        };
    },

    authenticateTeacherById: async function(teacherId: string, rawPassword: string): Promise<User | null> {
        const res = await this.authenticateTeacherByIdWithReason(teacherId, rawPassword);
        return res.user;
    },

    authenticateUserWithReason: async function(identifier: string, password: string): Promise<AuthResult> {
        if (!supabase) return { user: null, reason: 'offline' };
        const rawIdentifier = String(identifier || '');
        const trimmedIdentifier = cleanInvisibleChars(rawIdentifier).trim();
        const rawPassword = cleanInvisibleChars(String(password || '')).trim();
        if (!trimmedIdentifier || !rawPassword) return { user: null, reason: 'invalid_credentials' };

        if (rawIdentifier.startsWith('teacher:')) {
            const teacherId = rawIdentifier.slice('teacher:'.length);
            return await this.authenticateTeacherByIdWithReason(teacherId, rawPassword);
        }

        const idKey = normalizeTextKey(trimmedIdentifier);

        if (idKey === 'admin') {
            const { data: adminUsers } = await supabase
                .from('users')
                .select('*')
                .or('role.eq.admin,username.ilike.admin');

            const adminMatch = (adminUsers || []).find((u: any) =>
                (u.role === 'admin' || normalizeTextKey(u.username) === 'admin') &&
                !isEmptySecret(u.password) &&
                cleanInvisibleChars(String(u.password)).trim() === rawPassword
            );
            if (!adminMatch) return { user: null, reason: 'invalid_credentials' };
            return {
                user: {
                    id: adminMatch.id,
                    username: adminMatch.username,
                    password: '',
                    role: adminMatch.role,
                    teacherId: adminMatch.teacher_id || null,
                    studentId: adminMatch.student_id || null
                }
            };
        }

        const teachers = await this.getTeachers();
        const idDoc = normalizeDocument(trimmedIdentifier);
        const matchedTeacher = teachers.find(t =>
            normalizeTextKey(t.name) === idKey ||
            (t.email && normalizeTextKey(t.email) === idKey) ||
            (idDoc !== '' && normalizeDocument(t.cedula) === idDoc)
        );
        if (matchedTeacher) {
            return await this.authenticateTeacherByIdWithReason(String(matchedTeacher.id), rawPassword);
        }

        const { data: directUsers } = await supabase
            .from('users')
            .select('*')
            .eq('username', trimmedIdentifier);
        const matchedUser = (directUsers || []).find((u: any) => secretMatches(u.password, rawPassword));
        if (!matchedUser) return { user: null, reason: 'invalid_credentials' };

        return {
            user: {
                id: matchedUser.id,
                username: matchedUser.username,
                password: '',
                role: matchedUser.role,
                teacherId: matchedUser.teacher_id || null,
                studentId: matchedUser.student_id || null
            }
        };
    },

    authenticateUser: async function(identifier: string, password: string): Promise<User | null> {
        const res = await this.authenticateUserWithReason(identifier, password);
        return res.user;
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

    getAllProjectFormatHistories: async function(): Promise<ProjectFormatHistory[]> {
        const localHistory = this.getFormatHistoriesLocal();
        const mergedById = new Map<string, ProjectFormatHistory>();
        localHistory.forEach(h => mergedById.set(h.id, h));

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('project_format_history')
                    .select('*')
                    .order('created_at', { ascending: true });
                if (!error && data) {
                    data.forEach((d: any) => {
                        const entry: ProjectFormatHistory = {
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
                        };
                        mergedById.set(entry.id, entry);
                    });
                }
            } catch (err) {
                console.warn("Error consultando historial general project_format_history:", err);
            }
        }
        return Array.from(mergedById.values());
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
