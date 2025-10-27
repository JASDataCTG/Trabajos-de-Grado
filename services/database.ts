import { AppDatabase, Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program, User } from '../types';

const DB_KEY = 'degreeProjectsDB';
const DB_CUSTOM_SEED_KEY = 'degreeProjectsDBCustomSeed';

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

const getSeedData = (): AppDatabase => {
    const statuses: Status[] = [
        { id: 'status-1', name: 'Propuesto' },
        { id: 'status-2', name: 'En Progreso' },
        { id: 'status-3', name: 'En Revisión' },
        { id: 'status-4', name: 'Aprobado' },
        { id: 'status-5', name: 'Rechazado' },
    ];
    const formats: Format[] = [
        { id: 'format-1', name: 'Tesis Estándar' },
        { id: 'format-2', name: 'Artículo de Investigación' },
        { id: 'format-3', name: 'Proyecto de Software' },
    ];
    const teacherRoles: TeacherRole[] = [
        { id: 'role-1', name: 'Director' },
        { id: 'role-2', name: 'Co-Director' },
        { id: 'role-3', name: 'Evaluador 1' },
        { id: 'role-4', name: 'Evaluador 2' },
    ];
    const teachers: Teacher[] = [
        { id: 'teacher-1', name: 'Dr. Eleanor Vance', email: 'eleanor.v@university.edu', cedula: '12345678' },
        { id: 'teacher-2', name: 'Prof. Ben Carter', email: 'ben.c@university.edu', cedula: '87654321' },
        { id: 'teacher-3', name: 'Dra. Olivia Chen', email: 'olivia.c@university.edu', cedula: '11223344' },
    ];
    const programs: Program[] = [
        { id: 'prog-1', name: 'Tecnología en Desarrollo de Sistemas de Información y Software' },
        { id: 'prog-2', name: 'Ingeniería de Sistemas' },
    ];

    const projects: Project[] = [
        { id: 'project-1', title: 'Mantenimiento Predictivo con IA', presentationDate: '2024-12-15', filesUrl: 'https://example.com/project1', statusId: 'status-2', formatId: 'format-3', isApprovedByDirector: false, writtenGradeReviewer1: null, presentationGradeReviewer1: null, writtenGradeReviewer2: null, presentationGradeReviewer2: null },
        { id: 'project-2', title: 'Computación Cuántica para Fármacos', presentationDate: '2025-01-20', filesUrl: 'https://example.com/project2', statusId: 'status-1', formatId: 'format-1', isApprovedByDirector: true, writtenGradeReviewer1: 4.3, presentationGradeReviewer1: 4.5, writtenGradeReviewer2: 4.4, presentationGradeReviewer2: 4.1 },
    ];

    const students: Student[] = [
        { id: 'student-1', name: 'Alice Johnson', email: 'alice.j@student.edu', cedula: '100100100', projectId: 'project-1', programId: 'prog-2' },
        { id: 'student-2', name: 'Bob Williams', email: 'bob.w@student.edu', cedula: '200200200', projectId: 'project-1', programId: 'prog-1' },
        { id: 'student-3', name: 'Charlie Brown', email: 'charlie.b@student.edu', cedula: '300300300', projectId: 'project-2', programId: 'prog-2' },
        { id: 'student-4', name: 'Diana Miller', email: 'diana.m@student.edu', cedula: '400400400', projectId: null, programId: 'prog-1' },
    ];
    
    const projectTeachers: ProjectTeacher[] = [
        {id: 'pt-1', projectId: 'project-1', teacherId: 'teacher-1', roleId: 'role-1'},
        {id: 'pt-2', projectId: 'project-1', teacherId: 'teacher-2', roleId: 'role-3'},
        {id: 'pt-3', projectId: 'project-2', teacherId: 'teacher-2', roleId: 'role-1'},
        {id: 'pt-4', projectId: 'project-2', teacherId: 'teacher-1', roleId: 'role-3'},
        {id: 'pt-5', projectId: 'project-2', teacherId: 'teacher-3', roleId: 'role-4'},
    ];
    
    const users: User[] = [
        { id: 'user-admin', username: 'admin', password: 'Ja39362505', role: 'admin', teacherId: null, studentId: null },
        { id: 'user-teacher-1', username: 'eleanor.v', password: '12345678', role: 'teacher', teacherId: 'teacher-1', studentId: null },
        { id: 'user-teacher-2', username: 'ben.c', password: '87654321', role: 'teacher', teacherId: 'teacher-2', studentId: null },
        { id: 'user-teacher-3', username: 'olivia.c', password: '11223344', role: 'teacher', teacherId: 'teacher-3', studentId: null },
        { id: 'user-student-1', username: 'alice.j', password: '100100100', role: 'student', teacherId: null, studentId: 'student-1' },
        { id: 'user-student-2', username: 'bob.w', password: '200200200', role: 'student', teacherId: null, studentId: 'student-2' },
        { id: 'user-student-3', username: 'charlie.b', password: '300300300', role: 'student', teacherId: null, studentId: 'student-3' },
        { id: 'user-student-4', username: 'diana.m', password: '400400400', role: 'student', teacherId: null, studentId: 'student-4' },
    ];

    return { users, statuses, formats, teacherRoles, teachers, projects, students, projectTeachers, programs };
};

export const initializeDB = (): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    if (!localStorage.getItem(DB_KEY)) {
        const customSeed = localStorage.getItem(DB_CUSTOM_SEED_KEY);
        if (customSeed) {
            localStorage.setItem(DB_KEY, customSeed);
        } else {
            localStorage.setItem(DB_KEY, JSON.stringify(getSeedData()));
        }
    }
};

const readDB = (): AppDatabase => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return getSeedData();
    }

    const dbString = localStorage.getItem(DB_KEY);
    if (!dbString) {
        initializeDB();
        const fallbackString = localStorage.getItem(DB_KEY);
        if(fallbackString) return JSON.parse(fallbackString);
        return getSeedData();
    }

    try {
        const db = JSON.parse(dbString);
        if (typeof db === 'object' && db !== null && Array.isArray(db.users)) {
            return db as AppDatabase;
        }
        throw new Error("Invalid DB format");
    } catch (error) {
        console.error("Failed to parse DB from localStorage, resetting to default seed.", error);
        const seedData = getSeedData();
        localStorage.setItem(DB_KEY, JSON.stringify(seedData));
        return seedData;
    }
};


const writeDB = (db: AppDatabase): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(DB_KEY, JSON.stringify(db));
};

const saveCurrentDbAsSeed = (): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const currentDb = localStorage.getItem(DB_KEY);
    if (currentDb) {
        localStorage.setItem(DB_CUSTOM_SEED_KEY, currentDb);
    }
};

type EntityName = keyof AppDatabase;

const getItems = <K extends EntityName>(entityName: K): AppDatabase[K] => {
    const db = readDB();
    return db[entityName] || [];
};

const getItemById = <K extends EntityName>(entityName: K, id: string): AppDatabase[K][number] | undefined => {
    const items = getItems(entityName);
    return items.find((item: { id: string }) => item.id === id);
};

const addItem = <K extends EntityName>(
    entityName: K,
    item: Omit<AppDatabase[K][number], 'id'>
): AppDatabase[K][number] => {
    const db = readDB();
    const newItem = { ...item, id: generateId() } as AppDatabase[K][number];
    if (!Array.isArray(db[entityName])) {
        (db as any)[entityName] = [];
    }
    (db[entityName] as AppDatabase[K][number][]).push(newItem);
    writeDB(db);
    return newItem;
};

const updateItem = <K extends EntityName>(
    entityName: K,
    updatedItem: AppDatabase[K][number]
): AppDatabase[K][number] => {
    const db = readDB();
    const items = db[entityName] as AppDatabase[K][number][];
    const index = items.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
        items[index] = updatedItem;
        writeDB(db);
    }
    return updatedItem;
};

const deleteItem = (entityName: EntityName, id: string): void => {
    const db = readDB();
    let items = (db[entityName] as { id: string }[]).filter(item => item.id !== id);
    (db as any)[entityName] = items;
    
    if (entityName === 'projects') {
        db.students = db.students.map(s => s.projectId === id ? { ...s, projectId: null } : s);
        db.projectTeachers = db.projectTeachers.filter(pt => pt.projectId !== id);
    }
    if (entityName === 'teachers') {
        db.projectTeachers = db.projectTeachers.filter(pt => pt.teacherId !== id);
        db.users = db.users.filter(u => u.teacherId !== id);
    }
    if (entityName === 'students') {
        db.users = db.users.filter(u => u.studentId !== id);
    }
    if (entityName === 'users') {
        const adminUser = getSeedData().users.find(u => u.role === 'admin');
        if (id === adminUser?.id) return; // Prevent admin deletion
    }

    writeDB(db);
};

const replaceAllItems = <K extends EntityName>(entityName: K, newItems: AppDatabase[K]): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const db = readDB();
    (db as any)[entityName] = newItems;
    writeDB(db);
};

const addTeacher = (teacher: Omit<Teacher, 'id'>) => {
    const dbState = readDB();
    const newTeacher = { ...teacher, id: generateId() };
    dbState.teachers.push(newTeacher);

    const newUser: Omit<User, 'id'> = {
        username: newTeacher.email.split('@')[0],
        password: newTeacher.cedula,
        role: 'teacher',
        teacherId: newTeacher.id,
        studentId: null,
    };
    const newUserId = generateId();
    dbState.users.push({ ...newUser, id: newUserId });

    writeDB(dbState);
    return newTeacher;
};

const updateTeacher = (updatedTeacher: Teacher) => {
    const dbState = readDB();
    
    const teacherIndex = dbState.teachers.findIndex(t => t.id === updatedTeacher.id);
    if (teacherIndex === -1) return updatedTeacher;
    dbState.teachers[teacherIndex] = updatedTeacher;

    const userIndex = dbState.users.findIndex(u => u.teacherId === updatedTeacher.id);
    if (userIndex !== -1) {
        dbState.users[userIndex].username = updatedTeacher.email.split('@')[0];
        dbState.users[userIndex].password = updatedTeacher.cedula;
    }
    
    writeDB(dbState);
    return updatedTeacher;
};

const addStudent = (student: Omit<Student, 'id'>) => {
    const dbState = readDB();
    const newStudent = { ...student, id: generateId() };
    dbState.students.push(newStudent);

    const newUser: Omit<User, 'id'> = {
        username: newStudent.email.split('@')[0],
        password: newStudent.cedula,
        role: 'student',
        teacherId: null,
        studentId: newStudent.id,
    };
    const newUserId = generateId();
    dbState.users.push({ ...newUser, id: newUserId });
    
    writeDB(dbState);
    return newStudent;
};

const updateStudent = (updatedStudent: Student) => {
    const dbState = readDB();

    const studentIndex = dbState.students.findIndex(s => s.id === updatedStudent.id);
    if (studentIndex === -1) return updatedStudent;
    dbState.students[studentIndex] = updatedStudent;

    const userIndex = dbState.users.findIndex(u => u.studentId === updatedStudent.id);
    if (userIndex !== -1) {
        dbState.users[userIndex].username = updatedStudent.email.split('@')[0];
        dbState.users[userIndex].password = updatedStudent.cedula;
    }
    
    writeDB(dbState);
    return updatedStudent;
};

export const db = {
    getUsers: () => getItems('users'),
    getUserById: (id: string) => getItemById('users', id),
    addUser: (user: Omit<User, 'id'>) => addItem('users', user),
    updateUser: (user: User) => updateItem('users', user),
    deleteUser: (id: string) => deleteItem('users', id),
    getProjects: () => getItems('projects'),
    getProjectById: (id: string) => getItemById('projects', id),
    addProject: (project: Omit<Project, 'id'>) => addItem('projects', project),
    updateProject: (project: Project) => updateItem('projects', project),
    deleteProject: (id: string) => deleteItem('projects', id),
    getPrograms: () => getItems('programs'),
    getStudents: () => getItems('students'),
    getStudentById: (id: string) => getItemById('students', id),
    addStudent: addStudent,
    updateStudent: updateStudent,
    deleteStudent: (id: string) => deleteItem('students', id),
    getTeachers: () => getItems('teachers'),
    getTeacherById: (id: string) => getItemById('teachers', id),
    addTeacher: addTeacher,
    updateTeacher: updateTeacher,
    deleteTeacher: (id: string) => deleteItem('teachers', id),
    getProjectTeachers: () => getItems('projectTeachers'),
    addProjectTeacher: (pt: Omit<ProjectTeacher, 'id'>) => addItem('projectTeachers', pt),
    updateProjectTeacher: (pt: ProjectTeacher) => updateItem('projectTeachers', pt),
    deleteProjectTeacher: (id: string) => deleteItem('projectTeachers', id),
    getFormats: () => getItems('formats'),
    addFormat: (format: Omit<Format, 'id'>) => addItem('formats', format),
    updateFormat: (format: Format) => updateItem('formats', format),
    deleteFormat: (id: string) => deleteItem('formats',id),
    getTeacherRoles: () => getItems('teacherRoles'),
    addTeacherRole: (role: Omit<TeacherRole, 'id'>) => addItem('teacherRoles', role),
    updateTeacherRole: (role: TeacherRole) => updateItem('teacherRoles', role),
    deleteTeacherRole: (id: string) => deleteItem('teacherRoles', id),
    getStatuses: () => getItems('statuses'),
    addStatus: (status: Omit<Status, 'id'>) => addItem('statuses', status),
    updateStatus: (status: Status) => updateItem('statuses', status),
    deleteStatus: (id: string) => deleteItem('statuses', id),
    replaceAll: replaceAllItems,
    saveCurrentDbAsSeed: saveCurrentDbAsSeed,
};